# NFC Smart Keychain — web, Android and iOS

One codebase, three places it runs:

| Where it runs             | NFC implementation                                     | Notes                                                     |
| ------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| Any browser without NFC   | `MockNfcService` (demo mode)                           | Never claims a physical tag was touched                   |
| Chrome on Android (https) | `WebNfcService` (Web NFC)                              | Already working today                                     |
| Android app (Capacitor)   | `NativeNfcService` → `SmartNfcPlugin.java`             | Needs Android Studio + a real phone to test               |
| iPhone app (Capacitor)    | `NativeNfcService` → `SmartNfcPlugin.swift` (Core NFC) | Needs Xcode, an Apple Developer account and a real iPhone |

> Status: the native Android and iOS layers are **written but not yet tested on a
> physical device**. Everything marked "needs testing" below must be verified in
> Xcode / Android Studio before you trust it.

## Architecture

```text
UI screens (Read / Write / Tags / Tag details)
        │  imports only from src/lib/nfc.ts
        ▼
src/lib/nfc.ts        payload encoding, validation, size checks, verification
        │
        ▼
src/lib/nfc-services/index.ts   getNfcService() picks the implementation
        ├── MockNfcService    (demo)
        ├── WebNfcService     (browser NDEFReader)
        └── NativeNfcService  (Capacitor plugin "SmartNfc")
                ├── android/app/src/main/java/app/lovable/nfckeychain/SmartNfcPlugin.java
                └── ios/App/App/SmartNfcPlugin.swift
```

The UI never chooses an implementation. Selection order in `getNfcService()`:

1. running inside a Capacitor app → `NativeNfcService`
2. secure page with `NDEFReader` → `WebNfcService`
3. otherwise → `MockNfcService`

`/diagnostics` (NFC Tools → Platform status) shows platform, NFC mode and
availability at runtime.

### Dynamic NFC stays identical

Native writes use the same records the web app produces, including the dynamic
tag link `https://<app-url>/t/A7K9PX2Q`. There is no second dynamic system: the
permanent code and the destination history live in the same database tables.

## How each mode works

**Web NFC** — `NDEFReader.write()` / `.scan()`. Chrome on Android only, https
only, tab must be in the foreground. After a write the app reads the tag again
(a second tap) to verify.

**Android native** — `NfcAdapter.enableReaderMode` with `Ndef`/`NdefFormatable`.
Checks `isWritable()` and `getMaxSize()` before writing, writes, then reads the
message back from the chip in the same tap to verify. Erase writes an empty
NDEF record.

**iOS native** — Core NFC `NFCNDEFReaderSession` with the tag callbacks.
`queryNDEFStatus` reports `notSupported` / `readOnly` / `readWrite` and the tag
capacity before writing; after `writeNDEF` the tag is read back in the same
session. Errors are mapped to plain language: cancelled, timeout, system busy,
tag lost, read-only, too large, invalid data.

No implementation ever reports success unless the hardware confirms it.

## Required native configuration (already applied)

Android — `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="false" />
```

`MainActivity.java` registers the plugin with `registerPlugin(SmartNfcPlugin.class)`.

iOS — `ios/App/App/Info.plist`:

```xml
<key>NFCReaderUsageDescription</key>
<string>This app uses NFC to read and write your own keychain tags.</string>
```

iOS — `ios/App/App/App.entitlements` declares the NDEF reader format, and the
Xcode project now references it directly: `SmartNfcPlugin.swift` is part of the
App target's Compile Sources and `CODE_SIGN_ENTITLEMENTS = App/App.entitlements`
is set for Debug and Release. So the NFC code really is compiled into the app.

**In Xcode you must still:** select the App target → Signing & Capabilities →
pick your Team, and confirm **Near Field Communication Tag Reading** is listed
(Xcode adds it from the entitlements file; add it with `+ Capability` if it is
not). This capability requires a paid Apple Developer account, and the App ID in
the developer portal must have NFC Tag Reading enabled — automatic signing does
this for you when a Team is selected.

Do **not** run `npx cap add ios` again; it would recreate the project without
these settings.

## Building

The web app is server-rendered and talks to Lovable Cloud, so the native shells
load the hosted site over https instead of bundling a static copy. That URL is
`server.url` in `capacitor.config.ts` — update it if you publish to a different
address or add a custom domain, then run `npx cap sync`.

```bash
# after any config or plugin change
npx cap sync

# Android (needs Android Studio + JDK 17)
npx cap open android      # then Run ▶ on a real phone with NFC

# iOS (needs macOS + Xcode 15+)
npx cap open ios          # then select your device and Run ▶
```

A physical device is required for both: emulators and the iOS Simulator have no
NFC hardware.

## Testing with a real tag

1. Turn NFC on (Android: Settings → Connected devices → NFC; iPhone 7+ needs no setting).
2. Open the app, sign in, go to NFC Tools → Platform status and confirm
   _NFC mode: Native NFC_, _NFC availability: Available_.
3. Write NFC → Website URL → `https://google.com` → Preview → Confirm and write →
   hold the tag against the phone (Android: back centre; iPhone: top edge).
4. The result must say written and verified. Read NFC should return the same value.
5. Dynamic: Write NFC → Dynamic NFC → destination → write. Tap the tag with any
   phone; it opens the destination. Change the destination in Tag details and tap
   again — it opens the new one without rewriting the tag.

## Security notes

- No secrets are stored in the app. It uses the same public Lovable Cloud
  publishable key the web app uses, and all data access goes through
  row-level security scoped to the signed-in user.
- The native shells reuse the existing web login, so authentication and
  permissions behave exactly as on the web.
- Only the NFC permission is requested. No location, Bluetooth, background
  tracking or cellular features are used.
