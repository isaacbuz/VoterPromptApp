const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, './src/index.tsx'),
  output: {
    path: path.resolve(__dirname, './docs'),
    filename: 'bundle.js',
    publicPath: '/docs/',
    clean: true,
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.css', '.json'],
    alias: {
      '@src': path.resolve(__dirname, 'src/'),
      '@backend': path.resolve(__dirname, 'backend/'),
      '@config': path.resolve(__dirname, 'src/auth_config.json'),
    },
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
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.json$/i,
        type: 'json',
        include: path.resolve(__dirname, 'src'),
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]',
        },
      },
    ],
  },
  devServer: {
    port: 3000,
    static: {
      directory: path.join(__dirname, './docs'),
      publicPath: '/docs/',
      serveIndex: true,
    },
    historyApiFallback: {
      index: '/docs/index.html',
    },
    proxy: [
      {
        context: ['/login', '/profile', '/logout', '/Shibboleth.sso'],
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './docs/index.html',
      filename: 'index.html',
      inject: true,
    }),
    new MiniCssExtractPlugin({
      filename: 'style.css',
    }),
  ],
};