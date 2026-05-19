const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Hermes can't parse dynamic import() with webpack magic comments (e.g. /* webpackIgnore: true */)
// used by @sanity/client's OpenTelemetry deps. Force Metro/Babel to transpile them.
config.transformer.transformIgnorePatterns = [
  "node_modules/(?!(react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|nativewind|react-native-css-interop|@opentelemetry|@sanity)/)",
];

module.exports = withNativeWind(config, { input: "./global.css" });


