import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Eraser,
  History,
  LifeBuoy,
  Link2,
  Loader2,
  Pencil,
  RotateCcw,
  ScanLine,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { NfcStatusBadge, useNfcStatus } from "@/components/NfcStatusBadge";
import { StatusPill } from "@/components/StatusPill";
import { TagQrCard } from "@/components/TagQrCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DESTINATION_HINTS,
  DESTINATION_LABELS,
  buildDestination,
  type DestinationKind,
} from "@/lib/destination";
import { CONTENT_LABELS, eraseTag, friendlyNfcError, readTagOnce } from "@/lib/nfc";
import {
  deleteTag,
  formatNumber,
  setDestination,
  setTagEnabled,
  tagUrl,
  updateTag,
  useDestinations,
  useLandingPages,
  useLostReports,
  useTag,
} from "@/lib/store";

const KINDS: DestinationKind[] = [
  "website",
  "google_review",
  "social",
  "phone",
  "email",
  "contact",
  "landing",
];

export const Route = createFileRoute("/tags/$tagId")({
  head: () => ({
    meta: [
      { title: "Tag details — NFC Smart Keychain" },
      {
        name: "description",
        content: "View, rename, write, erase and share a single NFC keychain tag.",
      },
      { property: "og:title", content: "Tag details — NFC Smart Keychain" },
      {
        property: "og:description",
        content: "View, rename, write, erase and share a single NFC keychain tag.",
      },
    ],
  }),
  component: TagDetailPage,
});

