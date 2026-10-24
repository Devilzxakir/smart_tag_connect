import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Smart Tag Connect — Capacitor configuration.
 *
 * The web app is server-rendered (TanStack Start) and talks to Supabase,
 * so the native shells load the hosted app over https instead of bundling a
 * static copy. `webDir` only holds an offline fallback page.
 *
 * `appId` is the existing native application identifier shared by the Android
 * and iOS projects. Changing it requires updating android/app/build.gradle,
 * the Java package, strings.xml (custom_url_scheme) and the iOS bundle id,
 * plus any OAuth redirect allow-lists — so only rename it deliberately.
 *
 * Change `server.url` to your own deployed URL (or a custom domain later),
 * then run `npx cap sync`.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.nfckeychain",
  appName: "Smart Tag Connect",
  webDir: "mobile-shell",
  server: {
    url: "https://smart-tag-connect.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
