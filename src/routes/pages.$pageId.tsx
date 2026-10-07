import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify, validateDestination } from "@/lib/destination";
import {
  deleteLandingPage,
  updateLandingPage,
  useLandingPages,
  type LandingPage,
} from "@/lib/store";

export const Route = createFileRoute("/pages/$pageId")({
  head: () => ({
    meta: [
      { title: "Edit landing page — NFC Smart Keychain" },
      {
        name: "description",
        content: "Edit the name, image, contact details and buttons of your page.",
      },
      { property: "og:title", content: "Edit landing page — NFC Smart Keychain" },
      {
        property: "og:description",
        content: "Edit the name, image, contact details and buttons of your page.",
      },
    ],
  }),
  component: PageEditor,
});

function PageEditor() {
  const { pageId } = Route.useParams();
  const navigate = useNavigate();
  const { pages, loading, reload } = useLandingPages();
  const page = pages.find((p) => p.id === pageId);

  const [draft, setDraft] = useState<LandingPage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (page && !draft) setDraft(page);
  }, [page, draft]);

  if (loading && !draft) {
    return (
      <AppShell title="Page" back="/pages">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!draft) {
    return (
      <AppShell title="Page" back="/pages">
        <p className="text-sm text-muted-foreground">This page no longer exists.</p>
      </AppShell>
    );
  }

  const set = <K extends keyof LandingPage>(key: K, value: LandingPage[K]) =>
    setDraft({ ...draft, [key]: value });

  const save = async () => {
    const slug = slugify(draft.slug);
    if (slug.length < 3) {
      toast.error("The page address needs at least 3 letters or numbers.");
      return;
    }
    for (const [label, value] of [
      ["Website", draft.website],
      ["Google Review", draft.googleReview],
    ] as const) {
      if (value.trim() && validateDestination(value)) {
        toast.error(`${label}: ${validateDestination(value)}`);
        return;
      }
    }
    for (const s of draft.socials) {
      if (validateDestination(s.url)) {
        toast.error(`${s.label || "Social link"}: enter a normal https link.`);
        return;
      }
    }

    setSaving(true);
    try {
      await updateLandingPage(draft.id, { ...draft, slug });
      reload();
      toast.success("Page saved.");
    } catch {
      toast.error("Could not save — that address may already be taken.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await deleteLandingPage(draft.id);
    toast.success("Page deleted.");
    navigate({ to: "/pages" });
  };

  return (
    <AppShell title={draft.title} subtitle={`/p/${draft.slug}`} back="/pages">
      <div className="space-y-5">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <Field label="Name">
            <Input value={draft.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Public address">
            <Input value={draft.slug} onChange={(e) => set("slug", e.target.value)} />
          </Field>
          <Field label="Logo or photo link">
            <Input
              placeholder="https://…/logo.png"
              value={draft.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Buttons</p>
          <Field label="Website">
            <Input value={draft.website} onChange={(e) => set("website", e.target.value)} />
          </Field>
          <Field label="Google Review link">
            <Input
              value={draft.googleReview}
              onChange={(e) => set("googleReview", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={draft.email} onChange={(e) => set("email", e.target.value)} />
          </Field>

          <p className="pt-2 text-xs uppercase tracking-widest text-muted-foreground">
            Social buttons
          </p>
          {draft.socials.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input
                className="w-28"
                placeholder="Label"
                value={s.label}
                onChange={(e) => {
                  const next = [...draft.socials];
                  next[i] = { ...s, label: e.target.value };
                  set("socials", next);
                }}
              />
              <Input
                placeholder="https://instagram.com/you"
                value={s.url}
                onChange={(e) => {
                  const next = [...draft.socials];
                  next[i] = { ...s, url: e.target.value };
                  set("socials", next);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  set(
                    "socials",
                    draft.socials.filter((_, j) => j !== i),
                  )
                }
                aria-label="Remove social button"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => set("socials", [...draft.socials, { label: "", url: "" }])}
          >
            <Plus className="mr-2 size-4" /> Add social button
          </Button>
        </section>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="text-sm text-card-foreground">Published</p>
            <p className="text-xs text-muted-foreground">
              Visitors can open this page without an account.
            </p>
          </div>
          <Switch
            checked={draft.published}
            onCheckedChange={(v) => set("published", v)}
            aria-label="Publish page"
          />
        </div>

        <p className="text-[11px] text-muted-foreground">
          Only text, links and an image address are allowed — custom code is never accepted.
        </p>

        <div className="space-y-2">
          <Button className="w-full" size="lg" disabled={saving} onClick={() => void save()}>
            Save page
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href={`/p/${draft.slug}`} target="_blank" rel="noreferrer noopener">
              <ExternalLink className="mr-2 size-4" /> Open public page
            </a>
          </Button>
          <Button variant="ghost" className="w-full text-destructive" onClick={() => void remove()}>
            <Trash2 className="mr-2 size-4" /> Delete page
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
