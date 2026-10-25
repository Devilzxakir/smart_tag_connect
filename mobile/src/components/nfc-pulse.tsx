import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

import { radius, useTheme } from "@/lib/theme";

/**
 * Concentric "waiting for a tag" animation.
 *
 * Pure RN Animated (no reanimated) so it works in every build configuration.
 */
export function NfcPulse({ active = true, size = 148 }: { active?: boolean; size?: number }) {
  const { palette } = useTheme();
  const first = useRef(new Animated.Value(0)).current;
  const second = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      first.setValue(0);
      second.setValue(0);
      return;
    }
    const loop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    loop(first, 0);
    loop(second, 900);
  }, [active, first, second]);

  const ring = (value: Animated.Value) => ({
    position: "absolute" as const,
    width: size,
    height: size,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.primary,
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={ring(first)} />
      <Animated.View style={ring(second)} />
      <View
        style={{
          width: size * 0.52,
          height: size * 0.52,
          borderRadius: radius.pill,
          backgroundColor: palette.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="wifi" size={size * 0.24} color={palette.primary} style={{ transform: [{ rotate: "90deg" }] }} />
      </View>
    </View>
  );
}
