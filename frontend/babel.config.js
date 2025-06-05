module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@hooks': './src/hooks',
            '@services': './src/services',
            '@utils': './src/utils',
            '@assets': './src/assets',
            '@types': './src/types',
            '@constants': './src/constants',
            '@store': './src/store'
          }
        }
      ],
      'react-native-reanimated/plugin'
    ]
  };
}; 