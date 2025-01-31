import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './cb-vote-widget';
import { Auth0Provider } from '@auth0/auth0-react';
import { MsalProvider } from '@azure/msal-react';
import OktaAuth from '@okta/okta-auth-js';
import { PublicClientApplication } from '@azure/msal-browser';
import getAuthProvider from './authConfigHandler';

// Define the Provider type
type Provider = 'auth0' | 'okta' | 'azure';

// Define the provider
const provider: Provider = 'okta'; // Change to 'auth0', 'okta', or 'azure'

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const root = ReactDOM.createRoot(rootElement);

// Type guard for narrowing the provider type
const isAuth0Provider = (p: Provider): p is 'auth0' => p === 'auth0';
const isOktaProvider = (p: Provider): p is 'okta' => p === 'okta';
const isAzureProvider = (p: Provider): p is 'azure' => p === 'azure';

// Fetch the authProvider configuration dynamically
const authProvider = getAuthProvider(provider);

if (isAuth0Provider(provider)) {
  const auth0Config = authProvider as {
    domain: string;
    clientId: string;
    redirectUri: string;
    scopes: string[];
  };

  root.render(
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: auth0Config.redirectUri,
        scope: auth0Config.scopes.join(' '),
      }}
      useRefreshTokens
      cacheLocation="localstorage"
    >
      <Router>
        <Routes>
          <Route path="/" element={<App provider="auth0" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </Auth0Provider>
  );
} else if (isOktaProvider(provider)) {
  const oktaAuth = authProvider as OktaAuth;

  root.render(
    <Router>
      <Routes>
        <Route path="/" element={<App provider="okta" authProvider={oktaAuth} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
} else if (isAzureProvider(provider)) {
  const azureConfig = authProvider as {
    clientId: string;
    authority: string;
    redirectUri: string;
    scopes: string[];
  };

  const msalInstance = new PublicClientApplication({
    auth: {
      clientId: azureConfig.clientId,
      authority: azureConfig.authority,
      redirectUri: azureConfig.redirectUri,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: true,
    },
  });

  root.render(
    <MsalProvider instance={msalInstance}>
      <Router>
        <Routes>
          <Route path="/" element={<App provider="azure" authProvider={{ instance: msalInstance }} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </MsalProvider>
  );
} else {
  throw new Error(`Unsupported provider: ${provider}`);
}
