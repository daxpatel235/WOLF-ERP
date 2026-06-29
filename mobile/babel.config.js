module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Binds stylesheets to the native shadow tree for zero-rerender theming.
      ['react-native-unistyles/plugin', { root: 'src' }],
      // Reanimated 4 worklets plugin — MUST be the last plugin in the list.
      'react-native-worklets/plugin',
    ],
  };
};
