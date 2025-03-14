import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { AuthProvider, AuthProviderConfig, AuthProviderUserInfo } from './authProvider';

export class AzureProvider implements AuthProvider {
  private msalInstance: PublicClientApplication;

  constructor(config: AuthProviderConfig) {
    this.msalInstance = new PublicClientApplication({
      auth: {
        clientId: config.clientId || '',
        authority: config.authority || `https://login.microsoftonline.com/${config.tenantId}`,
        redirectUri: config.redirectUri || '',
      },
      cache: {
        cacheLocation: 'localStorage',
      },
    });
  }

  login(): void {
    this.msalInstance.loginRedirect({ scopes: ['User.Read'] });
  }

  logout(): void {
    this.msalInstance.logoutRedirect();
  }

  async getUser(): Promise<AuthProviderUserInfo> {
    const accounts: AccountInfo[] = this.msalInstance.getAllAccounts();
    const account = accounts[0];
    return account ? { email: account.username, name: account.name } : { email: undefined, name: undefined };
  }

  async isAuthenticated(): Promise<boolean> {
    return this.msalInstance.getAllAccounts().length > 0;
  }
}