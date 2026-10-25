import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { Body, Card, EmptyState, Heading, Label, Screen, Segmented, Stat } from "@/components/ui";
import { dailySeries, relativeTime } from "@/lib/format";
import { listEvents } from "@/lib/tags";
import { useTags } from "@/lib/tags-context";
import { radius, spacing, useTheme } from "@/lib/theme";
import type { RangeKey, TagEvent } from "@/lib/types";

export default function ActivityScreen() {
  const { palette } = useTheme();
  const { tags } = useTags();
  const [range, setRange] = useState<RangeKey>("30d");
  const [events, setEvents] = useState<TagEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await listEvents(range));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load activity.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const tagName = useCallback(
    (id: string) => tags.find((t) => t.id === id)?.name ?? "Deleted tag",
    [tags],
  );

  const nfcCount = events.filter((e) => e.source === "nfc").length;
  const qrCount = events.filter((e) => e.source === "qr").length;
  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      if (!event.country) continue;
      counts.set(event.country, (counts.get(event.country) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [events]);

  const series = useMemo(() => dailySeries(events.map((e) => e.createdAt), 14), [events]);
  const peak = Math.max(1, ...series.map((point) => point.value));

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AppHeader title="Activity" subtitle="Scans of your tags" />
      <Screen onRefresh={() => void load()}>
        <Segmented
          options={[
            { value: "7d", label: "7 days" },
            { value: "30d", label: "30 days" },
            { value: "90d", label: "90 days" },
            { value: "all", label: "All" },
          ]}
          value={range}
          onChange={setRange}
        />

        <Card style={{ marginTop: spacing.md, flexDirection: "row" }}>
          <Stat label="Total scans" value={String(events.length)} />
          <Stat label="NFC taps" value={String(nfcCount)} tint={palette.primary} />
          <Stat label="QR scans" value={String(qrCount)} tint={palette.warning} />
        </Card>

        {series.length > 0 ? (
          <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Label>Last 14 days</Label>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 84 }}>
              {series.map((point) => (
                <View key={point.label} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                  <View
                    style={{
                      width: "100%",
                      height: Math.max(3, (point.value / peak) * 66),
                      borderRadius: 4,
                      backgroundColor: point.value > 0 ? palette.primary : palette.surfaceAlt,
                    }}
                  />
                  <Text style={{ color: palette.textMuted, fontSize: 8 }}>{point.label.slice(3)}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {countries.length > 0 ? (
          <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <Label>Where scans came from</Label>
            {countries.map(([country, count]) => (
              <View key={country} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: palette.text, fontSize: 13 }}>{country}</Text>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>{count}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Label>Recent scans</Label>
        {loading ? (
          <Body muted size={12} style={{ marginTop: spacing.sm }}>
            Loading…
          </Body>
        ) : error ? (
          <Text style={{ color: palette.danger, fontSize: 12, marginTop: spacing.sm }}>{error}</Text>
        ) : events.length === 0 ? (
          <EmptyState
            icon="pulse-outline"
            title="No scans yet"
            message="Tap one of your written tags with a phone, or scan its QR code, and it will show up here."
          />
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {events.slice(0, 40).map((event) => (
              <View
                key={event.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                  backgroundColor: palette.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: palette.border,
                  padding: spacing.md,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radius.pill,
                    backgroundColor: event.source === "nfc" ? palette.primarySoft : palette.warningSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={event.source === "nfc" ? "radio-outline" : "qr-code-outline"}
                    size={15}
                    color={event.source === "nfc" ? palette.primary : palette.warning}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Heading size={13}>{tagName(event.tagId)}</Heading>
                  <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                    {event.source === "nfc" ? "NFC tap" : "QR scan"}
                    {event.deviceType ? ` · ${event.deviceType}` : ""}
                    {event.country ? ` · ${event.country}` : ""}
                  </Text>
                </View>
                <Text style={{ color: palette.textMuted, fontSize: 10 }}>{relativeTime(event.createdAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </Screen>
    </View>
  );
}
