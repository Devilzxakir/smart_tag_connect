import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DestinationKind } from "./destination";
import type { ContentType } from "./nfc";
import { saveDestination as saveDestinationFn } from "./tags.functions";

export type TagStatus = "empty" | "written" | "demo" | "failed";
export type TagMode = "direct" | "dynamic";

export type Tag = {
  id: string;
  /** Permanent, random, non-guessable code written to dynamic tags: /t/<publicCode>. */
  publicCode: string;
  number: number;
  name: string;
  mode: TagMode;
  enabled: boolean;
  contentType: ContentType | null;
  /** Direct tags: the content. Dynamic tags: the current destination. */
  content: string;
  destinationKind: DestinationKind;
  landingPageId: string | null;
  lostMode: boolean;
  lostMessage: string;
  lostContactName: string;
  lostContactPhone: string;
  lostContactEmail: string;
  lostFormEnabled: boolean;
  /** Exactly what was written to real NFC hardware (never set in demo mode). */
  writtenContent: string | null;
  /** Simulated content from demo-mode writes. Kept apart from real writes. */
  demoContent: string | null;
  status: TagStatus;
  verified: "verified" | "mismatch" | "unverified" | null;
  createdAt: number;
  lastWrittenAt: number | null;
};

export type DestinationEntry = {
  id: string;
  tagId: string;
  destination: string;
  isCurrent: boolean;
  createdAt: number;
};

export type LandingPage = {
  id: string;
  slug: string;
  title: string;
  imageUrl: string;
  description: string;
  website: string;
  phone: string;
  email: string;
  googleReview: string;
  socials: { label: string; url: string }[];
  published: boolean;
  createdAt: number;
};

export type TagEvent = {
  id: string;
  tagId: string;
  source: "nfc" | "qr";
  deviceType: string | null;
  country: string | null;
  createdAt: number;
};

export type LostReport = {
  id: string;
  tagId: string;
  finderName: string | null;
  finderContact: string | null;
  message: string;
  createdAt: number;
};

/* ---------------- helpers ---------------- */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makePublicCode(length = 8): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function formatNumber(n: number) {
  return `Tag ${String(n).padStart(3, "0")}`;
}

/** Permanent link written to dynamic tags. Uses the app's current URL. */
export function tagUrl(tag: Pick<Tag, "publicCode">): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/t/${tag.publicCode}`;
}

/** Same permanent link, marked so scans from a QR code are counted separately. */
export function tagQrUrl(tag: Pick<Tag, "publicCode">): string {
  return `${tagUrl(tag)}?s=qr`;
}

type Row = {
  id: string;
  public_code: string;
  number: number;
  name: string;
  mode: string;
  enabled: boolean;
  content_type: string | null;
  content: string;
  destination_kind: string | null;
  landing_page_id: string | null;
  lost_mode: boolean;
  lost_message: string | null;
  lost_contact_name: string | null;
  lost_contact_phone: string | null;
  lost_contact_email: string | null;
  lost_form_enabled: boolean;
  written_content: string | null;
  demo_content: string | null;
  status: string;
  verified: string | null;
  created_at: string;
  last_written_at: string | null;
};

function mapRow(r: Row): Tag {
  return {
    id: r.id,
    publicCode: r.public_code,
    number: r.number,
    name: r.name,
    mode: (r.mode === "dynamic" ? "dynamic" : "direct") as TagMode,
    enabled: r.enabled,
    contentType: (r.content_type as ContentType | null) ?? null,
    content: r.content ?? "",
    destinationKind: (r.destination_kind as DestinationKind | null) ?? "website",
    landingPageId: r.landing_page_id,
    lostMode: r.lost_mode ?? false,
    lostMessage: r.lost_message ?? "",
    lostContactName: r.lost_contact_name ?? "",
    lostContactPhone: r.lost_contact_phone ?? "",
    lostContactEmail: r.lost_contact_email ?? "",
    lostFormEnabled: r.lost_form_enabled ?? true,
    writtenContent: r.written_content,
    demoContent: r.demo_content,
    status: r.status as TagStatus,
    verified: (r.verified as Tag["verified"]) ?? null,
    createdAt: new Date(r.created_at).getTime(),
    lastWrittenAt: r.last_written_at ? new Date(r.last_written_at).getTime() : null,
  };
}

function toRow(patch: Partial<Tag>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.name !== undefined) out["name"] = patch.name;
  if (patch.mode !== undefined) out["mode"] = patch.mode;
  if (patch.enabled !== undefined) out["enabled"] = patch.enabled;
  if (patch.contentType !== undefined) out["content_type"] = patch.contentType;
  if (patch.content !== undefined) out["content"] = patch.content;
  if (patch.destinationKind !== undefined) out["destination_kind"] = patch.destinationKind;
  if (patch.landingPageId !== undefined) out["landing_page_id"] = patch.landingPageId;
  if (patch.lostMode !== undefined) out["lost_mode"] = patch.lostMode;
  if (patch.lostMessage !== undefined) out["lost_message"] = patch.lostMessage;
  if (patch.lostContactName !== undefined) out["lost_contact_name"] = patch.lostContactName;
  if (patch.lostContactPhone !== undefined) out["lost_contact_phone"] = patch.lostContactPhone;
  if (patch.lostContactEmail !== undefined) out["lost_contact_email"] = patch.lostContactEmail;
  if (patch.lostFormEnabled !== undefined) out["lost_form_enabled"] = patch.lostFormEnabled;
  if (patch.writtenContent !== undefined) out["written_content"] = patch.writtenContent;
  if (patch.demoContent !== undefined) out["demo_content"] = patch.demoContent;
  if (patch.status !== undefined) out["status"] = patch.status;
  if (patch.verified !== undefined) out["verified"] = patch.verified;
  if (patch.publicCode !== undefined) out["public_code"] = patch.publicCode;
  if (patch.lastWrittenAt !== undefined)
    out["last_written_at"] = patch.lastWrittenAt ? new Date(patch.lastWrittenAt).toISOString() : null;
  return out;
}

/* ---------------- auth ---------------- */

export type User = { id: string; email: string; fullName: string | null; phone: string | null };

export async function signUp(email: string, password: string, fullName?: string, phone?: string) {
  // Check if phone already exists in profiles (if phone provided)
  if (phone) {
    const { data: existingPhone } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    
    if (existingPhone) {
      throw new Error("An account with this phone number already exists. Please use a different number.");
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/home`,
      data: { full_name: fullName, phone },
    },
  });

  if (error) {
    console.error("SignUp error:", error.message, error);
    // Handle specific Supabase auth errors
    if (error.message.includes("User already registered") || error.message.includes("email already registered")) {
      throw new Error("An account with this email already exists. Please log in instead.");
    }
    throw new Error(error.message);
  }
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  // Try up to 3 times with small delay (handles timing issues after signup)
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return data;
    
    console.error(`SignIn attempt ${attempt} error:`, error.message, error);
    
    // Don't retry on these errors
    if (error.message.includes("Email not confirmed")) {
      throw new Error("Please check your email and confirm your account before logging in.");
    }
    if (error.message.includes("Invalid login credentials") && attempt === 3) {
      throw new Error("Invalid email or password.");
    }
    
    // Wait before retry
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
  throw new Error("Invalid email or password.");
}

