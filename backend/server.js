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
const authConfig = require('../src/auth_config.json');

const app = express();

// Redis Client Setup
const redisClient = redis.createClient({
  socket: {
    host: 'localhost',
    port: 6379, // Default Redis port
  },
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error during operation', { error: err.message, stack: err.stack });
});
redisClient.connect().catch((err) => {
  logger.error('Redis Connection Error during initialization', { error: err.message, stack: err.stack });
});

// Logger Setup with Winston and Custom Pretty Format
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, error, stack, ...metadata }) => {
      let logMessage = `${timestamp} [${level}]: ${message}`;
      if (error) {
        logMessage += `\n    Error: ${error}`;
      }
      if (stack) {
        logMessage += `\n    Stack: ${stack}`;
      }
      if (Object.keys(metadata).length > 0) {
        logMessage += `\n    Metadata: ${JSON.stringify(metadata, null, 2)}`;
      }
      return logMessage;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, 'logs/server.log') }),
  ],
});

const PORT = process.env.PORT || 3001;

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

// Dynamically import and configure RedisStore
let RedisStore;
try {
  const connectRedisModule = require('connect-redis');
  RedisStore = connectRedisModule.default || connectRedisModule.RedisStore; // Try default or named export
  if (typeof RedisStore !== 'function') {
    throw new Error('Default or named export of connect-redis is not a function');
  }
  logger.info('Successfully imported connect-redis', { type: typeof RedisStore, export: Object.keys(connectRedisModule) });
} catch (importError) {
  logger.error('Failed to import connect-redis as a constructor', { error: importError.message, stack: importError.stack });
  RedisStore = null; // Set to null to use fallback
}

// Configure session store
let sessionStore;
if (RedisStore) {
  try {
    sessionStore = new RedisStore({ client: redisClient });
    logger.info('Redis session store initialized successfully');
  } catch (storeError) {
    logger.error('Failed to initialize Redis session store', { error: storeError.message, stack: storeError.stack });
    sessionStore = new session.MemoryStore(); // Fallback to memory store
    logger.warn('Falling back to memory store due to Redis store failure');
  }
} else {
  sessionStore = new session.MemoryStore(); // Fallback if import fails
  logger.warn('Using memory store as connect-redis import failed');
}

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

app.use(passport.initialize());
app.use(passport.session());

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
  if (typeof content !== 'string') {
    logger.warn(`Invalid content type for PEM validation`, { type, contentType: typeof content });
    return false;
  }
  if (type === 'certificate') {
    const isValid = content.includes('-----BEGIN CERTIFICATE-----') && content.includes('-----END CERTIFICATE-----');
    logger.debug(`Validating certificate PEM`, { isValid, contentSnippet: content.slice(0, 50) });
    return isValid;
  }
  if (type === 'privateKey') {
    const isValid = (content.includes('-----BEGIN PRIVATE KEY-----') && content.includes('-----END PRIVATE KEY-----')) ||
                   (content.includes('-----BEGIN RSA PRIVATE KEY-----') && content.includes('-----END RSA PRIVATE KEY-----'));
    logger.debug(`Validating private key PEM`, { isValid, contentSnippet: content.slice(0, 50) });
    return isValid;
  }
  logger.warn(`Unknown PEM type for validation`, { type });
  return false;
};

