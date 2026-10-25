/** Shared domain types, mirroring the web app's `src/lib/store.ts` contract. */

export type ContentType = "url" | "text" | "tel" | "email" | "vcard" | "wifi";

export type DestinationKind =
  | "website"
  | "google_review"
  | "social"
  | "phone"
  | "email"
  | "contact"
  | "landing";

export type TagStatus = "empty" | "written" | "demo" | "failed";
export type TagMode = "direct" | "dynamic";
export type VerifyResult = "verified" | "mismatch" | "unverified" | null;

export type Tag = {
  id: string;
  publicCode: string;
  number: number;
  name: string;
  mode: TagMode;
  enabled: boolean;
  contentType: ContentType | null;
  content: string;
  destinationKind: DestinationKind;
  landingPageId: string | null;
  lostMode: boolean;
  lostMessage: string;
  lostContactName: string;
  lostContactPhone: string;
  lostContactEmail: string;
  lostFormEnabled: boolean;
  writtenContent: string | null;
  demoContent: string | null;
  status: TagStatus;
  verified: VerifyResult;
  createdAt: number;
  lastWrittenAt: number | null;
};

export type DestinationEntry = {
  id: string;
  tagId: string;
  destination: string;
  isCurrent: boolean;
  createdAt: number;
};

export type RangeKey = "7d" | "30d" | "90d" | "all";

export type TagEvent = {
  id: string;
  tagId: string;
  source: "nfc" | "qr";
  deviceType: string | null;
  country: string | null;
  createdAt: number;
};

export type LostReport = {
  id: string;
  tagId: string;
  finderName: string | null;
  finderContact: string | null;
  message: string;
  createdAt: number;
};

export type AppUser = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
};
