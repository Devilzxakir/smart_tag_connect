import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { safeEmail, safeHttpUrl, safePhone } from "@/lib/destination";

export type PublicSocial = { label: string; url: string };

export type PublicLandingPage =
  | { found: false }
  | {
      found: true;
      title: string;
      imageUrl: string | null;
      description: string | null;
      website: string | null;
      phone: string | null;
      email: string | null;
      googleReview: string | null;
      socials: PublicSocial[];
    };

/** Public landing page used by /p/<slug>. Visitors never need an account. */
export const getLandingPage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string().min(2).max(64) }).parse(data),
  )
  .handler(async ({ data }): Promise<PublicLandingPage> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("landing_pages")
      .select("title, image_url, description, website, phone, email, google_review, socials, published")
      .eq("slug", data.slug.toLowerCase())
      .maybeSingle();

    if (error || !row || !row.published) return { found: false };

    // Every value that becomes a link is re-checked here, so a crafted row can
    // never produce a javascript:/data:/file: href on the public page.
    const socials = Array.isArray(row.socials)
      ? (row.socials as unknown[]).flatMap((s) => {
          if (!s || typeof s !== "object") return [];
          const rec = s as Record<string, unknown>;
          const label = typeof rec["label"] === "string" ? rec["label"].slice(0, 60) : "";
          const url = safeHttpUrl(typeof rec["url"] === "string" ? rec["url"] : null);
          if (!label || !url) return [];
          return [{ label, url }];
        }).slice(0, 12)
      : [];

    return {
      found: true,
      title: row.title.slice(0, 120),
      imageUrl: safeHttpUrl(row.image_url),
      description: row.description ? row.description.slice(0, 2000) : null,
      website: safeHttpUrl(row.website),
      phone: safePhone(row.phone),
      email: safeEmail(row.email),
      googleReview: safeHttpUrl(row.google_review),
      socials,
    };
  });
