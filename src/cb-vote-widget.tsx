import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useIsAuthenticated, useAccount, useMsal } from '@azure/msal-react';
import './style.css';

type AppProps = {
  provider: 'okta' | 'auth0' | 'azure';
  authProvider?: any;
  partnerId?: string;
  campaignCode?: string;
};

// Define AppState type for Auth0
interface AppState {
  returnTo?: string;
  // Add other state properties if needed
}

const App: React.FC<AppProps> = ({ provider, authProvider, partnerId, campaignCode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showVoterPopup, setShowVoterPopup] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const {
    isAuthenticated: auth0IsAuthenticated,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();

  const isAzureAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();

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
    setShowVoterPopup(false); // Close the modal after clicking
  };

  useEffect(() => {
    if (provider === 'okta' && authProvider) {
      const checkOktaAuthentication = async () => {
        try {
          if (window.location.search.includes('code=')) {
            await authProvider.handleRedirect();
          }
          const isOktaAuthenticated = await authProvider.isAuthenticated();
          setIsAuthenticated(isOktaAuthenticated);
          setShowVoterPopup(isOktaAuthenticated); // Show modal immediately on login
          if (isOktaAuthenticated) {
            const user = await authProvider.getUser();
            setUserInfo(user);
          }
        } catch (err) {
          console.error('Error during Okta authentication:', err);
        } finally {
          setAuthChecked(true);
        }
      };
      checkOktaAuthentication();
    }
  }, [provider, authProvider]);

  useEffect(() => {
    if (provider === 'auth0') {
      setAuthChecked(false);
      if (auth0IsAuthenticated) {
        setIsAuthenticated(true);
        setUserInfo(auth0User);
        setShowVoterPopup(true); // Show modal immediately on login
      }
      setAuthChecked(true);
    }
  }, [provider, auth0IsAuthenticated, auth0User]);

  useEffect(() => {
    if (provider === 'azure') {
      setIsAuthenticated(isAzureAuthenticated);
      setUserInfo(accounts.length ? accounts[0] : null);
      setShowVoterPopup(isAzureAuthenticated); // Show modal immediately on login
      setAuthChecked(true);
    }
  }, [provider, isAzureAuthenticated, accounts]);

  const handleLogin = async () => {
    try {
      if (provider === 'auth0') {
        await loginWithRedirect({
          appState: {
            returnTo: window.location.pathname, // Optional: return to current path after login
          },
          // Do not specify redirectUri here; it’s handled by Auth0Provider
        });
      } else if (provider === 'okta' && authProvider) {
        await authProvider.signInWithRedirect();
      } else if (provider === 'azure' && authProvider) {
        const { instance } = authProvider;
        await instance.loginRedirect();
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      if (provider === 'auth0') {
        auth0Logout({ logoutParams: { returnTo: 'http://127.0.0.1:3000' } });
      } else if (provider === 'okta' && authProvider) {
        const authClient = authProvider;
        const signoutRedirectUrl = authClient.getSignOutRedirectUrl({
          postLogoutRedirectUri: 'http://127.0.0.1:3000',
          clientId: authProvider.options.clientId,
        });
        await authClient.revokeRefreshToken();
        await authClient.revokeAccessToken();
        await authClient.tokenManager.clear();
        window.location.href = signoutRedirectUrl;
      } else if (provider === 'azure' && authProvider) {
        const { instance } = authProvider;
        await instance.logoutRedirect();
      }
      setIsAuthenticated(false);
      setUserInfo(null);
      setShowVoterPopup(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const closeVoterPopup = () => {
    setShowVoterPopup(false);
  };

  if (!authChecked) {
    return <div className="loading">Loading...</div>;
  }

  const titleStyle: React.CSSProperties = {
    color: 'red',
  };

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
          Welcome to<span style={titleStyle}>MyOrgApp</span>
        </h1>
        <p>This is the main content area!</p>
        {isAuthenticated && userInfo && (
          <div className="user-info">
            <p>Welcome, {userInfo?.name || userInfo?.nickname || 'User'}!</p>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>

      {isAuthenticated && showVoterPopup && (
        <div className="popup-overlay">
          <div className="voter-popup-container">
            <button className="close-button" onClick={closeVoterPopup}>
              X
            </button>
            <div className="voter-widget-header">You can register to vote.</div>
            <div className="voter-widget-image">
              <img src="/assets/y.svg" alt="Voter Registration" />
            </div>
            <div className="voter-widget-footer">It only takes two minutes.</div>
            <div className="voter-button-container">
              <button
                className="voter-button voter-button-primary"
                onClick={redirect}
                aria-label="Register to vote"
              >
                Register to Vote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
