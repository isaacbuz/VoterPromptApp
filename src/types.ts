import { PublicClientApplication } from '@azure/msal-browser';
import OktaAuth from '@okta/okta-auth-js';

export type OidcProvider = "auth0" | "okta" | "azure";
export type SamlProvider = "auth0" | "okta" | "azure" | "shibboleth";
export type Provider = OidcProvider | SamlProvider;

export interface VoteWidgetProps {
  provider: Provider;
  authProvider?: PublicClientApplication | OktaAuth;
  partnerId?: string;
  campaignCode?: string;
}