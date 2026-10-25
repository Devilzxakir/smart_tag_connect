/**
 * NFC payload encoding and validation — pure TypeScript, no native imports.
 *
 * The wire format matches the web app (`src/lib/nfc.ts`) exactly:
 *   url / tel / email → NDEF URI record
 *   text / wifi       → NDEF Text record
 *   vcard             → NDEF MIME record (text/vcard)
 *
 * A tag written by the phone can therefore be read by the web app (and vice
 * versa), and dynamic tags keep using the same `/t/<code>` link.
 */
import type { ContentType } from "../types";

export type Payload =
  | { type: "url"; url: string }
  | { type: "text"; text: string }
  | { type: "tel"; phone: string }
  | { type: "email"; email: string; subject?: string; body?: string }
  | { type: "vcard"; name: string; phone?: string; email?: string; org?: string }
  | { type: "wifi"; ssid: string; password?: string; security: "WPA" | "WEP" | "nopass" };

export const CONTENT_LABELS: Record<ContentType, string> = {
  url: "Website URL",
  text: "Plain text",
  tel: "Phone number",
  email: "Email",
  vcard: "Contact card",
  wifi: "Wi-Fi",
};

const DANGEROUS_PROTOCOLS = [
  "javascript:",
  "data:",
  "file:",
  "blob:",
  "vbscript:",
  "intent:",
  "content:",
  "chrome:",
  "about:",
];

function hasDangerousProtocol(url: string): boolean {
  const lower = url.toLowerCase();
  return DANGEROUS_PROTOCOLS.some((p) => lower.startsWith(p));
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function validateUrlForNfc(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Enter a website address.";

  const normalized = normalizeUrl(trimmed);
  if (hasDangerousProtocol(normalized)) {
    return "Dangerous protocol not allowed. Only https:// and http:// URLs are permitted.";
  }

  try {
    const u = new URL(normalized);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return "Only https:// and http:// URLs are allowed.";
    }
    if (!u.hostname.includes(".") && u.hostname !== "localhost") {
      return "That doesn't look like a valid website address.";
    }
  } catch {
    return "That doesn't look like a valid website address.";
  }
  return null;
}

export function encodePayload(p: Payload): string {
  switch (p.type) {
    case "url":
      return normalizeUrl(p.url);
    case "text":
      return p.text.trim();
    case "tel":
      return `tel:${p.phone.replace(/[^\d+]/g, "")}`;
    case "email": {
      const params = new URLSearchParams();
      if (p.subject?.trim()) params.set("subject", p.subject.trim());
      if (p.body?.trim()) params.set("body", p.body.trim());
      const qs = params.toString();
      return `mailto:${p.email.trim()}${qs ? `?${qs}` : ""}`;
    }
    case "vcard":
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${p.name.trim()}`,
        p.org?.trim() ? `ORG:${p.org.trim()}` : null,
        p.phone?.trim() ? `TEL;TYPE=CELL:${p.phone.trim()}` : null,
        p.email?.trim() ? `EMAIL:${p.email.trim()}` : null,
        "END:VCARD",
      ]
        .filter(Boolean)
        .join("\n");
    case "wifi":
      return `WIFI:T:${p.security};S:${p.ssid.trim()};${
        p.security === "nopass" ? "" : `P:${(p.password ?? "").trim()};`
      };`;
  }
}

export function validatePayload(p: Payload): string | null {
  switch (p.type) {
    case "url":
      return validateUrlForNfc(p.url);
    case "text":
      return p.text.trim() ? null : "Enter some text.";
    case "tel":
      return /^\+?[\d\s()-]{6,}$/.test(p.phone.trim()) ? null : "Enter a valid phone number.";
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()) ? null : "Enter a valid email address.";
    case "vcard":
      if (!p.name.trim()) return "Enter a contact name.";
      if (p.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) {
        return "Enter a valid email address.";
      }
      return null;
    case "wifi":
      if (!p.ssid.trim()) return "Enter the network name.";
      if (p.security !== "nopass" && (p.password ?? "").trim().length < 8) {
        return "Wi-Fi passwords are usually at least 8 characters.";
      }
      return null;
  }
}

/** UTF-8 byte length without depending on TextEncoder (Hermes ships without it on some versions). */
export function utf8Length(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

/** Common blank keychain tag (NTAG213) usable NDEF space, in bytes. */
export const TAG_CAPACITY_BYTES = 137;

export function payloadBytes(p: Payload): number {
  const body = utf8Length(encodePayload(p));
  const overhead = p.type === "vcard" ? 16 : p.type === "text" || p.type === "wifi" ? 9 : 7;
  return body + overhead;
}

export type SizeCheck = { bytes: number; capacity: number; level: "ok" | "tight" | "over" };

export function checkSize(p: Payload, capacity = TAG_CAPACITY_BYTES): SizeCheck {
  const bytes = payloadBytes(p);
  const level = bytes > capacity ? "over" : bytes > capacity * 0.8 ? "tight" : "ok";
  return { bytes, capacity, level };
}

/** Human label for an encoded destination, used in lists. */
export function describeValue(value: string): string {
  return value.length > 64 ? `${value.slice(0, 61)}…` : value;
}