export async function signOut() {
  await supabase.auth.signOut();
  cache = null;
  notify();
}

export async function updateProfile(userId: string, patch: { fullName?: string; phone?: string }) {
  const updates: { full_name?: string; phone?: string } = {};
  if (patch.fullName !== undefined) updates.full_name = patch.fullName;
  if (patch.phone !== undefined) updates.phone = patch.phone;
  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) throw error;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("email, full_name, phone").eq("id", userId).single();
    return data;
  };

  const updateUserWithProfile = async (session: { user: { id: string; email?: string | null } } | null) => {
    if (!session?.user) {
      setUser(null);
      setReady(true);
      return;
    }
    const profile = await fetchProfile(session.user.id);
    const p = profile as Record<string, unknown> | null;
    const emailVal = p && typeof p['email'] === 'string' ? p['email'] as string : null;
    const fullNameVal = p && typeof p['full_name'] === 'string' ? p['full_name'] as string : null;
    const phoneVal = p && typeof p['phone'] === 'string' ? p['phone'] as string : null;
    setUser({
      id: session.user.id,
      email: emailVal ?? session.user.email ?? "",
      fullName: fullNameVal,
      phone: phoneVal,
    });
    setReady(true);
  };

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active) return;
      updateUserWithProfile(session);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      updateUserWithProfile(data.session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, ready };
}

/* ---------------- tags ---------------- */

let cache: Tag[] | null = null;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

export async function refreshTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  cache = ((data ?? []) as Row[]).map(mapRow);
  notify();
  return cache;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    const sync = () => {
      setTags(cache ?? []);
      setLoading(false);
    };
    subscribers.add(sync);
    void refreshTags()
      .catch(() => undefined)
      .finally(sync);
    return () => {
      subscribers.delete(sync);
    };
  }, []);

  return { tags, loading };
}

export function useTag(id: string) {
  const { tags, loading } = useTags();
  return { tag: tags.find((t) => t.id === id), loading };
}

export async function createTag(name?: string, mode: TagMode = "direct"): Promise<Tag> {
  const tags = cache ?? (await refreshTags());
  const number = tags.reduce((max, t) => Math.max(max, t.number), 0) + 1;
  const { data, error } = await supabase
    .from("tags")
    .insert({
      number,
      name: name?.trim() || formatNumber(number),
      mode,
      public_code: makePublicCode(),
    })
    .select("*")
    .single();
  if (error) throw error;
  await refreshTags();
  return mapRow(data as Row);
}

export async function updateTag(id: string, patch: Partial<Tag>) {
  const { error } = await supabase.from("tags").update(toRow(patch) as never).eq("id", id);
  if (error) throw error;
  await refreshTags();
}

export async function setTagEnabled(id: string, enabled: boolean) {
  await updateTag(id, { enabled });
}

export async function regeneratePublicCode(id: string) {
  await updateTag(id, { publicCode: makePublicCode() });
}

