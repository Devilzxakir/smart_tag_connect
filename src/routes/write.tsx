import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Contact,
  Globe,
  Link2,
  Loader2,
  Mail,
  Phone,
  Smartphone,
  Type,
  Wifi,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { NfcModeCard, NfcStatusBadge, useNfcStatus } from "@/components/NfcStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeDestination, validateDestination } from "@/lib/destination";
import {
  CONTENT_LABELS,
  checkSize,
  encodePayload,
  friendlyNfcError,
  validatePayload,
  writeAndVerify,
  type ContentType,
  type Payload,
} from "@/lib/nfc";
import {
  createTag,
  setDestination,
  tagUrl,
  updateTag,
  useTag,
  type Tag,
  type TagMode,
} from "@/lib/store";

const searchSchema = z.object({ tagId: z.string().optional() });

export const Route = createFileRoute("/write")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Write NFC — NFC Smart Keychain" },
      { name: "description", content: "Write a link, text, phone, email, contact card or Wi-Fi to an NFC tag." },
      { property: "og:title", content: "Write NFC — NFC Smart Keychain" },
      { property: "og:description", content: "Write a link, text, phone, email, contact card or Wi-Fi to an NFC tag." },
    ],
  }),
  component: WritePage,
});

const TYPES: { type: ContentType; icon: typeof Globe; desc: string }[] = [
  { type: "url", icon: Globe, desc: "Open a website when tapped" },
  { type: "text", icon: Type, desc: "Show a short message" },
  { type: "tel", icon: Phone, desc: "Start a phone call" },
  { type: "email", icon: Mail, desc: "Start an email" },
  { type: "vcard", icon: Contact, desc: "Share contact details" },
  { type: "wifi", icon: Wifi, desc: "Share a Wi-Fi network" },
];

function emptyPayload(type: ContentType): Payload {
  switch (type) {
    case "url":
      return { type: "url", url: "" };
    case "text":
      return { type: "text", text: "" };
    case "tel":
      return { type: "tel", phone: "" };
    case "email":
      return { type: "email", email: "", subject: "", body: "" };
    case "vcard":
      return { type: "vcard", name: "", phone: "", email: "", org: "" };
    case "wifi":
      return { type: "wifi", ssid: "", password: "", security: "WPA" };
  }
}

type Step = "mode" | "type" | "form" | "preview" | "writing" | "result";

type Result =
  | { ok: true; demo: boolean; verified: "verified" | "mismatch" | "unverified" }
  | { ok: false; message: string };

