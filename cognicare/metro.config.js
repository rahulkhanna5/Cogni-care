const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Web support, for previewing the app in a browser. Android remains the
 * target platform — this only makes `--web` bundle at all.
 *
 * expo-sqlite's browser build is a WASM worker, so Metro has to treat .wasm
 * as an asset, and the page needs COOP/COEP set or SharedArrayBuffer is
 * unavailable and the database never opens.
 */
config.resolver.assetExts.push('wasm');

config.server = config.server ?? {};
const previousEnhance = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (middleware, server) => {
  const base = previousEnhance ? previousEnhance(middleware, server) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    return base(req, res, next);
  };
};

module.exports = config;
