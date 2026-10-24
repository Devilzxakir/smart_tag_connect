# Smart Tag Connect

Smart Tag Connect is a web + mobile app for writing, reading and managing NFC
tags. Write a URL to a tag, print or share its QR code, and manage every tag
from one place. Dynamic tags keep a stable link on the chip while the
destination behind it can be changed at any time.

The same codebase ships as:

- a server-rendered web app (TanStack Start),
- an Android app (Capacitor + a native NDEF plugin),
- an iOS app (Capacitor + Core NFC).

## Features

- **Write NFC tags** - encode a website URL as a standard NDEF URI record,
  preview it, write it, then read it back to verify the write.
- **Dynamic NFC tags** - write a permanent `/t/<code>` link once; change the
  destination later from Tag details without rewriting the chip.
- **Read NFC tags** - read NDEF content from any tag and inspect the records.
- **Tag management** - named tags with status (empty, written, demo, failed),
  search, ownership-scoped access, QR codes and shareable preview links.
- **Landing pages** - optional public pages (`/p/<slug>`) used as tag
  destinations, plus a lost-mode report form for finders.
- **Analytics** - per-tag scan activity for the signed-in owner.
- **Auth and profiles** - Supabase email/password auth, profile completion,
  and row-level security so users only ever see their own data.

## Tech stack

- React 19 + TypeScript
- TanStack Start / TanStack Router (SSR)
- Vite 8 + Nitro (production server build for Vercel / Node)
- Tailwind CSS v4 + shadcn/ui (Radix UI) + lucide-react
- Supabase (auth, Postgres, row-level security)
- Drizzle ORM / drizzle-kit for the SQL migration tooling
- Capacitor 8 for the Android and iOS shells
- Web NFC (`NDEFReader`) in the browser; custom native plugins on Android/iOS

## Prerequisites

- Node.js 22.12 or newer (required by the TanStack Start server packages) and npm
- A Supabase project (or the Supabase CLI) for auth and data
- For Android builds: Android Studio + JDK 17
- For iOS builds: macOS + Xcode 15+, a paid Apple Developer account for NFC
  entitlements
- A real NFC-capable phone to test anything NFC related

## Installation

```sh
npm install
```

Create a `.env` file in the project root with your own values (never commit
it). The names the app reads:

| Variable | Used by |
| --- | --- |
| `SUPABASE_URL` | server |
| `SUPABASE_PUBLISHABLE_KEY` | server |
| `SUPABASE_SERVICE_ROLE_KEY` | server only - never expose to the client |
| `SUPABASE_PROJECT_ID` | server / tooling |
| `VITE_SUPABASE_URL` | client bundle |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client bundle |
| `VITE_SUPABASE_PROJECT_ID` | client bundle |
| `VITE_PUBLIC_APP_URL` | optional, public HTTPS origin written to dynamic tags (defaults to `https://smart-tag-connect.vercel.app`) |
| `DATABASE_URL` | optional, `drizzle-kit` migrations (legacy fallback: `LOVABLE_DB_MIGRATION_URL`) |

## Local development

```sh
npm run dev        # Vite dev server with SSR on http://localhost:5173
```

Other scripts that exist in `package.json`:

| Script | Purpose |
| --- | --- |
| `npm run dev` | start the dev server |
| `npm run build` | production build via Nitro (`.output/`; `.vercel/output/` on Vercel) |
| `npm run build:dev` | production build in development mode |
| `npm run preview` | preview the production build |
| `npm run lint` | ESLint over the repo |
| `npm run format` | Prettier write |

There is no automated test suite in this repository yet (`vitest` is installed
but no tests are configured). Type checking is separate:

```sh
npx tsc --noEmit
```

## NFC testing on real hardware

NFC cannot be tested in an emulator, the iOS Simulator, or a desktop browser:

- **Web NFC** works in Chrome/Edge on Android only, over HTTPS (or
  `localhost`), with the tab in the foreground. iOS Safari does not implement
  Web NFC.
- **Native apps** use the custom `SmartNfc` Capacitor plugin
  (`android/.../SmartNfcPlugin.java`, `ios/.../SmartNfcPlugin.swift`).
- The `/diagnostics` page (NFC Tools -> Platform status) shows which NFC
  implementation is active at runtime.
- Write, then read the tag back to verify; the app only reports success when
  the hardware confirms it.

A successful web build proves nothing about NFC behavior. Test on physical
devices as described in [docs/NATIVE-APPS.md](docs/NATIVE-APPS.md).

## Mobile apps (Capacitor)

The native shells load the hosted web app over HTTPS (`server.url` in
`capacitor.config.ts`), so deploy the web app first, then point `server.url`
at the published production URL and sync. Do not use a Lovable editor preview
URL: previews require Lovable access and return 403 on other phones, which
breaks every tag written by the native app. The current production URL is
`https://smart-tag-connect.vercel.app`.

```sh
npx cap sync          # after config or plugin changes
npx cap open android  # run on a real NFC phone
npx cap open ios      # run on a real iPhone
```

See [docs/NATIVE-APPS.md](docs/NATIVE-APPS.md) for required NFC capabilities
and signing notes. The Android/iOS application id is still
`app.lovable.nfckeychain`; renaming it requires coordinated changes across
`capacitor.config.ts`, the Gradle config, the Java package, `strings.xml` and
the Xcode project (plus any OAuth redirect allow-lists), so treat it as a
separate migration.

## Database

Supabase migrations live in two places and are kept in sync manually:

- `supabase/migrations/` - SQL applied with the Supabase CLI
  (`supabase link`, `supabase db push`)
- `drizzle/migrations/` - drizzle-kit migrations
  (`npx drizzle-kit push` with `DATABASE_URL` set)

`full_schema.sql` is a complete snapshot of the schema for reference. All
tables use row-level security scoped to the authenticated user.

## Deployment

The production server build is produced by [Nitro](https://nitro.build), wired
up in `vite.config.ts`:

```sh
npm run build
```

- **Vercel** - zero configuration. Vercel detects TanStack Start + Nitro, the
  build emits the Build Output API layout (static assets plus the `__server`
  function) and all routes are served from it.
- **Other hosts** - the same command emits `.output/` (Node preset by default);
  set `NITRO_PRESET` for other deploy targets.

Set the environment variables listed in Installation in the hosting platform's
project settings (on Vercel: Project -> Settings -> Environment Variables),
including `SUPABASE_SERVICE_ROLE_KEY`. Then update `server.url` in
`capacitor.config.ts` if the mobile shells should point at the new address.

## Project structure

```
src/routes/              file-based routes (auth, tags, write, read, tools, ...)
src/lib/nfc.ts           payload encoding, validation, size checks, verification
src/lib/nfc-services/    Web NFC, native (Capacitor) and mock implementations
src/lib/store.ts         auth + tag data store used by the UI
src/lib/tags.functions.ts, pages.functions.ts   server functions
src/integrations/supabase/  Supabase clients, auth middleware, generated types
supabase/, drizzle/      database migrations
android/, ios/           Capacitor native projects
docs/NATIVE-APPS.md      native architecture and device testing guide
mobile-shell/            offline fallback page loaded by the native shells
```

## Security notes

- Never commit `.env` or any Supabase service-role key. The service-role
  client is server-only code (`*.server.ts`); route files and
  `*.functions.ts` ship to the browser, so do not import it there.
- All user data access goes through Supabase row-level security.
- Tag codes scanned by strangers only expose the public fields the owner
  chose to publish.
