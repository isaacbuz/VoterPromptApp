import React, { useState, useEffect } from 'react';
import authConfig from './auth_config.json';
import './style.css';
import { PublicClientApplication } from '@azure/msal-browser'; // For Azure MSAL
import { OktaAuth } from '@okta/okta-auth-js'; // For Okta, if used

interface VoteWidgetProps {
  provider?: string;
  partnerId?: string;
  campaignCode?: string;
  onLogin?: () => void;
  authProvider?: PublicClientApplication | OktaAuth; // Add optional authProvider
}

const VoteWidget: React.FC<VoteWidgetProps> = ({
  provider = authConfig.provider || 'azure',
  partnerId = authConfig.partnerId || 'partner123',
  campaignCode = authConfig.campaignCode || 'campaign456',
  onLogin,
  authProvider, // Accept authProvider
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showVoterPrompt, setShowVoterPrompt] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('VoteWidget mounted, checking login status');
    const checkLoginStatus = async () => {
      try {
        const response = await fetch('/profile', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        console.log('Profile data:', data);
        if (data.loggedIn) {
          setIsLoggedIn(true);
          setUser(data.user);
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('voterPrompt') === 'true') {
            console.log('Voter prompt triggered via query param');
            setShowVoterPrompt(true);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          setIsLoggedIn(false);
          setUser(null);
          setShowVoterPrompt(false);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError('Unable to check login status');
      }
    };
    checkLoginStatus();
  }, []);

  const handleLogin = () => {
    console.log(`Initiating login with provider: ${provider}, redirecting to /login/${provider}`);
    if (onLogin) return onLogin();
    if (authProvider) {
      // Handle OIDC login if authProvider is provided (e.g., MSAL or Okta)
      if (provider === 'azure' && authProvider instanceof PublicClientApplication) {
        authProvider.loginPopup().catch((err) => console.error('Login error:', err));
      } else if (provider === 'okta' && authProvider instanceof OktaAuth) {
        authProvider.signInWithRedirect().catch((err) => console.error('Login error:', err));
      }
    } else {
      window.location.href = `/login/${provider}`;
    }
  };

  const handleLogout = () => {
    console.log('Logging out user');
    window.location.href = '/logout';
  };

  const handleRegister = () => {
    console.log('Opening voter registration URL');
    window.open(`https://register.vote.org/?partnerId=${partnerId}&campaignCode=${campaignCode}`, '_blank');
  };

  const closeVoterPrompt = () => {
    console.log('Closing voter prompt');
    setShowVoterPrompt(false);
  };

  return (
    <div className="background-page">
      {error && <p className="error">{error}</p>}
      {!isLoggedIn ? (
        <button className="login-button" onClick={handleLogin}>
          Login with {provider.charAt(0).toUpperCase() + provider.slice(1)}
        </button>
      ) : (
        <div className="user-info">
          <p className="voter-widget-header">Welcome, {user?.name || user?.email}!</p>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
          {showVoterPrompt && (
            <div className="popup-overlay">
              <div className="voter-popup-container">
                <h2>Voter Registration</h2>
                <p>Are you registered to vote?</p>
                <button className="voter-button-primary" onClick={handleRegister}>
                  Register to Vote
                </button>
                <button className="close-button" onClick={closeVoterPrompt}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoteWidget;