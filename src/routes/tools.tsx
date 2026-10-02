import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Eraser, Loader2, PenLine, RefreshCw, ScanLine, XCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { NfcModeCard, NfcStatusBadge, useNfcStatus } from "@/components/NfcStatusBadge";
import { Button } from "@/components/ui/button";
import { eraseTag, friendlyNfcError } from "@/lib/nfc";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "NFC Tools — NFC Smart Keychain" },
      { name: "description", content: "Read, write, rewrite and erase NFC tags from your phone." },
      { property: "og:title", content: "NFC Tools — NFC Smart Keychain" },
      { property: "og:description", content: "Read, write, rewrite and erase NFC tags from your phone." },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  const status = useNfcStatus();
  const support = status?.mode ?? null;
  const [erasing, setErasing] = useState(false);
  const [eraseResult, setEraseResult] = useState<null | { ok: boolean; message: string }>(null);

  const handleErase = async () => {
    setErasing(true);
    setEraseResult(null);
    try {
      if (support === "demo") {
        await new Promise((r) => setTimeout(r, 1200));
        setEraseResult({
          ok: false,
          message: "Demo mode — no tag was erased. This browser has no NFC access.",
        });
        toast.info("Demo mode — nothing was erased.");
      } else {
        await eraseTag();
        setEraseResult({ ok: true, message: "Tag erased." });
        toast.success("Tag erased.");
      }
    } catch (e) {
      const message = friendlyNfcError(e);
      setEraseResult({ ok: false, message });
      toast.error(message);
    } finally {
      setErasing(false);
    }
  };

  return (
    <AppShell title="NFC Tools" subtitle="Choose what to do with a tag" back="/home">
      <div className="space-y-4">
        <NfcStatusBadge support={support} />

        <NfcModeCard status={status} />

        <ToolLink to="/read" icon={ScanLine} title="Read NFC" desc="Scan a tag and see its contents" />
        <ToolLink to="/write" icon={PenLine} title="Write NFC" desc="Save a link, text, contact and more" />
        <ToolLink to="/tags" icon={RefreshCw} title="Rewrite NFC" desc="Pick a saved tag and write it again" />

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Eraser className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-card-foreground">Erase NFC</p>
              <p className="text-xs text-muted-foreground">Clear everything stored on a tag</p>
            </div>
          </div>
          <Button variant="outline" className="mt-4 w-full" onClick={handleErase} disabled={erasing}>
            {erasing && <Loader2 className="mr-2 size-4 animate-spin" />}
            {erasing ? "Hold tag near phone…" : "Erase a tag"}
          </Button>
          {eraseResult && (
            <p
              className={
                eraseResult.ok
                  ? "mt-3 flex items-start gap-2 text-xs text-success"
                  : "mt-3 flex items-start gap-2 text-xs text-warning"
              }
            >
              {eraseResult.ok ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <XCircle className="size-3.5 shrink-0" />
              )}
              {eraseResult.message}
            </p>
          )}
        </div>
        <ToolLink
          to="/diagnostics"
          icon={Activity}
          title="Platform status"
          desc="Platform, NFC mode and availability"
        />
      </div>
    </AppShell>
  );
}

function ToolLink({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: "/read" | "/write" | "/tags" | "/diagnostics";
  icon: typeof ScanLine;
  title: string;
  desc: string;
}) {
  return (
    <Link to={to} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-card-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </Link>
  );
}
