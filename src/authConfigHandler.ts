import authConfig from './auth_config.json';

// Define Provider Types
type OidcProviderType = 'auth0' | 'okta' | 'azure';
type SamlProviderType = 'auth0' | 'okta' | 'azure' | 'shibboleth';
type ProviderType = OidcProviderType | SamlProviderType;

// Interface for OIDC Configuration
interface OidcConfig {
  domain: string;
  clientId: string;
  redirectUri: string;
  authority?: string; // Optional, used specifically for Azure
  scopes?: string[];  // Optional, used specifically for Azure
  samlConnection?: string; // Optional, for future SAML integration via OIDC brokers (if needed)
}

// Interface for SAML Configuration
interface SamlConfig {
  entryPoint: string;      // IdP entry point URL
  issuer: string;          // SP issuer identifier
  callbackUrl: string;     // ACS URL for SAML response
  privateCertPath: string; // Path to SP private key (optional)
  idpCertPath: string;     // Path to IdP certificate
  connectionName: string;  // Unique name for the SAML connection
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
export const getSamlProvider = (provider: SamlProviderType): SamlConfig => {
  if (!(provider in authConfig.samlProviders)) {
    throw new Error(`SAML provider not configured: ${provider}`);
  }

  return {
    entryPoint: authConfig.samlProviders[provider].entryPoint,
    issuer: authConfig.samlProviders[provider].issuer,
    callbackUrl: authConfig.samlProviders[provider].callbackUrl,
    privateCertPath: authConfig.samlProviders[provider].privateCertPath,
    idpCertPath: authConfig.samlProviders[provider].idpCertPath,
    connectionName: authConfig.samlProviders[provider].connectionName,
  };
};

// Determine the authentication protocol from auth_config.json
export const getProtocol = (): 'OIDC' | 'SAML' => {
  const protocol = authConfig.protocol as 'OIDC' | 'SAML';
  if (protocol !== 'OIDC' && protocol !== 'SAML') {
    throw new Error(`Invalid protocol specified in auth_config.json. Use 'OIDC' or 'SAML'.`);
  }
  return protocol;
};

// Check if the provider is a SAML provider
export const isSamlProvider = (provider: ProviderType): provider is SamlProviderType => {
  return (authConfig.samlProviders as any)[provider] !== undefined;
};

// Get the SAML connection name for a provider (for metadata or logging purposes)
export const getSamlConnectionName = (provider: SamlProviderType): string => {
  const samlConfig = getSamlProvider(provider);
  return samlConfig.connectionName;
};

// Validate the provider based on the selected protocol
export const isValidProvider = (provider: ProviderType, protocol: 'OIDC' | 'SAML'): boolean => {
  if (protocol === 'OIDC') {
    return ['auth0', 'okta', 'azure'].includes(provider);
  } else if (protocol === 'SAML') {
    return isSamlProvider(provider);
  }
  return false;
};