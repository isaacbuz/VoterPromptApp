const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, './src/index.tsx'),
  output: {
    path: path.resolve(__dirname, './docs'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.css', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.json$/i,
        type: 'json',
      },
    ],
  },
  devServer: {
    port: 3000,
    static: {
      directory: path.join(__dirname, './docs'),
      publicPath: '/',
      serveIndex: true,
    },
    historyApiFallback: true,
    proxy: [
      {
        context: ['/login', '/profile', '/logout', '/Shibboleth.sso'],
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.CALLBACK_URL_BASE': JSON.stringify(process.env.CALLBACK_URL_BASE || 'http://localhost:3001/login/callback'),
      'process.env.SESSION_SECRET': JSON.stringify(process.env.SESSION_SECRET || '123'),
      'process.env.PORT': JSON.stringify(process.env.PORT || '3001'),
      'process.env.CERT_DIR': JSON.stringify(process.env.CERT_DIR || 'cert'),
      'process.env.SHIBBOLETH_IDP_CERT_PATH': JSON.stringify(process.env.SHIBBOLETH_IDP_CERT_PATH || 'cert/shibboleth/shibboleth-idp-cert.pem'),
      'process.env.SHIBBOLETH_PRIVATE_KEY_PATH': JSON.stringify(process.env.SHIBBOLETH_PRIVATE_KEY_PATH || 'cert/shibboleth/shibboleth-key.pem'),
      'process.env.SHIBBOLETH_SP_CERT_PATH': JSON.stringify(process.env.SHIBBOLETH_SP_CERT_PATH || 'cert/shibboleth/shibboleth-sp-cert.pem'),
      'process.env.SHIBBOLETH_ENTRY_POINT': JSON.stringify(process.env.SHIBBOLETH_ENTRY_POINT || 'https://10.153.168.81/idp/profile/SAML2/Redirect/SSO'),
      'process.env.SHIBBOLETH_ISSUER': JSON.stringify(process.env.SHIBBOLETH_ISSUER || 'https://ip-10-153-168-78/shibboleth'),
      'process.env.SHIBBOLETH_CALLBACK_URL': JSON.stringify(process.env.SHIBBOLETH_CALLBACK_URL || 'http://localhost:3001/login/callback/shibboleth'),
      'process.env.AZURE_IDP_CERT_PATH': JSON.stringify(process.env.AZURE_IDP_CERT_PATH || 'cert/azure/azure-ad-idp-cert.pem'),
      'process.env.AZURE_PRIVATE_KEY_PATH': JSON.stringify(process.env.AZURE_PRIVATE_KEY_PATH || 'cert/azure/azure-key.pem'),
      'process.env.AZURE_SP_CERT_PATH': JSON.stringify(process.env.AZURE_SP_CERT_PATH || 'cert/azure/azure-sp-cert.pem'),
      'process.env.AZURE_ENTRY_POINT': JSON.stringify(process.env.AZURE_ENTRY_POINT || 'https://login.microsoftonline.com/9e0ab446-dd79-4d10-a90d-d405048204c9/saml2'),
      'process.env.AZURE_ISSUER': JSON.stringify(process.env.AZURE_ISSUER || 'urn:com:voterpromptapp'),
      'process.env.AZURE_CALLBACK_URL': JSON.stringify(process.env.AZURE_CALLBACK_URL || 'http://localhost:3001/login/callback/azure'),
      'process.env.AUTH0_SAML_IDP_CERT_PATH': JSON.stringify(process.env.AUTH0_SAML_IDP_CERT_PATH || 'cert/auth0/auth0-idp-cert.pem'),
      'process.env.AUTH0_SAML_PRIVATE_KEY_PATH': JSON.stringify(process.env.AUTH0_SAML_PRIVATE_KEY_PATH || 'cert/auth0/auth0-key.pem'),
      'process.env.AUTH0_SAML_SP_CERT_PATH': JSON.stringify(process.env.AUTH0_SAML_SP_CERT_PATH || 'cert/auth0/auth0-sp-cert.pem'),
      'process.env.AUTH0_SAML_ENTRY_POINT': JSON.stringify(process.env.AUTH0_SAML_ENTRY_POINT || 'https://auth0-saml-idp.com/sso'),
      'process.env.AUTH0_SAML_ISSUER': JSON.stringify(process.env.AUTH0_SAML_ISSUER || 'auth0-app'),
      'process.env.AUTH0_SAML_CALLBACK_URL': JSON.stringify(process.env.AUTH0_SAML_CALLBACK_URL || 'http://localhost:3001/login/callback/auth0'),
      'process.env.OKTA_SAML_IDP_CERT_PATH': JSON.stringify(process.env.OKTA_SAML_IDP_CERT_PATH || 'cert/okta/okta-idp-cert.pem'),
      'process.env.OKTA_SAML_PRIVATE_KEY_PATH': JSON.stringify(process.env.OKTA_SAML_PRIVATE_KEY_PATH || 'cert/okta/okta-key.pem'),
      'process.env.OKTA_SAML_SP_CERT_PATH': JSON.stringify(process.env.OKTA_SAML_SP_CERT_PATH || 'cert/okta/okta-sp-cert.pem'),
      'process.env.OKTA_SAML_ENTRY_POINT': JSON.stringify(process.env.OKTA_SAML_ENTRY_POINT || 'https://okta-saml-idp.com/sso'),
      'process.env.OKTA_SAML_ISSUER': JSON.stringify(process.env.OKTA_SAML_ISSUER || 'okta-app'),
      'process.env.OKTA_SAML_CALLBACK_URL': JSON.stringify(process.env.OKTA_SAML_CALLBACK_URL || 'http://localhost:3001/login/callback/okta'),
      'process.env.AUTH0_OIDC_DOMAIN': JSON.stringify(process.env.AUTH0_OIDC_DOMAIN || 'dev-cefy84by8ug1nbak.us.auth0.com'),
      'process.env.AUTH0_OIDC_CLIENT_ID': JSON.stringify(process.env.AUTH0_OIDC_CLIENT_ID || 'YOUR_AUTH0_CLIENT_ID'),
      'process.env.AUTH0_OIDC_REDIRECT_URI': JSON.stringify(process.env.AUTH0_OIDC_REDIRECT_URI || 'http://localhost:3001/login/callback'),
      'process.env.OKTA_OIDC_DOMAIN': JSON.stringify(process.env.OKTA_OIDC_DOMAIN || 'https://dev-40855217.okta.com'),
      'process.env.OKTA_OIDC_CLIENT_ID': JSON.stringify(process.env.OKTA_OIDC_CLIENT_ID || '0oanhs57lchFwU7v15d7'),
      'process.env.OKTA_OIDC_REDIRECT_URI': JSON.stringify(process.env.OKTA_OIDC_REDIRECT_URI || 'http://localhost:3001/login/callback'),
      'process.env.AZURE_OIDC_DOMAIN': JSON.stringify(process.env.AZURE_OIDC_DOMAIN || 'techtide1223gmail.onmicrosoft.com'),
      'process.env.AZURE_OIDC_CLIENT_ID': JSON.stringify(process.env.AZURE_OIDC_CLIENT_ID || '7c41c780-b9db-43df-950d-bf1feabb27a8'),
      'process.env.AZURE_OIDC_REDIRECT_URI': JSON.stringify(process.env.AZURE_OIDC_REDIRECT_URI || 'http://localhost:3001/login/callback'),
      'process.env.AZURE_OIDC_TENANT_ID': JSON.stringify(process.env.AZURE_OIDC_TENANT_ID || '9e0ab446-dd79-4d10-a90d-d405048204c9'),
      'process.env.AZURE_OIDC_SCOPES': JSON.stringify(process.env.AZURE_OIDC_SCOPES || 'openid,profile,email'),
    }),
  ],
};