import React from 'react';
import { createRoot } from 'react-dom/client';
import VoteWidget from './cb-vote-widget';
import { PublicClientApplication } from '@azure/msal-browser';
import { OktaAuth } from '@okta/okta-auth-js';
import authConfig from './auth_config.json';
import r2wc from '@r2wc/react-to-web-component';

// Azure MSAL Configuration
const msalConfig = {
  auth: {
    clientId: (authConfig as any).oidcProviders.azure.clientId || '7c41c780-b9db-43df-950d-bf1feabb27a8',
    authority: `https://login.microsoftonline.com/${(authConfig as any).oidcProviders.azure.tenantId || '9e0ab446-dd79-4d10-a90d-d405048204c9'}`,
    redirectUri: (authConfig as any).oidcProviders.azure.redirectUri || 'http://localhost:3001/login/callback',
  },
};
const msalInstance = new PublicClientApplication(msalConfig);

// Okta Configuration
const oktaConfig = (authConfig as any).oidcProviders.okta || {
  domain: 'https://dev-40855217.okta.com',
  clientId: '0oanhs57lchFwU7v15d7',
  redirectUri: 'http://localhost:3001/login/callback',
};
const oktaAuth = new OktaAuth({
  issuer: `${oktaConfig.domain}/oauth2/default`,
  clientId: oktaConfig.clientId,
  redirectUri: oktaConfig.redirectUri,
});

// Register <cb-vote> as a Web Component
const CbVote = r2wc(VoteWidget, {
  props: {
    provider: 'string',
    partnerId: 'string',
    campaignCode: 'string',
    authProvider: 'json',
  },
}) as any; // Cast to any to bypass type issues
customElements.define('cb-vote', CbVote);

// Render the React app
const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    {/* Azure SAML */}
    <VoteWidget provider="azure" partnerId="partner123" campaignCode="campaign456" />
    {/* Azure OIDC */}
    <VoteWidget
      provider="azure"
      partnerId="partner123"
      campaignCode="campaign456"
      authProvider={msalInstance}
    />
    {/* Okta OIDC */}
    <VoteWidget
      provider="okta"
      partnerId="partner123"
      campaignCode="campaign456"
      authProvider={oktaAuth}
    />
  </React.StrictMode>
);