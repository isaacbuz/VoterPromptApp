import React, { useEffect, useState } from 'react';
import { Provider } from './types/types';
import './style.css';

interface VoteWidgetProps {
  provider: Provider;
  partnerId?: string;
  campaignCode?: string;
}

const VoteWidget: React.FC<VoteWidgetProps> = ({ provider, partnerId, campaignCode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
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
    } catch (error) {
      console.error('Failed to open voter prompt:', error);
      alert('Unable to redirect to voter prompt. Please allow popups.');
    }
  };

  useEffect(() => {
    const checkAuthentication = async () => {
      setAuthChecked(false); // Reset authChecked during re-check
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
            setForceLogin(false); // Allow login screen only if forced
          } else {
            console.log('Invalid user data, prompting login if forced');
            setIsAuthenticated(false);
            setUserInfo(null);
            // Keep forceLogin as is unless explicitly set
          }
        } else {
          console.log('User not authenticated or server error, prompting login if forced');
          setIsAuthenticated(false);
          setUserInfo(null);
          // Keep forceLogin as is unless explicitly set
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        // Only force login if initial check fails and no prior authentication
        if (!isAuthenticated) setForceLogin(true);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuthentication();
  }, [provider, window.location.search]); // Re-run on provider change or redirect

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
        setForceLogin(true); // Force login after logout
        console.log('Logout successful, prompting login');
      })
      .catch((error) => {
        console.error('Logout failed:', error);
        setForceLogin(true);
      });
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
    <div className="app-container" style={{ backgroundColor: '#f0f0f0', padding: '20px', textAlign: 'center' }}>
      <h1 style={{ color: 'black' }}>Welcome to <span style={{ color: 'red' }}>MyOrgApp</span></h1>
      <p style={{ color: 'gray' }}>This is the main content area!</p>
      {userInfo && (
        <p style={{ color: 'gray' }}>Welcome, {userInfo.email}!</p>
      )}
      <button className="logout-button" onClick={handleLogout} style={{ marginTop: '10px' }}>
        Logout
      </button>
    </div>
  );
};

export default VoteWidget;