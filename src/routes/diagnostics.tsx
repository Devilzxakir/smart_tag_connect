import { createFileRoute } from "@tanstack/react-router";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { resolveNfcStatus, type NfcDiagnostics } from "@/lib/nfc";

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "Platform status — NFC Smart Keychain" },
      {
        name: "description",
        content: "Developer view of the platform, NFC mode and NFC availability.",
      },
      { property: "og:title", content: "Platform status — NFC Smart Keychain" },
      {
        property: "og:description",
        content: "Developer view of the platform, NFC mode and NFC availability.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiagnosticsPage,
});

const PLATFORM_LABELS = { web: "Web", android: "Android", ios: "iOS" } as const;
const ENGINE_LABELS = { mock: "Demo", web: "Web NFC", native: "Native NFC" } as const;

function DiagnosticsPage() {
  const [info, setInfo] = useState<NfcDiagnostics | null>(null);
  const [busy, setBusy] = useState(true);

  const refresh = useCallback(() => {
    setBusy(true);
    resolveNfcStatus()
      .then(setInfo)
      .finally(() => setBusy(false));
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <AppShell title="Platform status" subtitle="For development and testing" back="/tools">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          {!info ? (
            <p className="text-sm text-muted-foreground">Checking this device…</p>
          ) : (
            <dl className="space-y-3 text-sm">
              <Row label="Platform" value={PLATFORM_LABELS[info.platform]} />
              <Row label="NFC mode" value={ENGINE_LABELS[info.engine]} />
              <Row
                label="NFC availability"
                value={info.available ? "Available" : "Not available"}
              />
              <Row label="Implementation" value={info.serviceName} />
              <Row label="Secure page (https)" value={secureLabel()} />
            </dl>
          )}
          {info && <p className="mt-4 text-xs text-muted-foreground">{info.reason}</p>}
        </div>

        <Button variant="outline" className="w-full" onClick={refresh} disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Check again
        </Button>

        <p className="text-xs text-muted-foreground">
          Native NFC only appears when the app runs inside the Android or iPhone app build. In a
          browser you get Web NFC on Chrome for Android, and demo mode everywhere else.
        </p>
      </div>
    </AppShell>
  );
}

function secureLabel() {
  if (typeof window === "undefined") return "—";
  return window.isSecureContext ? "Yes" : "No";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-card-foreground">{value}</dd>
    </div>
  );
}
