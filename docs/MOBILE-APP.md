# Smart Tag Connect — React Native mobile app

The mobile app lives in [`mobile/`](../mobile) and is a real native application
(Expo SDK 58 / React Native 0.88), not a WebView wrapper. It talks to the same
Supabase project and the same tables as the web app, so an account created on
either side works everywhere.

| | |
| --- | --- |
| Android application id | `com.smarttagconnect.app` |
| iOS bundle id | `com.smarttagconnect.app` |
| URL scheme | `smarttagconnect` |
| NFC library | [`react-native-nfc-manager`](https://github.com/revtel/react-native-nfc-manager) |
| Router | `expo-router` (file based, `mobile/src/app`) |
| State / data | React context + `@supabase/supabase-js` with Row Level Security |

## Screens

| Route | What it does |
| --- | --- |
| `/sign-in`, `/sign-up` | Email + password login, profile created by a database trigger |
| `/(tabs)` (Home) | Greeting, live NFC status, quick actions, tag stats, recent tags |
| `/(tabs)/write` | Write a direct payload (URL, text, phone, email, Wi-Fi, contact card) or a dynamic `/t/<code>` link |
| `/(tabs)/tags` | Search, filter, create tags |
| `/(tabs)/activity` | Scan analytics: totals, 14-day bars, countries, recent taps |
| `/read` | Read a tag, inspect every NDEF record, copy or open the value |
| `/tag/[id]` | Rename, pause, rewrite, QR code, public link, lost mode, finder messages, delete |
| `/destination/[id]` | Repoint a dynamic tag without rewriting the chip |
| `/profile` | Name/phone, appearance (system/light/dark), diagnostics, sign out |
| `/diagnostics` | NFC hardware, permission and platform status |

## What matches the web app

* **The same tables and policies.** The app reads and writes `tags`,
  `tag_destinations`, `tag_events` and `lost_reports` directly; Row Level
  Security limits every row to its owner. No server function is involved, and
  the service-role key never ships in the app.
* **The same NDEF payloads.** `src/lib/nfc/payload.ts` mirrors
  `src/lib/nfc.ts` on the web: URL/phone/email become a URI record, text and
  Wi-Fi become Text records, contact cards become `text/vcard` MIME records.
  A tag written by the phone reads identically in Chrome on Android.
* **The same dynamic link.** A dynamic tag stores
  `https://smart-tag-connect.vercel.app/t/<CODE>`, so changing the destination
  in either app changes it everywhere.
* **Same validation.** `src/lib/destination.ts` is a port of the web module, so
  the mobile app refuses `javascript:`/`data:`/private-network destinations
  before anything reaches the database.

## First run

```sh
cd mobile
cp .env.example .env      # then paste your Supabase URL + publishable key
npm install
npx expo run:android      # builds and installs on a connected phone
```

`npx expo start` alone only works on a phone with the dev client installed
(the app uses native NFC code, so Expo Go cannot run it).

Requirements: Node 22, JDK 17+, Android SDK (via Android Studio) for Android;
macOS + Xcode 15+ and an Apple Developer account for iOS NFC.

## Environment

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public/publishable key (safe in a bundle) |
| `EXPO_PUBLIC_PUBLIC_APP_URL` | Optional; origin written to dynamic tags. Defaults to the production site |

Only public values belong here. Never add `SUPABASE_SERVICE_ROLE_KEY` to a
mobile build: anything baked into the APK can be extracted.

If no credentials are baked in, the app opens a "Setup required" screen instead
of failing at runtime.

## Building an APK in CI

`.github/workflows/mobile-android.yml` builds an installable APK:

1. run it from **Actions → Mobile Android APK → Run workflow**, or push a change
   under `mobile/`;
2. when it finishes, download the `smart-tag-connect-apk-<sha>` artifact;
3. install it on an NFC phone (`adb install -r smart-tag-connect-release.apk` or
   open the file on the phone).

Credentials come from the repository secrets `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; if they are not set, the workflow falls
back to the public values already in the web app's `.env`.

The artifact is signed with the **debug keystore**, which is fine for
sideloading and testing but is **not** accepted by Google Play. For a store
release, create an upload keystore and pass it to Gradle:

```sh
keytool -genkey -v -keystore upload.keystore -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

then configure `signingConfigs.release` in `android/app/build.gradle` (generated
by `npx expo prebuild`, so prefer an
[EAS build](https://docs.expo.dev/build/introduction/) or a committed
`withReleaseSigning` config plugin rather than editing generated files).

### iOS

iOS cannot be built in GitHub's Linux runners. On a Mac:

```sh
cd mobile
npx expo prebuild --platform ios
npx expo run:ios --device
```

Select your Team in Xcode, confirm **Near Field Communication Tag Reading** is
present (the `react-native-nfc-manager` config plugin adds the entitlement and
`NFCReaderUsageDescription`), then Run on a physical iPhone 7 or newer. The
Simulator has no NFC hardware.

## Native project is generated, not committed

`mobile/android` and `mobile/ios` are git-ignored. `app.json` is the source of
truth and `npx expo prebuild` regenerates the native projects. Never hand-edit
files under `mobile/android` or `mobile/ios` — the next prebuild overwrites them.

```sh
npx expo prebuild --clean            # regenerate both platforms
npx expo prebuild --platform android # Android only
```

## Testing NFC

Emulators and the iOS Simulator have no NFC reader, so the app runs in a
**demo** mode there: writes are recorded on the tag as `demo` and nothing is
sent to hardware. On a real phone:

1. **Home** should read *NFC ready*; `/diagnostics` shows engine, permission and
   hardware state.
2. Write a URL to a blank NTAG213 and confirm *Written and verified*.
3. Tap the tag with any phone — it opens the link.
4. Write a dynamic tag, change its destination in `/destination/[id]`, tap again:
   the destination changes, the chip does not.

## Security notes

* Only the `NFC` permission is requested (plus what Expo/React Native add for
  networking and splash screens). No location, Bluetooth or background reading.
* The session is stored in `AsyncStorage`, so it survives a restart and is
  cleared by *Sign out*.
* All data access is authorised by RLS; the app cannot read another user's tags
  even if it asks for them.
