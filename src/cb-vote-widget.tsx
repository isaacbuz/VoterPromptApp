import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useIsAuthenticated, useAccount, useMsal } from '@azure/msal-react'; // Azure AD
import './style.css';

type AppProps = {
  provider: 'okta' | 'auth0' | 'azure';
  authProvider?: any; // Used for Okta and Azure
};

const App: React.FC<AppProps> = ({ provider, authProvider }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Auth0 Logic
  const {
    isAuthenticated: auth0IsAuthenticated,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();

  // Azure AD Logic
  const isAzureAuthenticated = useIsAuthenticated();
  const { accounts } = useMsal();

  // Redirect Function
  const redirect = () => {
    const partnerId = '123456';
    const campaignCode = '654321';
    let url = 'https://register.vote.org/';
    if (partnerId || campaignCode) {
      url += '?';
      if (partnerId) url += `partnerId=${partnerId}`;
      if (campaignCode) url += `&campaignCode=${campaignCode}`;
    }
    window.location.href = url;
  };

  // Okta Authentication Check
  useEffect(() => {
    if (provider === 'okta' && authProvider) {
      const checkOktaAuthentication = async () => {
        try {
          if (window.location.search.includes('code=')) {
            await authProvider.handleRedirect();
          }

          const isOktaAuthenticated = await authProvider.isAuthenticated();
          setIsAuthenticated(isOktaAuthenticated);
          setShowLoginPopup(!isOktaAuthenticated);

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

  // Auth0 Authentication Check
  useEffect(() => {
    if (provider === 'auth0') {
      setAuthChecked(false);
      if (auth0IsAuthenticated) {
        setIsAuthenticated(true);
        setUserInfo(auth0User);
        setShowLoginPopup(false);
      }
      setAuthChecked(true);
    }
  }, [provider, auth0IsAuthenticated, auth0User]);

  // Azure AD Authentication Check
  useEffect(() => {
    if (provider === 'azure') {
      setIsAuthenticated(isAzureAuthenticated);
      setUserInfo(accounts.length ? accounts[0] : null);
      setShowLoginPopup(!isAzureAuthenticated);
      setAuthChecked(true);
    }
  }, [provider, isAzureAuthenticated, accounts]);

  const handleLogin = async () => {
    setShowLoginPopup(false);
    if (provider === 'auth0') {
      await loginWithRedirect();
    } else if (provider === 'okta' && authProvider) {
      await authProvider.signInWithRedirect();
    } else if (provider === 'azure' && authProvider) {
      const { instance } = authProvider;
      await instance.loginRedirect();
    }
  };

  const handleLogout = async () => {
  try {
    if (provider === 'auth0') {
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    } else if (provider === 'okta' && authProvider) {
      console.log('Starting Okta logout process...');

      // Get the Okta auth client
      const authClient = authProvider;

      // Step 1: Obtain the signout redirect URL
      const signoutRedirectUrl = authClient.getSignOutRedirectUrl({
        postLogoutRedirectUri: window.location.origin,
        clientId: authProvider.options.clientId,
      });
      console.log('Okta Sign-Out Redirect URL:', signoutRedirectUrl);

      // Step 2: Revoke tokens (optional but recommended)
      await authClient.revokeRefreshToken(); // Revoke refresh token if offline_access scope was granted
      await authClient.revokeAccessToken();  // Revoke access token
      console.log('Tokens revoked successfully.');

      // Step 3: Clear local session
      await authClient.tokenManager.clear(); // Clear tokens stored locally
      console.log('Tokens cleared from Okta tokenManager.');

      // Step 4: Redirect the user to the Okta logout endpoint
      window.location.href = signoutRedirectUrl;
    } else if (provider === 'azure' && authProvider) {
      const { instance } = authProvider;
      await instance.logoutRedirect();
    }

    // Reset application state (common for all providers)
    setIsAuthenticated(false);
    setUserInfo(null);
    setShowLoginPopup(true);
    setAuthChecked(true);
    console.log('Application state reset after logout.');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};


  if (!authChecked) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app-container">
      {showLoginPopup && !isAuthenticated && (
        <div className="popup-container">
          <div className="popup-content">
            <h2>Login to Continue</h2>
            <button onClick={handleLogin}>Login</button>
          </div>
        </div>
      )}
      {!showLoginPopup && isAuthenticated && (
        <div className="voter-widget-container">
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
      )}
      {isAuthenticated && userInfo && (
        <div className="user-info">
          <p>Welcome, {userInfo?.name || userInfo?.nickname || 'User'}!</p>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
