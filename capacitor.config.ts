import type { CapacitorConfig } from "@capacitor/cli";

/**
 * NFC Smart Keychain — Capacitor configuration.
 *
 * The web app is server-rendered (TanStack Start) and talks to Lovable Cloud,
 * so the native shells load the hosted app over https instead of bundling a
 * static copy. `webDir` only holds an offline fallback page.
 *
 * Change `server.url` to your own published URL (or a custom domain later).
 */
const config: CapacitorConfig = {
  appId: "app.lovable.nfckeychain",
  appName: "NFC Smart Keychain",
  webDir: "mobile-shell",
  server: {
    url: "https://project--2d9e18a4-03ac-40ea-b4d9-42fbbb59d484.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
