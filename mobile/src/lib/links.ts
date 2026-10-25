/**
 * The permanent-link helpers, matching `src/lib/store.ts` on the web.
 *
 * A dynamic tag always stores `<PUBLIC_APP_URL>/t/<code>` on the chip, so the
 * destination can change later without rewriting the physical tag. Device
 * specific origins must never be used here.
 */
import { PUBLIC_APP_URL } from "./config";
import type { Tag } from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makePublicCode(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  const cryptoRef = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => void } }).crypto;
  if (cryptoRef?.getRandomValues) {
    cryptoRef.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < length; i += 1) out[i] = Math.floor(Math.random() * 256);
  return out;
}

export function formatNumber(n: number): string {
  return `Tag ${String(n).padStart(3, "0")}`;
}

export function tagUrl(tag: Pick<Tag, "publicCode">): string {
  return `${PUBLIC_APP_URL}/t/${tag.publicCode}`;
}

/** Same permanent link, flagged so QR scans are counted separately. */
export function tagQrUrl(tag: Pick<Tag, "publicCode">): string {
  return `${tagUrl(tag)}?s=qr`;
}

/** Where a finder lands when a tag is in lost mode. */
export function lostPageUrl(tag: Pick<Tag, "publicCode">): string {
  return `${tagUrl(tag)}?lost=1`;
}

export function landingPageUrl(slug: string): string {
  return `${PUBLIC_APP_URL}/p/${slug}`;
}
