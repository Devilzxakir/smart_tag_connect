import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTag, type TagMode } from "@/lib/store";

export const Route = createFileRoute("/tags/add")({
  head: () => ({
    meta: [
      { title: "Add Tag — NFC Smart Keychain" },
      { name: "description", content: "Create a direct or dynamic NFC keychain tag." },
      { property: "og:title", content: "Add Tag — NFC Smart Keychain" },
      { property: "og:description", content: "Create a direct or dynamic NFC keychain tag." },
    ],
  }),
  component: AddTagPage,
});

const MODES: { mode: TagMode; title: string; desc: string }[] = [
  {
    mode: "direct",
    title: "Direct NFC",
    desc: "The content itself is written onto the tag. Changing it means writing the tag again.",
  },
  {
    mode: "dynamic",
    title: "Dynamic NFC",
    desc: "A permanent link is written onto the tag. You can change where it goes any time, without touching the tag.",
  },
];

function AddTagPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<TagMode>("direct");
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const tag = await createTag(name, mode);
      toast.success(`${tag.name} added.`);
      navigate({ to: "/tags/$tagId", params: { tagId: tag.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the tag.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Add Tag" subtitle="Name it, then write to it" back="/tags">
      <form onSubmit={create} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Tag name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Leave blank for the next number"
          />
          <p className="text-xs text-muted-foreground">
            Simple names work best, like “Tag 001” or “Front door”.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Tag type</Label>
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              onClick={() => setMode(m.mode)}
              className={
                mode === m.mode
                  ? "block w-full rounded-2xl border border-primary bg-primary/10 p-4 text-left"
                  : "block w-full rounded-2xl border border-border bg-card p-4 text-left"
              }
            >
              <span className="block text-sm font-semibold text-card-foreground">{m.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{m.desc}</span>
            </button>
          ))}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          Add tag
        </Button>
      </form>
    </AppShell>
  );
}
