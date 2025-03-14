import { OktaAuth, AccessToken, IDToken } from '@okta/okta-auth-js';
import { AuthProvider, AuthProviderConfig, AuthProviderUserInfo } from './authProvider';

interface OktaConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes?: string[];
  [key: string]: any;
}

interface OktaUserInfo {
  email?: string;
  name?: string;
  [key: string]: any;
}

export class OktaProvider implements AuthProvider {
  private oktaAuth: OktaAuth;
  private redirectUri: string;

  constructor(config: AuthProviderConfig) {
    const oktaConfig: OktaConfig = {
      issuer: `https://${config.domain}/oauth2/default`,
      clientId: config.clientId || '',
      clientSecret: config.clientSecret || '',
      redirectUri: config.redirectUri || '',
      scopes: config.scopes || ['openid', 'profile', 'email'],
    };
    this.oktaAuth = new (OktaAuth as any)(oktaConfig); // Temporary type assertion
    this.redirectUri = config.redirectUri || '';
  }

  login(): void {
    this.oktaAuth.signInWithRedirect({ originalUri: this.redirectUri } as { originalUri: string });
  }

  logout(): void {
    this.oktaAuth.signOut({ postLogoutRedirectUri: this.redirectUri } as { postLogoutRedirectUri: string });
  }

  async getUser(): Promise<AuthProviderUserInfo> {
    try {
      const accessToken = await this.oktaAuth.tokenManager.get('accessToken') as AccessToken | undefined;
      const idToken = await this.oktaAuth.tokenManager.get('idToken') as IDToken | undefined;
      if (accessToken && idToken && accessToken.accessToken && idToken.idToken) {
        const user = await this.oktaAuth.token.getUserInfo(accessToken, idToken) as OktaUserInfo;
        return { email: user.email, name: user.name };
      }
      return { email: undefined, name: undefined };
    } catch (error) {
      console.error('Error fetching Okta user info:', error);
      return { email: undefined, name: undefined };
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const accessToken = await this.oktaAuth.tokenManager.get('accessToken') as AccessToken | undefined;
      const idToken = await this.oktaAuth.tokenManager.get('idToken') as IDToken | undefined;
      return !!(accessToken && idToken && accessToken.accessToken && idToken.idToken);
    } catch (error) {
      console.error('Error checking Okta authentication:', error);
      return false;
    }
  }
}