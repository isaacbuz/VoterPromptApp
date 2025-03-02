SSO Integration with Multiple IDPs (Auth0, Okta, Azure AD)
This project supports Single Sign-On (SSO) using multiple Identity Providers (IDPs): Auth0, Okta, and Azure AD. You can dynamically switch between IDPs by updating the configuration.

Table of Contents
Project Overview
Supported IDPs
Getting Started
Switching IDPs
Configuration Files
Setting Up Each IDP
Auth0
Okta
Azure AD
Running the Application
Troubleshooting
Project Overview
This project demonstrates how to integrate multiple IDPs in a React application using a shared structure. Each IDP uses its own library and configuration, allowing you to choose which one to use dynamically.

Supported IDPs
Auth0: A cloud-based authentication provider.
Okta: Enterprise-grade identity management service.
Azure AD: Microsoft's cloud identity and access management service.
Getting Started
Prerequisites
Node.js installed (v14+ recommended).
An account with the respective IDPs: Auth0, Okta, or Azure AD.
Installation
Clone the repository:
bash
Copy code
git clone https://github.com/your-repo.git
cd your-repo
Install dependencies:
bash
Copy code
npm install
Switching IDPs
To switch between IDPs:

Open the file src/index.tsx.
Update the provider variable to one of the supported options:
typescript
Copy code
const provider: Provider = 'auth0'; // Change to 'okta' or 'azure'
Auth0: 'auth0'
Okta: 'okta'
Azure AD: 'azure'
Save the file and restart the application.
Configuration Files
Key Files to Update:
src/auth_config.json:

Stores the client ID, tenant ID, and redirect URIs for each IDP.
Example:

json
Copy code
{
  "auth0": {
    "domain": "your-auth0-domain",
    "clientId": "your-auth0-client-id",
    "redirectUri": "http://localhost:3000",
    "scopes": ["openid", "profile", "email"]
  },
  "okta": {
    "domain": "your-okta-domain",
    "clientId": "your-okta-client-id"
  },
  "azure": {
    "clientId": "your-azure-client-id",
    "tenantId": "your-azure-tenant-id",
    "redirectUri": "http://localhost:3000",
    "scopes": ["openid", "profile", "email"]
  }
}
src/authConfigHandler.ts:

Contains logic to fetch the correct configuration for the selected IDP.
src/index.tsx:

The entry point where the provider is set to choose the IDP dynamically.
Setting Up Each IDP
Auth0 Setup
Go to the Auth0 Dashboard.
Create an application and note the Domain and Client ID.
Update the auth_config.json file with the details under the auth0 section.
Okta Setup
Log in to your Okta Developer Account.
Create an application and note the Domain and Client ID.
Update the auth_config.json file with the details under the okta section.
Azure AD Setup
Log in to the Azure Portal.
Register an application in Azure AD, and note the Client ID and Tenant ID.
Update the auth_config.json file with the details under the azure section.
Running the Application
Start the development server:

bash
Copy code
npm start
Open your browser at http://localhost:3000.

Log in using the selected IDP.

Troubleshooting
Common Issues
Redirect URI mismatch:

Ensure the redirect URI in the IDP settings matches the redirectUri in auth_config.json.
Invalid client credentials:

Double-check the clientId, tenantId, and domain values in auth_config.json.
TypeScript Errors:

Ensure you’ve set the correct provider type in index.tsx.
Library Errors:

Ensure the required libraries for your IDP are installed:
bash
Copy code
npm install @auth0/auth0-react @okta/okta-auth-js @azure/msal-react @azure/msal-browser
Notes
This project supports dynamic switching between IDPs. Ensure you test each configuration independently before deployment.
For production, use HTTPS and set appropriate environment variables for sensitive data like clientId and tenantId.