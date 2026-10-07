import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  Smartphone,
  XCircle,
  ExternalLink,
  Edit,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { NfcModeCard, NfcStatusBadge, useNfcStatus } from "@/components/NfcStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkSize,
  encodePayload,
  friendlyNfcError,
  validateUrlForNfc,
  writeAndVerify,
  type Payload,
} from "@/lib/nfc";
import { createTag, updateTag, useTag, type Tag } from "@/lib/store";

const searchSchema = z.object({ tagId: z.string().optional() });

export const Route = createFileRoute("/write-destination")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Write Destination URL to NFC — NFC Smart Keychain" },
      {
        name: "description",
        content:
          "Write a destination URL directly to an NFC tag. The URL will be stored on the tag itself.",
      },
      { property: "og:title", content: "Write Destination URL to NFC — NFC Smart Keychain" },
      {
        property: "og:description",
        content:
          "Write a destination URL directly to an NFC tag. The URL will be stored on the tag itself.",
      },
    ],
  }),
  component: WriteDestinationPage,
});

type Step = "form" | "preview" | "writing" | "result";

type Result =
  | { ok: true; demo: boolean; verified: "verified" | "mismatch" | "unverified"; url: string }
  | { ok: false; message: string };

function WriteDestinationPage() {
  const { tagId } = Route.useSearch();
  const navigate = useNavigate();
  const status = useNfcStatus();
  const support = status?.mode ?? null;
  const demo = support === "demo";

  const { tag: existing, loading } = useTag(tagId ?? "");

  const [step, setStep] = useState<Step>("form");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [touched, setTouched] = useState(false);
  const [normalizedUrl, setNormalizedUrl] = useState("");

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    if (existing.content) {
      setUrl(existing.content);
      setNormalizedUrl(existing.content);
    }
  }, [existing]);

  const error = validateUrlForNfc(url);
  const payload: Payload = { type: "url", url };
  const size = checkSize(payload);
  const encoded = encodePayload(payload);

  useEffect(() => {
    if (url) {
      setNormalizedUrl(encodePayload({ type: "url", url }));
    } else {
      setNormalizedUrl("");
    }
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!error) setStep("preview");
  };

  const doWrite = async () => {
    setStep("writing");
    try {
      let verified: "verified" | "mismatch" | "unverified" = "unverified";
      if (demo) {
        await new Promise((r) => setTimeout(r, 1200));
      } else {
        verified = await writeAndVerify(payload);
      }

      const tag = existing ?? (await createTag(name));
      const finalName = name.trim() || tag.name;

      await updateTag(tag.id, {
        name: finalName,
        contentType: "url",
        content: encoded,
        writtenContent: demo ? tag.writtenContent : encoded,
        demoContent: demo ? encoded : tag.demoContent,
        status: demo ? "demo" : "written",
        verified: demo ? "unverified" : verified,
        lastWrittenAt: Date.now(),
      });

      setResult({ ok: true, demo, verified, url: encoded });
      setStep("result");
      toast[demo ? "info" : "success"](
        demo
          ? "Demo mode — nothing was written to hardware."
          : "Destination URL written to NFC tag.",
      );
    } catch (e) {
      const message = friendlyNfcError(e);
      if (existing) await updateTag(existing.id, { status: "failed" }).catch(() => undefined);
      setResult({ ok: false, message });
      setStep("result");
      toast.error(message);
    }
  };

  if (tagId && loading) {
    return (
      <AppShell title="Write Destination URL" back="/tools">
        <p className="text-sm text-muted-foreground">Loading tag…</p>
      </AppShell>
    );
  }

  const tagTitle = existing ? `Rewriting ${existing.name}` : "Write destination URL to NFC tag";

  return (
    <AppShell title="Write Destination URL" subtitle={tagTitle} back="/tools">
      <div className="space-y-5">
        <NfcStatusBadge support={support} />
        <NfcModeCard status={status} />

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <p className="text-sm font-semibold text-primary">Direct NFC Destination Mode</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The destination URL will be written directly to the NFC tag as a standard NDEF URI
            record. Any NFC-enabled phone can read it without needing the Smart Tag Connect app.
          </p>
        </div>

        {step === "form" && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Destination URL" id="url">
              <Input
                id="url"
                inputMode="url"
                placeholder="https://instagram.com/deepak"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="url"
              />
            </Field>

            {touched && error && <p className="text-sm text-destructive">{error}</p>}

            <Field label="Tag name (optional)" id="tagname">
              <Input
                id="tagname"
                placeholder={existing?.name ?? "Tag 001"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            {url && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Will be written as
                </p>
                <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-sm text-card-foreground">
                  {normalizedUrl}
                </pre>
                <p className="mt-2 text-xs text-muted-foreground">
                  Type: Website URL · {size.bytes} of ~{size.capacity} bytes
                  {size.level === "tight" && " · Close to capacity"}
                  {size.level === "over" && " · May not fit!"}
                </p>
              </div>
            )}

            {size.level === "over" && (
              <div className="flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  This URL is {size.bytes} bytes and may not fit a standard keychain tag (~
                  {size.capacity} bytes). Please shorten the URL or use a larger tag.
                </span>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={!!error || !url.trim()}>
              {demo ? "Preview (Demo Mode)" : "Preview & Write to NFC"}
            </Button>
          </form>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Exactly what will be written to the NFC tag
              </p>
              <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-sm text-card-foreground">
                {encoded}
              </pre>
              <p className="mt-3 text-xs text-muted-foreground">
                Type: Website URL · {size.bytes} of ~{size.capacity} bytes
                {size.level === "tight" && " · Close to capacity"}
                {size.level === "over" && " · May not fit!"}
              </p>
              <p className="mt-3 text-xs text-primary font-medium">
                This is a standard NDEF URI record. Any phone with NFC can read it.
              </p>
            </div>

            {size.level !== "ok" && (
              <div
                className={
                  size.level === "over"
                    ? "flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive"
                    : "flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-xs text-warning"
                }
              >
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  {size.level === "over"
                    ? `This is ${size.bytes} bytes and may not fit a standard keychain tag (~${size.capacity} bytes). Shorten it, or use a larger tag.`
                    : "This is close to the space on a standard keychain tag. It should fit, but a larger tag is safer."}
                </span>
              </div>
            )}

            <Button size="lg" className="w-full" onClick={() => void doWrite()}>
              {support === "demo" ? "Run demo write (no real tag)" : "Confirm and write to tag"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep("form")}>
              <Edit className="mr-2 size-4" /> Edit URL
            </Button>
          </div>
        )}

        {step === "writing" && (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <Smartphone className="mx-auto size-8 animate-pulse text-primary" />
            <p className="mt-4 text-sm font-medium text-card-foreground">
              {demo
                ? "Demo write — no tag is being touched"
                : "Hold the tag flat against the back of your phone"}
            </p>
            <p className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />{" "}
              {demo ? "Simulating…" : "Writing destination URL, then reading back to verify…"}
            </p>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            {result.ok ? (
              <div
                className={
                  result.demo
                    ? "rounded-2xl border border-warning/40 bg-warning/10 p-6 text-center"
                    : "rounded-2xl border border-success/40 bg-success/10 p-6 text-center"
                }
              >
                {result.demo ? (
                  <AlertTriangle className="mx-auto size-8 text-warning" />
                ) : (
                  <CheckCircle2 className="mx-auto size-8 text-success" />
                )}
                <p className="mt-3 text-base font-semibold text-foreground">
                  {result.demo
                    ? "Demo only — no tag was written"
                    : "Destination URL written successfully"}
                </p>
                <p className="mt-2 break-all text-xs text-muted-foreground">{result.url}</p>
                {!result.demo && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {result.verified === "verified"
                      ? "Verified: Read back from the tag and confirmed match."
                      : result.verified === "mismatch"
                        ? "Warning: What we read back does not match. Try writing again."
                        : "Could not read the tag back to confirm — test it with another phone or use Read NFC."}
                  </p>
                )}
                {result.demo && (
                  <p className="mt-2 text-xs text-warning">
                    This browser has no NFC access, so nothing touched real hardware.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
                <XCircle className="mx-auto size-8 text-destructive" />
                <p className="mt-3 text-base font-semibold text-foreground">Write failed</p>
                <p className="mt-2 text-xs text-muted-foreground">{result.message}</p>
              </div>
            )}

            <Button asChild size="lg" className="w-full">
              <Link to="/read">Read the tag back to verify</Link>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/tags" })}>
              View my tags
            </Button>
            {!result.ok && (
              <Button variant="ghost" className="w-full" onClick={() => setStep("preview")}>
                Try again
              </Button>
            )}
            {result.ok && !result.demo && result.verified === "verified" && (
              <div className="rounded-2xl border border-success/40 bg-success/10 p-4 text-center">
                <ExternalLink className="mx-auto size-6 text-success" />
                <p className="mt-2 text-sm font-medium text-success">Test with another phone</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tap the NFC card with any NFC-enabled Android phone. It will recognize the URL and
                  offer to open it.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
