import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { formatNumber, tagUrl } from "@/lib/links";
import { radius, spacing, statusTone, useTheme } from "@/lib/theme";
import type { Tag } from "@/lib/types";

const STATUS_LABEL: Record<Tag["status"], string> = {
  empty: "Not written",
  written: "Written",
  demo: "Demo write",
  failed: "Write failed",
};

export function statusLabel(tag: Tag): string {
  return STATUS_LABEL[tag.status];
}

/** Row used on the Home and My Tags screens. */
export function TagCard({ tag, onPress }: { tag: Tag; onPress: () => void }) {
  const { palette } = useTheme();
  const tone = statusTone(palette, tag.status);
  const target = tag.mode === "dynamic" ? tagUrl(tag) : tag.content;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.border,
        padding: spacing.lg,
        gap: 6,
        opacity: pressed ? 0.86 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: palette.text, fontSize: 15, fontWeight: "600", flex: 1 }} numberOfLines={1}>
          {tag.name}
        </Text>
        <View
          style={{
            backgroundColor: tone.bg,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: radius.pill,
          }}
        >
          <Text style={{ color: tone.fg, fontSize: 10, fontWeight: "700" }}>{STATUS_LABEL[tag.status]}</Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={palette.textMuted} />
      </View>

      <Text style={{ color: palette.textMuted, fontSize: 12 }}>
        {formatNumber(tag.number)} · {tag.mode === "dynamic" ? "Dynamic" : "Direct"}
        {!tag.enabled ? " · paused" : ""}
        {tag.lostMode ? " · lost mode" : ""}
      </Text>

      <Text style={{ color: palette.textMuted, fontSize: 12 }} numberOfLines={1}>
        {target || "Nothing written yet"}
      </Text>
    </Pressable>
  );
}
