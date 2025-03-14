// src/okta.d.ts
declare module '@okta/okta-auth-js' {
    export class OktaAuth {
      token: {
        parseFromUrl(): Promise<any>;
        getUserInfo(token: string, idToken: string): Promise<any>;
      };
      tokenManager: {
        get(key: string): Promise<string>;
        add(key: string, value: string): void;
      };
      signInWithRedirect(config: any): Promise<any>;
      signOut(config: any): Promise<any>;
      // Add other methods as needed based on your usage
    }
  }