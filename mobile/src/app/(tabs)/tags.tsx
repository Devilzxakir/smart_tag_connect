import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { TagCard } from "@/components/tag-card";
import { Body, Button, Card, EmptyState, Label, Screen, Segmented, TextField } from "@/components/ui";
import { useTags } from "@/lib/tags-context";
import { radius, spacing, useTheme } from "@/lib/theme";
import type { TagMode } from "@/lib/types";

type Filter = "all" | TagMode;

export default function TagsScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { tags, loading, error, refresh, create } = useTags();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMode, setNewMode] = useState<TagMode>("direct");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tags.filter((tag) => {
      if (filter !== "all" && tag.mode !== filter) return false;
      if (!needle) return true;
      return (
        tag.name.toLowerCase().includes(needle) ||
        tag.publicCode.toLowerCase().includes(needle) ||
        tag.content.toLowerCase().includes(needle)
      );
    });
  }, [tags, query, filter]);

  async function submitCreate() {
    const tag = await create({ name: newName, mode: newMode });
    setNewName("");
    setCreating(false);
    router.push(`/tag/${tag.id}`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AppHeader
        title="My tags"
        subtitle={`${tags.length} saved`}
        right={
          <Pressable
            onPress={() => setCreating((v) => !v)}
            accessibilityLabel="Create tag"
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.pill,
              backgroundColor: palette.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={22} color={palette.onPrimary} />
          </Pressable>
        }
      />

      <Screen onRefresh={() => void refresh()}>
        <TextField value={query} onChangeText={setQuery} placeholder="Search name, code or destination" />

        <View style={{ height: spacing.sm }} />
        <Segmented
          options={[
            { value: "all", label: "All" },
            { value: "direct", label: "Direct" },
            { value: "dynamic", label: "Dynamic" },
          ]}
          value={filter}
          onChange={setFilter}
        />

        {creating ? (
          <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Label>New tag</Label>
            <TextField value={newName} onChangeText={setNewName} placeholder="e.g. Gym locker" />
            <Segmented
              options={[
                { value: "direct", label: "Direct" },
                { value: "dynamic", label: "Dynamic" },
              ]}
              value={newMode}
              onChange={setNewMode}
            />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Button label="Cancel" variant="secondary" onPress={() => setCreating(false)} style={{ flex: 1 }} />
              <Button label="Create" onPress={() => void submitCreate()} style={{ flex: 1 }} />
            </View>
          </Card>
        ) : null}

        {error ? (
          <View
            style={{
              marginTop: spacing.md,
              backgroundColor: palette.dangerSoft,
              padding: spacing.md,
              borderRadius: radius.md,
            }}
          >
            <Text style={{ color: palette.danger, fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {visible.map((tag) => (
            <TagCard key={tag.id} tag={tag} onPress={() => router.push(`/tag/${tag.id}`)} />
          ))}
        </View>

        {!loading && visible.length === 0 ? (
          <EmptyState
            icon="pricetags-outline"
            title={tags.length === 0 ? "No tags yet" : "Nothing matches that"}
            message={
              tags.length === 0
                ? "Create a tag to keep a link, then write it to a chip from the Write tab."
                : "Try a different search, or clear the filters above."
            }
            action={
              tags.length === 0 ? (
                <Button label="Create a tag" icon="add-outline" onPress={() => setCreating(true)} />
              ) : undefined
            }
          />
        ) : null}

        {loading ? (
          <Body muted size={12} style={{ textAlign: "center", marginTop: spacing.lg }}>
            Loading your tags…
          </Body>
        ) : null}
      </Screen>
    </View>
  );
}
