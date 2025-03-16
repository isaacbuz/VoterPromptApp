// src/types/azure-msal-react.d.ts
declare module '@azure/msal-react' {
    import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
  
    export interface MsalProviderProps {
      instance: PublicClientApplication;
      children: React.ReactNode;
    }
  
    export const MsalProvider: React.FC<MsalProviderProps>;
  
    export interface MsalContextType {
      instance: PublicClientApplication;
      accounts: AccountInfo[];
      inProgress: 'login' | 'logout' | 'acquireToken' | 'none';
    }
  
    export function useMsal(): MsalContextType;
  
    export function useIsAuthenticated(): boolean;
  }