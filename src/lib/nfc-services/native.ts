import { registerPlugin } from "@capacitor/core";
import type { NfcAvailability, NfcReadResult, NfcRecord, NfcService } from "./types";

type PluginReadResult = { records?: NfcRecord[]; writable?: boolean; success?: boolean };

export interface SmartNfcPlugin {
  isAvailable(): Promise<NfcAvailability>;
  read(options: { timeoutMs?: number }): Promise<PluginReadResult>;
  write(options: { records: NfcRecord[]; timeoutMs?: number }): Promise<PluginReadResult>;
  erase(options: { timeoutMs?: number }): Promise<PluginReadResult>;
  cancel(): Promise<void>;
}

/** Native NDEF bridge: Core NFC on iOS, NfcAdapter reader mode on Android. */
export const SmartNfc = registerPlugin<SmartNfcPlugin>("SmartNfc");

export class NativeNfcService implements NfcService {
  readonly engine = "native" as const;
  readonly name = "NativeNfcService";

  async isAvailable(): Promise<NfcAvailability> {
    try {
      return await SmartNfc.isAvailable();
    } catch {
      return {
        available: false,
        reason: "The app's NFC component isn't installed in this build yet.",
      };
    }
  }

  async read(timeoutMs = 20000, cancel?: AbortSignal): Promise<NfcReadResult> {
    cancel?.addEventListener("abort", () => void SmartNfc.cancel());
    const result = await SmartNfc.read({ timeoutMs });
    return {
      records: result.records ?? [],
      ...(result.writable !== undefined ? { writable: result.writable } : {}),
    };
  }

  async write(records: NfcRecord[], cancel?: AbortSignal): Promise<NfcReadResult> {
    cancel?.addEventListener("abort", () => void SmartNfc.cancel());
    const result = await SmartNfc.write({ records });
    return { records: result.records ?? [] };
  }

  async erase(cancel?: AbortSignal): Promise<void> {
    cancel?.addEventListener("abort", () => void SmartNfc.cancel());
    await SmartNfc.erase({});
  }

  async cancel(): Promise<void> {
    await SmartNfc.cancel();
  }
}
