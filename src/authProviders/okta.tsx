import OktaAuth, { AccessToken, Token } from '@okta/okta-auth-js';
import { AuthProvider, AuthProviderConfig, AuthProviderUserInfo } from './authProvider';

export class OktaProvider implements AuthProvider {
  private oktaAuth: OktaAuth;

  constructor(config: AuthProviderConfig) {
    this.oktaAuth = new OktaAuth({
      issuer: `https://${config.domain}/oauth2/default`,
      clientId: config.clientId || '',
      clientSecret: config.clientSecret || '',
      redirectUri: config.redirectUri || '',
      scopes: config.scopes || ['openid', 'profile', 'email'],
    });
  }

  login(): void {
    this.oktaAuth.signInWithRedirect({ originalUri: this.oktaAuth.options.redirectUri });
  }

  logout(): void {
    this.oktaAuth.signOut({ postLogoutRedirectUri: this.oktaAuth.options.redirectUri });
  }

  async getUser(): Promise<AuthProviderUserInfo> {
    const accessToken = await this.oktaAuth.tokenManager.get('accessToken') as AccessToken;
    const idToken = await this.oktaAuth.tokenManager.get('idToken') as Token;
    if (accessToken && idToken && 'idToken' in idToken) {
      const user = await this.oktaAuth.token.getUserInfo(accessToken);
      return { email: user.email, name: user.name };
    }
    return { email: undefined, name: undefined };
  }

  async isAuthenticated(): Promise<boolean> {
    const accessToken = await this.oktaAuth.tokenManager.get('accessToken') as AccessToken;
    const idToken = await this.oktaAuth.tokenManager.get('idToken') as Token;
    return !!(accessToken && idToken && 'idToken' in idToken);
  }
}