export async function deleteTag(id: string) {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
  await refreshTags();
}

/* ---------------- dynamic destinations ---------------- */

export async function listDestinations(tagId: string): Promise<DestinationEntry[]> {
  const { data, error } = await supabase
    .from("tag_destinations")
    .select("*")
    .eq("tag_id", tagId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id as string,
    tagId: d.tag_id as string,
    destination: d.destination as string,
    isCurrent: d.is_current as boolean,
    createdAt: new Date(d.created_at as string).getTime(),
  }));
}

/**
 * Point a dynamic tag somewhere new. The physical tag is never rewritten.
 * The destination is validated on the server before it is stored.
 */
export async function setDestination(
  tagId: string,
  value: string,
  kind: DestinationKind = "website",
) {
  const result = await saveDestinationFn({ data: { tagId, kind, value } });
  if (!result.ok) throw new Error(result.error);
  await refreshTags();
  return result.destination;
}

export function useDestinations(tagId: string) {
  const [entries, setEntries] = useState<DestinationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    listDestinations(tagId)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [tagId]);

  useEffect(reload, [reload]);

  return { entries, loading, reload };
}

/* ---------------- landing pages ---------------- */

type PageRow = {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  google_review: string | null;
  socials: unknown;
  published: boolean;
  created_at: string;
};

function mapPage(r: PageRow): LandingPage {
  const socials = Array.isArray(r.socials)
    ? (r.socials as { label?: string; url?: string }[]).map((s) => ({
        label: s.label ?? "",
        url: s.url ?? "",
      }))
    : [];
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    imageUrl: r.image_url ?? "",
    description: r.description ?? "",
    website: r.website ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    googleReview: r.google_review ?? "",
    socials,
    published: r.published,
    createdAt: new Date(r.created_at).getTime(),
  };
}

export async function listLandingPages(): Promise<LandingPage[]> {
  const { data, error } = await supabase
    .from("landing_pages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as PageRow[]).map(mapPage);
}

export function useLandingPages() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    listLandingPages()
      .then(setPages)
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  return { pages, loading, reload };
}

export async function createLandingPage(title: string, slug: string): Promise<LandingPage> {
  const { data, error } = await supabase
    .from("landing_pages")
    .insert({ title, slug })
    .select("*")
    .single();
  if (error) throw error;
  return mapPage(data as PageRow);
}

export async function updateLandingPage(id: string, patch: Partial<LandingPage>) {
  const out: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) out["title"] = patch.title;
  if (patch.slug !== undefined) out["slug"] = patch.slug;
  if (patch.imageUrl !== undefined) out["image_url"] = patch.imageUrl || null;
  if (patch.description !== undefined) out["description"] = patch.description || null;
  if (patch.website !== undefined) out["website"] = patch.website || null;
  if (patch.phone !== undefined) out["phone"] = patch.phone || null;
  if (patch.email !== undefined) out["email"] = patch.email || null;
  if (patch.googleReview !== undefined) out["google_review"] = patch.googleReview || null;
  if (patch.socials !== undefined) out["socials"] = patch.socials;
  if (patch.published !== undefined) out["published"] = patch.published;

  const { error } = await supabase.from("landing_pages").update(out as never).eq("id", id);
  if (error) throw error;
}

export async function deleteLandingPage(id: string) {
  const { error } = await supabase.from("landing_pages").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- analytics ---------------- */

export type RangeKey = "7d" | "30d" | "90d" | "all";

export const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  all: "All time",
};

export function rangeStart(range: RangeKey): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function listEvents(range: RangeKey, tagId?: string): Promise<TagEvent[]> {
  let query = supabase
    .from("tag_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);

  const start = rangeStart(range);
  if (start) query = query.gte("created_at", start.toISOString());
  if (tagId) query = query.eq("tag_id", tagId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id as string,
    tagId: e.tag_id as string,
    source: (e.source === "qr" ? "qr" : "nfc") as "nfc" | "qr",
    deviceType: (e.device_type as string | null) ?? null,
    country: (e.country as string | null) ?? null,
    createdAt: new Date(e.created_at as string).getTime(),
  }));
}

export function useEvents(range: RangeKey, tagId?: string) {
  const [events, setEvents] = useState<TagEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listEvents(range, tagId)
      .then((e) => active && setEvents(e))
      .catch(() => active && setEvents([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range, tagId]);

  return { events, loading };
}

/* ---------------- lost reports ---------------- */

export function useLostReports(tagId: string) {
  const [reports, setReports] = useState<LostReport[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    void supabase
      .from("lost_reports")
      .select("*")
      .eq("tag_id", tagId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setReports(
          (data ?? []).map((r) => ({
            id: r.id as string,
            tagId: r.tag_id as string,
            finderName: (r.finder_name as string | null) ?? null,
            finderContact: (r.finder_contact as string | null) ?? null,
            message: r.message as string,
            createdAt: new Date(r.created_at as string).getTime(),
          })),
        );
        setLoading(false);
      });
  }, [tagId]);

  useEffect(reload, [reload]);

  return { reports, loading, reload };
}
