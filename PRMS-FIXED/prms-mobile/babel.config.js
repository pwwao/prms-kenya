module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@': './src',
          '@api': './src/api',
          '@store': './src/store',
          '@screens': './src/screens',
          '@components': './src/components',
          '@hooks': './src/hooks',
          '@utils': './src/utils',
          '@types': './src/types',
          '@constants': './src/constants',
          '@theme': './src/theme',
          '@db': './src/db',
          '@navigation': './src/navigation',
        },
      },
    ],
    // BUG FIX: react-native-config reads .env at build time.
    // Required so Config.PRMS_API_BASE_URL / Config.PRMS_WS_URL resolve correctly.
    'module:react-native-config/babel',
    'react-native-reanimated/plugin', // must be listed last
  ],
};
