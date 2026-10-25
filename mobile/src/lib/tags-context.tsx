/**
 * Shared tag cache.
 *
 * One provider owns the tag list so every screen sees the same data and a
 * write on one screen is reflected everywhere immediately. Refetches happen
 * on sign-in and after every mutation.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "./auth";
import { createTag, deleteTag, listTags, updateTag } from "./tags";
import type { Tag, TagMode } from "./types";

type TagsContextValue = {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: { name?: string; mode?: TagMode }) => Promise<Tag>;
  update: (id: string, patch: Partial<Tag>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  byId: (id: string) => Tag | undefined;
};

const TagsContext = createContext<TagsContextValue | null>(null);

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await listTags();
      setTags(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your tags.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setTags([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void refresh();
  }, [user, refresh]);

  const create = useCallback(
    async (input: { name?: string; mode?: TagMode }) => {
      const nextNumber = tags.reduce((max, t) => Math.max(max, t.number), 0) + 1;
      const tag = await createTag({ ...input, number: nextNumber });
      await refresh();
      return tag;
    },
    [tags, refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Tag>) => {
      // Optimistic so toggles feel instant; the refetch is the source of truth.
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      try {
        await updateTag(id, patch);
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      setTags((prev) => prev.filter((t) => t.id !== id));
      await deleteTag(id);
      await refresh();
    },
    [refresh],
  );

  const byId = useCallback((id: string) => tags.find((t) => t.id === id), [tags]);

  const value = useMemo<TagsContextValue>(
    () => ({ tags, loading, error, refresh, create, update, remove, byId }),
    [tags, loading, error, refresh, create, update, remove, byId],
  );

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
}

export function useTags(): TagsContextValue {
  const ctx = useContext(TagsContext);
  if (!ctx) throw new Error("useTags must be used inside TagsProvider");
  return ctx;
}
