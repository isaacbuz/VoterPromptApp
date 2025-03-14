import { OktaAuth } from '@okta/okta-auth-js';
import { PublicClientApplication } from '@azure/msal-browser';
import config from './auth_config.json';
import { AuthConfig } from './custom';
import { AuthProviderConfig } from './authProviders/authProvider';

// Define Auth0 configuration structure
interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  authority: string;
}

// Define Okta configuration structure
interface OktaConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes?: string[];
  [key: string]: any;
}

// ✅ Get the authentication provider
export const getAuthProvider = (provider: string): Auth0Config | OktaAuth | PublicClientApplication | any => {
  const { protocol, samlProviders, oidcProviders } = config as AuthConfig;

  // Determine if using SAML or OIDC
  const useSaml = protocol === 'SAML' && samlProviders?.[provider];
  const useOidc = protocol === 'OIDC' && oidcProviders?.[provider];

  switch (provider) {
    case 'auth0':
      if (useSaml) return samlProviders?.auth0;
      if (useOidc || (!useSaml && oidcProviders?.auth0)) {
        const auth0Config = oidcProviders?.auth0 as AuthProviderConfig;
        if (!auth0Config.clientId || !auth0Config.redirectUri) {
          throw new Error('Auth0 OIDC configuration missing required fields: clientId or redirectUri');
        }
        return {
          domain: auth0Config.domain || '',
          clientId: auth0Config.clientId,
          clientSecret: auth0Config.clientSecret,
          redirectUri: auth0Config.redirectUri,
          scopes: auth0Config.scopes || [],
          authority: auth0Config.authority || '',
        } as Auth0Config;
      }
      throw new Error('Auth0 configuration not found in auth_config.json');

    case 'okta':
      if (useSaml) return samlProviders?.okta;
      if (useOidc || (!useSaml && oidcProviders?.okta)) {
        const oktaConfig = oidcProviders?.okta as AuthProviderConfig;
        if (!oktaConfig.clientId || !oktaConfig.redirectUri) {
          throw new Error('Okta OIDC configuration missing required fields: clientId or redirectUri');
        }
        return new OktaAuth({
          issuer: `https://${oktaConfig.domain || ''}/oauth2/default`,
          clientId: oktaConfig.clientId,
          clientSecret: oktaConfig.clientSecret || '',
          redirectUri: oktaConfig.redirectUri,
          scopes: oktaConfig.scopes || ['openid', 'profile', 'email'],
        });
      }
      throw new Error('Okta configuration not found in auth_config.json');

    case 'azure':
      if (useSaml) return samlProviders?.azure;
      if (useOidc || (!useSaml && oidcProviders?.azure)) {
        const azureConfig = oidcProviders?.azure as AuthProviderConfig;
        if (!azureConfig.clientId || !azureConfig.redirectUri || !azureConfig.tenantId) {
          throw new Error('Azure OIDC configuration missing required fields: clientId, redirectUri, or tenantId');
        }
        try {
          return new PublicClientApplication({
            auth: {
              clientId: azureConfig.clientId,
              authority: azureConfig.authority || `https://login.microsoftonline.com/${azureConfig.tenantId}`,
              redirectUri: azureConfig.redirectUri,
            },
            cache: {
              cacheLocation: 'localStorage',
            },
          });
        } catch (error) {
          throw new Error(`Azure OIDC initialization failed: ${(error as Error).message}`);
        }
      }
      throw new Error('Azure configuration not found in auth_config.json');

    case 'shibboleth':
      if (useSaml) return samlProviders?.shibboleth;
      throw new Error('Shibboleth configuration not found in auth_config.json');

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

// ✅ Get all authentication configurations
export const getAllConfig = (): AuthConfig => config as AuthConfig;

// ✅ Get provider-specific configuration
export const getProviderConfig = (provider: string): any => {
  const { samlProviders, oidcProviders } = config as AuthConfig;
  return samlProviders?.[provider] || oidcProviders?.[provider];
};

export default getAuthProvider;
