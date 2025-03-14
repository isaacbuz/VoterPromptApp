import { AuthProvider, AuthProviderConfig, AuthProviderUserInfo } from './authProvider';

export class ShibbolethProvider implements AuthProvider {
  constructor(config: AuthProviderConfig) {
    // No direct client-side logic; relies on backend
  }

  login(): void {
    window.location.href = `http://localhost:3001/login/shibboleth`;
  }

  logout(): void {
    fetch('http://localhost:3001/logout', { method: 'GET', credentials: 'include' })
      .then((res) => {
        if (res.headers.get('X-Logout') === 'true') {
          window.location.href = 'http://localhost:3000/';
        }
      });
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