import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, LayoutTemplate, Nfc, Tags, Plus, ScanLine } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { NfcStatusBadge, useNfcSupport } from "@/components/NfcStatusBadge";
import { useTags, useUser } from "@/lib/store";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — NFC Smart Keychain" },
      {
        name: "description",
        content: "Your NFC keychain dashboard: tools, saved tags and quick actions.",
      },
      { property: "og:title", content: "Home — NFC Smart Keychain" },
      {
        property: "og:description",
        content: "Your NFC keychain dashboard: tools, saved tags and quick actions.",
      },
    ],
  }),
  component: HomePage,
});

const actions = [
  { to: "/tools", label: "NFC Tools", desc: "Read, write, erase", icon: Nfc },
  { to: "/tags", label: "My Tags", desc: "Saved tags", icon: Tags },
  { to: "/tags/add", label: "Add Tag", desc: "Direct or dynamic", icon: Plus },
  { to: "/read", label: "Read NFC", desc: "Scan a tag", icon: ScanLine },
  { to: "/pages", label: "Landing Pages", desc: "Simple public pages", icon: LayoutTemplate },
  { to: "/analytics", label: "Activity", desc: "Taps and scans", icon: BarChart3 },
] as const;

function HomePage() {
  const { user } = useUser();
  const { tags } = useTags();
  const support = useNfcSupport();

  const dynamic = tags.filter((t) => t.mode === "dynamic").length;

  return (
    <AppShell title="Home" subtitle={user ? user.email : undefined}>
      <div className="space-y-6">
        <NfcStatusBadge support={support} />

        <div className="rounded-2xl bg-gradient-brand p-5 text-primary-foreground shadow-glow">
          <p className="text-xs uppercase tracking-widest opacity-80">Saved tags</p>
          <p className="mt-1 text-4xl font-semibold">{tags.length}</p>
          <p className="mt-2 text-sm opacity-90">
            {dynamic > 0
              ? `${dynamic} dynamic — change where they go without rewriting the tag.`
              : "Write a website link to a keychain in a few taps."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {actions.map(({ to, label, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <Icon className="size-5 text-primary" />
              <p className="mt-3 text-sm font-semibold text-card-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
