import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './cb-vote-widget';
import { Auth0Provider } from '@auth0/auth0-react';
import { MsalProvider } from '@azure/msal-react';
import OktaAuth, { TokenResponse } from '@okta/okta-auth-js';
import { PublicClientApplication } from '@azure/msal-browser';
import getAuthProvider from './authConfigHandler';
import { Provider } from './types';

interface SamlProviderConfig {
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  idpCertPath: string;
  privateKeyPath: string;
  spCertPath: string;
}

interface OidcProviderConfig {
  domain?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  tenantId?: string;
  scopes?: string[];
  authority?: string;
}

// Type guards for authProviderResult
const isOidcProviderConfig = (result: SamlProviderConfig | OidcProviderConfig | OktaAuth | PublicClientApplication | null): result is OidcProviderConfig => {
  return result !== null && 'clientId' in result && 'redirectUri' in result && !('loginRedirect' in result);
};

const isOktaAuth = (result: SamlProviderConfig | OidcProviderConfig | OktaAuth | PublicClientApplication | null): result is OktaAuth => {
  return result instanceof OktaAuth;
};

const isMsalInstance = (result: SamlProviderConfig | OidcProviderConfig | OktaAuth | PublicClientApplication | null): result is PublicClientApplication => {
  return result instanceof PublicClientApplication;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app">
    <nav>
      <ul>
        <li><a href="#">Demo</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">Locations</a></li>
        <li><a href="#">Contact Us</a></li>
      </ul>
    </nav>
    <main>{children}</main>
  </div>
);

const getProviderConfig = (): { provider: Provider; partnerId?: string; campaignCode?: string } => {
  const cbVoteElement = document.querySelector('cb-vote');
  const provider = (cbVoteElement?.getAttribute('provider') || 'azure') as Provider; // Default to 'azure'
  const partnerId = cbVoteElement?.getAttribute('partnerid') || undefined;
  const campaignCode = cbVoteElement?.getAttribute('campaigncode') || undefined;
  return { provider, partnerId, campaignCode };
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
const root = createRoot(rootElement);

const renderApp = () => {
  try {
    const { provider, partnerId, campaignCode } = getProviderConfig();
    console.log('Rendering with provider:', provider);
    let authProviderResult;
    try {
      authProviderResult = getAuthProvider(provider);
      if (!authProviderResult) throw new Error(`No auth config for ${provider}`);
    } catch (error) {
      console.error(`Failed to initialize auth provider for ${provider}:`, error);
      authProviderResult = null; // Fallback to null
    }

    const isAuth0Provider = (p: Provider): p is 'auth0' => p === 'auth0';
    const isOktaProvider = (p: Provider): p is 'okta' => p === 'okta';
    const isAzureProvider = (p: Provider): p is 'azure' => p === 'azure';
    const isShibbolethProvider = (p: Provider): p is 'shibboleth' => p === 'shibboleth';

    if (isAuth0Provider(provider)) {
      if (!isOidcProviderConfig(authProviderResult)) {
        console.warn('Invalid Auth0 configuration, falling back to login');
        root.render(
          <Router>
            <AppLayout>
              <Routes>
                <Route path="/" element={<App provider={provider} authProvider={null} partnerId={partnerId} campaignCode={campaignCode} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppLayout>
          </Router>
        );
        return;
      }
      const authConfig = authProviderResult;
      root.render(
        <Auth0Provider
          domain={authConfig.domain || ''}
          clientId={authConfig.clientId}
          authorizationParams={{ redirect_uri: authConfig.redirectUri, scope: authConfig.scopes?.join(' ') || '' }}
          useRefreshTokens
          cacheLocation="localstorage"
          onRedirectCallback={() => window.location.href = '/'}
        >
          <Router>
            <AppLayout>
              <Routes>
                <Route path="/" element={<App provider={provider} partnerId={partnerId} campaignCode={campaignCode} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppLayout>
          </Router>
        </Auth0Provider>
      );
    } else if (isOktaProvider(provider)) {
      if (!isOktaAuth(authProviderResult)) {
        console.warn('Invalid Okta configuration, falling back to login');
        root.render(
          <Router>
            <AppLayout>
              <Routes>
                <Route path="/" element={<App provider={provider} authProvider={null} partnerId={partnerId} campaignCode={campaignCode} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppLayout>
          </Router>
        );
        return;
      }
      const oktaAuth = authProviderResult;
      if (window.location.search.includes('code=')) {
        oktaAuth.token.parseFromUrl().then((tokenResponse: TokenResponse) => {
          if (tokenResponse.tokens?.accessToken) oktaAuth.tokenManager.add('accessToken', tokenResponse.tokens.accessToken);
          if (tokenResponse.tokens?.idToken) oktaAuth.tokenManager.add('idToken', tokenResponse.tokens.idToken);
          if (tokenResponse.tokens?.refreshToken) oktaAuth.tokenManager.add('refreshToken', tokenResponse.tokens.refreshToken);
          console.log('Okta redirect callback completed');
          renderOktaApp(oktaAuth, partnerId, campaignCode);
        }).catch(err => console.error('Okta redirect error:', err));
      } else {
        renderOktaApp(oktaAuth, partnerId, campaignCode);
      }
    } else if (isAzureProvider(provider)) {
      if (!isMsalInstance(authProviderResult)) {
        console.warn('Invalid Azure configuration, falling back to login');
        root.render(
          <Router>
            <AppLayout>
              <Routes>
                <Route path="/" element={<App provider={provider} authProvider={null} partnerId={partnerId} campaignCode={campaignCode} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppLayout>
          </Router>
        );
        return;
      }
      const msalInstance = authProviderResult;
      root.render(
        <MsalProvider instance={msalInstance}>
          <Router>
            <AppLayout>
              <Routes>
                <Route path="/" element={<App provider={provider} authProvider={msalInstance} partnerId={partnerId} campaignCode={campaignCode} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AppLayout>
          </Router>
        </MsalProvider>
      );
    } else if (isShibbolethProvider(provider)) {
      root.render(
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/" element={<App provider={provider} partnerId={partnerId} campaignCode={campaignCode} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AppLayout>
        </Router>
      );
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (err: any) {
    console.error('Render error:', err);
    root.render(<div>Error initializing app: {err.message}</div>);
  }
};

const renderOktaApp = (oktaAuth: OktaAuth, partnerId?: string, campaignCode?: string) => {
  root.render(
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<App provider="okta" authProvider={oktaAuth} partnerId={partnerId} campaignCode={campaignCode} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppLayout>
    </Router>
  );
};

const renderWithDelay = () => {
  setTimeout(() => {
    const { provider } = getProviderConfig();
    console.log('Selected provider:', provider);
    renderApp();
  }, 100);
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  renderWithDelay();
} else {
  document.addEventListener('DOMContentLoaded', renderWithDelay);
}