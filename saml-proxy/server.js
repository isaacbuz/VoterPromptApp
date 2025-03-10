const express = require('express');
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const fs = require('fs');
require('dotenv').config();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'secret'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
}));
app.use(passport.initialize());
app.use(passport.session());

// Configure SAML strategies for all providers
const samlStrategies = {
  shibboleth: new SamlStrategy({
    callbackUrl: process.env.CALLBACK_URL,
    entryPoint: process.env.ENTRY_POINT,
    issuer: process.env.ISSUER,
    identifierFormat: null,
    decryptionPvk: fs.readFileSync(__dirname + '/cert/key.pem', 'utf8'),
    cert: fs.readFileSync(__dirname + '/cert/idp_cert.pem', 'utf8'),
    wantAssertionsSigned: false
  }, (profile, done) => {
    return done(null, {
      email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      name: profile.name || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
    });
  }),

  azure: new SamlStrategy({
    callbackUrl: 'http://localhost:3001/login/callback/azure',
    entryPoint: 'https://login.microsoftonline.com/9e0ab446-dd79-4d10-a90d-d405048204c9/saml2', // Replace with your tenant ID
    issuer: 'urn:com:voterpromptapp',
    identifierFormat: null,
    decryptionPvk: fs.readFileSync(__dirname + '/cert/azure-key.pem', 'utf8') || fs.readFileSync(__dirname + '/cert/key.pem', 'utf8'),
    cert: fs.readFileSync(__dirname + '/cert/azure-idp-cert.pem', 'utf8'),
    wantAssertionsSigned: false
  }, (profile, done) => {
    return done(null, {
      email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      name: profile.name || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
    });
  }),

  auth0: new SamlStrategy({
    callbackUrl: 'http://localhost:3001/login/callback/auth0',
    entryPoint: 'https://auth0-saml-idp.com/sso', // Placeholder
    issuer: 'auth0-app',
    identifierFormat: null,
    decryptionPvk: fs.readFileSync(__dirname + '/cert/auth0-key.pem', 'utf8') || fs.readFileSync(__dirname + '/cert/key.pem', 'utf8'),
    cert: fs.readFileSync(__dirname + '/cert/auth0-idp-cert.pem', 'utf8') || fs.readFileSync(__dirname + '/cert/idp_cert.pem', 'utf8'),
    wantAssertionsSigned: false
  }, (profile, done) => {
    return done(null, {
      email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      name: profile.name || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
    });
  }),

  okta: new SamlStrategy({
    callbackUrl: 'http://localhost:3001/login/callback/okta',
    entryPoint: 'https://okta-saml-idp.com/sso', // Placeholder
    issuer: 'okta-app',
    identifierFormat: null,
    decryptionPvk: fs.readFileSync(__dirname + '/cert/okta-key.pem', 'utf8') || fs.readFileSync(__dirname + '/cert/key.pem', 'utf8'),
    cert: fs.readFileSync(__dirname + '/cert/okta-idp-cert.pem', 'utf8') || fs.readFileSync(__dirname + '/cert/idp_cert.pem', 'utf8'),
    wantAssertionsSigned: false
  }, (profile, done) => {
    return done(null, {
      email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      name: profile.name || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
    });
  })
};

// Register strategies dynamically
Object.keys(samlStrategies).forEach(provider => {
  passport.use(provider, samlStrategies[provider]);
});

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Routes for each provider
Object.keys(samlStrategies).forEach(provider => {
  app.get(`/login/${provider}`, passport.authenticate(provider, { successRedirect: '/', failureRedirect: '/login' }));

  app.post(`/login/callback/${provider}`,
    passport.authenticate(provider, { session: false }),
    (req, res) => {
      req.session.user = req.user;
      res.redirect('http://127.0.0.1:3000/login/callback');
    }
  );

  app.get(`/Shibboleth.sso/Metadata/${provider}`,
    (req, res) => {
      res.type('application/xml');
      res.status(200).send(samlStrategies[provider].generateServiceProviderMetadata(
        fs.readFileSync(__dirname + `/cert/${provider === 'shibboleth' ? 'idp_cert' : provider === 'azure' ? 'azure-idp-cert' : `${provider}-idp-cert`}.pem`, 'utf8')
      ));
    }
  );
});

// Status endpoint for SPA to poll
app.get('/auth/status', (req, res) => {
  if (req.session.user) {
    res.json({ token: 'dummy-jwt', email: req.session.user.email, name: req.session.user.name });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.listen(3001, () => console.log('SAML proxy running on port 3001'));