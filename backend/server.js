const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SamlStrategy = require('@node-saml/passport-saml').Strategy;
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const redis = require('redis');
const { exec } = require('child_process');

const authConfig = require('../src/auth_config.json');

const app = express();

// Logger Setup with Winston and Custom Pretty Format
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, error, stack }) => {
      let logMessage = `${timestamp} [${level}]: ${message}`;
      if (error) {
        logMessage += `\n    Error: ${error}`;
      }
      if (stack) {
        logMessage += `\n    Stack: ${stack}`;
      }
      return logMessage;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, 'logs/server.log') }),
  ],
});

// Redis Client Setup
const redisClient = redis.createClient({
  socket: {
    host: 'localhost',
    port: 6379,
  },
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', { error: err.message, stack: err.stack });
});
redisClient.on('connect', () => {
  logger.info('Redis client connected successfully');
});
redisClient.on('ready', () => {
  logger.info('Redis client ready for operations');
});
redisClient.on('end', () => {
  logger.warn('Redis client connection ended');
});

// Start Redis server and verify connection
const startRedis = () => {
  return new Promise((resolve, reject) => {
    logger.info('Attempting to start Redis server...');
    exec('redis-server --daemonize yes', (error, stdout, stderr) => {
      if (error) {
        logger.error('Failed to start Redis server', { error: error.message });
        reject(error);
      } else {
        logger.info('Redis server started successfully in daemon mode');
        // Verify Redis connection
        (async () => {
          try {
            await redisClient.connect();
            const pingResponse = await redisClient.ping();
            if (pingResponse === 'PONG') {
              logger.info('Redis ping successful');
              resolve();
            } else {
              logger.error('Redis ping failed with unexpected response', { response: pingResponse });
              reject(new Error('Redis ping failed'));
            }
          } catch (err) {
            logger.error('Failed to connect to Redis', { error: err.message });
            reject(err);
          }
        })();
      }
    });
  });
};

// Middleware Setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'http://localhost:3000', 'http://localhost:3001'],
    },
  },
}));

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure RedisStore with connect-redis v6.1.3
let RedisStore;
try {
  const connectRedis = require('connect-redis'); // Require the module
  RedisStore = connectRedis(session); // Initialize with express-session
  logger.info('Successfully imported connect-redis', { version: '6.1.3' });
} catch (importError) {
  logger.error('Failed to import connect-redis', { error: importError.message, stack: importError.stack });
  RedisStore = null;
}

// Initialize session store after Redis is ready
const initializeSessionStore = async () => {
  let sessionStore;
  if (RedisStore && redisClient.isReady) {
    try {
      sessionStore = new RedisStore({ client: redisClient }); // Instantiate with new
      logger.info('Redis session store initialized successfully');
      await redisClient.set('test-session', 'Redis is working');
      const value = await redisClient.get('test-session');
      logger.info('Redis test successful', { key: 'test-session', value });
    } catch (storeError) {
      logger.error('Failed to initialize Redis session store', { error: storeError.message, stack: storeError.stack });
      sessionStore = new session.MemoryStore();
      logger.warn('Falling back to memory store due to Redis store failure');
    }
  } else {
    sessionStore = new session.MemoryStore();
    logger.warn('Using memory store as Redis is unavailable or connect-redis import failed');
  }

  // Apply the session middleware synchronously after determining the store
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || authConfig.sessionSecret || 'your-secure-secret-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }));

  // Ensure Passport middleware is applied after session middleware
  app.use(passport.initialize());
  app.use(passport.session());
};

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../dist')));

// Passport Serialization
passport.serializeUser((user, done) => {
  logger.info('Serializing user', { user });
  done(null, user);
});

passport.deserializeUser((user, done) => {
  logger.info('Deserializing user', { user: user || 'null' });
  done(null, user || null);
});

