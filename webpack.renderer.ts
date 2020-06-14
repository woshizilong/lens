import path from "path";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserWebpackPlugin from "terser-webpack-plugin";
import { htmlTemplate, isDevelopment, isProduction, outDir, rendererDir, sassCommonVars, tsConfigFile } from "./src/common/vars";
import { libraryTarget, manifestPath } from "./webpack.dll";

export default [
  webpackConfigReact,
  webpackConfigVue,
];

export function webpackConfigReact(): webpack.Configuration {
  return {
    target: "electron-renderer",
    mode: isProduction ? "production" : "development",
    devtool: isProduction ? "source-map" : "cheap-module-eval-source-map",
    cache: isDevelopment,
    entry: {
      renderer: path.resolve(rendererDir, "components/app.tsx"),
    },
    output: {
      path: outDir,
      filename: '[name].js',
      chunkFilename: 'chunks/[name].js',
    },
    resolve: {
      alias: {
        "@": rendererDir,
      },
      extensions: [
        '.js', '.jsx', '.json',
        '.ts', '.tsx',
      ]
    },
    optimization: {
      minimize: false,
      minimizer: [
        new TerserWebpackPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
          extractComments: {
            condition: "some",
            banner: [
              `Lens - The Kubernetes IDE. Copyright ${new Date().getFullYear()} by Lakend Labs, Inc. All rights reserved.`
            ].join("\n")
          }
        })
      ],
    },

    module: {
      rules: [
        {
          test: /\.node$/,
          use: "node-loader"
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            "babel-loader",
            {
              loader: "ts-loader",
              options: {
                configFile: tsConfigFile,
                compilerOptions: {
                  // localization support
                  // https://lingui.js.org/guides/typescript.html
                  jsx: "preserve",
                  target: "es2016",
                },
              }
            }
          ]
        },
        {
          test: /\.(jpg|png|svg|map|ico)$/,
          use: "file-loader?name=images/[name]-[hash:6].[ext]"
        },
        {
          test: /\.(ttf|eot|woff2?)$/,
          use: "file-loader?name=fonts/[name].[ext]"
        },
        {
          test: /\.s?css$/,
          use: [
            isDevelopment ? "style-loader" : MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: {
                sourceMap: isDevelopment
              },
            },
            {
              loader: "sass-loader",
              options: {
                sourceMap: isDevelopment,
                prependData: `@import "${path.basename(sassCommonVars)}";`,
                sassOptions: {
                  includePaths: [
                    path.dirname(sassCommonVars)
                  ]
                },
              }
            },
          ]
        }
      ]
    },

    plugins: [
      // todo: check if this actually works in mode=production files
      new webpack.DllReferencePlugin({
        context: process.cwd(),
        manifest: manifestPath,
        sourceType: libraryTarget,
      }),
      new HtmlWebpackPlugin({
        template: htmlTemplate,
        inject: true,
      }),
      new MiniCssExtractPlugin({
        filename: "[name].css",
      }),
    ],
  }
}

export function webpackConfigVue(): webpack.Configuration {
  const config = webpackConfigReact();

  config.resolve.extensions.push(".vue");
  config.entry = {
    renderer_vue: path.resolve(rendererDir, "_vue/index.js")
  }

  // rules and loaders
  config.module.rules = config.module.rules
    .filter(({ test }: { test: RegExp }) => !test.test(".ts"))
    .filter(({ test }: { test: RegExp }) => !test.test(".css"))

  config.module.rules.push(
    {
      test: /\.vue$/,
      use: {
        loader: "vue-loader",
        options: {
          shadowMode: false,
          loaders: {
            css: "vue-style-loader!css-loader",
            scss: "vue-style-loader!css-loader!sass-loader",
          }
        }
      }
    },
    {
      test: /\.jsx?$/,
      loader: "babel-loader",
    },
    {
      test: /\.tsx?$/,
      loader: "ts-loader",
      options: {
        transpileOnly: false,
        appendTsSuffixTo: [/\.vue$/],
      }
    },
    {
      test: /\.s?css$/,
      use: [
        'vue-style-loader',
        'css-loader',
        'sass-loader'
      ]
    }
  );

  // plugins
  const VueLoaderPlugin = require("vue-loader/lib/plugin");
  config.plugins = [
    new VueLoaderPlugin(),
  ];

  return config;
}