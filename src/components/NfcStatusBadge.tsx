import { useEffect, useState } from "react";
import { Info, Nfc } from "lucide-react";
import { resolveNfcStatus, type NfcStatus, type NfcSupport } from "@/lib/nfc";

export function useNfcStatus() {
  const [status, setStatus] = useState<NfcStatus | null>(null);
  useEffect(() => {
    let active = true;
    void resolveNfcStatus().then((s) => {
      if (active) setStatus(s);
    });
    return () => {
      active = false;
    };
  }, []);
  return status;
}

export function useNfcSupport() {
  const status = useNfcStatus();
  return status ? status.mode : null;
}

export function NfcStatusBadge({ support }: { support: NfcSupport | null }) {
  if (!support) return null;
  const demo = support === "demo";
  return (
    <span
      className={
        demo
          ? "inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning"
          : "inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-success"
      }
    >
      <span
        className={demo ? "size-1.5 rounded-full bg-warning" : "size-1.5 rounded-full bg-success"}
      />
      {demo ? "Demo mode — no real NFC" : "Real NFC — this device can write tags"}
    </span>
  );
}

/** Badge plus the plain-language reason behind it. */
export function NfcModeCard({ status }: { status: NfcStatus | null }) {
  if (!status) return null;
  const demo = status.mode === "demo";
  return (
    <div
      className={
        demo
          ? "rounded-2xl border border-warning/40 bg-warning/10 p-4"
          : "rounded-2xl border border-success/40 bg-success/10 p-4"
      }
    >
      <div className="flex items-center gap-2">
        {demo ? (
          <Info className="size-4 shrink-0 text-warning" />
        ) : (
          <Nfc className="size-4 shrink-0 text-success" />
        )}
        <p
          className={
            demo ? "text-sm font-semibold text-warning" : "text-sm font-semibold text-success"
          }
        >
          {demo ? "Demo mode" : "Real NFC available"}
        </p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{status.reason}</p>
      {demo && (
        <p className="mt-2 text-xs text-muted-foreground">
          Nothing in demo mode touches a physical tag, and demo results are never saved as real
          writes.
        </p>
      )}
    </div>
  );
}
