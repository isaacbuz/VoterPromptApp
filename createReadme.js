const fs = require('fs');

const readmeContent = `
# SSO Integration with Multiple IDPs (Auth0, Okta, Azure AD)

This project supports Single Sign-On (SSO) using multiple Identity Providers (IDPs): **Auth0**, **Okta**, and **Azure AD**. You can dynamically switch between IDPs by updating the configuration.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Supported IDPs](#supported-idps)
3. [Getting Started](#getting-started)
4. [Switching IDPs](#switching-idps)
5. [Configuration Files](#configuration-files)
6. [Setting Up Each IDP](#setting-up-each-idp)
   - [Auth0](#auth0-setup)
   - [Okta](#okta-setup)
   - [Azure AD](#azure-ad-setup)
7. [Running the Application](#running-the-application)
8. [Troubleshooting](#troubleshooting)

---

## Project Overview
This project demonstrates how to integrate multiple IDPs in a React application using a shared structure. Each IDP uses its own library and configuration, allowing you to choose which one to use dynamically.

---

## Supported IDPs
- **Auth0**: A cloud-based authentication provider.
- **Okta**: Enterprise-grade identity management service.
- **Azure AD**: Microsoft's cloud identity and access management service.

---

## Getting Started

### Prerequisites
- **Node.js** installed (v14+ recommended).
- An account with the respective IDPs: [Auth0](https://auth0.com/), [Okta](https://www.okta.com/), or [Azure AD](https://azure.microsoft.com/).

### Installation
1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/your-repo.git
   cd your-repo
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

---

## Switching IDPs

To switch between IDPs:
1. Open the file \`src/index.tsx\`.
2. Update the \`provider\` variable to one of the supported options:
   \`\`\`typescript
   const provider: Provider = 'auth0'; // Change to 'okta' or 'azure'
   \`\`\`

- **Auth0**: \`'auth0'\`
- **Okta**: \`'okta'\`
- **Azure AD**: \`'azure'\`

3. Save the file and restart the application.

---

## Configuration Files

### Key Files to Update:
1. **\`src/auth_config.json\`**:
   - Stores the client ID, tenant ID, and redirect URIs for each IDP.

   Example:
   \`\`\`json
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
   \`\`\`

2. **\`src/authConfigHandler.ts\`**:
   - Contains logic to fetch the correct configuration for the selected IDP.

3. **\`src/index.tsx\`**:
   - The entry point where the \`provider\` is set to choose the IDP dynamically.

---

## Setting Up Each IDP

### Auth0 Setup
1. Go to the [Auth0 Dashboard](https://auth0.com/).
2. Create an application and note the **Domain** and **Client ID**.
3. Update the \`auth_config.json\` file with the details under the \`auth0\` section.

### Okta Setup
1. Log in to your [Okta Developer Account](https://developer.okta.com/).
2. Create an application and note the **Domain** and **Client ID**.
3. Update the \`auth_config.json\` file with the details under the \`okta\` section.

### Azure AD Setup
1. Log in to the [Azure Portal](https://portal.azure.com/).
2. Register an application in Azure AD, and note the **Client ID** and **Tenant ID**.
3. Update the \`auth_config.json\` file with the details under the \`azure\` section.

---

## Running the Application

1. Start the development server:
   \`\`\`bash
   npm start
   \`\`\`

2. Open your browser at \`http://localhost:3000\`.
3. Log in using the selected IDP.

---

## Troubleshooting

### Common Issues
1. **Redirect URI mismatch**:
   - Ensure the redirect URI in the IDP settings matches the \`redirectUri\` in \`auth_config.json\`.

2. **Invalid client credentials**:
   - Double-check the \`clientId\`, \`tenantId\`, and \`domain\` values in \`auth_config.json\`.

3. **TypeScript Errors**:
   - Ensure you’ve set the correct \`provider\` type in \`index.tsx\`.

4. **Library Errors**:
   - Ensure the required libraries for your IDP are installed:
     \`\`\`bash
     npm install @auth0/auth0-react @okta/okta-auth-js @azure/msal-react @azure/msal-browser
     \`\`\`

---

## Notes
- This project supports dynamic switching between IDPs. Ensure you test each configuration independently before deployment.
- For production, use HTTPS and set appropriate environment variables for sensitive data like \`clientId\` and \`tenantId\`.
`;

fs.writeFile('README.md', readmeContent, (err) => {
  if (err) {
    console.error('Error creating README.md:', err);
  } else {
    console.log('README.md has been created successfully!');
  }
});
