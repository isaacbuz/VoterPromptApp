// src/types/okta-auth.d.ts
declare module '@okta/okta-auth-js' {
  export interface OktaConfig {
    issuer: string;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    scopes?: string[];
    [key: string]: any;
  }

  export interface AccessToken {
    accessToken: string;
    expiresAt: number;
    tokenType: string;
    scopes: string[];
  }

  export interface IDToken {
    idToken: string;
    expiresAt: number;
    scopes: string[];
    issuer: string;
    clientId: string;
  }

  export interface TokenResponse {
    tokens: {
      accessToken?: AccessToken;
      idToken?: IDToken;
      refreshToken?: any;
    };
  }

  export class OktaAuth {
    constructor(config: OktaConfig);
    signInWithRedirect(options: { originalUri: string }): void;
    signOut(options: { postLogoutRedirectUri: string }): Promise<void>;
    tokenManager: {
      get(type: 'accessToken'): Promise<AccessToken | undefined>;
      get(type: 'idToken'): Promise<IDToken | undefined>;
      add(key: string, token: AccessToken | IDToken): void;
    };
    token: {
      getUserInfo(accessToken: AccessToken, idToken: IDToken): Promise<any>;
      parseFromUrl(): Promise<TokenResponse>;
    };
    options: {
      redirectUri: string;
    };
  }
}