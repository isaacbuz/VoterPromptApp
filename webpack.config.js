const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    modules: ["node_modules", "src"],
    mainFiles: ["index"],
    // Prevent Webpack from resolving .d.ts files
    extensions: [".tsx", ".ts", ".js"], // Restrict to these extensions
    // Add a condition to ignore .d.ts files
    conditionNames: ["source"],
    // Explicitly ignore .d.ts files
    alias: {
      "\\.d\\.ts$": false,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: path.resolve(__dirname, "tsconfig.json"),
              onlyCompileBundledFiles: true, // Only compile files that will be bundled
              transpileOnly: true, // Skip type checking during bundling (handled by tsc --noEmit)
            },
          },
        ],
        exclude: [/node_modules/, /\.d\.ts$/], // Explicitly exclude .d.ts files
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
  devServer: {
    static: path.join(__dirname, "public"),
    compress: true,
    port: 3000,
  },
};