/**
 * Native NFC bridge.
 *
 * Everything goes through `react-native-nfc-manager`, wrapped so the rest of
 * the app never touches the plugin directly. The record shapes match the web
 * app, so a tag written here reads the same in Chrome on Android and vice
 * versa.
 *
 * Rules kept from the web app:
 *  - nothing is reported as written until the tag itself confirms it,
 *  - capacity is checked before writing,
 *  - every error becomes a sentence a person can act on.
 */
import NfcManager, { Ndef, NdefStatus, NfcTech } from "react-native-nfc-manager";
import { Platform } from "react-native";

import type { ContentType } from "../types";
import { encodePayload, normalizeUrl, type Payload, validatePayload } from "./payload";

export * from "./payload";

export type NfcRecord = {
  /** How the record was encoded, for display. */
  kind: "uri" | "text" | "mime" | "empty" | "other";
  /** Human-readable content. */
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

let started = false;

/** Starts the NFC manager once per app session. Safe to call repeatedly. */
export async function initializeNfc(): Promise<void> {
  if (started) return;
  try {
    await NfcManager.start();
    started = true;
  } catch {
    // On a device without NFC hardware this throws; availability reports it.
    started = true;
  }
}

export async function getNfcAvailability(): Promise<NfcAvailability> {
  await initializeNfc();
  try {
    const supported = await NfcManager.isSupported();
    if (!supported) {
      return {
        supported: false,
        enabled: false,
        reason:
          Platform.OS === "ios"
            ? "This iPhone or the iOS Simulator has no NFC reader. Use a physical iPhone 7 or newer."
            : "This device has no NFC reader. Use a phone with NFC to write real tags.",
      };
    }
    const enabled = await NfcManager.isEnabled();
    return {
      supported: true,
      enabled,
      reason: enabled
        ? "NFC is on. Hold the tag flat against the back of the phone."
        : "NFC is switched off. Turn it on in phone settings, then try again.",
    };
  } catch (error) {
    return {
      supported: false,
      enabled: false,
      reason: friendlyNfcError(error),
    };
  }
}

/** Android only: jump straight to the system NFC toggle. */
export async function openNfcSettings(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await NfcManager.goToNfcSetting();
  } catch {
    return false;
  }
}

/* ---------------- record encoding ---------------- */

function toNdefRecords(payload: Payload) {
  const value = encodePayload(payload);
  switch (payload.type) {
    case "url":
    case "tel":
    case "email":
      return [Ndef.uriRecord(value)];
    case "vcard":
      return [Ndef.record(Ndef.TNF_MIME_MEDIA, "text/vcard", [], value)];
    case "text":
    case "wifi":
      return [Ndef.textRecord(value)];
  }
}

function recordLabel(type: ContentType): string {
  return {
    url: "Website link",
    text: "Text",
    tel: "Phone number",
    email: "Email",
    vcard: "Contact card",
    wifi: "Wi-Fi network",
  }[type];
}

