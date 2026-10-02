import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildDestination, isDestinationKind } from "@/lib/destination";

export type LostInfo = {
  message: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  formEnabled: boolean;
};

export type ResolvedTag =
  | { found: false }
  | {
      found: true;
      id: string;
      name: string;
      enabled: boolean;
      mode: "direct" | "dynamic";
      destination: string;
      lostMode: boolean;
      lost: LostInfo | null;
    };

function deviceTypeFrom(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobi|iphone|android/.test(s)) return "mobile";
  if (!s) return "unknown";
  return "desktop";
}

function requestCountry(): string | null {
  return (
    getRequestHeader("cf-ipcountry") ??
    getRequestHeader("x-vercel-ip-country") ??
    getRequestHeader("x-country-code") ??
    null
  );
}

/**
 * Public resolver for the permanent tag link (/t/<code>).
 * Runs on the server so a visitor's phone never needs the owner's session,
 * and only returns the few fields a visitor may see.
 */
export const resolveTag = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        code: z.string().min(4).max(32),
        source: z.enum(["nfc", "qr"]).default("nfc"),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<ResolvedTag> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("tags")
      .select(
        "id, name, enabled, mode, content, lost_mode, lost_message, lost_contact_name, lost_contact_phone, lost_contact_email, lost_form_enabled",
      )
      .eq("public_code", data.code.toUpperCase())
      .maybeSingle();

    if (error || !row) return { found: false };

    // Analytics: scan counts only. No GPS, no fingerprints, no IP storage.
    await supabaseAdmin.from("tag_events").insert({
      tag_id: row.id,
      source: data.source,
      device_type: deviceTypeFrom(getRequestHeader("user-agent") ?? ""),
      country: requestCountry(),
    });

    return {
      found: true,
      id: row.id,
      name: row.name,
      enabled: row.enabled,
      mode: row.mode === "dynamic" ? "dynamic" : "direct",
      destination: row.enabled && !row.lost_mode ? (row.content ?? "") : "",
      lostMode: row.lost_mode,
      lost: row.lost_mode
        ? {
            message: row.lost_message ?? "",
            contactName: row.lost_contact_name ?? "",
            contactPhone: row.lost_contact_phone ?? "",
            contactEmail: row.lost_contact_email ?? "",
            formEnabled: row.lost_form_enabled,
          }
        : null,
    };
  });

/** A finder's message from the lost-mode page. No login required. */
export const submitLostReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        code: z.string().min(4).max(32),
        finderName: z.string().max(120).optional(),
        finderContact: z.string().max(200).optional(),
        message: z.string().min(1).max(1000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("tags")
      .select("id, lost_mode, lost_form_enabled")
      .eq("public_code", data.code.toUpperCase())
      .maybeSingle();

    if (!row || !row.lost_mode || !row.lost_form_enabled) {
      return { ok: false as const, error: "This tag isn’t accepting messages." };
    }

    const { error } = await supabaseAdmin.from("lost_reports").insert({
      tag_id: row.id,
      finder_name: data.finderName?.trim() || null,
      finder_contact: data.finderContact?.trim() || null,
      message: data.message.trim(),
    });

    if (error) {
      // The database limits finder messages to 5 per tag per hour.
      if (error.message?.includes("rate_limited")) {
        return {
          ok: false as const,
          error: "Too many messages were sent for this tag. Please try again later.",
        };
      }
      return { ok: false as const, error: "Could not send your message." };
    }
    return { ok: true as const };
  });

/** Server-validated destination change for a dynamic tag (owner only). */
export const saveDestination = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        tagId: z.string().uuid(),
        kind: z.string(),
        value: z.string().min(1).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    if (!isDestinationKind(data.kind)) {
      return { ok: false as const, error: "Unknown destination type." };
    }
    const built = buildDestination(data.kind, data.value);
    if ("error" in built) return { ok: false as const, error: built.error };

    const { data: tag } = await context.supabase
      .from("tags")
      .select("id")
      .eq("id", data.tagId)
      .maybeSingle();
    if (!tag) return { ok: false as const, error: "Tag not found." };

    await context.supabase
      .from("tag_destinations")
      .update({ is_current: false })
      .eq("tag_id", data.tagId)
      .eq("is_current", true);

    const { error: insertError } = await context.supabase
      .from("tag_destinations")
      .insert({ tag_id: data.tagId, destination: built.value, is_current: true });
    if (insertError) return { ok: false as const, error: "Could not save the destination." };

    const { error: updateError } = await context.supabase
      .from("tags")
      .update({
        content: built.value,
        destination_kind: data.kind,
        content_type: "url",
      })
      .eq("id", data.tagId);
    if (updateError) return { ok: false as const, error: "Could not update the tag." };

    return { ok: true as const, destination: built.value };
  });
