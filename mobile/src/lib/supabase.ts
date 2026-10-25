import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Supabase client for the mobile app.
 *
 * The app talks to Postgres directly and relies on the same row-level security
 * policies as the web app: a signed-in user can only ever read and write their
 * own rows. There are no server functions in this app, so nothing here needs
 * the service-role key.
 *
 * Placeholder credentials are used when the project is not configured yet so
 * the client can still be constructed; the UI shows a setup screen instead of
 * issuing requests.
 */
const FALLBACK_URL = "https://unconfigured.supabase.co";
const FALLBACK_KEY = "unconfigured";

export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL : FALLBACK_URL,
  isSupabaseConfigured ? SUPABASE_PUBLISHABLE_KEY : FALLBACK_KEY,
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

export { isSupabaseConfigured };
