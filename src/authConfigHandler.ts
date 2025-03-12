import authConfig from '@config';
import { Provider } from './types';
import OktaAuth from '@okta/okta-auth-js';
import { PublicClientApplication, Configuration } from '@azure/msal-browser';

interface SamlProviderConfig {
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  idpCertPath: string;
  privateKeyPath: string;
  spCertPath: string;
}

interface OidcProviderConfig {
  domain?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  tenantId?: string;
  scopes?: string[];
  authority?: string;
}

const getAuthProvider = (provider: Provider): SamlProviderConfig | OidcProviderConfig | OktaAuth | PublicClientApplication => {
  const { samlProviders, oidcProviders } = authConfig;

  switch (provider) {
    case 'auth0':
      if (samlProviders.auth0) return samlProviders.auth0;
      if (oidcProviders.auth0) {
        const config = oidcProviders.auth0 as OidcProviderConfig;
        console.log('Auth0 config:', config);
        if (!config.clientId || !config.redirectUri) {
          throw new Error('Auth0 OIDC configuration missing required fields: clientId or redirectUri');
        }
        return {
          domain: config.domain || '',
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri,
          scopes: config.scopes || [],
          authority: config.authority || '',
        } as OidcProviderConfig;
      }
      throw new Error('Auth0 configuration not found in auth_config.json');
    case 'okta':
      if (samlProviders.okta) return samlProviders.okta;
      if (oidcProviders.okta) {
        const config = oidcProviders.okta as OidcProviderConfig;
        console.log('Okta config:', config);
        if (!config.clientId || !config.redirectUri) {
          throw new Error('Okta OIDC configuration missing required fields: clientId or redirectUri');
        }
        return new OktaAuth({
          issuer: `https://${config.domain || ''}/oauth2/default`,
          clientId: config.clientId,
          clientSecret: config.clientSecret || '',
          redirectUri: config.redirectUri,
          scopes: config.scopes || ['openid', 'profile', 'email'],
        });
      }
      throw new Error('Okta configuration not found in auth_config.json');
    case 'azure':
      if (samlProviders.azure) return samlProviders.azure;
      if (oidcProviders.azure) {
        const config = oidcProviders.azure as OidcProviderConfig;
        console.log('Azure config:', config);
        if (!config.clientId || !config.redirectUri) {
          throw new Error('Azure OIDC configuration missing required fields: clientId or redirectUri');
        }
        if (!config.tenantId) {
          throw new Error('Azure OIDC configuration missing required field: tenantId');
        }
        try {
          const msalConfig: Configuration = {
            auth: {
              clientId: config.clientId,
              authority: config.authority || `https://login.microsoftonline.com/${config.tenantId}`,
              redirectUri: config.redirectUri,
            },
            cache: {
              cacheLocation: 'localStorage',
            },
          };
          console.log('MSAL config:', msalConfig);
          const msalInstance = new PublicClientApplication(msalConfig);
          console.log('MSAL instance created:', msalInstance);
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
      if (samlProviders.shibboleth) return samlProviders.shibboleth;
      throw new Error('Shibboleth configuration not found in auth_config.json');
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

export default getAuthProvider;