import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { NfcPulse } from "@/components/nfc-pulse";
import { Badge, Body, Button, Card, Heading, KeyValue, Label, Screen, Segmented, TextField } from "@/components/ui";
import { formatNumber, tagUrl } from "@/lib/links";
import {
  checkSize,
  encodePayload,
  getNfcAvailability,
  previewText,
  validatePayload,
  writePayload,
  type NfcAvailability,
  type Payload,
} from "@/lib/nfc";
import { useTags } from "@/lib/tags-context";
import { radius, spacing, useTheme } from "@/lib/theme";
import type { ContentType, Tag, TagMode } from "@/lib/types";

type DirectType = Exclude<ContentType, "vcard"> | "vcard";

const CONTENT_OPTIONS: { value: DirectType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "url", label: "Website", icon: "globe-outline" },
  { value: "text", label: "Text", icon: "text-outline" },
  { value: "tel", label: "Phone", icon: "call-outline" },
  { value: "email", label: "Email", icon: "mail-outline" },
  { value: "wifi", label: "Wi-Fi", icon: "wifi-outline" },
  { value: "vcard", label: "Contact", icon: "person-outline" },
];

type WriteResult =
  | { status: "verified" | "mismatch" | "unverified"; demo: boolean; saved?: string }
  | null;

