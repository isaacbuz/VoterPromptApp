const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, './src/index.tsx'),
  output: {
    path: path.resolve(__dirname, './docs'),
    filename: 'bundle.js', // Matches index.html
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.css', '.txt'],
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        include: [path.resolve('src')],
        loader: 'ts-loader',
        options: {
          transpileOnly: false,
          compilerOptions: {
            module: 'es2015',
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
    ],
  },
  devServer: {
    port: 3000, // Matches redirect URI
    static: {
      directory: path.join(__dirname, './docs'),
    },
    compress: true,
    historyApiFallback: true,
    client: {
      overlay: false, // Disable overlay for errors during dev
    },
  },
};
