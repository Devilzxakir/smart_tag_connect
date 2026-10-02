import type { NfcAvailability, NfcReadResult, NfcRecord, NfcService } from "./types";

/**
 * Demo-mode stand-in used when no real NFC is available.
 *
 * It never claims a physical tag was touched — callers must label every result
 * as demo data, and the app stores demo content separately from real writes.
 */
export class MockNfcService implements NfcService {
  readonly engine = "mock" as const;
  readonly name = "MockNfcService";

  private last: NfcRecord[] = [];

  async isAvailable(): Promise<NfcAvailability> {
    return {
      available: false,
      reason: "No real NFC access here, so the app runs in demo mode. Nothing touches a physical tag.",
    };
  }

  private delay(ms = 1200) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async read(): Promise<NfcReadResult> {
    await this.delay();
    return { records: this.last, writable: true };
  }

  async write(records: NfcRecord[]): Promise<NfcReadResult> {
    await this.delay();
    this.last = records;
    return { records };
  }

  async erase(): Promise<void> {
    await this.delay(900);
    this.last = [];
  }

  async cancel(): Promise<void> {}
}
