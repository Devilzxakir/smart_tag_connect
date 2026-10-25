# Smart Tag Connect — mobile app

Expo / React Native application for writing, reading and managing NFC tags.
It talks to the same Supabase project as the web app and writes the same NDEF
payloads, so tags and accounts work across both.

```sh
cp .env.example .env   # Supabase URL + publishable key
npm install
npx expo run:android   # or: npx expo run:ios
```

Full documentation: [../docs/MOBILE-APP.md](../docs/MOBILE-APP.md).
An installable APK is built by `.github/workflows/mobile-android.yml`.
