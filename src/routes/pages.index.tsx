import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LayoutTemplate, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/destination";
import { createLandingPage, useLandingPages } from "@/lib/store";

export const Route = createFileRoute("/pages/")({
  head: () => ({
    meta: [
      { title: "Landing pages — NFC Smart Keychain" },
      { name: "description", content: "Build simple mobile pages your tags can open." },
      { property: "og:title", content: "Landing pages — NFC Smart Keychain" },
      { property: "og:description", content: "Build simple mobile pages your tags can open." },
    ],
  }),
  component: PagesIndex,
});

function PagesIndex() {
  const { pages, loading, reload } = useLandingPages();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    const name = title.trim();
    if (!name) return;
    const slug = slugify(name) || `page-${Date.now().toString(36)}`;
    setCreating(true);
    try {
      const page = await createLandingPage(name, slug);
      reload();
      navigate({ to: "/pages/$pageId", params: { pageId: page.id } });
    } catch {
      toast.error("That address is already taken — try a different name.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell title="Landing pages" subtitle="Simple pages your tags can open" back="/home">
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">New page</p>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Page name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button disabled={!title.trim() || creating} onClick={() => void create()}>
              <Plus className="mr-2 size-4" /> Create
            </Button>
          </div>
          {title.trim() && (
            <p className="mt-2 break-all text-xs text-muted-foreground">
              Public address: <span className="font-mono">/p/{slugify(title)}</span>
            </p>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pages yet. Create one and point a dynamic tag at it.
          </p>
        ) : (
          <ul className="space-y-3">
            {pages.map((p) => (
              <li key={p.id}>
                <Link
                  to="/pages/$pageId"
                  params={{ pageId: p.id }}
                  className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="size-4 text-primary" />
                    <p className="text-sm font-semibold text-card-foreground">{p.title}</p>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">/p/{p.slug}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.published ? "Published" : "Not published"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
