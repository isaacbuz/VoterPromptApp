declare module "../src/auth_config.json" {
  interface OidcProvider {
    domain: string;
    clientId: string;
    redirectUri: string;
    clientSecret?: string;
    tenantId?: string;
    scopes?: string[];
  }

  interface SamlProvider {
    entryPoint: string;
    issuer: string;
    callbackUrl: string;
    idpCertPath: string;
    privateKeyPath: string;
    spCertPath: string;
  }

  interface AuthConfig {
    provider: string;
    protocol: string;
    campaignCode: string;
    partnerId: string;
    sessionSecret: string;
    port: number;
    certDir: string;
    oidcProviders: Record<string, OidcProvider>;
    samlProviders: Record<string, SamlProvider>;
  }

  const value: AuthConfig;
  export default value;
}
