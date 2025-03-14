import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { OktaAuth } from '@okta/okta-auth-js';
import { PublicClientApplication } from '@azure/msal-browser';
import { VoteWidgetProps, Provider } from './types';

interface UserInfo {
  email?: string;
  name?: string;
  [key: string]: any;
}

const VoteWidget: React.FC<VoteWidgetProps> = ({ provider, authProvider, partnerId, campaignCode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [showVoterPopup, setShowVoterPopup] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [forceLogin, setForceLogin] = useState(false);

  const auth0 = provider === 'auth0' ? useAuth0() : null;
  const auth0IsAuthenticated = auth0?.isAuthenticated ?? false;
  const auth0User = auth0?.user;
  const auth0Login = auth0?.loginWithRedirect;
  const auth0Logout = auth0?.logout;

  const msal = provider === 'azure' && authProvider instanceof PublicClientApplication ? useMsal() : null;
  const msalIsAuthenticated = provider === 'azure' && authProvider instanceof PublicClientApplication ? useIsAuthenticated() : false;
  const msalAccounts = msal?.accounts ?? [];

  const oktaAuth = provider === 'okta' && authProvider instanceof OktaAuth ? authProvider : null;

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        if (provider === 'auth0' && auth0) {
          if (auth0IsAuthenticated) {
            setIsAuthenticated(true);
            setUserInfo({ email: auth0User?.email, name: auth0User?.name });
            setShowVoterPopup(true);
            setForceLogin(false);
          } else {
            setIsAuthenticated(false);
            setUserInfo(null);
            setShowVoterPopup(false);
            setForceLogin(true);
          }
        } else if (provider === 'okta' && oktaAuth) {
          const accessToken = await oktaAuth.tokenManager.get('accessToken');
          const idToken = await oktaAuth.tokenManager.get('idToken');
          if (accessToken && idToken) {
            const user = await oktaAuth.token.getUserInfo(accessToken, idToken);
            setIsAuthenticated(true);
            setUserInfo({ email: user.email, name: user.name });
            setShowVoterPopup(true);
            setForceLogin(false);
          } else {
            setIsAuthenticated(false);
            setUserInfo(null);
            setShowVoterPopup(false);
            setForceLogin(true);
          }
        } else if (provider === 'azure' && msal && authProvider instanceof PublicClientApplication) {
          if (msalIsAuthenticated && msalAccounts.length > 0) {
            const account = msalAccounts[0];
            setIsAuthenticated(true);
            setUserInfo({ email: account.username, name: account.name });
            setShowVoterPopup(true);
            setForceLogin(false);
          } else {
            setIsAuthenticated(false);
            setUserInfo(null);
            setShowVoterPopup(false);
            setForceLogin(true);
          }
        } else if (provider === 'shibboleth' || provider === 'azure') {
          const res = await fetch('http://localhost:3001/profile', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Accept': 'application/json' },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user && data.user.email) {
              setIsAuthenticated(true);
              setUserInfo(data.user);
              setShowVoterPopup(true);
              setForceLogin(false);
            } else {
              setIsAuthenticated(false);
              setUserInfo(null);
              setShowVoterPopup(false);
              setForceLogin(true);
            }
          } else {
            setIsAuthenticated(false);
            setUserInfo(null);
            setShowVoterPopup(false);
            setForceLogin(true);
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setForceLogin(true);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuthentication();

    return () => {
      setIsAuthenticated(false);
      setUserInfo(null);
      setShowVoterPopup(false);
      setForceLogin(false);
    };
  }, [provider]);

  const handleLogin = () => {
    if (provider === 'auth0' && auth0Login) {
      auth0Login({ authorizationParams: { redirect_uri: 'http://localhost:3000/' } });
    } else if (provider === 'okta' && oktaAuth) {
      oktaAuth.signInWithRedirect({ originalUri: 'http://localhost:3000/' });
    } else if (provider === 'azure' && msal && authProvider instanceof PublicClientApplication) {
      msal.instance.loginRedirect({ scopes: ['User.Read'], redirectUri: 'http://localhost:3000/' });
    } else {
      window.location.href = `http://localhost:3001/login/${provider}`;
    }
  };

  const handleLogout = () => {
    if (provider === 'auth0' && auth0Logout) {
      auth0Logout({ logoutParams: { returnTo: 'http://localhost:3000/' } });
    } else if (provider === 'okta' && oktaAuth) {
      oktaAuth.signOut({ postLogoutRedirectUri: 'http://localhost:3000/' });
    } else if (provider === 'azure' && msal && authProvider instanceof PublicClientApplication) {
      msal.instance.logoutRedirect({ postLogoutRedirectUri: 'http://localhost:3000/' });
    } else {
      fetch('http://localhost:3001/logout', {
        method: 'GET',
        credentials: 'include',
      })
        .then((res) => {
          if (res.headers.get('X-Logout') === 'true') {
            console.log('Client received logout notification, resetting state');
            setIsAuthenticated(false);
            setUserInfo(null);
            setShowVoterPopup(false);
            setForceLogin(true);
            window.location.href = 'http://localhost:3000/';
          } else if (!res.ok) {
            console.error('Logout failed with status:', res.status);
          }
        })
        .catch((error) => {
          console.error('Logout failed:', error);
          setForceLogin(true);
        });
    }
  };

  const redirect = () => {
    console.log('Redirecting to voter registration...', { partnerId, campaignCode });
  };

  if (!authChecked) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated || forceLogin) {
    return (
      <div className="login-page">
        <h2>Login to continue</h2>
        <button className="login-button" onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="background-page">
        <h1>Voter Registration Widget</h1>
        {userInfo && (
          <div className="user-info">
            <p>Welcome, {userInfo.email || 'User'}!</p>
            <button className="logout-button" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>
      {showVoterPopup && (
        <div className="popup-overlay">
          <div className="voter-popup-container">
            <button className="close-button" onClick={() => setShowVoterPopup(false)}>X</button>
            <div className="voter-widget-header">You can register to vote.</div>
            <div className="voter-widget-title">
              <span>OWN YOUR FUTURE</span>
              <div className="vote-text">
                V<span className="vote-icon"><img src="/assets/y.svg" alt="Vote Icon" /></span>TE
              </div>
            </div>
            <div className="voter-widget-footer">It only takes two minutes.</div>
            <div className="voter-button-container">
              <button className="voter-button voter-button-primary" onClick={redirect} aria-label="Register to vote">
                Register to Vote
              </button>
            </div>
            <div className="voter-widget-info">
              {partnerId && <p>Partner ID: {partnerId}</p>}
              {campaignCode && <p>Campaign Code: {campaignCode}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoteWidget;