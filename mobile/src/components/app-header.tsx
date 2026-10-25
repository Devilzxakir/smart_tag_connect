import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, spacing, useTheme } from "@/lib/theme";

/** Sticky-in-layout header used by every screen. */
export function AppHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={{
        paddingTop: insets.top + spacing.sm,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: palette.background,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
      }}
    >
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.pill,
            backgroundColor: palette.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={18} color={palette.text} />
        </Pressable>
      ) : null}

      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: "700", letterSpacing: -0.3 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>

      {right}
    </View>
  );
}
