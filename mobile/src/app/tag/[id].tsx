import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Share, Switch, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { AppHeader } from "@/components/app-header";
import { NfcPulse } from "@/components/nfc-pulse";
import {
  Badge,
  Body,
  Button,
  Card,
  Divider,
  Heading,
  KeyValue,
  Label,
  Screen,
  TextField,
} from "@/components/ui";
import { relativeTime } from "@/lib/format";
import { formatNumber, tagQrUrl, tagUrl } from "@/lib/links";
import {
  getNfcAvailability,
  previewText,
  writePayload,
  type NfcAvailability,
  type Payload,
} from "@/lib/nfc";
import { listDestinations, listLostReports, regeneratePublicCode } from "@/lib/tags";
import { useTags } from "@/lib/tags-context";
import { radius, spacing, statusTone, useTheme } from "@/lib/theme";
import type { DestinationEntry, LostReport } from "@/lib/types";

/** Direct content → the payload that reproduces it on a tag. */
function payloadFromContent(content: string): Payload | null {
  const value = content.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return { type: "url", url: value };
  if (/^tel:/i.test(value)) return { type: "tel", phone: value.replace(/^tel:/i, "") };
  if (/^mailto:/i.test(value)) return { type: "email", email: value.replace(/^mailto:/i, "").split("?")[0] ?? "" };
  if (/^BEGIN:VCARD/i.test(value)) return null;
  return { type: "text", text: value };
}

