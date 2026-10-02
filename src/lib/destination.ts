/** Validation for dynamic tag destinations (links the tag will open). */

const BLOCKED_PROTOCOLS = ["javascript:", "data:", "file:", "blob:", "vbscript:"];

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd")) return true;
  if (/^0\.|^127\.|^10\.|^192\.168\.|^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

/**
 * Returns the value only when it is a plain, safe http(s) link.
 * Used before any stored value becomes an href, so a crafted row can never
 * turn into javascript:/data:/file: on a public page.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (validateDestination(trimmed)) return null;
  return trimmed;
}

/** Phone/email values that are safe to place in tel:/mailto: links. */
export function safePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  return /^[+0-9 ()./-]{6,40}$/.test(cleaned) ? cleaned : null;
}

export function safeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  return /^[^\s@<>"']{1,64}@[^\s@<>"']{1,120}\.[a-z]{2,24}$/i.test(cleaned) ? cleaned : null;
}

export function normalizeDestination(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Returns null when the destination is safe to use, otherwise a message. */
export function validateDestination(raw: string): string | null {
  const value = normalizeDestination(raw);
  if (!value) return "Enter a web address.";

  const lower = value.toLowerCase();
  if (BLOCKED_PROTOCOLS.some((p) => lower.startsWith(p))) {
    return "Only normal web links (https://) are allowed.";
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "That doesn’t look like a valid web address.";
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Only normal web links (https://) are allowed.";
  }
  if (!url.hostname.includes(".") && url.hostname !== "localhost") {
    return "That doesn’t look like a valid web address.";
  }
  if (isPrivateHost(url.hostname)) {
    return "Private or local addresses can’t be used as a destination.";
  }
  return null;
}

/* ---------------- destination kinds ---------------- */

export type DestinationKind =
  | "website"
  | "google_review"
  | "social"
  | "phone"
  | "email"
  | "contact"
  | "landing";

export const DESTINATION_LABELS: Record<DestinationKind, string> = {
  website: "Website",
  google_review: "Google Review",
  social: "Social link",
  phone: "Phone number",
  email: "Email address",
  contact: "Contact card",
  landing: "Landing page",
};

export const DESTINATION_HINTS: Record<DestinationKind, string> = {
  website: "https://example.com",
  google_review: "https://g.page/r/…/review",
  social: "https://instagram.com/yourname",
  phone: "+1 555 123 4567",
  email: "hello@example.com",
  contact: "Name, phone and email",
  landing: "Pick one of your landing pages",
};

export function isDestinationKind(value: string): value is DestinationKind {
  return value in DESTINATION_LABELS;
}

export function normalizePhone(raw: string): string {
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  return cleaned.startsWith("tel:") ? cleaned : `tel:${cleaned}`;
}

export function buildVCard(input: { name: string; phone?: string; email?: string; org?: string }) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${input.name}`,
    input.org ? `ORG:${input.org}` : "",
    input.phone ? `TEL:${input.phone}` : "",
    input.email ? `EMAIL:${input.email}` : "",
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * Turns a raw input for a given destination kind into the stored destination.
 * Returns an error message instead when the value is unsafe or incomplete.
 */
export function buildDestination(
  kind: DestinationKind,
  raw: string,
): { value: string } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Enter a destination." };

  if (kind === "phone") {
    const digits = trimmed.replace(/[^\d]/g, "");
    if (digits.length < 6) return { error: "Enter a valid phone number." };
    return { value: normalizePhone(trimmed) };
  }

  if (kind === "email") {
    const address = trimmed.replace(/^mailto:/i, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      return { error: "Enter a valid email address." };
    }
    return { value: `mailto:${address}` };
  }

  if (kind === "contact") {
    if (!trimmed.startsWith("BEGIN:VCARD")) return { error: "Add at least a contact name." };
    return { value: trimmed };
  }

  if (kind === "landing") {
    if (!/^\/p\/[a-z0-9-]{3,64}$/.test(trimmed)) return { error: "Pick a landing page." };
    return { value: trimmed };
  }

  const error = validateDestination(trimmed);
  if (error) return { error };
  return { value: normalizeDestination(trimmed) };
}

export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
