import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

const OktaCallback = () => {
  const { handleRedirectCallback, isAuthenticated, error } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Processing authentication callback...');
        await handleRedirectCallback();
        console.log('Authenticated:', isAuthenticated);

        if (isAuthenticated) {
          navigate('/'); // Redirect to home or desired page
        }
      } catch (error) {
        console.error('Error during callback:', error);
      }
    };

    handleCallback();
  }, [handleRedirectCallback, isAuthenticated, navigate]);

  return (
    <div>
      {error ? (
        <div>Error: {error.message}</div>
      ) : (
        <div>Processing authentication...</div>
      )}
    </div>
  );
};

export default OktaCallback;
