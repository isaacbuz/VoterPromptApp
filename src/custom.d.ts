// src/auth_config.d.ts
export interface AuthConfig {
  provider: string;
  protocol: string;
  campaignCode: string;
  partnerId: string;
  oidcProviders: {
    [key: string]: {
      domain: string;
      clientId: string;
      redirectUri: string;
      tenantId?: string;
      scopes?: string | string[]; // Allow string due to env substitution
    };
  };
  samlProviders: {
    [key: string]: {
      entryPoint: string;
      issuer: string;
      callbackUrl: string;
      idpCertPath: string;
      privateCertPath: string;
      spCertPath: string;
      connectionName: string;
    };
  };
}

declare module './auth_config.json' {
  const value: AuthConfig;
  export default value;
}