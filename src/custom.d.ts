declare module '*.svg' {
  const content: string;
  export default content;
}

export interface AuthConfig {
  provider?: string;
  protocol?: string;
  campaignCode?: string;
  partnerId?: string;
  sessionSecret?: string;
  port?: number;
  certDir?: string;
  samlProviders?: {
    [key: string]: {
      entryPoint: string;
      issuer: string;
      callbackUrl: string;
      idpCertPath: string;
      privateKeyPath: string;
      spCertPath: string;
    };
  };
  oidcProviders?: {
    [key: string]: {
      domain?: string;
      clientId: string;
      clientSecret?: string;
      redirectUri: string;
      scopes?: string[];
      tenantId?: string;
      authority?: string;
    };
  };
}