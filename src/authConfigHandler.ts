import authConfig from './auth_config.json';

// Define Provider Types
type OidcProviderType = 'auth0' | 'okta' | 'azure';
type SamlProviderType = 'auth0' | 'okta' | 'azure' | 'shibboleth';
type ProviderType = OidcProviderType | SamlProviderType;

// Interface for OIDC configuration
interface OidcConfig {
  domain: string;
  clientId: string;
  redirectUri: string;
  authority?: string; // Optional, used for Azure
  scopes?: string[]; // Optional, used for Azure
}

// Get OIDC Provider Configuration
export const getAuthProvider = (provider: OidcProviderType): OidcConfig => {
  if (!(provider in authConfig.oidcProviders)) {
    throw new Error(`Unsupported OIDC provider: ${provider}`);
  }
  const baseConfig = {
    domain: authConfig.oidcProviders[provider].domain,
    clientId: authConfig.oidcProviders[provider].clientId,
    redirectUri: authConfig.oidcProviders[provider].redirectUri,
  };

  // Add Azure-specific properties
  if (provider === 'azure') {
    return {
      ...baseConfig,
      authority: `https://login.microsoftonline.com/${authConfig.oidcProviders.azure.tenantId}`,
      scopes: authConfig.oidcProviders.azure.scopes || ['openid', 'profile', 'email'],
    };
  }

  return baseConfig;
};

// Get SAML Provider Configuration
export const getSamlProvider = (provider: SamlProviderType) => {
  if (!(provider in authConfig.samlProviders)) {
    throw new Error(`SAML provider not configured: ${provider}`);
  }
  return {
    entryPoint: authConfig.samlProviders[provider].entryPoint,
    issuer: authConfig.samlProviders[provider].issuer,
    callbackUrl: authConfig.samlProviders[provider].callbackUrl,
    privateCertPath: authConfig.samlProviders[provider].privateCertPath,
    idpCertPath: authConfig.samlProviders[provider].idpCertPath,
  };
};