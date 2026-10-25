import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { NfcPulse } from "@/components/nfc-pulse";
import { Body, Button, Card, Heading, KeyValue, Label, Screen } from "@/components/ui";
import {
  cancelNfc,
  getNfcAvailability,
  readTag,
  type NfcAvailability,
  type NfcRecord,
} from "@/lib/nfc";
import { radius, spacing, useTheme } from "@/lib/theme";

export default function ReadScreen() {
  const { palette } = useTheme();
  const [nfc, setNfc] = useState<NfcAvailability | null>(null);
  const [scanning, setScanning] = useState(false);
  const [records, setRecords] = useState<NfcRecord[] | null>(null);
  const [meta, setMeta] = useState<{ capacity: number | null; writable: boolean | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void getNfcAvailability().then(setNfc);
  }, []);

  async function startScan() {
    setError(null);
    setRecords(null);
    setScanning(true);
    try {
      const result = await readTag();
      setRecords(result.records);
      setMeta({ capacity: result.capacity, writable: result.writable });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the tag.");
    } finally {
      setScanning(false);
    }
  }

  async function copy(value: string) {
    await Clipboard.setStringAsync(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1600);
  }

  const webLinks = (records ?? []).map((r) => r.value).filter((v) => /^https?:\/\//i.test(v));

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AppHeader title="Read a tag" subtitle={nfc?.reason ?? "Checking NFC…"} back />
      <Screen>
        <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg }}>
          <NfcPulse active={scanning} />
          <Heading size={17}>{scanning ? "Waiting for a tag…" : "Scan an NFC tag"}</Heading>
          <Body muted size={13} style={{ textAlign: "center", maxWidth: 300 }}>
            {nfc?.enabled
              ? "Hold the tag flat against the back of the phone. Android reads near the centre, iPhone near the top edge."
              : nfc?.supported
                ? "NFC is switched off. Turn it on in phone settings first."
                : "This device has no NFC reader, so there is nothing to scan here."}
          </Body>

          {scanning ? (
            <Button label="Stop" variant="secondary" icon="stop-outline" onPress={() => void cancelNfc()} />
          ) : (
            <Button label={records ? "Scan again" : "Start scanning"} icon="scan-outline" onPress={() => void startScan()} />
          )}
        </View>

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

        {records ? (
          <>
            <Card style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Label>Tag contents</Label>
                <Text style={{ color: palette.textMuted, fontSize: 11 }}>
                  {records.length === 1 ? "1 record" : `${records.length} records`}
                </Text>
              </View>

              {records.length === 0 || (records.length === 1 && records[0]?.kind === "empty") ? (
                <Body muted size={13}>
                  This tag is empty. Write something to it from the Write tab.
                </Body>
              ) : (
                records.map((record, index) => (
                  <View
                    key={`${record.kind}-${index}`}
                    style={{ gap: 6, paddingVertical: spacing.sm, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: palette.border }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons
                        name={record.kind === "uri" ? "link-outline" : record.kind === "text" ? "text-outline" : "document-outline"}
                        size={13}
                        color={palette.primary}
                      />
                      <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: "600" }}>{record.label}</Text>
                    </View>
                    <Text selectable style={{ color: palette.text, fontSize: 14 }}>
                      {record.value || "(empty)"}
                    </Text>
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <Pressable
                        onPress={() => void copy(record.value)}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                      >
                        <Ionicons
                          name={copied === record.value ? "checkmark" : "copy-outline"}
                          size={13}
                          color={copied === record.value ? palette.success : palette.primary}
                        />
                        <Text style={{ color: copied === record.value ? palette.success : palette.primary, fontSize: 12 }}>
                          {copied === record.value ? "Copied" : "Copy"}
                        </Text>
                      </Pressable>
                      {/^https?:\/\//i.test(record.value) ? (
                        <Pressable
                          onPress={() => void WebBrowser.openBrowserAsync(record.value)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                        >
                          <Ionicons name="open-outline" size={13} color={palette.primary} />
                          <Text style={{ color: palette.primary, fontSize: 12 }}>Open</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </Card>

            <Card style={{ gap: 6, marginTop: spacing.sm }}>
              <Label>Tag info</Label>
              <KeyValue label="Writable" value={meta?.writable === null ? "unknown" : meta?.writable ? "yes" : "no"} />
              <KeyValue label="Capacity" value={meta?.capacity ? `${meta.capacity} bytes` : "unknown"} />
            </Card>

            {webLinks.length > 0 ? (
              <Button
                label="Open link on this phone"
                variant="secondary"
                icon="open-outline"
                onPress={() => void WebBrowser.openBrowserAsync(webLinks[0] as string)}
                style={{ marginTop: spacing.md }}
              />
            ) : null}
          </>
        ) : null}
      </Screen>
    </View>
  );
}
