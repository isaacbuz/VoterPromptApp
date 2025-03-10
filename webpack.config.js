const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.join(__dirname, './src/index.tsx'),
  output: {
    path: path.resolve(__dirname, './docs'),
    filename: 'bundle.js',
    assetModuleFilename: 'assets/[name][ext]',
    publicPath: '/',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.css'],
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        include: [path.resolve('src')],
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]',
        },
        include: path.resolve(__dirname, 'src/assets'),
      },
    ],
  },
  devServer: {
    port: 3000,
    static: {
      directory: path.join(__dirname, './docs'),
    },
    compress: true,
    historyApiFallback: true,
    client: {
      overlay: false,
    },
  },
};