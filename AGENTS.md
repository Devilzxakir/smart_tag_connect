# Smart Tag Connect - agent notes

Project layout and architecture are documented in `README.md` and `docs/NATIVE-APPS.md`.

## Commands

- `npm install` then `npm run dev` - dev server on http://localhost:5173
- `npx tsc --noEmit` - type check
- `npm run lint` - ESLint (must stay at 0 errors)
- `npm run build` - production build via Nitro (`.output/`; `.vercel/output/` on Vercel)

## Working agreements

- Never print, commit or expose `.env` values or any Supabase service-role key.
  Server-only code lives in `*.server.ts`; do not import it from routes or
  `*.functions.ts`.
- NFC behavior exists in three backends (`src/lib/nfc-services/`: web, native,
  mock). A passing build or browser test does not prove NFC hardware works;
  real tag testing needs a physical device (see `docs/NATIVE-APPS.md`).
- Database changes belong in `supabase/migrations/` and, when applicable,
  `drizzle/migrations/` - never edit production schema ad hoc.
- The native app id (`app.lovable.nfckeychain`) is shared by the Gradle config,
  Java package, `strings.xml`, the Xcode project and OAuth redirect allow-lists.
  Do not rename it piecemeal.
