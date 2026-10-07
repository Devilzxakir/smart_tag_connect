import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, LifeBuoy, Mail, Phone, QrCode, Send, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resolveTag, submitLostReport, type ResolvedTag } from "@/lib/tags.functions";

export const Route = createFileRoute("/t/$shortId")({
  head: () => ({
    meta: [
      { title: "Tag link — NFC Smart Keychain" },
      { name: "description", content: "Permanent link for an NFC keychain tag." },
      { property: "og:title", content: "Tag link — NFC Smart Keychain" },
      { property: "og:description", content: "Permanent link for an NFC keychain tag." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TagLinkPage,
});

function TagLinkPage() {
  const { shortId } = Route.useParams();
  const [result, setResult] = useState<ResolvedTag | null>(null);

  useEffect(() => {
    let active = true;
    const source =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).get("s") === "qr"
        ? "qr"
        : "nfc";

    resolveTag({ data: { code: shortId, source } })
      .then((r) => {
        if (!active) return;
        setResult(r);
        if (r.found && r.enabled && !r.lostMode && /^(https?:\/\/|\/p\/)/i.test(r.destination)) {
          window.location.replace(r.destination);
        }
      })
      .catch(() => active && setResult({ found: false }));
    return () => {
      active = false;
    };
  }, [shortId]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-10">
      {result?.found && result.lostMode ? (
        <LostModePage code={shortId} tag={result} />
      ) : (
        <>
          <QrCode className="size-8 text-primary" />

          {!result && <p className="text-sm text-muted-foreground">Looking up this tag…</p>}

          {result && !result.found && (
            <>
              <h1 className="text-xl font-semibold text-foreground">Tag not found</h1>
              <p className="text-sm text-muted-foreground">
                This link doesn’t match any tag. Check the code and try again.
              </p>
            </>
          )}

          {result?.found && (
            <>
              <h1 className="text-xl font-semibold text-foreground">{result.name}</h1>
              {!result.enabled ? (
                <p className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                  This tag is turned off by its owner, so it isn’t opening anything right now.
                </p>
              ) : result.destination ? (
                <Destination value={result.destination} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No destination set for this tag yet.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Destination({ value }: { value: string }) {
  if (value.startsWith("BEGIN:VCARD")) {
    const href = `data:text/vcard;charset=utf-8,${encodeURIComponent(value)}`;
    const name = /FN:(.*)/.exec(value)?.[1] ?? "Contact";
    const tel = /TEL:(.*)/.exec(value)?.[1] ?? "";
    const email = /EMAIL:(.*)/.exec(value)?.[1] ?? "";
    return (
      <>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Contact</p>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-base font-semibold text-card-foreground">{name}</p>
          {tel && <p className="mt-1 text-sm text-muted-foreground">{tel}</p>}
          {email && <p className="text-sm text-muted-foreground">{email}</p>}
        </div>
        <Button asChild size="lg">
          <a href={href} download={`${name}.vcf`}>
            Save contact
          </a>
        </Button>
      </>
    );
  }

  const isTel = value.startsWith("tel:");
  const isMail = value.startsWith("mailto:");

  return (
    <>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Opening</p>
      <pre className="whitespace-pre-wrap break-all rounded-xl bg-muted p-3 font-mono text-xs">
        {value}
      </pre>
      {/^(https?:\/\/|tel:|mailto:|\/p\/)/i.test(value) && (
        <Button asChild size="lg">
          <a href={value}>
            {isTel ? "Call" : isMail ? "Send email" : "Continue"}
            <ExternalLink className="ml-2 size-4" />
          </a>
        </Button>
      )}
    </>
  );
}

function LostModePage({ code, tag }: { code: string; tag: Extract<ResolvedTag, { found: true }> }) {
  const lost = tag.lost;
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await submitLostReport({
        data: {
          code,
          finderName: name.trim() || undefined,
          finderContact: contact.trim() || undefined,
          message: message.trim(),
        },
      });
      if (res.ok) setSent(true);
      else toast.error(res.error);
    } catch {
      toast.error("Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
        <LifeBuoy className="size-3.5" /> Lost item
      </div>

      <h1 className="text-xl font-semibold text-foreground">This item has been reported lost</h1>
      {lost?.message && <p className="text-sm text-muted-foreground">{lost.message}</p>}

      {(lost?.contactName || lost?.contactPhone || lost?.contactEmail) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Contact the owner
          </p>
          {lost?.contactName && (
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-card-foreground">
              <UserRound className="size-4 text-muted-foreground" /> {lost.contactName}
            </p>
          )}
          {lost?.contactPhone && (
            <a
              href={`tel:${lost.contactPhone}`}
              className="mt-2 flex items-center gap-2 text-sm text-primary"
            >
              <Phone className="size-4" /> {lost.contactPhone}
            </a>
          )}
          {lost?.contactEmail && (
            <a
              href={`mailto:${lost.contactEmail}`}
              className="mt-2 flex items-center gap-2 text-sm text-primary"
            >
              <Mail className="size-4" /> {lost.contactEmail}
            </a>
          )}
        </div>
      )}

      {lost?.formEnabled && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Found it?</p>
          {sent ? (
            <p className="mt-3 text-sm text-success">
              Thank you — your message was sent to the owner.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <Input
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="How to reach you (optional)"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
              <Textarea
                placeholder="Where you found it, how to hand it back…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={!message.trim() || sending}
                onClick={() => void send()}
              >
                <Send className="mr-2 size-4" /> Send message
              </Button>
              <p className="text-[11px] text-muted-foreground">
                No location is collected. Only what you type here is sent.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
