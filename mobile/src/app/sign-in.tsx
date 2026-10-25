import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Body, Button, Heading, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { PUBLIC_APP_URL } from "@/lib/config";
import { radius, spacing, useTheme } from "@/lib/theme";

export default function SignInScreen() {
  const { palette } = useTheme();
  const { signIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#0C2B3C", "#0A1A2E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + spacing.xxl,
            paddingBottom: spacing.xxl,
            paddingHorizontal: spacing.xl,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: radius.lg,
              backgroundColor: "rgba(31,182,201,0.22)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing.sm,
            }}
          >
            <Ionicons name="radio-outline" size={28} color="#38D3E6" />
          </View>
          <Text style={{ color: "#F3F7FF", fontSize: 27, fontWeight: "700", letterSpacing: -0.6 }}>
            Smart Tag Connect
          </Text>
          <Text style={{ color: "#9FB6CE", fontSize: 14, lineHeight: 20 }}>
            Write it once, change it any time. Sign in to write, read and manage your NFC tags.
          </Text>
        </LinearGradient>

        <View style={{ padding: spacing.xl, gap: spacing.lg }}>
          <View style={{ gap: 4 }}>
            <Heading size={19}>Welcome back</Heading>
            <Body muted size={13}>
              Use the same account as the web app.
            </Body>
          </View>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!busy}
          />

          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!reveal}
            autoComplete="password"
            textContentType="password"
            editable={!busy}
            onSubmitEditing={() => void submit()}
            returnKeyType="go"
            right={
              <Pressable onPress={() => setReveal((v) => !v)} hitSlop={8} accessibilityLabel="Toggle password">
                <Ionicons name={reveal ? "eye-off-outline" : "eye-outline"} size={18} color={palette.textMuted} />
              </Pressable>
            }
          />

          {error ? (
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                backgroundColor: palette.dangerSoft,
                padding: spacing.md,
                borderRadius: radius.md,
              }}
            >
              <Ionicons name="alert-circle" size={16} color={palette.danger} />
              <Text style={{ color: palette.danger, fontSize: 13, flex: 1 }}>{error}</Text>
            </View>
          ) : null}

          <Button label="Sign in" onPress={() => void submit()} loading={busy} icon="log-in-outline" />

          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <Body muted size={13}>
              No account yet?
            </Body>
            <Link href="/sign-up" asChild>
              <Pressable>
                <Text style={{ color: palette.primary, fontSize: 14, fontWeight: "600" }}>
                  Create an account
                </Text>
              </Pressable>
            </Link>
          </View>

          <Body muted size={11} style={{ textAlign: "center" }}>
            Tags and pages open on {PUBLIC_APP_URL.replace("https://", "")}
          </Body>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
