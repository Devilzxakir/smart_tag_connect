// Payload encoding/validation plus a thin façade over the active NFC service
// (native app, Web NFC, or demo mode). The UI imports only from here.

import {
  getNfcService,
  getPlatform,
  type NfcEngine,
  type NfcPlatform,
  type NfcRecord,
} from "./nfc-services";

export type NfcSupport = "supported" | "demo";

export type ContentType = "url" | "text" | "tel" | "email" | "vcard" | "wifi";

export const CONTENT_LABELS: Record<ContentType, string> = {
  url: "Website URL",
  text: "Plain text",
  tel: "Phone number",
  email: "Email",
  vcard: "Contact card",
  wifi: "Wi-Fi",
};

export type Payload =
  | { type: "url"; url: string }
  | { type: "text"; text: string }
  | { type: "tel"; phone: string }
  | { type: "email"; email: string; subject?: string; body?: string }
  | { type: "vcard"; name: string; phone?: string; email?: string; org?: string }
  | { type: "wifi"; ssid: string; password?: string; security: "WPA" | "WEP" | "nopass" };

/* ---------------- support ---------------- */

export function getNfcSupport(): NfcSupport {
  if (typeof window === "undefined") return "demo";
  if (!window.isSecureContext) return "demo";
  return "NDEFReader" in window ? "supported" : "demo";
}

export type NfcStatus = {
  mode: NfcSupport;
  /** Short plain-language explanation of why real NFC is or isn't available. */
  reason: string;
};

export function getNfcStatus(): NfcStatus {
  if (typeof window === "undefined") return { mode: "demo", reason: "Checking this device…" };

  if (!window.isSecureContext) {
    return {
      mode: "demo",
      reason: "Real NFC needs a secure (https) page. Open the app over https and try again.",
    };
  }

  if (!("NDEFReader" in window)) {
    const ua = navigator.userAgent;
    const android = /Android/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua);
    if (ios) {
      return {
        mode: "demo",
        reason:
          "Safari and other iPhone browsers don't give websites NFC access. Install this app as the iPhone app (built in Xcode) to read and write real tags with your iPhone.",
      };
    }

    if (android) {
      return {
        mode: "demo",
        reason:
          "This Android browser has no NFC access. Open the app in Chrome on Android and make sure NFC is turned on in phone settings.",
      };
    }
    return {
      mode: "demo",
      reason:
        "Real NFC only works on an Android phone using Chrome. On a computer you can still try every screen in demo mode.",
    };
  }

  return {
    mode: "supported",
    reason:
      "This device can read and write real tags. Make sure NFC is switched on in phone settings, then hold the tag flat against the back of the phone.",
  };
}

/** Ask the browser for NFC permission (Android Chrome). Returns the resulting state. */
export async function requestNfcPermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  try {
    const status = await (navigator.permissions as unknown as {
      query: (d: { name: string }) => Promise<{ state: "granted" | "denied" | "prompt" }>;
    }).query({ name: "nfc" });
    return status.state;
  } catch {
    return "unknown";
  }
}

/** Turn raw Web NFC errors into something a person can act on. */
export function friendlyNfcError(e: unknown): string {
  const name = (e as { name?: string } | null)?.name;
  const message = e instanceof Error ? e.message : "";
  switch (name) {
    case "NotAllowedError":
      return "NFC permission was refused. Allow NFC for this site in the browser prompt, then try again.";
    case "NotSupportedError":
      return "This device or browser can't access NFC hardware.";
    case "NotReadableError":
      return "NFC is switched off, or another app is using it. Turn NFC on in phone settings and try again.";
    case "NetworkError":
      return "The tag moved away too soon. Hold it still against the phone until the result shows.";
    case "AbortError":
      return "Cancelled.";
    default:
      return message || "Something went wrong with the tag. Try again.";
  }
}

/* ---------------- encoding ---------------- */

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Human-readable string of exactly what goes onto the tag. */
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

type RecordInit = { recordType: string; data?: string; mediaType?: string };

function toRecord(p: Payload): RecordInit {
  const value = encodePayload(p);
  switch (p.type) {
    case "url":
    case "tel":
    case "email":
      return { recordType: "url", data: value };
    case "vcard":
      return { recordType: "mime", mediaType: "text/vcard", data: value };
    case "text":
    case "wifi":
      return { recordType: "text", data: value };
  }
}

/* ---------------- validation ---------------- */

