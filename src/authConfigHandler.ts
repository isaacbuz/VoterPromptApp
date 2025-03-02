// src/authConfigHandler.ts
import OktaAuth from '@okta/okta-auth-js';
import authConfig from './auth_config.json';
import { Provider } from './types';

type Auth0Config = { domain: string; clientId: string; redirectUri: string; scopes: string[] };
type AzureConfig = { clientId: string; authority: string; redirectUri: string; scopes: string[] };
type OktaConfig = OktaAuth;

const getAuthProvider = (provider: Provider): Auth0Config | AzureConfig | OktaConfig => {
  const { okta, auth0, azure } = authConfig;

  if (provider === 'auth0') {
    return {
      domain: auth0.domain,
      clientId: auth0.clientId,
      redirectUri: 'http://127.0.0.1:3000',
      scopes: ['openid', 'profile', 'email'],
    };
  }

  if (provider === 'okta') {
    return new OktaAuth({
      clientId: okta.clientId,
      issuer: okta.domain, // Ensure this is your Okta issuer (e.g., https://dev-40855217.okta.com/oauth2/default)
      redirectUri: 'http://127.0.0.1:3000', // Exact match with Okta
      scopes: ['openid', 'profile', 'email'],
      pkce: true,
    });
  }

  if (provider === 'azure') {
    return {
      clientId: azure.clientId,
      authority: `https://login.microsoftonline.com/${azure.tenantId}`,
      redirectUri: azure.redirectUri,
      scopes: ['openid', 'profile', 'email'],
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
};

export default getAuthProvider;
