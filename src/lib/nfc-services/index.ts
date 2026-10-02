import { Capacitor } from "@capacitor/core";
import { MockNfcService } from "./mock";
import { NativeNfcService } from "./native";
import { WebNfcService } from "./web";
import type { NfcPlatform, NfcService } from "./types";

export * from "./types";
export { MockNfcService } from "./mock";
export { NativeNfcService } from "./native";
export { WebNfcService } from "./web";

export function getPlatform(): NfcPlatform {
  try {
    const platform = Capacitor.getPlatform();
    if (platform === "android" || platform === "ios") return platform;
  } catch {
    /* not running inside Capacitor */
  }
  return "web";
}

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

let cached: NfcService | null = null;

/**
 * Picks the right implementation for where the app is running:
 * native app → NativeNfcService, Chrome on Android → WebNfcService,
 * anything else → MockNfcService (demo mode).
 */
export function getNfcService(): NfcService {
  if (cached) return cached;
  if (isNativeApp()) cached = new NativeNfcService();
  else if (WebNfcService.isSupported()) cached = new WebNfcService();
  else cached = new MockNfcService();
  return cached;
}

/** Test helper / diagnostics: force a specific implementation. */
export function setNfcService(service: NfcService | null) {
  cached = service;
}
