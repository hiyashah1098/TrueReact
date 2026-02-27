// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix Firebase ESM module resolution issues
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
