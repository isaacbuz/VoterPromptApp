import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import OktaAuth from '@okta/okta-auth-js';
import { PublicClientApplication } from '@azure/msal-browser';
import './style.css';

// Define AuthProvider type to support OIDC providers
type AuthProvider = {
  instance?: PublicClientApplication; // For Azure MSAL
  oktaAuth?: OktaAuth; // For Okta
};

type AppProps = {
  provider: 'auth0' | 'okta' | 'azure' | 'shibboleth';
  partnerId?: string;
  campaignCode?: string;
  authProvider?: AuthProvider; // For OIDC providers
  onLogin?: () => void; // For SAML providers
};

const App: React.FC<AppProps> = ({ provider, partnerId, campaignCode, authProvider, onLogin }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showVoterPopup, setShowVoterPopup] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const { isAuthenticated: auth0IsAuthenticated, user: auth0User, loginWithRedirect, logout: auth0Logout } = useAuth0();

  const redirect = () => {
    const effectivePartnerId = partnerId || '123456';
    const effectiveCampaignCode = campaignCode || '654321';
    let url = 'https://register.vote.org/';
    if (effectivePartnerId || effectiveCampaignCode) {
      url += '?';
      if (effectivePartnerId) url += `partnerId=${effectivePartnerId}`;
      if (effectiveCampaignCode) url += `&campaignCode=${effectiveCampaignCode}`;
    }
    window.open(url, '_blank');
    setShowVoterPopup(false);
  };

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        if (provider === 'auth0' || provider === 'okta' || provider === 'azure') {
          // Handle OIDC authentication
          if (provider === 'auth0' && auth0IsAuthenticated) {
            setUserInfo(auth0User);
            setIsAuthenticated(true);
            setShowVoterPopup(true);
          } else if (provider === 'okta' && authProvider?.oktaAuth) {
            const isAuthenticatedOkta = await authProvider.oktaAuth.isAuthenticated();
            if (isAuthenticatedOkta) {
              const user = await authProvider.oktaAuth.getUser();
              setUserInfo(user);
              setIsAuthenticated(true);
              setShowVoterPopup(true);
            }
          } else if (provider === 'azure' && authProvider?.instance) {
            const accounts = authProvider.instance.getAllAccounts();
            if (accounts.length > 0) {
              const response = await authProvider.instance.acquireTokenSilent({
                scopes: ['openid', 'profile', 'email'],
                account: accounts[0],
              });
              setUserInfo(response.account);
              setIsAuthenticated(true);
              setShowVoterPopup(true);
            }
          }
        } else if (isSamlProvider(provider as any)) {
          // Handle SAML authentication via proxy
          const response = await fetch('http://localhost:3001/auth/status');
          const data = await response.json();
          if (data.token) {
            setIsAuthenticated(true);
            setUserInfo({ email: data.email, name: data.name });
            setShowVoterPopup(true);
          } else {
            console.warn('No authentication token received from SAML proxy');
          }
        }
      } catch (err) {
        console.error(`Authentication check error for provider ${provider}:`, err);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuthentication();
  }, [provider, auth0IsAuthenticated, auth0User, authProvider]);

  const handleLogin = () => {
    if (provider === 'auth0') {
      loginWithRedirect({ appState: { returnTo: window.location.pathname } });
    } else if (provider === 'okta' && authProvider?.oktaAuth) {
      authProvider.oktaAuth.signInWithRedirect();
    } else if (provider === 'azure' && authProvider?.instance) {
      authProvider.instance.loginRedirect({
        scopes: ['openid', 'profile', 'email'],
      });
    } else if (onLogin) {
      onLogin();
    } else {
      console.error('No login handler defined for provider:', provider);
    }
  };

  const handleLogout = () => {
    if (provider === 'auth0') {
      auth0Logout({ logoutParams: { returnTo: 'http://127.0.0.1:3000' } });
    } else if (provider === 'okta' && authProvider?.oktaAuth) {
      authProvider.oktaAuth.signOut();
    } else if (provider === 'azure' && authProvider?.instance) {
      authProvider.instance.logout();
    }
    setIsAuthenticated(false);
    setUserInfo(null);
    setShowVoterPopup(false);
    setAuthChecked(true);
  };

  if (!authChecked) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <h2>Login to continue</h2>
        <button className="login-button" onClick={handleLogin}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="background-page">
        <h1>
          Welcome to<span style={{ color: 'red' }}>MyOrgApp</span>
        </h1>
        <p>This is the main content area!</p>
        {isAuthenticated && userInfo && (
          <div className="user-info">
            <p>Welcome, {userInfo.email || userInfo.name || (userInfo.idTokenClaims?.name) || 'User'}!</p>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>

      {isAuthenticated && showVoterPopup && (
        <div className="popup-overlay">
          <div className="voter-popup-container">
            <button className="close-button" onClick={() => setShowVoterPopup(false)} aria-label="Close voter registration popup">
              ✕
            </button>
            <div className="voter-widget-header">You can register to vote.</div>
            <div className="voter-widget-image">
              {showFallback ? (
                <span>OWN YOUR FUTURE VOTE</span>
              ) : (
                <img
                  src="/assets/ownYourFuture.svg"
                  alt="Own Your Future - Vote"
                  onError={(e) => {
                    console.error('Image load error:', e);
                    setShowFallback(true);
                    console.log('Fallback triggered, showFallback:', true);
                  }}
                  onLoad={() => console.log('Image loaded successfully')}
                />
              )}
              {showFallback && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" width="100" height="40">
                  <rect width="100" height="40" fill="#B22234"/>
                  <path d="M0 0h30v20H0z" fill="#FFFFFF"/>
                  <path d="M0 20h30v20H0z" fill="#3C3B6E"/>
                  <g fill="#FFFFFF">
                    <circle cx="10" cy="10" r="2"/>
                    <circle cx="14" cy="10" r="2"/>
                    <circle cx="18" cy="10" r="2"/>
                  </g>
                </svg>
              )}
            </div>
            <div className="voter-widget-footer">It only takes two minutes.</div>
            <div className="voter-button-container">
              <button className="voter-button voter-button-primary" onClick={redirect} aria-label="Register to vote">
                Register to Vote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const { isSamlProvider } = require('./authConfigHandler');

export default App;