export default function TagDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette } = useTheme();
  const router = useRouter();
  const { tags, loading, update, remove, refresh } = useTags();

  const tag = useMemo(() => tags.find((t) => t.id === id), [tags, id]);

  const [name, setName] = useState(tag?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [destinations, setDestinations] = useState<DestinationEntry[]>([]);
  const [reports, setReports] = useState<LostReport[]>([]);
  const [nfc, setNfc] = useState<NfcAvailability | null>(null);
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const [lostMessage, setLostMessage] = useState(tag?.lostMessage ?? "");
  const [lostName, setLostName] = useState(tag?.lostContactName ?? "");
  const [lostPhone, setLostPhone] = useState(tag?.lostContactPhone ?? "");
  const [lostEmail, setLostEmail] = useState(tag?.lostContactEmail ?? "");

  useEffect(() => {
    if (tag) {
      setName(tag.name);
      setLostMessage(tag.lostMessage);
      setLostName(tag.lostContactName);
      setLostPhone(tag.lostContactPhone);
      setLostEmail(tag.lostContactEmail);
    }
  }, [tag?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRelated = useCallback(async () => {
    if (!tag) return;
    const [history, finderReports] = await Promise.all([
      listDestinations(tag.id).catch(() => []),
      listLostReports(tag.id).catch(() => []),
    ]);
    setDestinations(history);
    setReports(finderReports);
  }, [tag?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadRelated();
    void getNfcAvailability().then(setNfc);
  }, [loadRelated]);

  if (loading && !tag) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <AppHeader title="Tag" back />
        <Screen>
          <Body muted>Loading…</Body>
        </Screen>
      </View>
    );
  }

  if (!tag) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <AppHeader title="Tag not found" back />
        <Screen>
          <Body muted>This tag no longer exists, or it belongs to another account.</Body>
        </Screen>
      </View>
    );
  }

  const tone = statusTone(palette, tag.status);
  const publicLink = tagUrl(tag);
  const qrValue = tagQrUrl(tag);

  async function saveName() {
    if (!tag) return;
    setSavingName(true);
    try {
      await update(tag.id, { name: name.trim() || tag.name });
      setMessage({ tone: "success", text: "Name saved." });
    } catch {
      setMessage({ tone: "danger", text: "Could not save the name." });
    } finally {
      setSavingName(false);
    }
  }

  async function copyLink() {
    await Clipboard.setStringAsync(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function shareLink() {
    await Share.share({ message: `${tag?.name}: ${publicLink}` });
  }

  async function writeToChip() {
    if (!tag) return;
    const payload: Payload | null =
      tag.mode === "dynamic" ? { type: "url", url: publicLink } : payloadFromContent(tag.content);
    if (!payload) {
      setMessage({ tone: "danger", text: "This tag has no content to write yet." });
      return;
    }
    setWriting(true);
    setMessage(null);
    try {
      const outcome = await writePayload(payload, {
        alertMessage: `Write ${tag.name} to the tag`,
        demo: Boolean(nfc && !nfc.enabled),
      });
      await update(tag.id, {
        writtenContent: nfc?.enabled ? previewText(payload) : tag.writtenContent,
        demoContent: nfc?.enabled ? null : previewText(payload),
        status: nfc?.enabled ? "written" : "demo",
        verified: nfc?.enabled ? outcome.verified : "unverified",
        lastWrittenAt: Date.now(),
      });
      setMessage({
        tone: "success",
        text: nfc?.enabled
          ? outcome.verified === "verified"
            ? "Written and verified by the tag."
            : "Written, but the read-back was not confirmed."
          : "NFC unavailable — recorded a demo write only.",
      });
    } catch (err) {
      setMessage({ tone: "danger", text: err instanceof Error ? err.message : "Write failed." });
    } finally {
      setWriting(false);
    }
  }

  async function rotateCode() {
    if (!tag) return;
    await regeneratePublicCode(tag.id);
    await refresh();
  }

  function confirmRotate() {
    Alert.alert(
      "New public code?",
      "Any tag already written with the old link will stop working until it is rewritten.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Generate", style: "destructive", onPress: () => void rotateCode() },
      ],
    );
  }

  function confirmDelete() {
    if (!tag) return;
    Alert.alert("Delete this tag?", "The tag record, its history and finder messages are removed. The chip keeps whatever is on it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void remove(tag.id)
            .then(() => router.replace("/(tabs)/tags"))
            .catch(() => setMessage({ tone: "danger", text: "Could not delete the tag." }));
        },
      },
    ]);
  }

  async function saveLostMode(enabled: boolean) {
    if (!tag) return;
    await update(tag.id, { lostMode: enabled });
  }

  async function saveLostDetails() {
    if (!tag) return;
    await update(tag.id, {
      lostMessage,
      lostContactName: lostName,
      lostContactPhone: lostPhone,
      lostContactEmail: lostEmail,
    });
    setMessage({ tone: "success", text: "Lost-mode details saved." });
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AppHeader title={tag.name} subtitle={`${formatNumber(tag.number)} · ${tag.mode === "dynamic" ? "Dynamic" : "Direct"}`} back />
      <Screen>
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
          <View style={{ backgroundColor: tone.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill }}>
            <Text style={{ color: tone.fg, fontSize: 11, fontWeight: "700" }}>
              {tag.status === "written" ? "WRITTEN" : tag.status === "demo" ? "DEMO" : tag.status === "failed" ? "FAILED" : "NOT WRITTEN"}
            </Text>
          </View>
          {tag.verified ? <Badge label={tag.verified} icon="shield-checkmark-outline" /> : null}
          {tag.mode === "dynamic" ? <Badge label="dynamic" icon="git-branch-outline" /> : null}
          {!tag.enabled ? <Badge label="paused" icon="pause-outline" /> : null}
        </View>

        {message ? (
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: spacing.md,
              backgroundColor: message.tone === "success" ? palette.successSoft : palette.dangerSoft,
              padding: spacing.md,
              borderRadius: radius.md,
            }}
          >
            <Ionicons
              name={message.tone === "success" ? "checkmark-circle" : "alert-circle"}
              size={16}
              color={message.tone === "success" ? palette.success : palette.danger}
            />
            <Text
              style={{
                color: message.tone === "success" ? palette.success : palette.danger,
                fontSize: 13,
                flex: 1,
              }}
            >
              {message.text}
            </Text>
          </View>
        ) : null}

        {/* public link + QR */}
        <Card style={{ marginTop: spacing.md, alignItems: "center", gap: spacing.md }}>
          <View style={{ backgroundColor: "#FFFFFF", padding: spacing.md, borderRadius: radius.md }}>
            <QRCode value={qrValue} size={148} backgroundColor="#FFFFFF" color="#0A1224" />
          </View>
          <View style={{ alignItems: "center", gap: 2 }}>
            <Label>Public link</Label>
            <Text selectable style={{ color: palette.text, fontSize: 12, textAlign: "center" }}>
              {publicLink}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Button label={copied ? "Copied" : "Copy link"} variant="secondary" compact onPress={() => void copyLink()} icon="copy-outline" />
            <Button label="Share" variant="secondary" compact onPress={() => void shareLink()} icon="share-outline" />
            <Button label="New code" variant="secondary" compact onPress={confirmRotate} icon="refresh-outline" />
          </View>
        </Card>

        {/* write */}
        <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Label>{tag.mode === "dynamic" ? "Permanent link on the chip" : "Content"}</Label>
          <Text style={{ color: palette.text, fontSize: 13 }} numberOfLines={4}>
            {tag.mode === "dynamic" ? publicLink : tag.content || "Nothing yet"}
          </Text>
          {tag.writtenContent ? <KeyValue label="Last write" value={tag.writtenContent} /> : null}
          <KeyValue label="Last written" value={relativeTime(tag.lastWrittenAt)} />

          {writing ? (
            <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md }}>
              <NfcPulse size={110} />
              <Body muted size={12}>
                Hold the tag against your phone…
              </Body>
            </View>
          ) : (
            <Button
              label={tag.status === "written" ? "Rewrite to a tag" : "Write to a tag"}
              icon="radio-outline"
              variant="secondary"
              onPress={() => void writeToChip()}
            />
          )}
          {nfc && !nfc.enabled ? (
            <Body muted size={11}>
              {nfc.reason} Writes here will be recorded as demo writes.
            </Body>
          ) : null}
        </Card>

        {/* dynamic destination */}
        {tag.mode === "dynamic" ? (
          <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Label>Destination</Label>
              <Pressable onPress={() => router.push(`/destination/${tag.id}`)}>
                <Text style={{ color: palette.primary, fontSize: 13, fontWeight: "600" }}>Change</Text>
              </Pressable>
            </View>
            <Text style={{ color: palette.text, fontSize: 14 }}>{tag.content || "Not set yet"}</Text>
            <Text style={{ color: palette.textMuted, fontSize: 11 }}>
              Kind: {tag.destinationKind.replace(/_/g, " ")}
            </Text>

            {destinations.length > 0 ? (
              <>
                <Divider />
                <Label>History</Label>
                {destinations.slice(0, 5).map((entry) => (
                  <View key={entry.id} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <Ionicons
                      name={entry.isCurrent ? "radio-button-on" : "radio-button-off"}
                      size={12}
                      color={entry.isCurrent ? palette.primary : palette.textMuted}
                    />
                    <Text
                      numberOfLines={1}
                      style={{ color: entry.isCurrent ? palette.text : palette.textMuted, fontSize: 12, flex: 1 }}
                    >
                      {entry.destination}
                    </Text>
                    <Text style={{ color: palette.textMuted, fontSize: 10 }}>{relativeTime(entry.createdAt)}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </Card>
        ) : null}

        <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <Label>Rename</Label>
          <TextField value={name} onChangeText={setName} placeholder="Tag name" />
          <Button label="Save name" variant="secondary" onPress={() => void saveName()} loading={savingName} />
        </Card>

        {/* settings */}
        <Card style={{ marginTop: spacing.md, gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Heading size={14}>Tag active</Heading>
              <Body muted size={11}>
                Paused tags stop resolving for other people.
              </Body>
            </View>
            <Switch
              value={tag.enabled}
              onValueChange={(value) => void update(tag.id, { enabled: value })}
              trackColor={{ true: palette.primary, false: palette.border }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Divider />

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Heading size={14}>Lost mode</Heading>
              <Body muted size={11}>
                Anyone who taps the tag sees a contact page instead of your link.
              </Body>
            </View>
            <Switch
              value={tag.lostMode}
              onValueChange={(value) => void saveLostMode(value)}
              trackColor={{ true: palette.warning, false: palette.border }}
              thumbColor="#FFFFFF"
            />
          </View>

          {tag.lostMode ? (
            <View style={{ gap: spacing.sm }}>
              <TextField
                label="Message for the finder"
                value={lostMessage}
                onChangeText={setLostMessage}
                placeholder="I lost this keyring. Please get in touch."
                multiline
              />
              <TextField label="Contact name" value={lostName} onChangeText={setLostName} placeholder="Your name" />
              <TextField
                label="Contact phone"
                value={lostPhone}
                onChangeText={setLostPhone}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />
              <TextField
                label="Contact email"
                value={lostEmail}
                onChangeText={setLostEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Heading size={13}>Allow finder messages</Heading>
                  <Body muted size={11}>
                    Shows a short form on the lost page.
                  </Body>
                </View>
                <Switch
                  value={tag.lostFormEnabled}
                  onValueChange={(value) => void update(tag.id, { lostFormEnabled: value })}
                  trackColor={{ true: palette.primary, false: palette.border }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <Button label="Save lost-mode details" variant="secondary" onPress={() => void saveLostDetails()} />

              {reports.length > 0 ? (
                <>
                  <Divider />
                  <Label>Finder messages ({reports.length})</Label>
                  {reports.map((report) => (
                    <View key={report.id} style={{ gap: 2 }}>
                      <Text style={{ color: palette.text, fontSize: 12 }}>{report.message}</Text>
                      <Text style={{ color: palette.textMuted, fontSize: 10 }}>
                        {report.finderName || "Anonymous"}
                        {report.finderContact ? ` · ${report.finderContact}` : ""} · {relativeTime(report.createdAt)}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          ) : null}
        </Card>

        <View style={{ marginTop: spacing.xl }}>
          <Button label="Delete tag" variant="danger" icon="trash-outline" onPress={confirmDelete} />
        </View>
      </Screen>
    </View>
  );
}
