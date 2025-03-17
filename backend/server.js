const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SamlStrategy = require('@node-saml/passport-saml').Strategy;
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);

// Load configuration
const authConfig = require('../src/auth_config.json');

const app = express();

// Logger Setup with Color Coding
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
      const symbols = { info: '✅', debug: 'ℹ️', warn: '⚠️', error: '❌' };
      const symbol = symbols[level.split('[')[1].replace(']', '')] || '';
      let logMessage = `${timestamp} ${level}: ${symbol} ${message}`;
      if (metadata.error) logMessage += `\n    Error: ${metadata.error}`;
      if (metadata.stack) logMessage += `\n    Stack: ${metadata.stack}`;
      if (metadata.duration) logMessage += `\n    Duration: ${metadata.duration}ms`;
      if (metadata.headers) logMessage += `\n    Headers: ${JSON.stringify(metadata.headers)}`;
      if (metadata.session) logMessage += `\n    Session: ${JSON.stringify(metadata.session)}`;
      return logMessage;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, 'logs/server.log') })
  ],
});

// Environment Variables for Configuration
const PORT = process.env.PORT || authConfig.port || 3001;
const SESSION_SECRET = process.env.SESSION_SECRET || authConfig.sessionSecret || 'super-secret-key';

// Certificate Loading Function
const readCertFile = (filePath, type) => {
  try {
    logger.debug(`Attempting to read ${type}`, { filePath });
    if (!fs.existsSync(filePath)) throw new Error(`${type} file not found`);
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) throw new Error(`${type} is empty`);
    if (type.includes('Certificate') && !content.includes('-----BEGIN CERTIFICATE-----')) {
      throw new Error(`${type} is not in valid PEM format`);
    }
    if (type.includes('Private Key') && !content.match(/-----BEGIN (RSA )?PRIVATE KEY-----/)) {
      throw new Error(`${type} is not in valid PEM format`);
    }
    logger.info(`${type} loaded successfully`, { filePath });
    logger.debug(`${type} content preview`, { sample: content.substring(0, 100) + '...' });
    return content;
  } catch (error) {
    logger.error(`Failed to load ${type}`, { error: error.message, filePath });
    throw error;
  }
};

// Load Certificates for All Providers
const loadCertificates = () => {
  const samlProviders = authConfig.samlProviders || {};
  const certs = {};

  Object.keys(samlProviders).forEach((providerName) => {
    const providerConfig = samlProviders[providerName];
    const certPath = path.resolve(__dirname, '..', providerConfig.idpCertPath);
    const privateKeyPath = path.resolve(__dirname, '..', providerConfig.privateKeyPath);
    const spCertPath = providerConfig.spCertPath ? path.resolve(__dirname, '..', providerConfig.spCertPath) : null;

    try {
      certs[providerName] = {
        idpCert: readCertFile(certPath, `${providerName} IdP Certificate`),
        privateKey: readCertFile(privateKeyPath, `${providerName} Private Key`),
        spCert: spCertPath ? readCertFile(spCertPath, `${providerName} SP Certificate`) : null,
      };
      logger.info(`${providerName} certificates loaded`, { provider: providerName });
    } catch (error) {
      logger.warn(`Skipping ${providerName} due to certificate issues`, { provider: providerName });
    }
  });

  return certs;
};

// Load Certificates with Error Handling
let certs;
try {
  certs = loadCertificates();
  logger.info('All certificates loaded', { providers: Object.keys(certs) });
} catch (error) {
  logger.error('Critical failure loading certificates, exiting', { error: error.message });
  process.exit(1);
}

// SAML Strategy Configuration
const configureSamlStrategies = () => {
  const samlProviders = authConfig.samlProviders || {};

  Object.keys(samlProviders).forEach((providerName) => {
    if (!certs[providerName]) {
      logger.warn(`No valid certificates for ${providerName}, skipping`, { provider: providerName });
      return;
    }

    const providerConfig = samlProviders[providerName];
    logger.debug(`Configuring SAML for ${providerName}`, {
      entryPoint: providerConfig.entryPoint,
      issuer: providerConfig.issuer,
      callbackUrl: providerConfig.callbackUrl
    });

    try {
      passport.use(
        providerName,
        new SamlStrategy(
          {
            entryPoint: providerConfig.entryPoint,
            issuer: providerConfig.issuer,
            callbackUrl: providerConfig.callbackUrl,
            cert: certs[providerName].idpCert,
            privateKey: certs[providerName].privateKey,
            decryptionPvk: certs[providerName].privateKey,
            signatureAlgorithm: 'sha256',
            wantAssertionsSigned: providerConfig.wantAssertionsSigned || true,
            validateInResponseTo: false,
            acceptedClockSkewMs: 5000,
          },
          (profile, done) => {
            const startTime = Date.now();
            logger.info(`SAML profile received for ${providerName}`, { profile });
            const user = {
              email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
              name: profile.name || profile['http://schemas.microsoft.com/identity/claims/displayname'],
              provider: providerName,
            };
            done(null, user);
            logger.debug('SAML strategy processing completed', { duration: Date.now() - startTime });
          }
        )
      );
      logger.info(`SAML strategy configured for ${providerName}`);
    } catch (error) {
      logger.error(`SAML configuration failed for ${providerName}`, { error: error.message, stack: error.stack });
    }
  });
};

