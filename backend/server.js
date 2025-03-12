const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const path = require('path');
const fs = require('fs').promises;
const config = require('../src/auth_config.json');

const app = express();
const PORT = config.port || 3001;

// Configure session middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: config.sessionSecret || '123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../docs'))); // Serve static files from docs/

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log('Deserializing user:', user);
  done(null, user);
});

const getCert = (certPath) => {
  const fullPath = path.resolve(__dirname, '..', certPath);
  console.log(`Resolving certificate path: ${fullPath}`);
  return fs.readFile(fullPath, 'utf-8').catch(err => {
    console.warn(`Certificate not found or unreadable: ${fullPath}`, err);
    return null;
  });
};

const configureSaml = async () => {
  const selectedProvider = config.provider;
  const samlProviders = config.samlProviders;

  if (!samlProviders[selectedProvider]) {
    throw new Error(`Selected provider "${selectedProvider}" not found in samlProviders`);
  }

  const providerConfig = samlProviders[selectedProvider];
  console.log(`Configuring SAML for ${selectedProvider} with entryPoint: ${providerConfig.entryPoint}`);

  const [idpCert, privateKey, spCert] = await Promise.all([
    getCert(providerConfig.idpCertPath),
    getCert(providerConfig.privateKeyPath),
    getCert(providerConfig.spCertPath)
  ]);

  if (idpCert && privateKey && spCert) {
    console.log(`Successfully loaded certs for ${selectedProvider}: idpCert=${providerConfig.idpCertPath}, privateKey=${providerConfig.privateKeyPath}, spCert=${providerConfig.spCertPath}`);
    passport.use(selectedProvider, new SamlStrategy({
      entryPoint: providerConfig.entryPoint,
      issuer: providerConfig.issuer,
      callbackUrl: providerConfig.callbackUrl,
      logoutUrl: `https://login.microsoftonline.com/common/wsfederation?wa=wsignout1.0`, // Azure AD SLO endpoint
      cert: idpCert,
      privateKey,
      decryptionPvk: privateKey,
      signatureAlgorithm: 'sha256',
      spCert,
      validateInResponseTo: false,
      disableRequestedAuthnContext: true
    }, (profile, done) => {
      console.log('SAML profile received:', profile);
      const user = {
        email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        name: profile.name || profile['http://schemas.microsoft.com/identity/claims/displayname']
      };
      console.log('Authenticated user:', user);
      return done(null, user);
    }));
  } else {
    console.warn(`Skipping SAML configuration for ${selectedProvider} due to missing certificates`);
  }
};

app.get('/login/:provider', (req, res, next) => {
  const { provider } = req.params;
  if (provider !== config.provider) {
    console.error(`Unsupported provider: ${provider}. Expected: ${config.provider}`);
    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  }
  console.log(`Initiating SAML request for ${provider} to ${config.samlProviders[provider].entryPoint}`);
  passport.authenticate(provider, { failureRedirect: '/', failureFlash: true, prompt: 'login' })(req, res, next);
});

app.post('/login/callback/:provider', (req, res, next) => {
  const { provider } = req.params;
  console.log(`Received callback for ${provider} with body:`, req.body);
  if (provider !== config.provider) {
    console.error('Provider mismatch');
    return res.status(400).json({ error: 'Provider mismatch' });
  }
  passport.authenticate(provider, { failureRedirect: '/', failureFlash: true })(req, res, next);
}, (req, res) => {
  console.log('Authentication successful, user:', req.user);
  res.redirect('/');
});

app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    console.log('User not authenticated');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  console.log('User authenticated:', req.user);
  res.json({ user: req.user });
});

app.get('/logout', (req, res, next) => {
  console.log('Logout request received');
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    // Destroy the session and clear the cookie
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      // Explicitly expire the session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        domain: 'localhost',
        sameSite: 'lax',
        httpOnly: true,
        secure: false,
        expires: new Date(0) // Expire immediately
      });
      console.log('Session destroyed and cookie expired');
      // Initiate SAML single logout
      const provider = config.provider;
      const samlStrategy = passport._strategies[provider];
      if (samlStrategy && samlStrategy.logout) {
        samlStrategy.logout(req, (err, logoutUrl) => {
          if (err) {
            console.error('SAML logout error:', err);
            return res.redirect('/'); // Fallback to app root if SLO fails
          }
          console.log('Redirecting to Azure AD logout URL:', logoutUrl);
          res.redirect(logoutUrl);
        });
      } else {
        console.warn('SAML logout not supported, redirecting to /');
        res.redirect('/');
      }
    });
  });
});

app.get('*', (req, res) => {
  console.log('Serving React app for path:', req.path);
  const indexPath = path.join(__dirname, '../docs', 'index.html');
  fs.access(indexPath).then(() => {
    res.sendFile(indexPath);
  }).catch(err => {
    console.error(`Failed to serve index.html: ${err.message}`);
    res.status(404).json({ error: 'Not Found', details: 'index.html is missing in the docs directory' });
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

configureSaml().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});