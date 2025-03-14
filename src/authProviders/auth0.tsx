import { AuthProvider, AuthProviderConfig, AuthProviderUserInfo } from './authProvider';

export class Auth0Provider implements AuthProvider {
  private config: AuthProviderConfig;

  constructor(config: AuthProviderConfig) {
    this.config = config;
  }

  login(): void {
    window.location.href = `${this.config.domain}/authorize?client_id=${this.config.clientId}&redirect_uri=${this.config.redirectUri}&scope=${this.config.scopes?.join(' ')}&response_type=code`;
  }

  logout(): void {
    window.location.href = `${this.config.domain}/v2/logout?client_id=${this.config.clientId}&returnTo=${this.config.redirectUri}`;
  }

  async getUser(): Promise<AuthProviderUserInfo> {
    const res = await fetch('http://localhost:3001/profile', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      return data.user || { email: undefined, name: undefined };
    }
    return { email: undefined, name: undefined };
  }

  async isAuthenticated(): Promise<boolean> {
    const res = await fetch('http://localhost:3001/profile', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });
    return res.ok && !!(await res.json()).user;
  }
}