/** NDEF record → display record, mirroring the web decoder. */
function decodeRecord(record: {
  tnf: number;
  type: number[] | string;
  payload: number[];
}): NfcRecord {
  const bytes = Uint8Array.from(record.payload ?? []);

  if (record.tnf === Ndef.TNF_EMPTY) {
    return { kind: "empty", value: "", label: "Empty record" };
  }

  if (Ndef.isType(record as never, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
    const uri = Ndef.uri.decodePayload(bytes);
    return { kind: "uri", value: uri, label: "Website link" };
  }

  if (Ndef.isType(record as never, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
    return { kind: "text", value: Ndef.text.decodePayload(bytes), label: "Text" };
  }

  const mime = typeof record.type === "string" ? record.type : Ndef.util.bytesToString(record.type);
  if (record.tnf === Ndef.TNF_MIME_MEDIA) {
    const value = Ndef.util.bytesToString(record.payload ?? []);
    return {
      kind: "mime",
      value,
      label: mime === "text/vcard" ? "Contact card" : mime || "MIME record",
    };
  }

  return {
    kind: "other",
    value: Ndef.util.bytesToString(record.payload ?? []),
    label: mime || "NDEF record",
  };
}

function decodeMessage(message: { tnf: number; type: number[] | string; payload: number[] }[]) {
  return message.map(decodeRecord).filter((r) => r.kind !== "empty" || message.length === 1);
}

/* ---------------- read ---------------- */

export async function readTag(timeoutMs = 20000): Promise<ReadResult> {
  await initializeNfc();
  const timer = setTimeout(() => {
    void NfcManager.cancelTechnologyRequest({ throwOnError: false });
  }, timeoutMs);

  try {
    await NfcManager.requestTechnology([NfcTech.Ndef], {
      alertMessage: "Hold your phone near the NFC tag.",
    });

    const tag = await NfcManager.getTag();
    const message = tag?.ndefMessage ?? [];
    return {
      records: decodeMessage(message),
      writable: typeof tag?.isWritable === "boolean" ? tag.isWritable : null,
      capacity: typeof tag?.maxSize === "number" ? tag.maxSize : null,
      techTypes: tag?.techTypes ?? [],
    };
  } catch (error) {
    throw new Error(friendlyNfcError(error));
  } finally {
    clearTimeout(timer);
    await NfcManager.cancelTechnologyRequest({ throwOnError: false }).catch(() => undefined);
  }
}

/* ---------------- write ---------------- */

export type WriteOptions = {
  /** Message shown by the iOS scan sheet. */
  alertMessage?: string;
  /** Skip the write and just report what would have been encoded (demo mode). */
  demo?: boolean;
};

const normalize = (value: string) => value.replace(/\s+/g, "").toLowerCase();

/**
 * Writes a payload and confirms what is actually on the chip. On both
 * platforms the tag stays in range for the read-back, so verification happens
 * in the same tap.
 */
export async function writePayload(payload: Payload, options: WriteOptions = {}): Promise<WriteOutcome> {
  const invalid = validatePayload(payload);
  if (invalid) throw new Error(invalid);

  if (options.demo) {
    return { verified: "unverified", readBack: [] };
  }

  await initializeNfc();
  const expected = encodePayload(payload);
  const records = toNdefRecords(payload);
  const bytes = Ndef.encodeMessage(records);

  try {
    await NfcManager.requestTechnology([NfcTech.Ndef], {
      alertMessage: options.alertMessage ?? "Hold your phone near the tag to write it.",
    });

    // Capacity / read-only check before we touch the chip.
    try {
      const { status, capacity } = await NfcManager.ndefHandler.getNdefStatus();
      if (status === NdefStatus.NotSupported) {
        throw new Error("This tag does not support NDEF, so it can’t store a link.");
      }
      if (status === NdefStatus.ReadOnly) {
        throw new Error("This tag is locked read-only. Use a blank tag.");
      }
      if (capacity > 0 && bytes.length > capacity) {
        throw new Error(
          `This tag holds ${capacity} bytes and this link needs ${bytes.length}. Use a shorter link or a bigger tag.`,
        );
      }
    } catch (error) {
      // iOS reports status lazily; only a real "can't write" message should stop us.
      const message = error instanceof Error ? error.message : "";
      if (message.includes("locked read-only") || message.includes("does not support NDEF")) throw error;
      if (message.includes("bytes and this link needs")) throw error;
    }

    await NfcManager.ndefHandler.writeNdefMessage(bytes);

    let readBack: string[] = [];
    let verified: WriteOutcome["verified"] = "unverified";
    try {
      const tag = await NfcManager.ndefHandler.getNdefMessage();
      readBack = decodeMessage(tag?.ndefMessage ?? [])
        .map((r) => r.value)
        .filter(Boolean);
      if (readBack.length > 0) {
        verified = readBack.some((v) => normalize(v) === normalize(expected)) ? "verified" : "mismatch";
      }
    } catch {
      verified = "unverified";
    }

    return { verified, readBack };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("This tag")) throw error;
    throw new Error(friendlyNfcError(error));
  } finally {
    await NfcManager.cancelTechnologyRequest({ throwOnError: false }).catch(() => undefined);
  }
}

/** Writes an empty NDEF message, the NDEF equivalent of blanking a tag. */
export async function eraseTag(): Promise<void> {
  await initializeNfc();
  try {
    await NfcManager.requestTechnology([NfcTech.Ndef], {
      alertMessage: "Hold your phone near the tag to erase it.",
    });
    await NfcManager.ndefHandler.writeNdefMessage(
      Ndef.encodeMessage([Ndef.record(Ndef.TNF_EMPTY, "", [], [])]),
    );
  } catch (error) {
    throw new Error(friendlyNfcError(error));
  } finally {
    await NfcManager.cancelTechnologyRequest({ throwOnError: false }).catch(() => undefined);
  }
}

export async function cancelNfc(): Promise<void> {
  await NfcManager.cancelTechnologyRequest({ throwOnError: false }).catch(() => undefined);
}

/* ---------------- errors ---------------- */

export function friendlyNfcError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (lower.includes("cancel")) return "Cancelled.";
  if (lower.includes("not supported") || lower.includes("unsupported")) {
    return "This device can’t use NFC.";
  }
  if (lower.includes("not enabled") || lower.includes("disabled") || lower.includes("turned off")) {
    return "NFC is switched off. Turn it on in phone settings and try again.";
  }
  if (lower.includes("size") || lower.includes("capacity") || lower.includes("too small")) {
    return "This link is too large for the tag. Use a shorter link or a bigger tag.";
  }
  if (lower.includes("read") && lower.includes("only")) {
    return "This tag is locked read-only. Use a blank tag.";
  }
  if (lower.includes("timeout") || lower.includes("no tag") || lower.includes("tag connection lost")) {
    return "No tag detected. Hold the tag still against the back of the phone and try again.";
  }
  if (lower.includes("session") || lower.includes("busy")) {
    return "The NFC reader is busy. Close other apps using NFC and try again.";
  }
  return message || "Something went wrong with the NFC reader. Try again.";
}

/** A one-line preview of what a payload writes, for the confirmation sheet. */
export function previewText(payload: Payload): string {
  if (payload.type === "url") return normalizeUrl(payload.url);
  return encodePayload(payload);
}

export function payloadLabel(type: ContentType): string {
  return recordLabel(type);
}
