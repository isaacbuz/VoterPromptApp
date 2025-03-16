import { Auth0Provider } from './auth0';
import { OktaProvider } from './okta';
import { AzureProvider } from './azure';
import { ShibbolethProvider } from './shibboleth';
import { AuthProvider } from './authProvider';
import { getProviderConfig } from '../authConfigHandler';
import { Provider } from '../types/types';

export const createAuthProvider = (provider: Provider): AuthProvider => {
  const config = getProviderConfig(provider);
  switch (provider) {
    case 'auth0':
      return new Auth0Provider(config as any) as AuthProvider;
    case 'okta':
      return new OktaProvider(config as any) as AuthProvider;
    case 'azure':
      return new AzureProvider(config as any) as AuthProvider;
    case 'shibboleth':
      return new ShibbolethProvider(config as any) as AuthProvider;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};