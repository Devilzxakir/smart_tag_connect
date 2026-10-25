import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { Body, Button, Heading, Screen, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { radius, spacing, useTheme } from "@/lib/theme";

export default function SignUpScreen() {
  const { palette } = useTheme();
  const { signUp } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!fullName.trim()) return setError("Enter your name.");
    if (!email.trim()) return setError("Enter your email.");
    if (password.length < 6) return setError("Use a password with at least 6 characters.");

    setBusy(true);
    try {
      const result = await signUp({ email, password, fullName, phone });
      if (result.needsConfirmation) {
        setSentTo(email.trim());
        return;
      }
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <AppHeader title="Check your email" back />
        <Screen>
          <View style={{ alignItems: "center", gap: spacing.md, paddingTop: spacing.xxl }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.pill,
                backgroundColor: palette.successSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="mail-unread-outline" size={28} color={palette.success} />
            </View>
            <Heading size={18}>Confirm your address</Heading>
            <Body muted style={{ textAlign: "center" }}>
              We sent a confirmation link to {sentTo}. Open it, then come back and sign in.
            </Body>
            <Button
              label="Back to sign in"
              onPress={() => router.replace("/sign-in")}
              style={{ marginTop: spacing.md, minWidth: 200 }}
            />
          </View>
        </Screen>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppHeader title="Create account" subtitle="Same account as the web app" back />
      <Screen>
        <View style={{ gap: spacing.lg }}>
          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Ada Lovelace"
            autoComplete="name"
            editable={!busy}
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!busy}
          />
          <TextField
            label="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            autoComplete="tel"
            hint="Used to recover lost tags — finders can call you without seeing your email."
            editable={!busy}
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            autoComplete="new-password"
            editable={!busy}
            onSubmitEditing={() => void submit()}
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

          <Button label="Create account" onPress={() => void submit()} loading={busy} icon="person-add-outline" />

          <View style={{ alignItems: "center" }}>
            <Link href="/sign-in" asChild>
              <Pressable>
                <Text style={{ color: palette.primary, fontSize: 14, fontWeight: "600" }}>
                  I already have an account
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
