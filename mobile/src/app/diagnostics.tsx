import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import { useCallback, useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { Badge, Body, Button, Card, Heading, KeyValue, Label, Screen } from "@/components/ui";
import { APP_VERSION, PUBLIC_APP_URL, SUPABASE_URL } from "@/lib/config";
import { getNfcAvailability, openNfcSettings, type NfcAvailability } from "@/lib/nfc";
import { radius, spacing, useTheme } from "@/lib/theme";

export default function DiagnosticsScreen() {
  const { palette } = useTheme();
  const [nfc, setNfc] = useState<NfcAvailability | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setNfc(await getNfcAvailability());
    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const projectHost = SUPABASE_URL.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AppHeader title="NFC diagnostics" subtitle="Platform status" back />
      <Screen>
        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name={nfc?.enabled ? "checkmark-circle" : "warning"}
              size={20}
              color={nfc?.enabled ? palette.success : palette.warning}
            />
            <Heading size={16}>
              {nfc ? (nfc.enabled ? "NFC is ready" : nfc.supported ? "NFC is off" : "No NFC reader") : "Checking…"}
            </Heading>
          </View>
          <Body muted size={13}>
            {nfc?.reason ?? "Reading the NFC hardware state…"}
          </Body>
          {nfc?.supported && !nfc.enabled ? (
            <Button label="Open NFC settings" variant="secondary" compact onPress={() => void openNfcSettings()} />
          ) : null}
          <Button label="Re-check" variant="ghost" compact icon="refresh-outline" onPress={() => void check()} loading={checking} />
        </Card>

        <Card style={{ gap: 6, marginTop: spacing.md }}>
          <Label>Platform</Label>
          <KeyValue label="App version" value={APP_VERSION} />
          <KeyValue label="Device" value={Device.deviceName ?? Device.modelName ?? "unknown"} />
          <KeyValue label="Model" value={Device.modelName ?? "unknown"} />
          <KeyValue label="OS" value={`${Device.osName ?? "unknown"} ${Device.osVersion ?? ""}`} />
          <KeyValue label="NFC engine" value={Platform.OS === "web" ? "browser (no NFC)" : "react-native-nfc-manager"} />
          <KeyValue label="NFC supported" value={nfc?.supported ? "yes" : "no"} />
          <KeyValue label="NFC enabled" value={nfc?.enabled ? "yes" : "no"} />
        </Card>

        <Card style={{ gap: 6, marginTop: spacing.md }}>
          <Label>Backend</Label>
          <KeyValue label="Supabase project" value={projectHost || "not configured"} />
          <KeyValue label="Public tag origin" value={PUBLIC_APP_URL} />
        </Card>

        <Card style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Label>If NFC does not work</Label>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Badge label="1" icon={undefined} color={palette.primary} background={palette.primarySoft} />
            <Body muted size={12} style={{ flex: 1 }}>
              Turn NFC on in phone settings (Android: Connected devices → Connection preferences → NFC).
            </Body>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Badge label="2" color={palette.primary} background={palette.primarySoft} />
            <Body muted size={12} style={{ flex: 1 }}>
              Remove thick cases. The antenna sits near the camera on most phones.
            </Body>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Badge label="3" color={palette.primary} background={palette.primarySoft} />
            <Body muted size={12} style={{ flex: 1 }}>
              Close other apps that use NFC (banking, transit) and try again.
            </Body>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Badge label="4" color={palette.primary} background={palette.primarySoft} />
            <Body muted size={12} style={{ flex: 1 }}>
              On iPhone, hold the tag against the top edge; on Android, the upper back.
            </Body>
          </View>
          <Text style={{ color: palette.textMuted, fontSize: 11, marginTop: spacing.sm }}>
            Emulators and the iOS Simulator have no NFC hardware, so only physical devices can read or write tags.
          </Text>
        </Card>

        <View
          style={{
            flexDirection: "row",
            gap: 8,
            backgroundColor: palette.surfaceAlt,
            padding: spacing.md,
            borderRadius: radius.md,
            marginTop: spacing.md,
          }}
        >
          <Ionicons name="lock-closed-outline" size={14} color={palette.textMuted} />
          <Text style={{ color: palette.textMuted, fontSize: 11, flex: 1 }}>
            This app asks for NFC only. No location, Bluetooth or background scanning.
          </Text>
        </View>
      </Screen>
    </View>
  );
}