export function validatePayload(p: Payload): string | null {
  switch (p.type) {
    case "url": {
      if (!p.url.trim()) return "Enter a website address.";
      try {
        const u = new URL(normalizeUrl(p.url));
        if (!u.hostname.includes(".")) return "That doesn’t look like a valid website address.";
      } catch {
        return "That doesn’t look like a valid website address.";
      }
      return null;
    }
    case "text":
      return p.text.trim() ? null : "Enter some text.";
    case "tel":
      return /^\+?[\d\s()-]{6,}$/.test(p.phone.trim()) ? null : "Enter a valid phone number.";
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()) ? null : "Enter a valid email address.";
    case "vcard":
      if (!p.name.trim()) return "Enter a contact name.";
      if (p.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()))
        return "Enter a valid email address.";
      return null;
    case "wifi":
      if (!p.ssid.trim()) return "Enter the network name.";
      if (p.security !== "nopass" && (p.password ?? "").trim().length < 8)
        return "Wi-Fi passwords are usually at least 8 characters.";
      return null;
  }
}

/* ---------------- capacity ---------------- */

/** Common blank keychain tag (NTAG213) usable NDEF space, in bytes. */
export const TAG_CAPACITY_BYTES = 137;

export function payloadBytes(p: Payload): number {
  const value = encodePayload(p);
  const body = new TextEncoder().encode(value).length;
  // rough NDEF record overhead (header + type + length fields)
  const overhead = p.type === "vcard" ? 16 : p.type === "text" || p.type === "wifi" ? 9 : 7;
  return body + overhead;
}

export type SizeCheck = { bytes: number; capacity: number; level: "ok" | "tight" | "over" };

export function checkSize(p: Payload): SizeCheck {
  const bytes = payloadBytes(p);
  const level = bytes > TAG_CAPACITY_BYTES ? "over" : bytes > TAG_CAPACITY_BYTES * 0.8 ? "tight" : "ok";
  return { bytes, capacity: TAG_CAPACITY_BYTES, level };
}

/* ---------------- read / write / erase ---------------- */

function toServiceRecord(p: Payload): NfcRecord {
  const record = toRecord(p);
  return {
    recordType: record.recordType as NfcRecord["recordType"],
    value: record.data ?? "",
    ...(record.mediaType ? { mediaType: record.mediaType } : {}),
  };
}

export async function writePayload(p: Payload, signal?: AbortSignal): Promise<void> {
  await getNfcService().write([toServiceRecord(p)], signal);
}

export async function eraseTag(signal?: AbortSignal): Promise<void> {
  await getNfcService().erase(signal);
}

export async function readTagOnce(timeoutMs = 20000, cancel?: AbortSignal): Promise<string[]> {
  const result = await getNfcService().read(timeoutMs, cancel);
  return result.records.map((r) => r.value).filter((v) => Boolean(v && v.trim()));
}

/** Stop an in-progress scan or write. */
export async function cancelNfc(): Promise<void> {
  await getNfcService().cancel();
}

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

/** Read back after writing to confirm the data really landed on the tag. */
export async function verifyWrite(expected: string): Promise<"verified" | "mismatch" | "unverified"> {
  try {
    const values = await readTagOnce(8000);
    if (values.length === 0) return "unverified";
    return values.some((v) => norm(v) === norm(expected)) ? "verified" : "mismatch";
  } catch {
    return "unverified";
  }
}

/**
 * Write, then confirm what is actually on the chip.
 * Native platforms verify inside the same tap; Web NFC needs a second tap.
 */
export async function writeAndVerify(
  p: Payload,
  signal?: AbortSignal,
): Promise<"verified" | "mismatch" | "unverified"> {
  const expected = encodePayload(p);
  const result = await getNfcService().write([toServiceRecord(p)], signal);
  if (result.records.length > 0) {
    return result.records.some((r) => norm(r.value) === norm(expected)) ? "verified" : "mismatch";
  }
  return verifyWrite(expected);
}

/* ---------------- diagnostics ---------------- */

export type NfcDiagnostics = NfcStatus & {
  platform: NfcPlatform;
  engine: NfcEngine;
  serviceName: string;
  available: boolean;
};

/** Full picture of where the app runs and which NFC implementation is active. */
export async function resolveNfcStatus(): Promise<NfcDiagnostics> {
  const service = getNfcService();
  const platform = getPlatform();
  const availability = await service.isAvailable();
  const base =
    service.engine === "web" || service.engine === "mock"
      ? getNfcStatus()
      : {
          mode: availability.available ? ("supported" as const) : ("demo" as const),
          reason: availability.reason,
        };

  return {
    mode: availability.available ? "supported" : "demo",
    reason: availability.available ? availability.reason : base.reason,
    platform,
    engine: service.engine,
    serviceName: service.name,
    available: availability.available,
  };
}