configureSamlStrategies();

// Passport Serialization
passport.serializeUser((user, done) => {
  const startTime = Date.now();
  logger.debug('Serializing user', { user });
  done(null, user);
  logger.debug('Serialization completed', { duration: Date.now() - startTime });
});
passport.deserializeUser((user, done) => {
  const startTime = Date.now();
  logger.debug('Deserializing user', { user });
  done(null, user);
  logger.debug('Deserialization completed', { duration: Date.now() - startTime });
});

// Middleware and Server Setup
(async () => {
  try {
    // Middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'http://localhost:3000', 'http://localhost:3001'],
        },
      },
    }));
    app.use(cors({
      origin: 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST'],
      optionsSuccessStatus: 200, // Handle preflight requests
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use((req, res, next) => {
      const startTime = Date.now();
      logger.debug('Middleware: Processing request', { path: req.path, method: req.method, headers: req.headers });
      next();
      logger.debug('Middleware: Completed request processing', { path: req.path, method: req.method, duration: Date.now() - startTime });
    });
    app.use(session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    }));
    app.use((req, res, next) => {
      const startTime = Date.now();
      logger.debug('Session middleware: Starting', { sessionID: req.sessionID, session: req.session });
      next();
      logger.debug('Session middleware: Completed', { sessionID: req.sessionID, session: req.session, duration: Date.now() - startTime });
    });
    app.use(passport.initialize());
    app.use(passport.session());

    // Routes
    app.get('/login/:provider', (req, res, next) => {
      const startTime = Date.now();
      const provider = req.params.provider;
      if (!passport._strategies[provider]) {
        logger.warn(`Authentication attempt with unconfigured provider`, { provider });
        return res.status(400).json({ error: `Provider ${provider} not configured` });
      }
      logger.debug(`Initiating login for ${provider}`);
      passport.authenticate(provider, { session: true })(req, res, (err) => {
        logger.debug('Login route completed', { provider, duration: Date.now() - startTime, session: req.session });
        next(err);
      });
    });

    app.post('/login/callback/:provider',
      (req, res, next) => {
        const startTime = Date.now();
        const provider = req.params.provider;
        if (!passport._strategies[provider]) {
          logger.warn(`Callback for unconfigured provider`, { provider });
          return res.status(400).json({ error: `Provider ${provider} not configured` });
        }
        passport.authenticate(provider, { failureRedirect: `/login/${provider}` })(req, res, (err) => {
          logger.debug('Callback route processing', { provider, duration: Date.now() - startTime, session: req.session });
          next(err);
        });
      },
      (req, res) => {
        const startTime = Date.now();
        logger.info('User authenticated successfully', { user: req.user, session: req.session });
        res.redirect('http://localhost:3000/');
        logger.debug('Callback redirect completed', { duration: Date.now() - startTime, session: req.session });
      }
    );

    app.get('/profile', (req, res) => {
      const startTime = Date.now();
      logger.debug('Profile endpoint: Request received', { method: 'GET', path: '/profile', sessionID: req.sessionID, headers: req.headers, session: req.session });
      logger.debug('Profile endpoint: Checking authentication', { isAuthenticated: req.isAuthenticated() });
      try {
        if (req.isAuthenticated()) {
          logger.info('Profile accessed', { user: req.user });
          res.json({ user: req.user });
        } else {
          logger.warn('Unauthorized profile access attempt');
          res.status(401).json({ error: 'Unauthorized' });
        }
      } catch (error) {
        logger.error('Profile endpoint error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Internal Server Error' });
      }
      logger.debug('Profile route completed', { duration: Date.now() - startTime });
    });

    app.get('/logout', (req, res) => {
      const startTime = Date.now();
      req.logout((err) => {
        if (err) {
          logger.error('Logout failed', { error: err.message, stack: err.stack });
          return res.status(500).json({ error: 'Logout failed' });
        }
        req.session.destroy((err) => {
          if (err) {
            logger.error('Session destruction failed', { error: err.message });
            return res.status(500).json({ error: 'Session destroy failed' });
          }
          logger.info('User logged out successfully');
          res.redirect('http://localhost:3000/');
          logger.debug('Logout route completed', { duration: Date.now() - startTime });
        });
      });
    });

    // Health Check Route
    app.get('/health', (req, res) => {
      const startTime = Date.now();
      logger.info('Health check requested');
      res.status(200).json({ status: 'healthy', uptime: process.uptime() });
      logger.debug('Health check route completed', { duration: Date.now() - startTime });
    });

    // Error Handling Middleware
    app.use((err, req, res, next) => {
      logger.error('Unexpected server error', { error: err.message, stack: err.stack, path: req.path });
      res.status(500).json({ error: 'Internal Server Error' });
    });

    // Start Server
    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Server startup failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
})();

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  app.close(() => {
    logger.info('Server shut down');
    process.exit(0);
  });
});