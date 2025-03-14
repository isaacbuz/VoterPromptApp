import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import VoteWidget from './vote-widget';
import { Auth0Provider } from '@auth0/auth0-react';
import { MsalProvider } from '@azure/msal-react';
import { OktaAuth } from '@okta/okta-auth-js'; // Use named import
import { PublicClientApplication } from '@azure/msal-browser';
import authConfigHandler from './authConfigHandler';
import { Provider, VoteWidgetProps } from './types';
import './custom.d';
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

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
const root = createRoot(rootElement);

const renderApp = (
  authProviderResult: SamlProviderConfig | Auth0Config | OktaAuth | PublicClientApplication | null,
  provider: Provider,
  partnerId?: string,
  campaignCode?: string
) => {
  try {
    console.log('Rendering app with:', { provider, authProviderResult, partnerId, campaignCode });
    const isAuth0Provider = (p: string): p is 'auth0' => p === 'auth0';
    const isOktaProvider = (p: string): p is 'okta' => p === 'okta';
    const isAzureProvider = (p: string): p is 'azure' => p === 'azure';
    const isShibbolethProvider = (p: string): p is 'shibboleth' => p === 'shibboleth';

    const widgetProps: VoteWidgetProps = {
      provider,
      partnerId,
      campaignCode,
    };

    if (isAuth0Provider(provider)) {
      if (!isAuth0Config(authProviderResult)) {
        console.warn('Invalid Auth0 configuration, falling back to login');
        root.render(
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<VoteWidget {...widgetProps} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        );
        return;
      }
      const authConfig = authProviderResult as Auth0Config;
      console.log('Auth0 configuration:', authConfig);
      root.render(
        <Auth0Provider
          domain={authConfig.domain || ''}
          clientId={authConfig.clientId}
          authorizationParams={{ redirect_uri: authConfig.redirectUri, scope: authConfig.scopes?.join(' ') || 'openid profile email' }}
          useRefreshTokens
          cacheLocation="localstorage"
          onRedirectCallback={() => (window.location.href = 'http://localhost:3000/')}
        >
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<VoteWidget {...widgetProps} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </Auth0Provider>
      );
    } else if (isOktaProvider(provider)) {
      if (!isOktaAuth(authProviderResult)) {
        console.warn('Invalid Okta configuration, falling back to login');
        root.render(
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<VoteWidget {...widgetProps} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        );
        return;
      }
      const oktaAuthInstance = authProviderResult as OktaAuth;
      widgetProps.authProvider = oktaAuthInstance;
      console.log('Okta configuration:', oktaAuthInstance);
      if (window.location.search.includes('code=')) {
        oktaAuthInstance.token.parseFromUrl().then((tokenResponse) => {
          if (tokenResponse.tokens.accessToken) oktaAuthInstance.tokenManager.add('accessToken', tokenResponse.tokens.accessToken);
          if (tokenResponse.tokens.idToken) oktaAuthInstance.tokenManager.add('idToken', tokenResponse.tokens.idToken);
          if (tokenResponse.tokens.refreshToken) oktaAuthInstance.tokenManager.add('refreshToken', tokenResponse.tokens.refreshToken);
          console.log('Okta redirect callback completed');
          renderOktaApp(oktaAuthInstance, partnerId, campaignCode);
        }).catch((err) => console.error('Okta redirect error:', err));
      } else {
        renderOktaApp(oktaAuthInstance, partnerId, campaignCode);
      }
    } else if (isAzureProvider(provider)) {
      if (!isMsalInstance(authProviderResult) && !isSamlProviderConfig(authProviderResult)) {
        console.warn('Invalid Azure configuration, falling back to login');
        root.render(
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<VoteWidget {...widgetProps} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        );
        return;
      }
      if (isMsalInstance(authProviderResult)) {
        const msalInstance = authProviderResult as PublicClientApplication;
        widgetProps.authProvider = msalInstance;
        console.log('MSAL configuration:', msalInstance);
        root.render(
          <MsalProvider instance={msalInstance}>
            <BrowserRouter>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<VoteWidget {...widgetProps} />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </AppLayout>
            </BrowserRouter>
          </MsalProvider>
        );
      } else if (isSamlProviderConfig(authProviderResult)) {
        console.log('SAML configuration:', authProviderResult);
        root.render(
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<VoteWidget {...widgetProps} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        );
      }
    } else if (isShibbolethProvider(provider)) {
      console.log('Shibboleth (SAML) provider selected');
      root.render(
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<VoteWidget {...widgetProps} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      );
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (err) {
    console.error('Render error:', {
      message: (err as Error).message,
      stack: (err as Error).stack,
      provider,
      authProviderResult,
    });
    root.render(<div>Error initializing app: {(err as Error).message}</div>);
  }
};

const renderOktaApp = (oktaAuth: OktaAuth, partnerId?: string, campaignCode?: string) => {
  console.log('Rendering Okta app with:', { oktaAuth, partnerId, campaignCode });
  const widgetProps: VoteWidgetProps = {
    provider: 'okta',
    authProvider: oktaAuth,
    partnerId,
    campaignCode,
  };
  root.render(
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<VoteWidget {...widgetProps} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

const renderWithDelay = () => {
  setTimeout(() => {
    const { provider, partnerId, campaignCode } = getProviderConfig();
    console.log('Selected provider:', provider);
    let authProviderResult: SamlProviderConfig | Auth0Config | OktaAuth | PublicClientApplication | null;
    try {
      authProviderResult = authConfigHandler(provider);
      if (!authProviderResult) throw new Error(`No auth config for ${provider}`);
    } catch (error) {
      console.error(`Failed to initialize auth provider for ${provider}:`, error);
      authProviderResult = null;
    }
    renderApp(authProviderResult, provider, partnerId, campaignCode);
  }, 100);
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  renderWithDelay();
} else {
  document.addEventListener('DOMContentLoaded', renderWithDelay);
}