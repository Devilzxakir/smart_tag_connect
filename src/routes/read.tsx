import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Radio, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { NfcModeCard, NfcStatusBadge, useNfcStatus } from "@/components/NfcStatusBadge";
import { Button } from "@/components/ui/button";
import { friendlyNfcError, readTagOnce } from "@/lib/nfc";
import { useTags } from "@/lib/store";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "Read NFC — NFC Smart Keychain" },
      { name: "description", content: "Scan an NFC keychain tag and see what is stored on it." },
      { property: "og:title", content: "Read NFC — NFC Smart Keychain" },
      { property: "og:description", content: "Scan an NFC keychain tag and see what is stored on it." },
    ],
  }),
  component: ReadPage,
});

function ReadPage() {
  const status = useNfcStatus();
  const { tags } = useTags();
  const support = status?.mode ?? null;
  const [scanning, setScanning] = useState(false);
  const [values, setValues] = useState<string[] | null>(null);
  const [demoRead, setDemoRead] = useState(false);
  const cancelRef = useRef<AbortController | null>(null);

  const scan = async () => {
    setValues(null);
    setScanning(true);
    try {
      if (support === "demo") {
        await new Promise((r) => setTimeout(r, 1200));
        const latest = tags.find((t) => t.demoContent || t.content);
        setDemoRead(true);
        setValues(latest ? [latest.demoContent || latest.content] : []);
      } else {
        setDemoRead(false);
        const controller = new AbortController();
        cancelRef.current = controller;
        setValues(await readTagOnce(20000, controller.signal));
      }
    } catch (e) {
      toast.error(friendlyNfcError(e));
    } finally {
      cancelRef.current = null;
      setScanning(false);
    }
  };

  return (
    <AppShell title="Read NFC" subtitle="Scan a tag to see what's on it" back="/tools">
      <div className="space-y-5">
        <NfcStatusBadge support={support} />
        <NfcModeCard status={status} />

        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Radio
            className={scanning ? "mx-auto size-8 animate-ping text-primary" : "mx-auto size-8 text-primary"}
          />
          <p className="mt-4 text-sm font-medium text-card-foreground">
            {scanning
              ? support === "demo"
                ? "Simulating a scan…"
                : "Hold the tag flat against the back of your phone"
              : "Ready to scan"}
          </p>
        </div>

        <Button size="lg" className="w-full" onClick={scan} disabled={scanning}>
          {scanning ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
          {scanning ? "Scanning…" : support === "demo" ? "Start demo scan" : "Start scan"}
        </Button>

        {scanning && support === "supported" && (
          <Button variant="ghost" className="w-full" onClick={() => cancelRef.current?.abort()}>
            Cancel scan
          </Button>
        )}

        {values && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {demoRead ? "Demo result — not a real tag" : "Read from the physical tag"}
            </p>
            {values.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {demoRead ? "Nothing saved yet to simulate." : "This tag is empty."}
              </p>
            ) : (
              values.map((v) => (
                <pre
                  key={v}
                  className="mt-2 whitespace-pre-wrap break-all font-mono text-sm text-card-foreground"
                >
                  {v}
                </pre>
              ))
            )}
            {demoRead && (
              <p className="mt-3 text-xs text-warning">
                Demo mode — this shows your last simulated content, not real hardware.
              </p>
            )}
          </div>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link to="/tags">View my tags</Link>
        </Button>
      </div>
    </AppShell>
  );
}
