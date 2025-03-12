import React, { useEffect, useState } from 'react';
import { Provider } from './types';
import './style.css';

interface VoteWidgetProps {
  provider: Provider;
  authProvider?: any;
  partnerId?: string;
  campaignCode?: string;
}

const CbVoteWidget: React.FC<VoteWidgetProps> = ({ provider, partnerId, campaignCode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showVoterPopup, setShowVoterPopup] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [forceLogin, setForceLogin] = useState(false); // Only force login after explicit logout

  const redirect = () => {
    const effectivePartnerId = partnerId || '123456';
    const effectiveCampaignCode = campaignCode || '654321';
    const url = `https://register.vote.org/?partnerId=${effectivePartnerId}&campaignCode=${effectiveCampaignCode}`;
    console.log('Redirecting to vote.org:', url);
    try {
      const newWindow = window.open(url, '_blank');
      if (!newWindow || newWindow.closed) {
        console.error('Popup blocked: Please allow popups for this site');
        alert('Popup blocked. Please allow popups to redirect to the voter registration page.');
      }
      setShowVoterPopup(false);
    } catch (error) {
      console.error('Failed to open voter prompt:', error);
      alert('Unable to redirect to voter prompt. Please allow popups.');
    }
  };

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        console.log('Checking authentication with /profile');
        const res = await fetch('http://localhost:3001/profile', { 
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        console.log('Response status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('Response data:', data);
          if (data.user && data.user.email) {
            console.log('User authenticated:', data.user);
            setIsAuthenticated(true);
            setUserInfo(data.user);
            setShowVoterPopup(true);
            setForceLogin(false); // Don't force login if user is authenticated
          } else {
            console.log('Invalid user data, prompting login');
            setIsAuthenticated(false);
            setUserInfo(null);
            setShowVoterPopup(false);
            setForceLogin(true);
          }
        } else {
          console.log('User not authenticated, prompting login');
          setIsAuthenticated(false);
          setUserInfo(null);
          setShowVoterPopup(false);
          setForceLogin(true);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        console.log('Forcing redirect to login due to fetch failure');
        setForceLogin(true);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuthentication();
  }, [provider]);

  const handleLogin = () => {
    console.log('Login button clicked');
    console.log(`Attempting redirect to login with provider: ${provider}`);
    const loginUrl = `http://localhost:3001/login/${provider}`;
    console.log('Redirect URL:', loginUrl);
    try {
      window.location.href = loginUrl;
      console.log('Redirect initiated');
    } catch (error) {
      console.error('Redirect failed:', error);
      // Fallback redirect
      setTimeout(() => {
        if (window.location.href !== loginUrl) {
          console.log('Fallback redirect attempt');
          window.location.href = loginUrl;
        }
      }, 100);
    }
  };

  const handleLogout = () => {
    console.log('Logging out');
    fetch('http://localhost:3001/logout', { credentials: 'include' })
      .then(() => {
        setIsAuthenticated(false);
        setUserInfo(null);
        setShowVoterPopup(false);
        setForceLogin(true);
        console.log('Logout successful, prompting login');
      })
      .catch((error) => {
        console.error('Logout failed:', error);
        setForceLogin(true);
      });
  };

  const closeVoterPopup = () => {
    setShowVoterPopup(false);
  };

  if (!authChecked) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated || forceLogin) {
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
        <h1>Voter Registration Widget</h1>
        {userInfo && (
          <div className="user-info">
            <p>Welcome, {userInfo.email || 'User'}!</p>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>

      {showVoterPopup && (
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

export default CbVoteWidget;