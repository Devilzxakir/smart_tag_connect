# Smart Tag Connect - agent notes

Project layout and architecture are documented in `README.md` and `docs/NATIVE-APPS.md`.

## Commands

Web app (repository root):

- `npm install` then `npm run dev` - dev server on http://localhost:5173
- `npx tsc --noEmit` - type check
- `npm run lint` - ESLint (must stay at 0 errors)
- `npm run build` - production build via Nitro (`.output/`; `.vercel/output/` on Vercel)

Mobile app (`mobile/`, React Native / Expo):

- `npm install` in `mobile/` (its own lockfile and dependencies)
- `npm run typecheck` - `tsc --noEmit` for the app
- `npx expo prebuild --platform android` - regenerate the native project
  (`mobile/android`, `mobile/ios` are generated and git-ignored)
- `npx expo run:android` - build + install on a connected NFC phone
- `.github/workflows/mobile-android.yml` - builds the installable APK in CI

## Working agreements

- Never print, commit or expose `.env` values or any Supabase service-role key.
  Server-only code lives in `*.server.ts`; do not import it from routes or
  `*.functions.ts`.
- NFC behavior exists in three backends (`src/lib/nfc-services/`: web, native,
  mock). A passing build or browser test does not prove NFC hardware works;
  real tag testing needs a physical device (see `docs/NATIVE-APPS.md`).
- Database changes belong in `supabase/migrations/` and, when applicable,
  `drizzle/migrations/` - never edit production schema ad hoc.
- The app id is `com.smarttagconnect.app` for both the React Native app
  (`mobile/app.json`) and the legacy Capacitor shell (`capacitor.config.ts`,
  Gradle config, Java package, `strings.xml`, Xcode project). Do not rename it
  piecemeal - change all of them together, plus any OAuth redirect allow-lists.
- `mobile/` is a separate npm project: never add React Native dependencies to
  the root `package.json`, and never hand-edit `mobile/android` or
  `mobile/ios` (Expo prebuild regenerates them).
- The mobile app speaks to Supabase directly and relies on RLS. It must never
  contain a service-role key, and its NDEF payload encoding
  (`mobile/src/lib/nfc/payload.ts`) must stay byte-compatible with
  `src/lib/nfc.ts`.
