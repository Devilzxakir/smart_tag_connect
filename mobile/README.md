# Smart Tag Connect — Android app (`mobile/`)

Native Android (and iOS) app for writing, reading and managing NFC tags, built
with Expo SDK 58 / React Native 0.88. It shares the Supabase project and the
NDEF payload format with the web app, so accounts and tags work across both.

- **Package / bundle id:** `com.smarttagconnect.app`
- **Min Android:** 7.0 (API 24); a device with an NFC reader is required for real tag work
- **NFC:** [`react-native-nfc-manager`](https://github.com/revtel/react-native-nfc-manager)

This folder is the whole app. Nothing generated is committed: `mobile/android`
and `mobile/ios` are produced from `app.json` by `npx expo prebuild`.

## Download and install the APK

Every push that touches `mobile/` builds an installable APK in this repository:

1. open **Actions → Mobile Android APK →** the newest green run;
2. download the `smart-tag-connect-apk-<sha>` artifact and unzip it;
3. move `smart-tag-connect-release.apk` to the phone and open it (allow
   *Install unknown apps* for your file manager), or run
   `adb install -r smart-tag-connect-release.apk`.

You can also start a build by hand: **Actions → Mobile Android APK → Run
workflow** (pick `debug` and narrower ABIs for a much faster build).

The artifact is signed with the debug keystore, which is fine for sideloading
and testing. Google Play needs an upload keystore of your own — see
[Signing a Play release](#signing-a-play-release).

## Run it yourself

```sh
cd mobile
cp .env.example .env     # add EXPO_PUBLIC_SUPABASE_URL + publishable key
npm install
npx expo run:android     # builds and installs on a connected phone
```

`npx expo start` on its own only works with a dev-client build installed: the
app uses native NFC code, so Expo Go cannot run it.

Requirements: Node 22+, JDK 17+, Android Studio (SDK 37 / build-tools 37).
NFC needs a physical phone — emulators and the iOS Simulator have no reader.

## What's in the app

| Screen | What it does |
| --- | --- |
| Sign in / Sign up | Email + password, profile created by a database trigger |
| Home | NFC readiness, quick write/read, tag stats, recent tags |
| Write | Website, text, phone, email, Wi-Fi, contact card — or a dynamic `/t/<code>` link; byte-size check, write, then read the chip back to verify |
| Read | Decode every NDEF record, copy or open a value, show writable + capacity |
| My tags | Search, filter, create |
| Tag details | QR code, public link, rewrite, pause, rename, destination history, lost mode with finder messages, delete |
| Destination | Repoint a dynamic tag without rewriting the chip |
| Activity | Scan totals, 14-day bars, countries, recent taps |
| Profile / Diagnostics | Profile edit, light/system/dark theme, NFC hardware + permission status |

Writes only report success when the chip confirms the read-back. On a device
without NFC the app records an explicit **demo** write and says so — it never
pretends a tag was touched.

Architecture and the full guide: [`../docs/MOBILE-APP.md`](../docs/MOBILE-APP.md).

## Configuration

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public / publishable key |
| `EXPO_PUBLIC_PUBLIC_APP_URL` | Optional; origin written to dynamic tags (default `https://smart-tag-connect.vercel.app`) |

CI reads the first two from repository **secrets**
(`Settings → Secrets and variables → Actions`); if they are not set the APK
still builds but opens on a *Setup required* screen. Without secrets it falls
back to the public values already in the repository's `.env`.

Only public values belong anywhere in this project. The Supabase service-role
key must never be added here: anything in the bundle can be extracted from the
APK. All data access is scoped by Postgres row-level security to the signed-in
user.

## Native project is generated

```sh
npx expo prebuild --clean             # regenerate android/ and ios/
npx expo prebuild --platform android  # Android only
npx expo export --platform android    # check the JS bundle only
npx expo export --platform web        # browser preview of the screens (no NFC)
```

Never hand-edit `mobile/android` or `mobile/ios`: the next prebuild overwrites
them. Change `app.json` instead.

## Testing NFC on a real phone

1. Install the APK, sign in.
2. **Profile → NFC diagnostics**: expect *NFC is ready* and
   *NFC engine: react-native-nfc-manager*.
3. **Write → Website** → `https://example.com` → *Write to tag* → hold the tag
   still (Android: upper back; iPhone: top edge).
4. The result must read *Written and verified*. **Read** returns the same URL.
5. Dynamic: write a dynamic tag, change its destination under
   **Tag details → Destination**, tap the tag again — the destination changes,
   the chip does not.

If nothing happens: turn NFC on in system settings, remove a thick case, close
other NFC apps (banking, transit), and try again.

## Signing a Play release

```sh
keytool -genkey -v -keystore upload.keystore -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then either use [EAS Build](https://docs.expo.dev/build/introduction/)
(recommended) or add a `withReleaseSigning` Expo config plugin that writes
`signingConfigs.release` and reads the keystore from CI secrets. Do not commit
the keystore — `*.jks` / `*.keystore` are already git-ignored.

## iOS

macOS + Xcode 15+ and a paid Apple Developer account (NFC entitlement):

```sh
npx expo prebuild --platform ios
npx expo run:ios --device
```

Select your Team in Xcode and confirm **Near Field Communication Tag Reading**
is listed. The `react-native-nfc-manager` config plugin adds the entitlement
and `NFCReaderUsageDescription`.