export default function WriteScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { tags, create, update, refresh } = useTags();

  const [mode, setMode] = useState<TagMode>("direct");
  const [contentType, setContentType] = useState<DirectType>("url");
  const [nfc, setNfc] = useState<NfcAvailability | null>(null);

  // direct form
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiSecurity, setWifiSecurity] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // dynamic form
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");

  // write state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WriteResult>(null);
  const [saveName, setSaveName] = useState("");
  const [savedTagId, setSavedTagId] = useState<string | null>(null);

  const dynamicTags = useMemo(() => tags.filter((t) => t.mode === "dynamic"), [tags]);
  const selectedTag = useMemo(
    () => dynamicTags.find((t) => t.id === selectedTagId) ?? null,
    [dynamicTags, selectedTagId],
  );

  useEffect(() => {
    void getNfcAvailability().then(setNfc);
  }, []);

  const payload = useMemo<Payload | null>(() => {
    if (mode === "dynamic") {
      if (!selectedTag) return null;
      return { type: "url", url: tagUrl(selectedTag) };
    }
    switch (contentType) {
      case "url":
        return { type: "url", url };
      case "text":
        return { type: "text", text };
      case "tel":
        return { type: "tel", phone };
      case "email":
        return { type: "email", email };
      case "wifi":
        return { type: "wifi", ssid, password: wifiPassword, security: wifiSecurity };
      case "vcard":
        return {
          type: "vcard",
          name: contactName,
          phone: contactPhone,
          email: contactEmail,
        };
    }
  }, [
    mode,
    selectedTag,
    contentType,
    url,
    text,
    phone,
    email,
    ssid,
    wifiPassword,
    wifiSecurity,
    contactName,
    contactPhone,
    contactEmail,
  ]);

  const validation = payload ? validatePayload(payload) : null;
  const size = payload ? checkSize(payload) : null;
  const preview = payload && !validation ? previewText(payload) : "";
  const canDemo = Boolean(nfc && !nfc.enabled);

  const persistWrite = useCallback(
    async (tag: Tag | null, encoded: string, demo: boolean, verified: "verified" | "mismatch" | "unverified", name?: string) => {
      const patch: Partial<Tag> = {
        writtenContent: demo ? tag?.writtenContent ?? null : encoded,
        demoContent: demo ? encoded : null,
        status: demo ? "demo" : "written",
        verified: demo ? "unverified" : verified,
        lastWrittenAt: Date.now(),
      };
      if (tag) {
        if (tag.mode === "direct") patch.contentType = contentType as ContentType;
        await update(tag.id, tag.mode === "direct" ? { ...patch, content: encoded } : patch);
        return tag.id;
      }
      const created = await create({ name: name?.trim() || undefined, mode: "direct" });
      await update(created.id, { ...patch, content: encoded, contentType: contentType as ContentType });
      return created.id;
    },
    [contentType, create, update],
  );

  async function runWrite(demo: boolean) {
    if (!payload) {
      setError(mode === "dynamic" ? "Pick or create a dynamic tag first." : "Fill in the content first.");
      return;
    }
    const invalid = validatePayload(payload);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (size?.level === "over" && !demo) {
      setError(`This payload needs ${size.bytes} bytes and a keychain tag holds about ${size.capacity}.`);
      return;
    }

    setError(null);
    setBusy(true);
    setResult(null);
    const encoded = encodePayload(payload);

    try {
      const outcome = await writePayload(payload, { demo });
      let savedId: string | null = null;

      if (mode === "dynamic" && selectedTag) {
        await update(selectedTag.id, {
          writtenContent: demo ? selectedTag.writtenContent : encoded,
          demoContent: demo ? encoded : null,
          status: demo ? "demo" : "written",
          verified: demo ? "unverified" : outcome.verified,
          lastWrittenAt: Date.now(),
        });
        savedId = selectedTag.id;
        setSavedTagId(selectedTag.id);
      }

      setResult({ status: demo ? "unverified" : outcome.verified, demo, ...(savedId ? { saved: savedId } : {}) });
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not write the tag.";
      setError(message);
      if (mode === "dynamic" && selectedTag) {
        await update(selectedTag.id, { status: "failed" }).catch(() => undefined);
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveDirectWrite() {
    if (!payload) return;
    const encoded = encodePayload(payload);
    setBusy(true);
    try {
      const id = await persistWrite(null, encoded, result?.demo ?? false, result?.status ?? "unverified", saveName);
      setSavedTagId(id);
      setResult((prev) => (prev ? { ...prev, saved: id } : prev));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this tag.");
    } finally {
      setBusy(false);
    }
  }

  async function createDynamicTag() {
    setError(null);
    setBusy(true);
    try {
      const tag = await create({ name: newTagName.trim() || undefined, mode: "dynamic" });
      setSelectedTagId(tag.id);
      setNewTagName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the tag.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AppHeader
        title="Write a tag"
        subtitle={nfc ? (nfc.enabled ? "NFC ready" : nfc.reason) : "Checking NFC…"}
        right={
          <Pressable onPress={() => router.push("/diagnostics")} accessibilityLabel="NFC diagnostics">
            <Ionicons name="information-circle-outline" size={22} color={palette.textMuted} />
          </Pressable>
        }
      />

      <Screen>
        <Segmented
          options={[
            { value: "direct", label: "Direct write" },
            { value: "dynamic", label: "Dynamic tag" },
          ]}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setResult(null);
            setSavedTagId(null);
          }}
        />

        <Body muted size={12} style={{ marginTop: spacing.sm }}>
          {mode === "direct"
            ? "The link is stored on the chip. Rewriting it later means tapping the tag again."
            : "A permanent /t/<code> link goes on the chip. Change where it points any time without rewriting the tag."}
        </Body>

        {mode === "direct" ? (
          <>
            <Label>Content type</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {CONTENT_OPTIONS.map((option) => {
                const active = option.value === contentType;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setContentType(option.value)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderRadius: radius.pill,
                      backgroundColor: active ? palette.primarySoft : palette.surfaceAlt,
                      borderWidth: 1,
                      borderColor: active ? palette.primary : palette.border,
                    }}
                  >
                    <Ionicons name={option.icon} size={14} color={active ? palette.primary : palette.textMuted} />
                    <Text style={{ color: active ? palette.primary : palette.text, fontSize: 13, fontWeight: "600" }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Card style={{ gap: spacing.md }}>
              {contentType === "url" ? (
                <TextField
                  label="Website address"
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://example.com"
                  autoCapitalize="none"
                  keyboardType="url"
                  autoCorrect={false}
                />
              ) : null}

              {contentType === "text" ? (
                <TextField label="Text" value={text} onChangeText={setText} placeholder="Any short message" multiline />
              ) : null}

              {contentType === "tel" ? (
                <TextField
                  label="Phone number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                />
              ) : null}

              {contentType === "email" ? (
                <TextField
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="hello@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              ) : null}

              {contentType === "wifi" ? (
                <>
                  <TextField label="Network name (SSID)" value={ssid} onChangeText={setSsid} placeholder="HomeWiFi" />
                  <Segmented
                    options={[
                      { value: "WPA", label: "WPA/WPA2" },
                      { value: "WEP", label: "WEP" },
                      { value: "nopass", label: "Open" },
                    ]}
                    value={wifiSecurity}
                    onChange={setWifiSecurity}
                  />
                  {wifiSecurity !== "nopass" ? (
                    <TextField
                      label="Password"
                      value={wifiPassword}
                      onChangeText={setWifiPassword}
                      placeholder="Network password"
                      secureTextEntry
                    />
                  ) : null}
                </>
              ) : null}

              {contentType === "vcard" ? (
                <>
                  <TextField label="Full name" value={contactName} onChangeText={setContactName} placeholder="Ada Lovelace" />
                  <TextField
                    label="Phone"
                    value={contactPhone}
                    onChangeText={setContactPhone}
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                  />
                  <TextField
                    label="Email"
                    value={contactEmail}
                    onChangeText={setContactEmail}
                    placeholder="ada@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </>
              ) : null}
            </Card>
          </>
        ) : (
          <>
            <Label>Dynamic tags</Label>
            {dynamicTags.length === 0 ? (
              <Card style={{ gap: spacing.sm }}>
                <Body muted size={13}>
                  No dynamic tags yet. Create one to get a permanent link you can repoint later.
                </Body>
              </Card>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {dynamicTags.map((tag) => {
                  const active = tag.id === selectedTagId;
                  return (
                    <Pressable
                      key={tag.id}
                      onPress={() => {
                        setSelectedTagId(tag.id);
                        setResult(null);
                        setSavedTagId(null);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.md,
                        padding: spacing.md,
                        borderRadius: radius.md,
                        backgroundColor: active ? palette.primarySoft : palette.surface,
                        borderWidth: 1,
                        borderColor: active ? palette.primary : palette.border,
                      }}
                    >
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={18}
                        color={active ? palette.primary : palette.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: palette.text, fontSize: 14, fontWeight: "600" }}>{tag.name}</Text>
                        <Text style={{ color: palette.textMuted, fontSize: 11 }}>{tagUrl(tag)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Card style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Label>Create a new dynamic tag</Label>
              <TextField value={newTagName} onChangeText={setNewTagName} placeholder="e.g. Office door" />
              <Button
                label="Create & select"
                variant="secondary"
                icon="add-outline"
                onPress={() => void createDynamicTag()}
                loading={busy}
              />
            </Card>
          </>
        )}

        {/* preview */}
        {payload && !validation ? (
          <Card style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Label>On the tag</Label>
              <Badge
                label={`${size?.bytes ?? 0} / ${size?.capacity ?? 0} bytes`}
                color={size?.level === "over" ? palette.danger : size?.level === "tight" ? palette.warning : palette.success}
                background={
                  size?.level === "over"
                    ? palette.dangerSoft
                    : size?.level === "tight"
                      ? palette.warningSoft
                      : palette.successSoft
                }
              />
            </View>
            <Text style={{ color: palette.text, fontSize: 13 }} numberOfLines={3}>
              {preview}
            </Text>
            {size?.level !== "ok" ? (
              <Body size={11} muted>
                {size?.level === "over"
                  ? "Too big for a typical keychain tag (NTAG213, 137 bytes)."
                  : "Close to the limit of a small keychain tag."}
              </Body>
            ) : null}
          </Card>
        ) : null}

        {error ? (
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              backgroundColor: palette.dangerSoft,
              padding: spacing.md,
              borderRadius: radius.md,
              marginTop: spacing.md,
            }}
          >
            <Ionicons name="alert-circle" size={16} color={palette.danger} />
            <Text style={{ color: palette.danger, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {busy ? (
          <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl }}>
            <NfcPulse />
            <Heading size={15}>Hold the tag against your phone</Heading>
            <Body muted size={12} style={{ textAlign: "center" }}>
              Keep it still until the result appears. On iPhone, hold it near the top edge.
            </Body>
          </View>
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Button
              label={canDemo ? "Simulate write (demo)" : "Write to tag"}
              icon={canDemo ? "flask-outline" : "radio-outline"}
              onPress={() => void runWrite(canDemo)}
              disabled={Boolean(validation) || !payload}
            />
            {canDemo ? (
              <Body muted size={11} style={{ textAlign: "center" }}>
                NFC is off or missing, so this only records the write in the app. Nothing is sent to a chip.
              </Body>
            ) : null}
          </View>
        )}

        {result ? (
          <Card
            style={{
              marginTop: spacing.lg,
              gap: spacing.sm,
              borderColor: result.status === "verified" ? palette.success : palette.warning,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons
                name={result.status === "verified" ? "checkmark-circle" : "information-circle"}
                size={20}
                color={result.status === "verified" ? palette.success : palette.warning}
              />
              <Heading size={15}>
                {result.demo
                  ? "Demo write recorded"
                  : result.status === "verified"
                    ? "Written and verified"
                    : result.status === "mismatch"
                      ? "Written, but the read-back differs"
                      : "Written — read-back not confirmed"}
              </Heading>
            </View>
            <Body muted size={12}>
              {result.demo
                ? "No hardware was touched. Install this build on a phone with NFC to write a real chip."
                : result.status === "verified"
                  ? "The tag confirmed it holds exactly this data."
                  : "Tap the tag again on the Read screen to double-check it."}
            </Body>

            {savedTagId ? (
              <Button
                label="Open tag details"
                variant="secondary"
                icon="arrow-forward-outline"
                onPress={() => router.push(`/tag/${savedTagId}`)}
              />
            ) : mode === "direct" ? (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                <Label>Save to My Tags</Label>
                <TextField value={saveName} onChangeText={setSaveName} placeholder="e.g. Bike keyring" />
                <Button label="Save tag" variant="secondary" icon="bookmark-outline" onPress={() => void saveDirectWrite()} loading={busy} />
              </View>
            ) : null}
          </Card>
        ) : null}

        {selectedTag ? (
          <Card style={{ marginTop: spacing.lg, gap: 6 }}>
            <Label>Selected dynamic tag</Label>
            <KeyValue label="Name" value={selectedTag.name} />
            <KeyValue label="Number" value={formatNumber(selectedTag.number)} />
            <KeyValue label="Permanent link" value={tagUrl(selectedTag)} />
            <KeyValue label="Current destination" value={selectedTag.content || "not set"} />
            <Button
              label="Change destination"
              variant="ghost"
              icon="swap-horizontal-outline"
              onPress={() => router.push(`/destination/${selectedTag.id}`)}
              compact
              style={{ alignSelf: "flex-start", marginTop: 4 }}
            />
          </Card>
        ) : null}

        {busy ? (
          <View style={{ position: "absolute", opacity: 0 }}>
            <ActivityIndicator />
          </View>
        ) : null}
      </Screen>
    </View>
  );
}
