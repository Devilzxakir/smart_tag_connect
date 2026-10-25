/**
 * Shared UI primitives.
 *
 * Deliberately small and dependency-free (no UI kit) so the app stays easy to
 * build for both platforms and keeps the same visual language as the web app.
 */
import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { radius, spacing, useTheme, type Palette } from "@/lib/theme";

export type IoniconName = keyof typeof Ionicons.glyphMap;

/* ---------------- screen ---------------- */

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: palette.background }, style]}>{children}</View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={[
        { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 96 },
        style,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

/* ---------------- card ---------------- */

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { palette } = useTheme();
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: palette.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      padding: spacing.lg,
    },
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

/* ---------------- text ---------------- */

export function Heading({
  children,
  size = 20,
  style,
}: {
  children: ReactNode;
  size?: number;
  style?: StyleProp<TextStyle>;
}) {
  const { palette } = useTheme();
  return (
    <Text style={[{ color: palette.text, fontSize: size, fontWeight: "700", letterSpacing: -0.3 }, style]}>
      {children}
    </Text>
  );
}

export function Body({
  children,
  muted,
  size = 14,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  muted?: boolean;
  size?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { palette } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { color: muted ? palette.textMuted : palette.text, fontSize: size, lineHeight: size * 1.45 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  return (
    <Text
      style={{
        color: palette.textMuted,
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.1,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

/* ---------------- button ---------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  compact,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IoniconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const { palette } = useTheme();
  const isDisabled = disabled || loading;

  const colors: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: palette.primary, fg: palette.onPrimary, border: palette.primary },
    secondary: { bg: palette.surfaceAlt, fg: palette.text, border: palette.border },
    ghost: { bg: "transparent", fg: palette.primary, border: "transparent" },
    danger: { bg: palette.dangerSoft, fg: palette.danger, border: "transparent" },
  };
  const tone = colors[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled) }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: tone.bg,
          borderColor: tone.border,
          borderWidth: 1,
          borderRadius: radius.md,
          paddingVertical: compact ? 9 : 14,
          paddingHorizontal: compact ? 12 : 18,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : icon ? (
        <Ionicons name={icon} size={compact ? 16 : 18} color={tone.fg} />
      ) : null}
      <Text style={{ color: tone.fg, fontSize: compact ? 13 : 15, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tint,
  size = 40,
}: {
  icon: IoniconName;
  onPress: () => void;
  accessibilityLabel: string;
  tint?: string;
  size?: number;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.pill,
        backgroundColor: palette.surfaceAlt,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={size * 0.5} color={tint ?? palette.text} />
    </Pressable>
  );
}

/* ---------------- fields ---------------- */

export type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  error?: string | null;
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  right?: ReactNode;
};

export function TextField({ label, error, hint, right, ...props }: TextFieldProps) {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      {label ? <Label>{label}</Label> : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: palette.inputBackground,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: error ? palette.danger : focused ? palette.primary : palette.border,
          paddingHorizontal: 12,
        }}
      >
        <TextInput
          placeholderTextColor={palette.textMuted}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={{
            flex: 1,
            color: palette.text,
            fontSize: 15,
            paddingVertical: 13,
            minHeight: props.multiline ? 88 : undefined,
            textAlignVertical: props.multiline ? "top" : "center",
          }}
        />
        {right}
      </View>
      {error ? (
        <Text style={{ color: palette.danger, fontSize: 12 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

/* ---------------- badges & rows ---------------- */

export function Badge({
  label,
  color,
  background,
  icon,
}: {
  label: string;
  color?: string;
  background?: string;
  icon?: IoniconName;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: background ?? palette.surfaceAlt,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: radius.pill,
        alignSelf: "flex-start",
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={color ?? palette.textMuted} /> : null}
      <Text style={{ color: color ?? palette.textMuted, fontSize: 11, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  actionLabel,
}: {
  title: string;
  action?: () => void;
  actionLabel?: string;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
      }}
    >
      <Label>{title}</Label>
      {action && actionLabel ? (
        <Pressable onPress={action} hitSlop={8}>
          <Text style={{ color: palette.primary, fontSize: 13, fontWeight: "600" }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IoniconName;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: spacing.xxl, gap: spacing.sm }}>
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: radius.pill,
          backgroundColor: palette.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={26} color={palette.primary} />
      </View>
      <Heading size={16}>{title}</Heading>
      <Body muted style={{ textAlign: "center", maxWidth: 280 }}>
        {message}
      </Body>
      {action ? <View style={{ marginTop: spacing.sm }}>{action}</View> : null}
    </View>
  );
}

export function Stat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: tint ?? palette.text, fontSize: 22, fontWeight: "700" }}>{value}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/* ---------------- segmented control ---------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: palette.surfaceAlt,
        borderRadius: radius.md,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.sm + 2,
              backgroundColor: active ? palette.primary : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: active ? palette.onPrimary : palette.textMuted,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- misc ---------------- */

export function Divider() {
  const { palette } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />;
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: palette.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: palette.text, fontSize: 13, flexShrink: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

export function toneColors(palette: Palette, tone: "success" | "warning" | "danger" | "neutral") {
  switch (tone) {
    case "success":
      return { fg: palette.success, bg: palette.successSoft };
    case "warning":
      return { fg: palette.warning, bg: palette.warningSoft };
    case "danger":
      return { fg: palette.danger, bg: palette.dangerSoft };
    default:
      return { fg: palette.textMuted, bg: palette.surfaceAlt };
  }
}
