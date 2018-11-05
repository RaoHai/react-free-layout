const path = require("path");

module.exports = (baseConfig, env, config) => {
  config.module.rules.push({
    test: /\.tsx?$/,
    include: path.resolve(__dirname, "../src"),
    use: [
      require.resolve("ts-loader"),
      {
        loader: 'react-docgen-typescript-loader',
        options: {
          tsconfigPath: './tsconfig.json'
        }
      }
    ],
  });

  config.resolve.extensions.push(".ts", ".tsx");

  return config;
};