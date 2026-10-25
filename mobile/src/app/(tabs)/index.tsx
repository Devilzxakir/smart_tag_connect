import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TagCard } from "@/components/tag-card";
import { Badge, Body, Card, Heading, Screen, SectionHeader, Stat } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { initials, plural } from "@/lib/format";
import { getNfcAvailability, openNfcSettings, type NfcAvailability } from "@/lib/nfc";
import { listEvents } from "@/lib/tags";
import type { TagEvent } from "@/lib/types";
import { useTags } from "@/lib/tags-context";
import { radius, spacing, useTheme } from "@/lib/theme";

export default function HomeScreen() {
  const { palette, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { tags, loading, refresh } = useTags();

  const [nfc, setNfc] = useState<NfcAvailability | null>(null);
  const [events, setEvents] = useState<TagEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [availability, recentEvents] = await Promise.all([
      getNfcAvailability(),
      listEvents("30d").catch(() => []),
    ]);
    setNfc(availability);
    setEvents(recentEvents);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), load()]);
    setRefreshing(false);
  }, [refresh, load]);

  const written = tags.filter((t) => t.status === "written").length;
  const dynamic = tags.filter((t) => t.mode === "dynamic").length;
  const recent = [...tags].sort((a, b) => (b.lastWrittenAt ?? b.createdAt) - (a.lastWrittenAt ?? a.createdAt)).slice(0, 3);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.push("/profile")}
          style={{
            width: 42,
            height: 42,
            borderRadius: radius.pill,
            backgroundColor: palette.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: palette.primary, fontWeight: "700" }}>{initials(user?.fullName)}</Text>
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>{greeting}</Text>
          <Text style={{ color: palette.text, fontSize: 19, fontWeight: "700", letterSpacing: -0.3 }}>
            {(user?.fullName ?? "there").split(" ")[0]}
          </Text>
        </View>

        <Pressable
          onPress={toggle}
          accessibilityLabel="Toggle theme"
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.pill,
            backgroundColor: palette.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={palette.name === "dark" ? "sunny-outline" : "moon-outline"} size={18} color={palette.text} />
        </Pressable>
      </View>

      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {/* NFC status */}
        <Pressable
          onPress={() => {
            if (nfc && nfc.supported && !nfc.enabled) void openNfcSettings();
            else router.push("/diagnostics");
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            backgroundColor: nfc?.enabled ? palette.successSoft : palette.warningSoft,
            borderRadius: radius.md,
            paddingVertical: 10,
            paddingHorizontal: spacing.md,
          }}
        >
          <Ionicons
            name={nfc?.enabled ? "checkmark-circle" : "alert-circle"}
            size={16}
            color={nfc?.enabled ? palette.success : palette.warning}
          />
          <Text
            numberOfLines={2}
            style={{ flex: 1, color: nfc?.enabled ? palette.success : palette.warning, fontSize: 12, fontWeight: "600" }}
          >
            {nfc ? (nfc.enabled ? "NFC ready — tap to see platform details" : nfc.reason) : "Checking NFC…"}
          </Text>
        </Pressable>

        {/* Write / read hero */}
        <LinearGradient
          colors={["#0F3A4A", "#0B2038"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.md, gap: spacing.md }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ color: "#8FE3EF", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 }}>
              QUICK START
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "700" }}>
              Write a tag in two taps
            </Text>
            <Text style={{ color: "#A7C0D6", fontSize: 13, lineHeight: 18 }}>
              Tap write, choose a link, then hold the tag against your phone.
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              onPress={() => router.navigate("/(tabs)/write")}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: palette.primary,
                borderRadius: radius.md,
                paddingVertical: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="pencil-outline" size={16} color={palette.onPrimary} />
              <Text style={{ color: palette.onPrimary, fontWeight: "700", fontSize: 14 }}>Write tag</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/read")}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: radius.md,
                paddingVertical: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Read tag</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Stats */}
        <Card style={{ marginTop: spacing.md, flexDirection: "row" }}>
          <Stat label="Tags" value={String(tags.length)} />
          <Stat label="Written" value={String(written)} tint={palette.success} />
          <Stat label="Dynamic" value={String(dynamic)} tint={palette.primary} />
          <Stat label="Scans (30d)" value={String(events.length)} tint={palette.warning} />
        </Card>

        <SectionHeader
          title="Recent tags"
          action={tags.length > 0 ? () => router.navigate("/(tabs)/tags") : undefined}
          actionLabel="See all"
        />

        {loading ? (
          <Body muted>Loading your tags…</Body>
        ) : recent.length === 0 ? (
          <Card style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }}>
            <Ionicons name="pricetags-outline" size={22} color={palette.textMuted} />
            <Heading size={15}>No tags yet</Heading>
            <Body muted size={13} style={{ textAlign: "center" }}>
              Create a tag to keep a link, then write it to a chip.
            </Body>
            <Pressable onPress={() => router.navigate("/(tabs)/write")} style={{ marginTop: 4 }}>
              <Text style={{ color: palette.primary, fontWeight: "600", fontSize: 13 }}>Create your first tag</Text>
            </Pressable>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {recent.map((tag) => (
              <TagCard key={tag.id} tag={tag} onPress={() => router.push(`/tag/${tag.id}`)} />
            ))}
          </View>
        )}

        <View style={{ marginTop: spacing.xl, flexDirection: "row", gap: spacing.sm }}>
          <Badge label={`${plural(tags.length, "tag")} saved`} icon="pricetag-outline" />
          <Badge
            label={nfc?.supported ? "NFC hardware found" : "No NFC on this device"}
            icon="hardware-chip-outline"
          />
        </View>
      </Screen>
    </View>
  );
}
