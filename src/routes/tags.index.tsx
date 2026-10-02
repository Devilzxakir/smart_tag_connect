import { createFileRoute, Link } from "@tanstack/react-router";
import { Link2, Plus, QrCode, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CONTENT_LABELS } from "@/lib/nfc";
import { formatNumber, setTagEnabled, useTags } from "@/lib/store";

export const Route = createFileRoute("/tags/")({
  head: () => ({
    meta: [
      { title: "My Tags — NFC Smart Keychain" },
      { name: "description", content: "Search, open and manage every NFC keychain tag you've saved." },
      { property: "og:title", content: "My Tags — NFC Smart Keychain" },
      { property: "og:description", content: "Search, open and manage every NFC keychain tag you've saved." },
    ],
  }),
  component: TagsPage,
});

function TagsPage() {
  const { tags, loading } = useTags();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) =>
      [t.name, formatNumber(t.number), t.content, t.contentType ? CONTENT_LABELS[t.contentType] : ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [tags, query]);

  return (
    <AppShell title="My Tags" subtitle={`${tags.length} saved`}>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search tags"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <Button asChild size="lg" className="w-full">
          <Link to="/tags/add">
            <Plus className="mr-2 size-4" /> Add tag
          </Link>
        </Button>

        {loading && tags.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading your tags…</p>
        )}

        {!loading && tags.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No tags yet. Add one to get started.</p>
          </div>
        )}

        {tags.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing matches “{query}”.</p>
        )}

        <div className="space-y-3">
          {filtered.map((tag) => (
            <div key={tag.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link to="/tags/$tagId" params={{ tagId: tag.id }} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-card-foreground">{tag.name}</p>
                    {tag.mode === "dynamic" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        <Link2 className="size-3" /> Dynamic
                      </span>
                    )}
                    {!tag.enabled && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Off
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatNumber(tag.number)} ·{" "}
                    {tag.contentType ? CONTENT_LABELS[tag.contentType] : "No content"} ·{" "}
                    {new Date(tag.createdAt).toLocaleDateString()}
                  </p>
                  {tag.content && (
                    <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
                      {tag.content}
                    </p>
                  )}
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusPill status={tag.status} />
                  <Switch
                    checked={tag.enabled}
                    onCheckedChange={(v) => void setTagEnabled(tag.id, v)}
                    aria-label="Enable tag"
                  />
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to="/write" search={{ tagId: tag.id }}>
                    {tag.status === "empty" ? "Write" : "Rewrite"}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to="/tags/$tagId" params={{ tagId: tag.id }} hash="qr">
                    <QrCode className="mr-2 size-4" /> QR
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
