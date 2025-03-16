import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import VoteWidget from './vote-widget';
import { Auth0Provider } from '@auth0/auth0-react';
import { MsalProvider } from '@azure/msal-react';
import { OktaAuth, TokenResponse } from '@okta/okta-auth-js';
import { PublicClientApplication } from '@azure/msal-browser';
import authConfigHandler from './authConfigHandler';
import { Provider, VoteWidgetProps, CustomAuthProvider } from './types/types';
import './style.css';

// Define interfaces for auth provider results
interface SamlProviderConfig {
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  idpCertPath: string;
  privateKeyPath: string;
  spCertPath: string;
}

interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes?: string[];
  authority?: string;
}

interface OktaConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes?: string[];
  [key: string]: any;
}

interface AzureMsalConfig {
  auth: {
    clientId: string;
    authority: string;
    redirectUri: string;
  };
  cache: {
    cacheLocation: string;
  };
}

// Type guards
const isSamlProviderConfig = (result: any): result is SamlProviderConfig =>
  result && 'entryPoint' in result && 'issuer' in result && 'callbackUrl' in result;

const isAuth0Config = (result: any): result is Auth0Config =>
  result && 'clientId' in result && 'redirectUri' in result && !('loginRedirect' in result);

const isOktaAuth = (result: any): result is OktaAuth => result instanceof OktaAuth;

const isMsalInstance = (result: any): result is PublicClientApplication =>
  result instanceof PublicClientApplication;

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app">
    <nav>
      <ul>
        <li><a href="/">Demo</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/locations">Locations</a></li>
        <li><a href="/contact">Contact Us</a></li>
      </ul>
    </nav>
    <main>{children}</main>
  </div>
);

const getProviderConfig = () => {
  const voteWidgetElement = document.querySelector('vote-widget');
  const provider = (voteWidgetElement?.getAttribute('provider') || 'azure') as Provider;
  const partnerId = voteWidgetElement?.getAttribute('partnerid') || undefined;
  const campaignCode = voteWidgetElement?.getAttribute('campaigncode') || undefined;
  console.log('Provider config:', { provider, partnerId, campaignCode });
  return { provider, partnerId, campaignCode };
};

const App: React.FC = () => {
  const { provider, partnerId, campaignCode } = getProviderConfig();
  let authProviderResult: SamlProviderConfig | Auth0Config | OktaAuth | PublicClientApplication | null = null;

  try {
    authProviderResult = authConfigHandler(provider) || null;
  } catch (error) {
    console.error(`Failed to initialize auth provider for ${provider}:`, error);
  }

  let authProvider: OktaAuth | PublicClientApplication | CustomAuthProvider | undefined = undefined;
  let auth0Config: Auth0Config | undefined = undefined;

  if (isSamlProviderConfig(authProviderResult)) {
    console.log('SAML provider selected, configuration:', authProviderResult);
    authProvider = {
      login: () => { window.location.href = `/login/${provider}`; },
      logout: () => { window.location.href = '/logout'; },
      getUser: async () => ({ email: undefined, name: undefined }),
      isAuthenticated: async () => false,
    };
  } else if (isOktaAuth(authProviderResult)) {
    const oktaAuthProvider = authProviderResult;
    console.log('Okta provider selected:', oktaAuthProvider);
    authProvider = oktaAuthProvider;
    if (window.location.search.includes('code=')) {
      oktaAuthProvider.token.parseFromUrl().then((tokenResponse: TokenResponse) => {
        if (tokenResponse.tokens.accessToken) oktaAuthProvider.tokenManager.add('accessToken', tokenResponse.tokens.accessToken);
        if (tokenResponse.tokens.idToken) oktaAuthProvider.tokenManager.add('idToken', tokenResponse.tokens.idToken);
        if (tokenResponse.tokens.refreshToken) oktaAuthProvider.tokenManager.add('refreshToken', tokenResponse.tokens.refreshToken);
        window.location.replace(window.location.origin);
      }).catch((err: Error) => console.error('Okta redirect error:', err));
    }
  } else if (isMsalInstance(authProviderResult)) {
    authProvider = authProviderResult;
    console.log('Azure provider selected:', authProvider);
  } else if (isAuth0Config(authProviderResult)) {
    auth0Config = authProviderResult;
    console.log('Auth0 provider selected:', auth0Config);
  }

  const widgetProps: VoteWidgetProps = {
    provider,
    authProvider,
    partnerId,
    campaignCode,
  };

  const renderProvider = (children: React.ReactNode) => {
    if (auth0Config) {
      return (
        <Auth0Provider
          domain={auth0Config.domain || ''}
          clientId={auth0Config.clientId}
          authorizationParams={{ redirect_uri: auth0Config.redirectUri, scope: auth0Config.scopes?.join(' ') || 'openid profile email' }}
          useRefreshTokens
          cacheLocation="localstorage"
          onRedirectCallback={() => (window.location.href = 'http://localhost:3000/')}
        >
          {children}
        </Auth0Provider>
      );
    } else if (isMsalInstance(authProvider)) {
      return <MsalProvider instance={authProvider}>{children}</MsalProvider>;
    } else {
      return <>{children}</>;
    }
  };

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={renderProvider(<VoteWidget {...widgetProps} />)} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

// Render the app
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);