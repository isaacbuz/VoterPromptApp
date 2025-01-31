const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, './src/index.tsx'), // Entry point
  output: {
    path: path.resolve(__dirname, './docs'), // Output directory
    filename: 'cb-vote-widget.js', // Output filename
  },
  devtool: 'source-map', // Enable source maps for debugging
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.css', '.txt'], // File extensions to resolve
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/, // TypeScript files
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
        test: /\.css$/i, // CSS files
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.svg$/, // SVG files
        use: ['@svgr/webpack'],
      },
    ],
  },
  devServer: {
    port: 8080, // Development server port
    static: {
      directory: path.join(__dirname, './docs'), // Serve files from the `docs` directory
    },
    compress: true, // Enable Gzip compression
    historyApiFallback: true, // Redirect 404s to index.html for SPA
  },
};