// Function to validate PEM content
const isValidPem = (content, type) => {
  if (typeof content !== 'string') return false;
  if (type === 'certificate') {
    return content.includes('-----BEGIN CERTIFICATE-----') && content.includes('-----END CERTIFICATE-----');
  }
  if (type === 'privateKey') {
    return (content.includes('-----BEGIN PRIVATE KEY-----') && content.includes('-----END PRIVATE KEY-----')) ||
           (content.includes('-----BEGIN RSA PRIVATE KEY-----') && content.includes('-----END RSA PRIVATE KEY-----'));
  }
  return false;
};

// SAML Configuration with Certificate Validation and Debugging Options
const configureSamlStrategies = () => {
  const samlProviders = authConfig.samlProviders || {};

  Object.keys(samlProviders).forEach((providerName) => {
    const providerConfig = samlProviders[providerName];
    const certPath = path.resolve(__dirname, '..', providerConfig.idpCertPath);
    const privateKeyPath = path.resolve(__dirname, '..', providerConfig.privateKeyPath);
    const spCertPath = providerConfig.spCertPath ? path.resolve(__dirname, '..', providerConfig.spCertPath) : null;

    try {
      if (!fs.existsSync(certPath)) {
        throw new Error(`IdP certificate file not found: ${certPath}`);
      }
      if (!fs.existsSync(privateKeyPath)) {
        throw new Error(`Private key file not found: ${privateKeyPath}`);
      }
      if (spCertPath && !fs.existsSync(spCertPath)) {
        throw new Error(`SP certificate file not found: ${spCertPath}`);
      }

      const certContent = fs.readFileSync(certPath, 'utf-8');
      const privateKeyContent = fs.readFileSync(privateKeyPath, 'utf-8');
      const spCertContent = spCertPath ? fs.readFileSync(spCertPath, 'utf-8') : null;

      if (!isValidPem(certContent, 'certificate')) {
        throw new Error(`Invalid IdP certificate format in ${certPath}`);
      }
      if (!isValidPem(privateKeyContent, 'privateKey')) {
        throw new Error(`Invalid private key format in ${privateKeyPath}`);
      }
      if (spCertPath && !isValidPem(spCertContent, 'certificate')) {
        throw new Error(`Invalid SP certificate format in ${spCertPath}`);
      }

      logger.info(`Configuring SAML for ${providerName}`, { entryPoint: providerConfig.entryPoint });

      passport.use(
        providerName,
        new SamlStrategy(
          {
            entryPoint: providerConfig.entryPoint,
            issuer: providerConfig.issuer,
            callbackUrl: providerConfig.callbackUrl,
            cert: certContent,
            privateKey: privateKeyContent,
            decryptionPvk: privateKeyContent,
            signatureAlgorithm: 'sha256',
            wantAssertionsSigned: providerConfig.wantAssertionsSigned || false,
            validateInResponseTo: false,
            validateIssuer: false,
            disableRequestSignatureValidation: true, // Temporary for debugging
            acceptedClockSkewMs: 5000, // Allow 5 seconds of clock skew
          },
          (profile, done) => {
            logger.info(`SAML profile received for ${providerName}`, { profile });
            const user = {
              email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
              name: profile.name || profile['http://schemas.microsoft.com/identity/claims/displayname'],
              provider: providerName,
            };
            logger.info(`Authenticated user for ${providerName}`, { user });
            return done(null, user);
          }
        )
      );
    } catch (error) {
      logger.warn(`Skipping SAML provider ${providerName} due to invalid certificate configuration`, { error: error.message });
    }
  });
};

