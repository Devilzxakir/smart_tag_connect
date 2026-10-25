/**
 * Web stand-in for the native NFC bridge.
 *
 * Metro picks this file for `expo start --web` / `expo export --platform web`,
 * so the browser build never imports the native module. Desktop and iOS
 * browsers have no Web NFC, so everything here reports "no reader" and writes
 * fall back to the explicit demo path — the UI then behaves exactly as it does
 * on an emulator.
 */
import { encodePayload, normalizeUrl, type Payload, validatePayload } from "./payload";

export * from "./payload";

export type NfcRecord = {
  kind: "uri" | "text" | "mime" | "empty" | "other";
  value: string;
  label: string;
};

export type NfcAvailability = {
  supported: boolean;
  enabled: boolean;
  reason: string;
};

export type ReadResult = {
  records: NfcRecord[];
  writable: boolean | null;
  capacity: number | null;
  techTypes: string[];
};

export type WriteOutcome = {
  verified: "verified" | "mismatch" | "unverified";
  readBack: string[];
};

const NO_READER =
  "This browser has no NFC reader. Open the app on an Android phone to read and write real tags.";

export async function initializeNfc(): Promise<void> {
  // Nothing to start in a browser.
}

export async function getNfcAvailability(): Promise<NfcAvailability> {
  return { supported: false, enabled: false, reason: NO_READER };
}

export async function openNfcSettings(): Promise<boolean> {
  return false;
}

export async function readTag(): Promise<ReadResult> {
  throw new Error(NO_READER);
}

export async function writePayload(
  payload: Payload,
  options: { alertMessage?: string; demo?: boolean } = {},
): Promise<WriteOutcome> {
  const invalid = validatePayload(payload);
  if (invalid) throw new Error(invalid);
  if (!options.demo) throw new Error(NO_READER);
  return { verified: "unverified", readBack: [] };
}

export async function eraseTag(): Promise<void> {
  throw new Error(NO_READER);
}

export async function cancelNfc(): Promise<void> {
  // No session to cancel.
}

export function friendlyNfcError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message || "Something went wrong with the NFC reader. Try again.";
}

export function previewText(payload: Payload): string {
  if (payload.type === "url") return normalizeUrl(payload.url);
  return encodePayload(payload);
}

export function payloadLabel(type: string): string {
  return type;
}
