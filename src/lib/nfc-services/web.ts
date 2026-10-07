import type { NfcAvailability, NfcReadResult, NfcRecord, NfcService } from "./types";

interface NDEFReaderEventTarget extends EventTarget {
  onreading: ((event: NDEFReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
  scan: (options: { signal: AbortSignal }) => Promise<void>;
  write: (message: NDEFMessage, options?: { signal: AbortSignal }) => Promise<void>;
}

interface NDEFReadingEvent extends Event {
  message: NDEFMessage;
}

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  encoding?: string;
  data?: ArrayBuffer | ArrayBufferView;
}

interface NDEFReaderConstructor {
  new (): NDEFReaderEventTarget;
}

declare global {
  interface Window {
    NDEFReader?: NDEFReaderConstructor;
  }
}

/** Web NFC (Chrome on Android). Reads and writes real tags through the browser. */
export class WebNfcService implements NfcService {
  readonly engine = "web" as const;
  readonly name = "WebNfcService";

  private controller: AbortController | null = null;

  static isSupported(): boolean {
    return typeof window !== "undefined" && window.isSecureContext && "NDEFReader" in window;
  }

  private reader(): NDEFReaderEventTarget {
    const Ctor = (window as { NDEFReader?: NDEFReaderConstructor }).NDEFReader;
    if (!Ctor) throw new Error("This browser has no NFC access.");
    return new Ctor();
  }

  private encodeString(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  async isAvailable(): Promise<NfcAvailability> {
    if (!WebNfcService.isSupported()) {
      return { available: false, reason: "This browser has no NFC access." };
    }
    return {
      available: true,
      reason:
        "This device can read and write real tags. Make sure NFC is switched on in phone settings, then hold the tag flat against the back of the phone.",
    };
  }

  async write(records: NfcRecord[], cancel?: AbortSignal): Promise<NfcReadResult> {
    const message = {
      records: records.map((r) =>
        r.recordType === "empty"
          ? { recordType: "empty" }
          : r.recordType === "mime"
            ? {
                recordType: "mime",
                mediaType: r.mediaType ?? "text/plain",
                data: this.encodeString(r.value),
              }
            : { recordType: r.recordType, data: this.encodeString(r.value) },
      ),
    };
    await this.reader().write(message, cancel ? { signal: cancel } : undefined);
    return { records: [] };
  }

  async erase(cancel?: AbortSignal): Promise<void> {
    await this.write([{ recordType: "empty", value: "" }], cancel);
  }

  async read(timeoutMs = 20000, cancel?: AbortSignal): Promise<NfcReadResult> {
    const controller = new AbortController();
    this.controller = controller;
    const r = this.reader();
    await r.scan({ signal: controller.signal });

    return new Promise<NfcReadResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        controller.abort();
        reject(
          new Error("No tag detected. Hold the tag against the back of the phone and try again."),
        );
      }, timeoutMs);

      cancel?.addEventListener("abort", () => {
        clearTimeout(timer);
        controller.abort();
        reject(new Error("Cancelled."));
      });

      r.onreadingerror = () => {
        clearTimeout(timer);
        controller.abort();
        reject(new Error("Could not read this tag."));
      };

      r.onreading = (event: NDEFReadingEvent) => {
        clearTimeout(timer);
        controller.abort();
        const records: NfcRecord[] = [];
        for (const record of event.message.records) {
          if (!record.data) continue;
          try {
            const value = new TextDecoder(record.encoding || "utf-8").decode(record.data);
            if (!value.trim()) continue;
            records.push({
              recordType: (record.recordType as NfcRecord["recordType"]) ?? "text",
              value,
              ...(record.mediaType ? { mediaType: record.mediaType } : {}),
            });
          } catch {
            /* skip records this browser can't decode */
          }
        }
        resolve({ records });
      };
    });
  }

  async cancel(): Promise<void> {
    this.controller?.abort();
    this.controller = null;
  }
}
