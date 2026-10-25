/**
 * Destination validation for dynamic tags.
 *
 * This is a faithful port of the web app's `src/lib/destination.ts`. Keep the
 * rules in sync: the mobile app writes the same rows, and the public resolver
 * re-validates everything before a value becomes a link.
 */
import type { DestinationKind } from "./types";

const BLOCKED_PROTOCOLS = ["javascript:", "data:", "file:", "blob:", "vbscript:"];

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd")) return true;
  if (/^0\.|^127\.|^10\.|^192\.168\.|^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
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

export const DESTINATION_LABELS: Record<DestinationKind, string> = {
  website: "Website",
  google_review: "Google review",
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
  phone: "+91 98765 43210",
  email: "hello@example.com",
  contact: "Name, phone and email",
  landing: "/p/my-page",
};

export function isDestinationKind(value: string): value is DestinationKind {
  return value in DESTINATION_LABELS;
}

export function normalizePhone(raw: string): string {
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  return cleaned.startsWith("tel:") ? cleaned : `tel:${cleaned}`;
}

export function buildVCard(input: { name: string; phone?: string; email?: string; org?: string }) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${input.name}`,
    input.org ? `ORG:${input.org}` : "",
    input.phone ? `TEL:${input.phone}` : "",
    input.email ? `EMAIL:${input.email}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Turns raw input for a destination kind into the stored destination value. */
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
