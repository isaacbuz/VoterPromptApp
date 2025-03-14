import { OktaAuth } from '@okta/okta-auth-js';
import { PublicClientApplication } from '@azure/msal-browser';

export type Provider = 'auth0' | 'okta' | 'azure' | 'shibboleth';

export interface VoteWidgetProps {
  provider: Provider;
  authProvider?: OktaAuth | PublicClientApplication;
  partnerId?: string;
  campaignCode?: string;
}