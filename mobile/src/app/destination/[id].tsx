import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { Body, Button, Card, Heading, KeyValue, Label, Screen, Segmented, TextField } from "@/components/ui";
import { DESTINATION_HINTS, DESTINATION_LABELS, buildDestination } from "@/lib/destination";
import { relativeTime } from "@/lib/format";
import { tagUrl } from "@/lib/links";
import { listDestinations, saveDestination } from "@/lib/tags";
import { useTags } from "@/lib/tags-context";
import { radius, spacing, useTheme } from "@/lib/theme";
import type { DestinationEntry, DestinationKind } from "@/lib/types";

const KINDS: DestinationKind[] = ["website", "google_review", "social", "phone", "email"];

export default function DestinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette } = useTheme();
  const { tags, refresh } = useTags();
  const tag = useMemo(() => tags.find((t) => t.id === id), [tags, id]);

  const [kind, setKind] = useState<DestinationKind>((tag?.destinationKind as DestinationKind) ?? "website");
  const [value, setValue] = useState(tag?.content ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<DestinationEntry[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setHistory(await listDestinations(id).catch(() => []));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const preview = useMemo(() => {
    if (!value.trim()) return null;
    const built = buildDestination(kind, value);
    return "error" in built ? { error: built.error } : { value: built.value };
  }, [kind, value]);

  async function save() {
    if (!tag) return;
    setError(null);
    setSaved(false);
    const built = buildDestination(kind, value);
    if ("error" in built) {
      setError(built.error);
      return;
    }
    setBusy(true);
    try {
      await saveDestination(tag.id, kind, value);
      await Promise.all([refresh(), load()]);
      setValue(built.value);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the destination.");
    } finally {
      setBusy(false);
    }
  }

  if (!tag) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <AppHeader title="Destination" back />
        <Screen>
          <Body muted>This tag could not be found.</Body>
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AppHeader title="Change destination" subtitle={tag.name} back />
      <Screen>
        <Card style={{ gap: spacing.sm }}>
          <Label>Permanent link on the chip</Label>
          <Text selectable style={{ color: palette.text, fontSize: 13 }}>
            {tagUrl(tag)}
          </Text>
          <Body muted size={11}>
            This link never changes, so the physical tag never needs rewriting. Only where it points changes.
          </Body>
        </Card>

        <Label>Destination type</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {KINDS.map((option) => {
            const active = option === kind;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  setKind(option);
                  setValue("");
                  setSaved(false);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderRadius: radius.pill,
                  backgroundColor: active ? palette.primarySoft : palette.surfaceAlt,
                  borderWidth: 1,
                  borderColor: active ? palette.primary : palette.border,
                }}
              >
                <Text style={{ color: active ? palette.primary : palette.text, fontSize: 13, fontWeight: "600" }}>
                  {DESTINATION_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={{ gap: spacing.md, marginTop: spacing.md }}>
          <TextField
            label={DESTINATION_LABELS[kind]}
            value={value}
            onChangeText={(next) => {
              setValue(next);
              setSaved(false);
            }}
            placeholder={DESTINATION_HINTS[kind]}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={kind === "phone" ? "phone-pad" : kind === "email" ? "email-address" : "default"}
          />

          {preview && "error" in preview ? (
            <Text style={{ color: palette.danger, fontSize: 12 }}>{preview.error}</Text>
          ) : preview ? (
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <Ionicons name="arrow-forward" size={12} color={palette.textMuted} />
              <Text style={{ color: palette.textMuted, fontSize: 12, flex: 1 }} numberOfLines={2}>
                {preview.value}
              </Text>
            </View>
          ) : null}

          <Button
            label={saved ? "Destination updated" : "Save destination"}
            icon={saved ? "checkmark-circle-outline" : "save-outline"}
            onPress={() => void save()}
            loading={busy}
            disabled={!value.trim()}
          />

          {error ? <Text style={{ color: palette.danger, fontSize: 12 }}>{error}</Text> : null}
        </Card>

        <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Label>Current</Label>
          <Heading size={14}>{tag.content || "Not set"}</Heading>
          <KeyValue label="Kind" value={tag.destinationKind.replace(/_/g, " ")} />
          <KeyValue label="Scans open the newest destination" value="automatic" />
        </Card>

        {history.length > 0 ? (
          <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Label>History</Label>
            {history.map((entry) => (
              <View key={entry.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Ionicons
                  name={entry.isCurrent ? "radio-button-on" : "radio-button-off"}
                  size={12}
                  color={entry.isCurrent ? palette.primary : palette.textMuted}
                />
                <Text
                  numberOfLines={1}
                  style={{ color: entry.isCurrent ? palette.text : palette.textMuted, fontSize: 12, flex: 1 }}
                >
                  {entry.destination}
                </Text>
                <Text style={{ color: palette.textMuted, fontSize: 10 }}>{relativeTime(entry.createdAt)}</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </Screen>
    </View>
  );
}
