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
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const authConfig = require('./auth_config.json');

const app = express();

// Redis Client Setup
const redisClient = redis.createClient({
  socket: {
    host: 'localhost',
    port: 6379,
  },
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.connect().catch((err) => console.error('Redis Connection Error:', err));

// Logger Setup
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
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
app.use(session({
  store: new RedisStore({ client: redisClient }),
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

// SAML Configuration
const configureSamlStrategies = () => {
  const samlProviders = authConfig.samlProviders || {};

  Object.keys(samlProviders).forEach((providerName) => {
    const providerConfig = samlProviders[providerName];
    const certPath = path.resolve(__dirname, providerConfig.idpCertPath);
    const privateKeyPath = path.resolve(__dirname, providerConfig.privateKeyPath);

    logger.info(`Configuring SAML for ${providerName}`, { entryPoint: providerConfig.entryPoint });

    passport.use(
      providerName,
      new SamlStrategy(
        {
          entryPoint: providerConfig.entryPoint,
          issuer: providerConfig.issuer,
          callbackUrl: providerConfig.callbackUrl,
          cert: fs.readFileSync(certPath, 'utf-8'),
          privateKey: fs.readFileSync(privateKeyPath, 'utf-8'),
          decryptionPvk: fs.readFileSync(privateKeyPath, 'utf-8'),
          signatureAlgorithm: 'sha256',
          wantAssertionsSigned: providerConfig.wantAssertionsSigned || false,
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
  });
};

configureSamlStrategies();

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

app.get('/login/:provider', (req, res, next) => {
  const provider = req.params.provider;
  passport.authenticate(provider, { session: true })(req, res, next);
});

app.post('/login/callback/:provider', 
  passport.authenticate('saml', { failureRedirect: '/login' }), // Fallback to 'saml' strategy
  (req, res) => {
    logger.info('SAML callback successful', { user: req.user });
    res.redirect('http://localhost:3000/');
  }
);

app.get('/profile', (req, res) => {
  if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});

app.get('/logout', (req, res) => {
  if (req.logout && typeof req.logout === 'function') {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: "Logout failed" });
      }
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destroy error:', err);
            return res.status(500).json({ error: "Session destroy failed" });
          }
          res.set('X-Logout', 'true');
          res.json({ message: "Logged out successfully" });
        });
      } else {
        res.set('X-Logout', 'true');
        res.json({ message: "Logged out successfully" });
      }
    });
  } else {
    res.status(500).json({ error: "Logout function is missing" });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start Server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});