// src/types.tsx
import { OktaAuth } from '@okta/okta-auth-js'; // Updated import
import { PublicClientApplication } from '@azure/msal-browser/dist/index.js';

export type Provider = 'auth0' | 'okta' | 'azure' | 'shibboleth';

// Define CustomAuthProvider interface
export interface CustomAuthProvider {
  login: () => void;
  logout: () => void;
  getUser: () => Promise<{ email?: string; name?: string }>;
  isAuthenticated: () => Promise<boolean>;
}

export interface VoteWidgetProps {
  provider: Provider;
  authProvider?: OktaAuth | PublicClientApplication | CustomAuthProvider | undefined;
  partnerId?: string;
  campaignCode?: string;
}