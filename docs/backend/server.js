const express = require('express');
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

require('dotenv').config({ path: '../.env' }); // Load root .env
console.log('Loaded environment variables:', process.env);

// Utility Functions for Certificate Reading
const getCert = (path) => {
  const fullPath = path.startsWith('/') ? path : path.join(__dirname, '..', path);
  console.log(`Attempting to read cert from: ${fullPath}`);
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`Warning: Cert file does not exist at ${fullPath}`);
      return null;
    }
    const cert = fs.readFileSync(fullPath, 'utf8');
    console.log(`Successfully read cert from ${fullPath}, length: ${cert.length}`);
    return cert;
  } catch (err) {
    console.log(`Warning: Could not read cert at ${fullPath}`, err.message);
    return null;
  }
};

const getPrivateKey = (path) => {
  const fullPath = path.startsWith('/') ? path : path.join(__dirname, '..', path);
  console.log(`Attempting to read private key from: ${fullPath}`);
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`Warning: Private key file does not exist at ${fullPath}`);
      return null;
    }
    const key = fs.readFileSync(fullPath, 'utf8');
    console.log(`Successfully read private key from ${fullPath}, length: ${key.length}`);
    return key;
  } catch (err) {
    console.log(`Warning: Could not read private key at ${fullPath}`, err.message);
    return null;
  }
};

const getSpCert = (path) => {
  const fullPath = path.startsWith('/') ? path : path.join(__dirname, '..', path);
  console.log(`Attempting to read SP cert from: ${fullPath}`);
  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`Warning: SP cert file does not exist at ${fullPath}`);
      return null;
    }
    const spCert = fs.readFileSync(fullPath, 'utf8');
    console.log(`Successfully read SP cert from ${fullPath}, length: ${spCert.length}`);
    return spCert;
  } catch (err) {
    console.log(`Warning: Could not read SP cert at ${fullPath}`, err.message);
    return null;
  }
};

// Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || '123',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(passport.initialize());
app.use(passport.session());

// SAML Provider Configurations
const samlProviders = {
  shibboleth: {
    entryPoint: process.env.SHIBBOLETH_ENTRY_POINT,
    issuer: process.env.SHIBBOLETH_ISSUER,
    callbackUrl: process.env.SHIBBOLETH_CALLBACK_URL,
    idpCertPath: process.env.SHIBBOLETH_IDP_CERT_PATH,
    privateKeyPath: process.env.SHIBBOLETH_PRIVATE_KEY_PATH,
    spCertPath: process.env.SHIBBOLETH_SP_CERT_PATH,
  },
  azure: {
    entryPoint: process.env.AZURE_ENTRY_POINT,
    issuer: process.env.AZURE_ISSUER,
    callbackUrl: process.env.AZURE_CALLBACK_URL,
    idpCertPath: process.env.AZURE_IDP_CERT_PATH,
    privateKeyPath: process.env.AZURE_PRIVATE_KEY_PATH,
    spCertPath: process.env.AZURE_SP_CERT_PATH,
  },
  auth0: {
    entryPoint: process.env.AUTH0_SAML_ENTRY_POINT,
    issuer: process.env.AUTH0_SAML_ISSUER,
    callbackUrl: process.env.AUTH0_SAML_CALLBACK_URL,
    idpCertPath: process.env.AUTH0_SAML_IDP_CERT_PATH,
    privateKeyPath: process.env.AUTH0_SAML_PRIVATE_KEY_PATH,
    spCertPath: process.env.AUTH0_SAML_SP_CERT_PATH,
  },
  okta: {
    entryPoint: process.env.OKTA_SAML_ENTRY_POINT,
    issuer: process.env.OKTA_SAML_ISSUER,
    callbackUrl: process.env.OKTA_SAML_CALLBACK_URL,
    idpCertPath: process.env.OKTA_SAML_IDP_CERT_PATH,
    privateKeyPath: process.env.OKTA_SAML_PRIVATE_KEY_PATH,
    spCertPath: process.env.OKTA_SAML_SP_CERT_PATH,
  },
};

// Dynamically Configure SAML Strategies
Object.entries(samlProviders).forEach(([provider, config]) => {
  const idpCert = getCert(config.idpCertPath);
  const privateKey = getPrivateKey(config.privateKeyPath);
  const spCert = getSpCert(config.spCertPath);

  if (idpCert && privateKey && spCert) {
    passport.use(provider, new SamlStrategy({
      callbackUrl: config.callbackUrl,
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      decryptionPvk: privateKey,
      cert: idpCert,
      spCert: spCert,
      wantAssertionsSigned: true
    }, (profile, done) => {
      console.log(`${provider} Profile:`, profile);
      return done(null, {
        email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        name: profile['http://schemas.microsoft.com/identity/claims/displayname'] || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
      });
    }));
  } else {
    console.log(`Skipping ${provider} due to missing certificates`);
  }
});

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Routes
app.get('/login/:provider', (req, res, next) => {
  const provider = req.params.provider;
  if (!passport._strategies[provider]) {
    return res.status(400).send(`Provider ${provider} not configured`);
  }
  passport.authenticate(provider)(req, res, next);
});

app.get('/login/callback/:provider', (req, res, next) => {
  const provider = req.params.provider;
  if (!passport._strategies[provider]) {
    return res.redirect('/login');
  }
  passport.authenticate(provider, {
    successRedirect: 'http://localhost:3000/?voterPrompt=true',
    failureRedirect: '/login'
  })(req, res, next);
});

app.post('/login/callback/:provider', (req, res, next) => {
  const provider = req.params.provider;
  if (!passport._strategies[provider]) {
    return res.redirect('/login');
  }
  passport.authenticate(provider, {
    successRedirect: 'http://localhost:3000/?voterPrompt=true',
    failureRedirect: '/login'
  })(req, res, next);
});

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('http://localhost:3000/'));
});

app.get('/profile', (req, res) => {
  console.log('Fetching profile, session user:', req.user);
  res.json({ loggedIn: !!req.user, user: req.user });
});

app.get('/', (req, res) => res.send('Backend running - use frontend at http://localhost:3000/'));

app.listen(process.env.PORT || 3001, () => console.log(`Server running on port ${process.env.PORT || 3001}`));