import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { initializeNfc } from "@/lib/nfc";
import { TagsProvider } from "@/lib/tags-context";
import { ThemeProvider, spacing, useTheme } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Shown when the build has no Supabase credentials baked in. */
function SetupRequired() {
  const { palette } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: palette.background }]}>
      <Text style={{ color: palette.text, fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
        Almost there
      </Text>
      <Text style={{ color: palette.textMuted, textAlign: "center", lineHeight: 20 }}>
        This build has no Supabase credentials. Set EXPO_PUBLIC_SUPABASE_URL and
        {"\n"}EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then rebuild the app.
      </Text>
    </View>
  );
}

function RootNavigator() {
  const { palette } = useTheme();
  const { ready, session } = useAuth();

  useEffect(() => {
    if (Platform.OS === "android") void SystemUI.setBackgroundColorAsync(palette.background);
  }, [palette.background]);

  useEffect(() => {
    void initializeNfc();
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: palette.background }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <StatusBar style={palette.name === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="read" />
          <Stack.Screen name="tag/[id]" />
          <Stack.Screen name="destination/[id]" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="diagnostics" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  if (!isSupabaseConfigured) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <SetupRequired />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <TagsProvider>
            <RootNavigator />
          </TagsProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
});
