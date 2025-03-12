// src/custom.d.ts

// Type definition for auth_config.json
export interface AuthConfig {
  provider: string;
  protocol: string;
  campaignCode: string;
  partnerId: string;
  sessionSecret?: string;
  port?: number;
  certDir?: string;
  oidcProviders: {
    [key: string]: {
      domain?: string;
      clientId: string;
      clientSecret?: string;
      redirectUri: string;
      tenantId?: string;
      scopes?: string[];
      authority?: string;
    };
  };
  samlProviders: {
    [key: string]: {
      entryPoint: string;
      issuer: string;
      callbackUrl: string;
      idpCertPath: string;
      privateCertPath: string; // Typo fix: should be privateKeyPath
      spCertPath: string;
      connectionName?: string;
    };
  };
}

declare module './auth_config.json' {
  const value: AuthConfig;
  export default value;
}

// Type definition for @okta/okta-react
declare module '@okta/okta-react' {
  import { AuthState } from '@okta/okta-auth-js';

  export interface OktaAuthResult {
    authState: AuthState | null;
    // Add other properties if needed (e.g., oktaAuth, setAuthState)
  }

  export function useOktaAuth(): OktaAuthResult;
}