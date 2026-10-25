/**
 * Runtime configuration for the mobile app.
 *
 * Values come from `EXPO_PUBLIC_*` variables (read from `mobile/.env` locally
 * and from repository secrets in CI). Only the Supabase *publishable* key is
 * ever used here — the service-role key must never reach a mobile bundle.
 */
import Constants from "expo-constants";

type Extra = {
  publicAppUrl?: string;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

const extra: Extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

export const SUPABASE_URL =
  clean(process.env.EXPO_PUBLIC_SUPABASE_URL) || clean(extra.supabaseUrl);

export const SUPABASE_PUBLISHABLE_KEY =
  clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || clean(extra.supabasePublishableKey);

/**
 * Public HTTPS origin used for permanent dynamic-tag links (`/t/<code>`).
 * Must be the deployed web app, not the phone-local WebView origin.
 */
export const PUBLIC_APP_URL = (
  clean(process.env.EXPO_PUBLIC_PUBLIC_APP_URL) ||
  clean(extra.publicAppUrl) ||
  "https://smart-tag-connect.vercel.app"
).replace(/\/+$/, "");

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";
