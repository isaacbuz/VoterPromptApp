// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './cb-vote-widget';
import { Auth0Provider } from '@auth0/auth0-react';
import { MsalProvider } from '@azure/msal-react';
import OktaAuth, { TokenResponse, Token, AccessToken, IDToken, RefreshToken } from '@okta/okta-auth-js';
import { PublicClientApplication } from '@azure/msal-browser';
import getAuthProvider from './authConfigHandler';
import { Provider } from './types';

type ProviderConfig = {
  provider: Provider;
  partnerId?: string;
  campaignCode?: string;
};

// Define getProviderConfig function at the top of the file
const getProviderConfig = (): ProviderConfig => {
  const cbVoteElement = document.querySelector('cb-vote');
  const provider = (cbVoteElement?.getAttribute('provider') || 'auth0') as Provider;
  const partnerId = cbVoteElement?.getAttribute('partnerid') || undefined;
  const campaignCode = cbVoteElement?.getAttribute('campaigncode') || undefined;

  console.log('Selected provider:', provider);
  console.log('Partner ID:', partnerId);
  console.log('Campaign Code:', campaignCode);

  return { provider, partnerId, campaignCode };
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const root = ReactDOM.createRoot(rootElement);

const renderApp = () => {
  const { provider, partnerId, campaignCode } = getProviderConfig();

  const isAuth0Provider = (p: Provider): p is 'auth0' => p === 'auth0';
  const isOktaProvider = (p: Provider): p is 'okta' => p === 'okta';
  const isAzureProvider = (p: Provider): p is 'azure' => p === 'azure';

  const authProvider = getAuthProvider(provider);

  if (isAuth0Provider(provider)) {
    const auth0Config = authProvider as { domain: string; clientId: string; redirectUri: string; scopes: string[] };
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
        onRedirectCallback={(appState) => {
          window.history.replaceState({}, document.title, window.location.pathname);
          console.log('Auth0 redirect callback completed');
        }}
      >
        <Router>
          <Routes>
            <Route path="/" element={<App provider={provider} partnerId={partnerId} campaignCode={campaignCode} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </Auth0Provider>
    );
  } else if (isOktaProvider(provider)) {
    const oktaAuth = authProvider as OktaAuth;
    if (window.location.search.includes('code=')) {
      oktaAuth.token.parseFromUrl().then((tokenResponse: TokenResponse) => {
        // Handle TokenResponse and create Token objects
        const accessToken = tokenResponse.tokens?.accessToken as AccessToken | undefined;
        const idToken = tokenResponse.tokens?.idToken as IDToken | undefined;
        const refreshToken = tokenResponse.tokens?.refreshToken as RefreshToken | undefined;

        // Ensure tokens are valid before adding
        if (accessToken) {
          oktaAuth.tokenManager.add('accessToken', accessToken);
        }
        if (idToken) {
          oktaAuth.tokenManager.add('idToken', idToken);
        }
        if (refreshToken) {
          oktaAuth.tokenManager.add('refreshToken', refreshToken);
        }

        console.log('Okta redirect callback completed');
        renderOktaApp(oktaAuth, partnerId, campaignCode);
      }).catch(err => {
        console.error('Okta redirect error:', err);
      });
    } else {
      renderOktaApp(oktaAuth, partnerId, campaignCode);
    }
  } else if (isAzureProvider(provider)) {
    const azureConfig = authProvider as { clientId: string; authority: string; redirectUri: string; scopes: string[] };
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
            <Route path="/" element={<App provider={provider} authProvider={{ instance: msalInstance }} partnerId={partnerId} campaignCode={campaignCode} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </MsalProvider>
    );
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
};

const renderOktaApp = (oktaAuth: OktaAuth, partnerId?: string, campaignCode?: string) => {
  root.render(
    <Router>
      <Routes>
        <Route path="/" element={<App provider="okta" authProvider={oktaAuth} partnerId={partnerId} campaignCode={campaignCode} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  renderApp();
} else {
  document.addEventListener('DOMContentLoaded', renderApp); // Fixed typo: 'addEventListener', not 'addEvent'
}