// SAML Configuration with Certificate Validation
const configureSamlStrategies = () => {
  const samlProviders = authConfig.samlProviders || {};
  logger.debug('SAML providers configuration loaded', { providers: Object.keys(samlProviders) });

  Object.keys(samlProviders).forEach((providerName) => {
    const providerConfig = samlProviders[providerName];
    logger.info(`Attempting to configure SAML for provider: ${providerName}`, { entryPoint: providerConfig.entryPoint });

    // Resolve paths relative to the project root (not backend/)
    const certPath = path.resolve(__dirname, '..', providerConfig.idpCertPath);
    const privateKeyPath = path.resolve(__dirname, '..', providerConfig.privateKeyPath);
    const spCertPath = providerConfig.spCertPath ? path.resolve(__dirname, '..', providerConfig.spCertPath) : null;

    // Validate certificate files
    try {
      // Check if files exist
      logger.debug(`Checking existence of certificate files for ${providerName}`, { certPath, privateKeyPath, spCertPath });
      if (!fs.existsSync(certPath)) {
        throw new Error(`IdP certificate file not found: ${certPath}`);
      }
      if (!fs.existsSync(privateKeyPath)) {
        throw new Error(`Private key file not found: ${privateKeyPath}`);
      }
      if (spCertPath && !fs.existsSync(spCertPath)) {
        throw new Error(`SP certificate file not found: ${spCertPath}`);
      }

      // Read file contents
      const certContent = fs.readFileSync(certPath, 'utf-8');
      const privateKeyContent = fs.readFileSync(privateKeyPath, 'utf-8');
      const spCertContent = spCertPath ? fs.readFileSync(spCertPath, 'utf-8') : null;

      // Log file contents for debugging
      logger.debug(`Read IDP certificate for ${providerName}`, { filePath: certPath, contentLength: certContent.length, contentSnippet: certContent.slice(0, 50) });
      logger.debug(`Read private key for ${providerName}`, { filePath: privateKeyPath, contentLength: privateKeyContent.length, contentSnippet: privateKeyContent.slice(0, 50) });
      if (spCertPath) {
        logger.debug(`Read SP certificate for ${providerName}`, { filePath: spCertPath, contentLength: spCertContent.length, contentSnippet: spCertContent.slice(0, 50) });
      }

      // Validate file contents
      if (!isValidPem(certContent, 'certificate')) {
        throw new Error(`Invalid IdP certificate format in ${certPath}`);
      }
      if (!isValidPem(privateKeyContent, 'privateKey')) {
        throw new Error(`Invalid private key format in ${privateKeyPath}`);
      }
      if (spCertPath && !isValidPem(spCertContent, 'certificate')) {
        throw new Error(`Invalid SP certificate format in ${spCertPath}`);
      }

      // Log successful validation
      logger.info(`Successfully validated certificates for ${providerName}, initializing SAML strategy`);

      // Configure the SAML strategy
      const samlOptions = {
        entryPoint: providerConfig.entryPoint,
        issuer: providerConfig.issuer,
        callbackUrl: providerConfig.callbackUrl,
        cert: certContent,
        privateKey: privateKeyContent,
        decryptionPvk: privateKeyContent,
        signatureAlgorithm: 'sha256',
        wantAssertionsSigned: providerConfig.wantAssertionsSigned || false,
      };
      logger.debug(`SAML strategy options for ${providerName}`, { samlOptions: { ...samlOptions, cert: '[REDACTED]', privateKey: '[REDACTED]', decryptionPvk: '[REDACTED]' } });

      passport.use(
        providerName,
        new SamlStrategy(
          samlOptions,
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
      logger.info(`SAML strategy successfully configured for ${providerName}`);
    } catch (error) {
      logger.warn(`Skipping SAML provider ${providerName} due to invalid certificate configuration`, {
        error: error.message,
        certPath,
        privateKeyPath,
        spCertPath,
      });
    }
  });
};

configureSamlStrategies();

// Routes
app.get('/health', (req, res) => {
  logger.info('Health check requested', { status: 'healthy', uptime: process.uptime() });
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

app.get('/login/:provider', (req, res, next) => {
  const provider = req.params.provider;
  logger.debug(`Login request for provider: ${provider}`);
  if (!passport._strategies[provider]) {
    logger.warn(`Authentication provider ${provider} is not configured, possibly due to missing or malformed certificates`);
    return res.status(400).json({ error: `Authentication provider ${provider} is not configured` });
  }
  passport.authenticate(provider, { session: true })(req, res, next);
});

app.post('/login/callback/:provider', 
  (req, res, next) => {
    const provider = req.params.provider;
    logger.debug(`Callback request for provider: ${provider}`);
    if (!passport._strategies[provider]) {
      logger.warn(`Authentication provider ${provider} is not configured for callback, possibly due to missing or malformed certificates`);
      return res.status(400).json({ error: `Authentication provider ${provider} is not configured` });
    }
    passport.authenticate(provider, { failureRedirect: '/login' })(req, res, next);
  },
  (req, res) => {
    logger.info('SAML callback successful', { user: req.user });
    res.redirect('http://localhost:3000/');
  }
);

app.get('/profile', (req, res) => {
  logger.debug('Profile endpoint accessed', { session: req.sessionID, isAuthenticated: req.isAuthenticated && typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false });
  if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
    logger.info('Profile requested', { user: req.user });
    res.json({ user: req.user });
  } else {
    logger.warn('Unauthorized profile request');
    res.status(401).json({ error: "Unauthorized" });
  }
});

app.get('/logout', (req, res) => {
  logger.debug('Logout endpoint accessed', { session: req.sessionID });
  if (req.logout && typeof req.logout === 'function') {
    req.logout((err) => {
      if (err) {
        logger.error('Logout error', { error: err.message });
        return res.status(500).json({ error: "Logout failed" });
      }
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            logger.error('Session destroy error', { error: err.message });
            return res.status(500).json({ error: "Session destroy failed" });
          }
          logger.info('Logged out successfully');
          res.set('X-Logout', 'true');
          res.json({ message: "Logged out successfully" });
        });
      } else {
        logger.info('Logged out successfully');
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
  logger.error('Server error', { error: err.message, stack: err.stack, path: req.path, method: req.method });
  res.status(500).json({ error: "Internal Server Error" });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  logger.debug(`Serving frontend for route: ${req.path}`);
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start Server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});