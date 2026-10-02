/** Shared NFC service contract. The UI never needs to know which one is active. */

export type NfcRecordType = "url" | "text" | "mime" | "empty";

export type NfcRecord = {
  recordType: NfcRecordType;
  value: string;
  mediaType?: string;
};

export type NfcEngine = "mock" | "web" | "native";

export type NfcPlatform = "web" | "android" | "ios";

export type NfcAvailability = { available: boolean; reason: string };

export type NfcReadResult = { records: NfcRecord[]; writable?: boolean };

export interface NfcService {
  /** Which implementation this is: MockNfcService, WebNfcService or NativeNfcService. */
  readonly engine: NfcEngine;
  /** Human-friendly implementation name, for the diagnostics screen. */
  readonly name: string;
  isAvailable(): Promise<NfcAvailability>;
  read(timeoutMs?: number, cancel?: AbortSignal): Promise<NfcReadResult>;
  /** Resolves only when the hardware reports the write succeeded. */
  write(records: NfcRecord[], cancel?: AbortSignal): Promise<NfcReadResult>;
  erase(cancel?: AbortSignal): Promise<void>;
  cancel(): Promise<void>;
}