function TagDetailPage() {
  const { tagId } = Route.useParams();
  const navigate = useNavigate();
  const { tag, loading } = useTag(tagId);
  const status = useNfcStatus();
  const support = status?.mode ?? null;
  const demo = support === "demo";

  const { entries, reload } = useDestinations(tagId);

  const { pages } = useLandingPages();
  const { reports, reload: reloadReports } = useLostReports(tagId);

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DestinationKind>("website");
  const [destination, setDestinationValue] = useState("");
  const [savingDest, setSavingDest] = useState(false);
  const [busy, setBusy] = useState<"read" | "erase" | null>(null);
  const [readResult, setReadResult] = useState<string | null>(null);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [lostDraft, setLostDraft] = useState<{
    message: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
  } | null>(null);

  if (loading && !tag) {
    return (
      <AppShell title="Tag" back="/tags">
        <p className="text-sm text-muted-foreground">Loading tag…</p>
      </AppShell>
    );
  }

  if (!tag) {
    return (
      <AppShell title="Tag" back="/tags">
        <p className="text-sm text-muted-foreground">This tag no longer exists.</p>
      </AppShell>
    );
  }

  const isDynamic = tag.mode === "dynamic";
  const lost = lostDraft ?? {
    message: tag.lostMessage,
    contactName: tag.lostContactName,
    contactPhone: tag.lostContactPhone,
    contactEmail: tag.lostContactEmail,
  };

  const preview = destination.trim() ? buildDestination(kind, destination) : null;

  const saveName = async () => {
    await updateTag(tag.id, { name: name.trim() || tag.name });
    setRenaming(false);
    toast.success("Renamed.");
  };

  const saveDestination = async () => {
    setSavingDest(true);
    try {
      await setDestination(tag.id, destination, kind);
      setDestinationValue("");
      reload();
      toast.success("Destination updated. The tag itself was not rewritten.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the destination.");
    } finally {
      setSavingDest(false);
    }
  };

  const restore = async (value: string) => {
    try {
      await setDestination(tag.id, value, tag.destinationKind);
      reload();
      toast.success("Previous destination restored.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not restore that destination.");
    }
  };

  const saveLost = async () => {
    await updateTag(tag.id, {
      lostMessage: lost.message,
      lostContactName: lost.contactName,
      lostContactPhone: lost.contactPhone,
      lostContactEmail: lost.contactEmail,
    });
    setLostDraft(null);
    toast.success("Lost mode details saved.");
  };

  const doRead = async () => {
    setBusy("read");
    setReadResult(null);
    setReadNote(null);
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 1200));
        setReadResult(tag.demoContent ?? "Nothing simulated for this tag yet.");
        setReadNote("Demo mode — this is simulated data, not a physical tag.");
      } else {
        const values = await readTagOnce(20000);
        setReadResult(values.length ? values.join("\n") : "This tag is empty.");
      }
    } catch (e) {
      toast.error(friendlyNfcError(e));
    } finally {
      setBusy(null);
    }
  };

  const doErase = async () => {
    setBusy("erase");
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 900));
        await updateTag(tag.id, { demoContent: null, status: "empty" });
        toast.info("Demo mode — no physical tag was erased.");
      } else {
        await eraseTag();
        await updateTag(tag.id, {
          status: "empty",
          writtenContent: null,
          verified: "unverified",
        });
        toast.success("Tag erased.");
      }
    } catch (e) {
      toast.error(friendlyNfcError(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    await deleteTag(tag.id);
    toast.success("Tag deleted.");
    navigate({ to: "/tags" });
  };

  return (
    <AppShell title={tag.name} subtitle={formatNumber(tag.number)} back="/tags">
      <div className="space-y-5">
        <NfcStatusBadge support={support} />

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <StatusPill status={tag.status} />
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
              {isDynamic ? <Link2 className="size-3" /> : null}
              {isDynamic ? "Dynamic NFC" : "Direct NFC"}
            </span>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Tag number" value={formatNumber(tag.number)} />
            <Row label="Tag name" value={tag.name} />
            <Row label="Active" value={tag.enabled ? "Yes" : "No"} />
            <Row
              label="Content type"
              value={tag.contentType ? CONTENT_LABELS[tag.contentType] : "—"}
            />
            <Row label="Created" value={new Date(tag.createdAt).toLocaleString()} />
            <Row
              label="Last written"
              value={tag.lastWrittenAt ? new Date(tag.lastWrittenAt).toLocaleString() : "Never"}
            />
            {tag.status === "written" && (
              <Row
                label="Verified"
                value={
                  tag.verified === "verified"
                    ? "Read back and confirmed"
                    : tag.verified === "mismatch"
                      ? "Mismatch — write again"
                      : "Not confirmed"
                }
              />
            )}
          </dl>

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {isDynamic ? "Current destination" : "Current content"}
            </p>
            <p className="mt-1 break-all font-mono text-sm text-card-foreground">
              {tag.content || "Nothing set yet"}
            </p>

            <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
              On the NFC chip
            </p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
              {tag.writtenContent
                ? tag.writtenContent
                : tag.demoContent
                  ? `${tag.demoContent} (demo only — nothing on real hardware)`
                  : "Nothing written to a physical tag yet"}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-card-foreground">Tag enabled</span>
            <Switch
              checked={tag.enabled}
              onCheckedChange={(v) => void setTagEnabled(tag.id, v)}
              aria-label="Enable tag"
            />
          </div>
        </div>

        {isDynamic && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 text-primary" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Change destination
              </p>
            </div>

            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">
              On the tag (never changes)
            </p>
            <p className="mt-1 break-all font-mono text-xs text-card-foreground">{tagUrl(tag)}</p>

            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground">
              Tapping the tag opens now
            </p>
            <p className="mt-1 break-all font-mono text-xs text-card-foreground">
              {tag.enabled ? tag.content || "Nothing yet" : "Nothing — this tag is turned off"}
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                {KINDS.map((k) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={kind === k ? "default" : "outline"}
                    onClick={() => {
                      setKind(k);
                      setDestinationValue("");
                    }}
                  >
                    {DESTINATION_LABELS[k]}
                  </Button>
                ))}
              </div>

              {kind === "landing" ? (
                pages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    You have no landing pages yet.{" "}
                    <Link to="/pages" className="text-primary">
                      Create one
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {pages.map((p) => (
                      <Button
                        key={p.id}
                        size="sm"
                        variant={destination === `/p/${p.slug}` ? "default" : "outline"}
                        onClick={() => setDestinationValue(`/p/${p.slug}`)}
                      >
                        {p.title}
                      </Button>
                    ))}
                  </div>
                )
              ) : kind === "contact" ? (
                <Textarea
                  placeholder={
                    "BEGIN:VCARD\nVERSION:3.0\nFN:Your Name\nTEL:+15551234567\nEND:VCARD"
                  }
                  value={destination}
                  onChange={(e) => setDestinationValue(e.target.value)}
                />
              ) : (
                <Input
                  placeholder={DESTINATION_HINTS[kind]}
                  value={destination}
                  onChange={(e) => setDestinationValue(e.target.value)}
                />
              )}

              {preview && (
                <p className="break-all text-xs text-muted-foreground">
                  {"error" in preview ? (
                    <span className="text-destructive">{preview.error}</span>
                  ) : (
                    <>
                      After saving, the tag will open:{" "}
                      <span className="font-mono">{preview.value}</span>
                    </>
                  )}
                </p>
              )}

              <Button
                className="w-full"
                disabled={!destination.trim() || savingDest}
                onClick={() => void saveDestination()}
              >
                {savingDest && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save new destination
              </Button>
              <p className="text-[11px] text-muted-foreground">
                The physical tag is never rewritten when you change this.
              </p>
            </div>

            {entries.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-muted-foreground" />
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Destination history
                  </p>
                </div>
                <ul className="mt-3 space-y-3">
                  {entries.map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                          {entry.isCurrent ? "Current" : "Previous"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 break-all font-mono text-xs text-card-foreground">
                        {entry.destination}
                      </p>
                      {!entry.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => void restore(entry.destination)}
                        >
                          <RotateCcw className="mr-2 size-3" /> Restore
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-warning" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Lost mode</p>
            </div>
            <Switch
              checked={tag.lostMode}
              onCheckedChange={(v) => void updateTag(tag.id, { lostMode: v })}
              aria-label="Lost mode"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            While lost mode is on, taps and QR scans show your lost message instead of the normal
            destination. No location is ever collected.
          </p>

          <div className="mt-4 space-y-2">
            <Textarea
              placeholder="This keychain is lost — please get in touch."
              value={lost.message}
              onChange={(e) => setLostDraft({ ...lost, message: e.target.value })}
            />
            <Input
              placeholder="Contact name (optional)"
              value={lost.contactName}
              onChange={(e) => setLostDraft({ ...lost, contactName: e.target.value })}
            />
            <Input
              placeholder="Contact phone (optional)"
              value={lost.contactPhone}
              onChange={(e) => setLostDraft({ ...lost, contactPhone: e.target.value })}
            />
            <Input
              placeholder="Contact email (optional)"
              value={lost.contactEmail}
              onChange={(e) => setLostDraft({ ...lost, contactEmail: e.target.value })}
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-card-foreground">Let finders send a message</span>
              <Switch
                checked={tag.lostFormEnabled}
                onCheckedChange={(v) => void updateTag(tag.id, { lostFormEnabled: v })}
                aria-label="Finder contact form"
              />
            </div>
            <Button className="w-full" disabled={!lostDraft} onClick={() => void saveLost()}>
              Save lost mode details
            </Button>
          </div>

          {reports.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Messages from finders
              </p>
              <ul className="mt-3 space-y-3">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{r.finderName || "Someone"}</span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-card-foreground">{r.message}</p>
                    {r.finderContact && (
                      <p className="mt-1 text-xs text-primary">{r.finderContact}</p>
                    )}
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" className="mt-2" onClick={reloadReports}>
                Refresh messages
              </Button>
            </div>
          )}
        </div>

        <div id="qr" className="scroll-mt-24">
          <TagQrCard tag={tag} />
        </div>

        <div className="space-y-2">
          <Button asChild size="lg" className="w-full">
            <Link to="/write" search={{ tagId: tag.id }}>
              <Pencil className="mr-2 size-4" />
              {tag.status === "empty" ? "Write to NFC tag" : "Edit & rewrite NFC tag"}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="w-full"
            disabled={busy !== null}
            onClick={() => void doRead()}
          >
            {busy === "read" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ScanLine className="mr-2 size-4" />
            )}
            Read NFC
          </Button>

          <Button
            variant="outline"
            className="w-full"
            disabled={busy !== null}
            onClick={() => void doErase()}
          >
            {busy === "erase" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Eraser className="mr-2 size-4" />
            )}
            Erase NFC
          </Button>

          {renaming ? (
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tag.name}
              />
              <Button onClick={() => void saveName()}>Save</Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setName(tag.name);
                setRenaming(true);
              }}
            >
              Rename tag
            </Button>
          )}

          <Button variant="ghost" className="w-full text-destructive" onClick={() => void remove()}>
            <Trash2 className="mr-2 size-4" /> Delete tag
          </Button>
        </div>

        {readResult && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Read result</p>
            <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-sm text-card-foreground">
              {readResult}
            </pre>
            {readNote && <p className="mt-2 text-xs text-warning">{readNote}</p>}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-card-foreground">{value}</dd>
    </div>
  );
}