// Routes
app.get('/health', (req, res) => {
  logger.info('Health check requested', { status: 'healthy', uptime: process.uptime() });
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

app.get('/test-redis', async (req, res) => {
  try {
    await redisClient.set('test-key', 'Hello Redis');
    const value = await redisClient.get('test-key');
    logger.info('Redis test result', { key: 'test-key', value });
    res.json({ success: true, value });
  } catch (err) {
    logger.error('Redis test failed', { error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/login/:provider', (req, res, next) => {
  const provider = req.params.provider;
  if (!passport._strategies[provider]) {
    logger.warn(`Authentication provider ${provider} is not configured, possibly due to missing or malformed certificates`);
    return res.status(400).json({ error: `Authentication provider ${provider} is not configured` });
  }
  passport.authenticate(provider, { session: true })(req, res, next);
});

app.post('/login/callback/:provider', 
  async (req, res, next) => {
    const provider = req.params.provider;
    logger.info('SAML callback received', { provider, body: req.body }); // Log raw SAML response for debugging
    if (!passport._strategies[provider]) {
      logger.warn(`Authentication provider ${provider} is not configured for callback, possibly due to missing or malformed certificates`);
      return res.status(400).json({ error: `Authentication provider ${provider} is not configured` });
    }
    try {
      passport.authenticate(provider, { failureRedirect: '/login' })(req, res, next);
    } catch (err) {
      logger.error('Error in SAML callback', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'SAML Authentication Failed' });
    }
  },
  (req, res) => {
    logger.info('SAML callback successful', { user: req.user });
    res.redirect('http://localhost:3000/');
  }
);

app.get('/profile', (req, res) => {
  if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
    logger.info('Profile requested', { user: req.user });
    res.json({ user: req.user });
  } else {
    logger.warn('Unauthorized profile request');
    res.status(401).json({ error: "Unauthorized" });
  }
});

app.get('/logout', (req, res) => {
  if (req.logout && typeof req.logout === 'function') {
    req.logout((err) => {
      if (err) {
        logger.error('Logout error', { error: err.message });
        return res.status(500).json({ error: "Logout failed" });
      }
      if (req.session) {
        const sessionId = req.sessionID;
        req.session.destroy((err) => {
          if (err) {
            logger.error('Session destroy error', { error: err.message });
            return res.status(500).json({ error: "Session destroy failed" });
          }
          logger.info('Logged out successfully', { sessionId });
          res.clearCookie('connect.sid', { path: '/' });
          res.set('X-Logout', 'true');
          res.json({ message: "Logged out successfully" });
        });
      } else {
        logger.info('Logged out successfully - no session to destroy');
        res.clearCookie('connect.sid', { path: '/' });
        res.set('X-Logout', 'true');
        res.json({ message: "Logged out successfully" });
      }
    });
  } else {
    logger.error('Logout function is missing');
    res.status(500).json({ error: "Logout function is missing" });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error('Server error occurred', {
    error: err.message,
    stack: err.stack,
    request: { method: req.method, url: req.url, body: req.body },
  });
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start Server with Redis Initialization
let server; // Store the Express server instance for graceful shutdown
const startServer = async () => {
  try {
    configureSamlStrategies(); // Configure SAML strategies before middleware
    await startRedis(); // Start and verify Redis
    await initializeSessionStore(); // Set up session store after Redis is ready
    const PORT = process.env.PORT || 3001;
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server due to Redis initialization failure', { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

// Graceful Shutdown Logic
const gracefulShutdown = async () => {
  logger.info('Received SIGINT (Ctrl+C). Initiating graceful shutdown...');

  // Close the Express server
  if (server) {
    server.close(() => {
      logger.info('Express server closed successfully');
    });
  } else {
    logger.warn('Express server instance not found');
  }

  // Disconnect the Redis client
  if (redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info('Redis client disconnected successfully');
    } catch (err) {
      logger.error('Failed to disconnect Redis client', { error: err.message });
    }
  } else {
    logger.info('Redis client already disconnected');
  }

  // Exit the process
  logger.info('Shutdown complete. Exiting process...');
  process.exit(0);
};

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  await gracefulShutdown();
});

// Handle SIGTERM (optional, for other termination signals)
process.on('SIGTERM', async () => {
  await gracefulShutdown();
});

// Start the server
startServer();