import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { Body, Button, Card, Heading, KeyValue, Label, Screen, Segmented, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { APP_VERSION, PUBLIC_APP_URL } from "@/lib/config";
import { initials } from "@/lib/format";
import { useTags } from "@/lib/tags-context";
import { radius, spacing, useTheme } from "@/lib/theme";

export default function ProfileScreen() {
  const { palette, preference, setPreference } = useTheme();
  const { user, updateProfile, signOut } = useAuth();
  const { tags } = useTags();
  const router = useRouter();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.id, user?.fullName, user?.phone]);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await updateProfile({ fullName, phone });
      setMessage("Profile saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in with the same account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void signOut().then(() => router.replace("/sign-in"));
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AppHeader title="Profile" back />
      <Screen>
        <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md }}>
          <View
            style={{
              width: 74,
              height: 74,
              borderRadius: radius.pill,
              backgroundColor: palette.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: palette.primary, fontSize: 26, fontWeight: "700" }}>
              {initials(user?.fullName)}
            </Text>
          </View>
          <Heading size={18}>{user?.fullName ?? "Your account"}</Heading>
          <Body muted size={12}>
            {user?.email}
          </Body>
          <Text style={{ color: palette.textMuted, fontSize: 11 }}>
            {tags.length} {tags.length === 1 ? "tag" : "tags"} · {tags.filter((t) => t.mode === "dynamic").length} dynamic
          </Text>
        </View>

        {message ? (
          <View
            style={{
              backgroundColor: message.includes("saved") ? palette.successSoft : palette.dangerSoft,
              padding: spacing.md,
              borderRadius: radius.md,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ color: message.includes("saved") ? palette.success : palette.danger, fontSize: 13 }}>
              {message}
            </Text>
          </View>
        ) : null}

        <Card style={{ gap: spacing.md }}>
          <Label>Your details</Label>
          <TextField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Ada Lovelace" />
          <TextField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            hint="Shown on lost-mode pages only if you add it there."
          />
          <Button label="Save profile" variant="secondary" onPress={() => void save()} loading={busy} />
        </Card>

        <Card style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Label>Appearance</Label>
          <Segmented
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            value={preference}
            onChange={setPreference}
          />
        </Card>

        <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable
            onPress={() => router.push("/diagnostics")}
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}
          >
            <Ionicons name="hardware-chip-outline" size={18} color={palette.primary} />
            <View style={{ flex: 1 }}>
              <Heading size={14}>NFC diagnostics</Heading>
              <Body muted size={11}>
                Check the reader, permissions and platform mode.
              </Body>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
          </Pressable>
        </Card>

        <Card style={{ gap: 6, marginTop: spacing.md }}>
          <Label>About</Label>
          <KeyValue label="App version" value={APP_VERSION} />
          <KeyValue label="Tag links open on" value={PUBLIC_APP_URL.replace("https://", "")} />
          <KeyValue label="Data" value="Supabase, scoped to you" />
        </Card>

        <View style={{ marginTop: spacing.xl }}>
          <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={confirmSignOut} />
        </View>
      </Screen>
    </View>
  );
}
