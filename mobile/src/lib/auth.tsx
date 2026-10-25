/**
 * Authentication + profile, mirroring the web app's behaviour.
 *
 * Supabase owns the session (stored in AsyncStorage so it survives a restart),
 * and the `profiles` row is created by a database trigger on signup, so both
 * apps see the same account.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { PUBLIC_APP_URL, isSupabaseConfigured } from "./config";
import { supabase } from "./supabase";
import type { AppUser } from "./types";

type AuthContextValue = {
  user: AppUser | null;
  session: Session | null;
  ready: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: { fullName?: string; phone?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<{ full_name: string | null; phone: string | null; email: string | null } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return data as { full_name: string | null; phone: string | null; email: string | null } | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);

  const hydrate = useCallback(async (next: Session | null) => {
    if (!mounted.current) return;
    setSession(next);
    if (!next?.user) {
      setUser(null);
      setReady(true);
      return;
    }
    const profile = await fetchProfile(next.user.id);
    if (!mounted.current) return;
    setUser({
      id: next.user.id,
      email: profile?.email ?? next.user.email ?? "",
      fullName: profile?.full_name ?? (next.user.user_metadata["full_name"] as string | undefined) ?? null,
      phone: profile?.phone ?? (next.user.user_metadata["phone"] as string | undefined) ?? null,
    });
    setReady(true);
  }, []);

  useEffect(() => {
    mounted.current = true;

    if (!isSupabaseConfigured) {
      setReady(true);
      return () => {
        mounted.current = false;
      };
    }

    void supabase.auth
      .getSession()
      .then(({ data }) => hydrate(data.session))
      .catch(() => setReady(true));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      void hydrate(next);
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!error) return;

    if (error.message.includes("Email not confirmed")) {
      throw new Error("Please check your email and confirm your account before signing in.");
    }
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      throw new Error("Invalid email or password.");
    }
    throw new Error(error.message);
  }, []);

  const signUp = useCallback(
    async (input: { email: string; password: string; fullName: string; phone?: string }) => {
      if (input.phone) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone", input.phone)
          .maybeSingle();
        if (existing) {
          throw new Error("An account with this phone number already exists. Use a different number.");
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          // Confirmation happens on the hosted web app; the app itself never
          // needs the custom scheme to be allow-listed in Supabase.
          emailRedirectTo: `${PUBLIC_APP_URL}/home`,
          data: { full_name: input.fullName.trim(), phone: input.phone?.trim() ?? null },
        },
      });

      if (error) {
        if (/already registered|already exists/i.test(error.message)) {
          throw new Error("An account with this email already exists. Sign in instead.");
        }
        throw new Error(error.message);
      }
      return { needsConfirmation: !data.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const profile = await fetchProfile(session.user.id);
    if (!profile) return;
    setUser((prev) =>
      prev
        ? {
            ...prev,
            fullName: profile.full_name,
            phone: profile.phone,
            email: profile.email ?? prev.email,
          }
        : prev,
    );
  }, [session?.user]);

  const updateProfile = useCallback(
    async (patch: { fullName?: string; phone?: string }) => {
      if (!session?.user) throw new Error("You need to be signed in.");
      const updates: Record<string, string | null> = {};
      if (patch.fullName !== undefined) updates["full_name"] = patch.fullName.trim() || null;
      if (patch.phone !== undefined) updates["phone"] = patch.phone.trim() || null;
      if (Object.keys(updates).length === 0) return;

      const { error } = await supabase.from("profiles").update(updates).eq("id", session.user.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
    },
    [session?.user, refreshProfile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      ready,
      configured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      updateProfile,
      refreshProfile,
    }),
    [user, session, ready, signIn, signUp, signOut, updateProfile, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
