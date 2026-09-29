/**
 * app.json, plus one optional override: COGNICARE_API_URL sets extra.apiUrl,
 * which the app reads at runtime (src/api/client.ts).
 *
 * It lets two Expo Go sessions run from this Mac at once — one on the Render
 * API, one on the Mac's own backend through a tunnel — sharing one bundle,
 * because the address arrives in the manifest instead of being compiled in.
 * An EAS build leaves it unset and uses EXPO_PUBLIC_API_URL from eas.json.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    ...(process.env.COGNICARE_API_URL ? { apiUrl: process.env.COGNICARE_API_URL } : {}),
  },
});
