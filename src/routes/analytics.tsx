import { createFileRoute, Link } from "@tanstack/react-router";
import { Nfc, QrCode } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { RANGE_LABELS, useEvents, useTags, type RangeKey } from "@/lib/store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Tag activity — NFC Smart Keychain" },
      { name: "description", content: "Taps and scans for your NFC keychain tags over time." },
      { property: "og:title", content: "Tag activity — NFC Smart Keychain" },
      { property: "og:description", content: "Taps and scans for your NFC keychain tags over time." },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES: RangeKey[] = ["7d", "30d", "90d", "all"];

function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const { events, loading } = useEvents(range);
  const { tags } = useTags();

  const nameOf = (id: string) => tags.find((t) => t.id === id)?.name ?? "Deleted tag";

  const nfc = events.filter((e) => e.source === "nfc").length;
  const qr = events.filter((e) => e.source === "qr").length;

  const byTag = new Map<string, number>();
  events.forEach((e) => byTag.set(e.tagId, (byTag.get(e.tagId) ?? 0) + 1));
  const top = [...byTag.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const days = new Map<string, number>();
  events.forEach((e) => {
    const key = new Date(e.createdAt).toISOString().slice(0, 10);
    days.set(key, (days.get(key) ?? 0) + 1);
  });
  const byDay = [...days.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14);
  const maxDay = byDay.reduce((m, d) => Math.max(m, d[1]), 1);

  return (
    <AppShell title="Activity" subtitle="Taps and scans of your tags">
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-2">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
            >
              {RANGE_LABELS[r]}
            </Button>
          ))}
        </div>

        <div className="rounded-2xl bg-gradient-brand p-5 text-primary-foreground shadow-glow">
          <p className="text-xs uppercase tracking-widest opacity-80">Total scans</p>
          <p className="mt-1 text-4xl font-semibold">{events.length}</p>
          <p className="mt-2 text-sm opacity-90">
            {nfc} NFC tap{nfc === 1 ? "" : "s"} · {qr} QR scan{qr === 1 ? "" : "s"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat icon={<Nfc className="size-4 text-primary" />} label="NFC taps" value={nfc} />
          <Stat icon={<QrCode className="size-4 text-primary" />} label="QR scans" value={qr} />
        </div>

        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Most active tags</p>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : top.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No scans in this period yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {top.map(([id, count]) => (
                <li key={id} className="flex items-center justify-between text-sm">
                  <Link to="/tags/$tagId" params={{ tagId: id }} className="text-primary">
                    {nameOf(id)}
                  </Link>
                  <span className="text-card-foreground">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Activity by day</p>
          {byDay.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {byDay.map(([day, count]) => (
                <li key={day} className="flex items-center gap-3 text-xs">
                  <span className="w-20 shrink-0 text-muted-foreground">{day}</span>
                  <span className="h-2 flex-1 rounded-full bg-muted">
                    <span
                      className="block h-2 rounded-full bg-primary"
                      style={{ width: `${Math.round((count / maxDay) * 100)}%` }}
                    />
                  </span>
                  <span className="w-6 text-right text-card-foreground">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent activity</p>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No scans recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {events.slice(0, 20).map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="text-sm text-card-foreground">{nameOf(e.tagId)}</p>
                    <p className="text-muted-foreground">
                      {e.source === "qr" ? "QR scan" : "NFC tap"}
                      {e.deviceType ? ` · ${e.deviceType}` : ""}
                      {e.country ? ` · ${e.country}` : ""}
                    </p>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[11px] text-muted-foreground">
          Only the scan time, whether it came from NFC or QR, a broad device type and an approximate
          country are stored. No location tracking, no fingerprinting.
        </p>
      </div>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {icon}
      <p className="mt-2 text-2xl font-semibold text-card-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