function WritePage() {
  const { tagId } = Route.useSearch();
  const navigate = useNavigate();
  const status = useNfcStatus();
  const support = status?.mode ?? null;

  const { tag: existing, loading } = useTag(tagId ?? "");

  const [mode, setMode] = useState<TagMode>("direct");
  const [dynamicTag, setDynamicTag] = useState<Tag | null>(null);
  const [step, setStep] = useState<Step>("mode");
  const [payload, setPayload] = useState<Payload>(emptyPayload("url"));
  const [destination, setDestinationValue] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [touched, setTouched] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setMode(existing.mode);
    setName(existing.name);
    if (existing.mode === "dynamic") {
      setDynamicTag(existing);
      setDestinationValue(existing.content);
      setStep((s) => (s === "mode" ? "form" : s));
    } else {
      setStep((s) => (s === "mode" ? "type" : s));
    }
  }, [existing]);

  const target = dynamicTag ?? existing ?? null;
  const permanentUrl = target && mode === "dynamic" ? tagUrl(target) : "";
  const isDynamic = mode === "dynamic";

  const encoded = isDynamic ? permanentUrl : encodePayload(payload);
  const error = isDynamic ? validateDestination(destination) : validatePayload(payload);
  const size = checkSize(isDynamic ? { type: "url", url: permanentUrl } : payload);

  const chooseMode = async (next: TagMode) => {
    setMode(next);
    if (next === "direct") {
      setStep("type");
      return;
    }
    setCreating(true);
    try {
      const tag = existing ?? (await createTag(name, "dynamic"));
      setDynamicTag(tag);
      setName(tag.name);
      setDestinationValue(tag.content);
      setStep("form");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the tag.");
      setMode("direct");
    } finally {
      setCreating(false);
    }
  };

  const choose = (type: ContentType) => {
    setPayload(emptyPayload(type));
    setTouched(false);
    setStep("form");
  };

  const set = (patch: Record<string, unknown>) =>
    setPayload((prev) => ({ ...prev, ...patch }) as Payload);

  const doWrite = async () => {
    setStep("writing");
    const demo = support === "demo";
    try {
      let verified: "verified" | "mismatch" | "unverified" = "unverified";
      if (demo) {
        await new Promise((r) => setTimeout(r, 1200));
      } else {
        verified = await writeAndVerify(isDynamic ? { type: "url", url: permanentUrl } : payload);
      }

      const tag = target ?? (await createTag(name));
      const finalName = name.trim() || tag.name;

      if (isDynamic) {
        await setDestination(tag.id, normalizeDestination(destination));
      }

      await updateTag(tag.id, {
        name: finalName,
        ...(isDynamic ? {} : { contentType: payload.type, content: encoded }),
        // demo writes never touch hardware, so they are stored separately
        writtenContent: demo ? tag.writtenContent : encoded,
        demoContent: demo ? encoded : tag.demoContent,
        status: demo ? "demo" : "written",
        verified: demo ? "unverified" : verified,
        lastWrittenAt: Date.now(),
      });

      setResult({ ok: true, demo, verified });
      setStep("result");
      toast[demo ? "info" : "success"](
        demo ? "Demo mode — nothing was written to hardware." : "Tag written.",
      );
    } catch (e) {
      const message = friendlyNfcError(e);
      if (target) await updateTag(target.id, { status: "failed" }).catch(() => undefined);
      setResult({ ok: false, message });
      setStep("result");
      toast.error(message);
    }
  };

  if (tagId && loading) {
    return (
      <AppShell title="Write NFC" back="/tools">
        <p className="text-sm text-muted-foreground">Loading tag…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Write NFC"
      subtitle={existing ? `Rewriting ${existing.name}` : "Save something to a tag"}
      back="/tools"
    >
      <div className="space-y-5">
        <NfcStatusBadge support={support} />

        {(step === "preview" || step === "type" || step === "mode") && <NfcModeCard status={status} />}

        {step === "mode" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">How should this tag work?</p>
            <button
              type="button"
              disabled={creating}
              onClick={() => void chooseMode("direct")}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Globe className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-card-foreground">Direct NFC</span>
                <span className="block text-xs text-muted-foreground">
                  The content is written straight onto the tag. To change it, write the tag again.
                </span>
              </span>
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={() => void chooseMode("dynamic")}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {creating ? <Loader2 className="size-5 animate-spin" /> : <Link2 className="size-5" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-card-foreground">Dynamic NFC</span>
                <span className="block text-xs text-muted-foreground">
                  A permanent link goes on the tag. Change where it opens any time, without rewriting.
                </span>
              </span>
            </button>
          </div>
        )}

        {step === "type" && !isDynamic && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">What should the tag do?</p>
            {TYPES.map(({ type, icon: Icon, desc }) => (
              <button
                key={type}
                type="button"
                onClick={() => choose(type)}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-card-foreground">
                    {CONTENT_LABELS[type]}
                  </span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {step === "form" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (!error) setStep("preview");
            }}
          >
            {isDynamic ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Dynamic tag
                </p>
                {target && (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Goes on the tag (never changes)
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-xs text-card-foreground">
                      {permanentUrl}
                    </pre>
                    <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                      Currently opens
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-card-foreground">
                      {target.content || "Nothing yet"}
                    </p>
                  </div>
                )}
                <Field label="Destination link" id="dest">
                  <Input
                    id="dest"
                    inputMode="url"
                    placeholder="https://instagram.com/example"
                    value={destination}
                    onChange={(e) => setDestinationValue(e.target.value)}
                  />
                </Field>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {CONTENT_LABELS[payload.type]}
                </p>

                {payload.type === "url" && (
                  <Field label="Website address" id="url">
                    <Input id="url" inputMode="url" placeholder="example.com/page" value={payload.url} onChange={(e) => set({ url: e.target.value })} />
                  </Field>
                )}

                {payload.type === "text" && (
                  <Field label="Text" id="text">
                    <Textarea id="text" rows={4} placeholder="Anything you want to show" value={payload.text} onChange={(e) => set({ text: e.target.value })} />
                  </Field>
                )}

                {payload.type === "tel" && (
                  <Field label="Phone number" id="tel">
                    <Input id="tel" inputMode="tel" placeholder="+91 98765 43210" value={payload.phone} onChange={(e) => set({ phone: e.target.value })} />
                  </Field>
                )}

                {payload.type === "email" && (
                  <>
                    <Field label="Email address" id="email">
                      <Input id="email" inputMode="email" placeholder="you@example.com" value={payload.email} onChange={(e) => set({ email: e.target.value })} />
                    </Field>
                    <Field label="Subject (optional)" id="subject">
                      <Input id="subject" value={payload.subject ?? ""} onChange={(e) => set({ subject: e.target.value })} />
                    </Field>
                    <Field label="Message (optional)" id="body">
                      <Textarea id="body" rows={3} value={payload.body ?? ""} onChange={(e) => set({ body: e.target.value })} />
                    </Field>
                  </>
                )}

                {payload.type === "vcard" && (
                  <>
                    <Field label="Full name" id="cname">
                      <Input id="cname" value={payload.name} onChange={(e) => set({ name: e.target.value })} />
                    </Field>
                    <Field label="Company (optional)" id="org">
                      <Input id="org" value={payload.org ?? ""} onChange={(e) => set({ org: e.target.value })} />
                    </Field>
                    <Field label="Phone (optional)" id="cphone">
                      <Input id="cphone" inputMode="tel" value={payload.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
                    </Field>
                    <Field label="Email (optional)" id="cemail">
                      <Input id="cemail" inputMode="email" value={payload.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
                    </Field>
                  </>
                )}

                {payload.type === "wifi" && (
                  <>
                    <Field label="Network name (SSID)" id="ssid">
                      <Input id="ssid" value={payload.ssid} onChange={(e) => set({ ssid: e.target.value })} />
                    </Field>
                    <Field label="Security" id="sec">
                      <div className="grid grid-cols-3 gap-2">
                        {(["WPA", "WEP", "nopass"] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => set({ security: s })}
                            className={
                              payload.security === s
                                ? "rounded-lg border border-primary bg-primary/10 py-2 text-xs font-medium text-primary"
                                : "rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground"
                            }
                          >
                            {s === "nopass" ? "Open" : s}
                          </button>
                        ))}
                      </div>
                    </Field>
                    {payload.security !== "nopass" && (
                      <Field label="Password" id="wpass">
                        <Input id="wpass" value={payload.password ?? ""} onChange={(e) => set({ password: e.target.value })} />
                      </Field>
                    )}
                  </>
                )}
              </>
            )}

            <Field label="Tag name" id="tagname">
              <Input id="tagname" placeholder={existing?.name ?? "Tag 001"} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            {touched && error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full">
              Preview
            </Button>
            {!isDynamic && (
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("type")}>
                Choose a different type
              </Button>
            )}
          </form>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Exactly what will be written
              </p>
              <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-sm text-card-foreground">
                {encoded}
              </pre>
              <p className="mt-3 text-xs text-muted-foreground">
                Type: {isDynamic ? "Dynamic link" : CONTENT_LABELS[payload.type]} · {size.bytes} of ~
                {size.capacity} bytes
              </p>
              {isDynamic && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Tapping the tag will open
                  </p>
                  <p className="mt-1 break-all font-mono text-sm text-card-foreground">
                    {normalizeDestination(destination)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    You can change this later without touching the tag.
                  </p>
                </div>
              )}
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
              Edit content
            </Button>
          </div>
        )}

        {step === "writing" && (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <Smartphone className="mx-auto size-8 animate-pulse text-primary" />
            <p className="mt-4 text-sm font-medium text-card-foreground">
              {support === "demo"
                ? "Demo write — no tag is being touched"
                : "Hold the tag flat against the back of your phone"}
            </p>
            <p className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />{" "}
              {support === "demo" ? "Simulating…" : "Writing, then reading back to check…"}
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
                  {result.demo ? "Demo only — no tag was written" : "Tag written"}
                </p>
                <p className="mt-2 break-all text-xs text-muted-foreground">{encoded}</p>
                {!result.demo && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {result.verified === "verified"
                      ? "Read back from the tag and confirmed."
                      : result.verified === "mismatch"
                        ? "Warning: what we read back does not match. Try writing again."
                        : "Could not read the tag back to confirm — check it with Read NFC."}
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
              <Link to="/read">Read the tag back</Link>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/tags" })}>
              View my tags
            </Button>
            {!result.ok && (
              <Button variant="ghost" className="w-full" onClick={() => setStep("preview")}>
                Try again
              </Button>
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
