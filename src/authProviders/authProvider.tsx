import { AuthConfig } from '../custom';

export interface AuthProvider {
  login(): void;
  logout(): void;
  getUser(): Promise<AuthProviderUserInfo>;
  isAuthenticated(): Promise<boolean>;
}

export interface AuthProviderConfig {
  domain?: string;
  clientId?: string;
  redirectUri?: string;
  scopes?: string[];
  clientSecret?: string;
  tenantId?: string;
  authority?: string;
  entryPoint?: string;
  issuer?: string;
  callbackUrl?: string;
  idpCertPath?: string;
  privateKeyPath?: string;
  spCertPath?: string;
}

export interface AuthProviderUserInfo {
  email?: string;
  name?: string;
}