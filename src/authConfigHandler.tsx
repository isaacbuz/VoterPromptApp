import { OktaAuth } from '@okta/okta-auth-js';
import { PublicClientApplication } from '@azure/msal-browser';
import config from './auth_config.json';
import { AuthConfig } from './custom.d';
import { AuthProviderConfig } from '../authProviders/authProvider'; // Adjust path if needed

interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  authority: string;
}

interface OktaConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes?: string[];
  [key: string]: any;
}

export const getAuthProvider = (provider: string): Auth0Config | OktaAuth | PublicClientApplication | any => {
  const { samlProviders, oidcProviders } = config as AuthConfig;
  switch (provider) {
    case 'auth0':
      if (samlProviders?.auth0) return samlProviders.auth0;
      if (oidcProviders?.auth0) {
        const auth0Config = oidcProviders.auth0 as AuthProviderConfig;
        console.log('Auth0 config:', auth0Config);
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
      if (samlProviders?.okta) return samlProviders.okta;
      if (oidcProviders?.okta) {
        const oktaConfig = oidcProviders.okta as AuthProviderConfig;
        console.log('Okta config:', oktaConfig);
        if (!oktaConfig.clientId || !oktaConfig.redirectUri) {
          throw new Error('Okta OIDC configuration missing required fields: clientId or redirectUri');
        }
        const configObj: OktaConfig = {
          issuer: `https://${oktaConfig.domain || ''}/oauth2/default`,
          clientId: oktaConfig.clientId,
          clientSecret: oktaConfig.clientSecret || '',
          redirectUri: oktaConfig.redirectUri,
          scopes: oktaConfig.scopes || ['openid', 'profile', 'email'],
        };
        return new OktaAuth(configObj);
      }
      throw new Error('Okta configuration not found in auth_config.json');
    case 'azure':
      if (samlProviders?.azure) return samlProviders.azure;
      if (oidcProviders?.azure) {
        const azureConfig = oidcProviders.azure as AuthProviderConfig;
        console.log('Azure config:', azureConfig);
        if (!azureConfig.clientId || !azureConfig.redirectUri) {
          throw new Error('Azure OIDC configuration missing required fields: clientId or redirectUri');
        }
        if (!azureConfig.tenantId) {
          throw new Error('Azure OIDC configuration missing required field: tenantId');
        }
        try {
          const msalConfig = {
            auth: {
              clientId: azureConfig.clientId,
              authority: azureConfig.authority || `https://login.microsoftonline.com/${azureConfig.tenantId}`,
              redirectUri: azureConfig.redirectUri,
            },
            cache: {
              cacheLocation: 'localStorage',
            },
          };
          console.log('MSAL config:', msalConfig);
          const msalInstance = new PublicClientApplication(msalConfig);
          return msalInstance;
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`Azure OIDC initialization failed: ${error.message}`);
          } else {
            throw new Error('Azure OIDC initialization failed: Unknown error');
          }
        }
      }
      throw new Error('Azure configuration not found in auth_config.json');
    case 'shibboleth':
      if (samlProviders?.shibboleth) return samlProviders.shibboleth;
      throw new Error('Shibboleth configuration not found in auth_config.json');
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

export const getAllConfig = (): AuthConfig => config as AuthConfig;

export const getProviderConfig = (provider: string): any => {
  const { samlProviders, oidcProviders } = config as AuthConfig;
  return samlProviders?.[provider] || oidcProviders?.[provider];
};

export default getAuthProvider;