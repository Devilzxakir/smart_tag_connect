/**
 * Tag data access.
 *
 * All reads and writes go straight to Supabase and are scoped by row-level
 * security to the signed-in owner — the mobile app has no server of its own.
 * Column mapping matches `src/lib/store.ts` on the web.
 */
import { buildDestination, isDestinationKind } from "./destination";
import { makePublicCode } from "./links";
import { supabase } from "./supabase";
import type {
  ContentType,
  DestinationEntry,
  DestinationKind,
  LostReport,
  RangeKey,
  Tag,
  TagEvent,
  TagMode,
  TagStatus,
} from "./types";

type Row = {
  id: string;
  public_code: string;
  number: number;
  name: string;
  mode: string;
  enabled: boolean;
  content_type: string | null;
  content: string | null;
  destination_kind: string | null;
  landing_page_id: string | null;
  lost_mode: boolean | null;
  lost_message: string | null;
  lost_contact_name: string | null;
  lost_contact_phone: string | null;
  lost_contact_email: string | null;
  lost_form_enabled: boolean | null;
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
    mode: r.mode === "dynamic" ? "dynamic" : "direct",
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
  if (patch.lastWrittenAt !== undefined) {
    out["last_written_at"] = patch.lastWrittenAt ? new Date(patch.lastWrittenAt).toISOString() : null;
  }
  return out;
}

/* ---------------- tags ---------------- */

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("number", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(mapRow);
}

export async function getTag(id: string): Promise<Tag | null> {
  const { data, error } = await supabase.from("tags").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as Row) : null;
}

export async function createTag(input: {
  name?: string;
  mode?: TagMode;
  number: number;
}): Promise<Tag> {
  const { data, error } = await supabase
    .from("tags")
    .insert({
      number: input.number,
      name: input.name?.trim() || `Tag ${String(input.number).padStart(3, "0")}`,
      mode: input.mode ?? "direct",
      public_code: makePublicCode(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Row);
}

export async function updateTag(id: string, patch: Partial<Tag>): Promise<void> {
  const { error } = await supabase
    .from("tags")
    .update(toRow(patch) as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setTagEnabled(id: string, enabled: boolean): Promise<void> {
  await updateTag(id, { enabled });
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function regeneratePublicCode(id: string): Promise<string> {
  const code = makePublicCode();
  await updateTag(id, { publicCode: code });
  return code;
}

/* ---------------- destinations ---------------- */

export async function listDestinations(tagId: string): Promise<DestinationEntry[]> {
  const { data, error } = await supabase
    .from("tag_destinations")
    .select("*")
    .eq("tag_id", tagId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({
    id: d["id"] as string,
    tagId: d["tag_id"] as string,
    destination: d["destination"] as string,
    isCurrent: Boolean(d["is_current"]),
    createdAt: new Date(d["created_at"] as string).getTime(),
  }));
}

/**
 * Points a dynamic tag somewhere new without touching the physical tag.
 * Same steps as the web app's `saveDestination` server function, authorised by
 * row-level security instead of a server session.
 */
export async function saveDestination(
  tagId: string,
  kind: string,
  rawValue: string,
): Promise<string> {
  if (!isDestinationKind(kind)) throw new Error("Unknown destination type.");
  const built = buildDestination(kind, rawValue);
  if ("error" in built) throw new Error(built.error);

  const { error: clearError } = await supabase
    .from("tag_destinations")
    .update({ is_current: false })
    .eq("tag_id", tagId)
    .eq("is_current", true);
  if (clearError) throw new Error(clearError.message);

  const { error: insertError } = await supabase
    .from("tag_destinations")
    .insert({ tag_id: tagId, destination: built.value, is_current: true });
  if (insertError) throw new Error("Could not save the destination.");

  const { error: updateError } = await supabase
    .from("tags")
    .update({ content: built.value, destination_kind: kind, content_type: "url" })
    .eq("id", tagId);
  if (updateError) throw new Error("Could not update the tag.");

  return built.value;
}

/* ---------------- analytics ---------------- */

export async function listEvents(range: RangeKey, tagId?: string): Promise<TagEvent[]> {
  let query = supabase
    .from("tag_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (range !== "all") {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    query = query.gte("created_at", new Date(Date.now() - days * 864e5).toISOString());
  }
  if (tagId) query = query.eq("tag_id", tagId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    id: e["id"] as string,
    tagId: e["tag_id"] as string,
    source: (e["source"] === "qr" ? "qr" : "nfc") as "nfc" | "qr",
    deviceType: (e["device_type"] as string | null) ?? null,
    country: (e["country"] as string | null) ?? null,
    createdAt: new Date(e["created_at"] as string).getTime(),
  }));
}

/* ---------------- lost reports ---------------- */

export async function listLostReports(tagId: string): Promise<LostReport[]> {
  const { data, error } = await supabase
    .from("lost_reports")
    .select("*")
    .eq("tag_id", tagId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r["id"] as string,
    tagId: r["tag_id"] as string,
    finderName: (r["finder_name"] as string | null) ?? null,
    finderContact: (r["finder_contact"] as string | null) ?? null,
    message: r["message"] as string,
    createdAt: new Date(r["created_at"] as string).getTime(),
  }));
}
