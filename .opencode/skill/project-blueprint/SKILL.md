---
name: project-blueprint
description: Creates 6 AI-readable planning documents (PRD, TRD, App Flow, UI/UX Design, Backend Schema, Implementation Plan) in a hidden /.ai folder BEFORE any code is written, then builds the project phase by phase with a check-in after each phase. Use this skill whenever the user wants to create, start, build, make, or scaffold ANY new project, app, website, SaaS, tool, game, bot, API, dashboard, or software product, even if they only describe the idea in one line and never mention documents, planning, or specs. Do not write project code until the 6 files exist.
---

# Project Blueprint

Every new project gets 6 planning files first, code second. The files are written for AI agents (Claude now, and any AI later), not for human reading. They must be precise, unambiguous, and complete enough that a fresh AI session with zero chat history could build the project correctly from them alone.

## Workflow

Follow these steps in order. Do not skip ahead.

### Step 1: Understand the idea

Read the user's request. Extract what you can: product goal, users, platform, key features, stack hints.

Only ask questions if something essential is unclear (the user chose "only ask if unclear"). Essential means the answer would change the architecture or scope, for example: web vs mobile, whether users need accounts, what the core feature actually is. Do not ask about things you can decide sensibly yourself.

- Ask at most 3 questions at once, preferably with `ask_user_input_v0` (tappable options) when available.
- For everything else, make a reasonable decision and record it in the "Assumptions" section of the PRD so the user can correct it.
- If the idea is clear enough, skip questions entirely.

### Step 2: Create the 6 files in `/.ai/`

Create a hidden folder named `.ai` at the project root and write these files. Before writing each one, read its template from `references/`.

| File | Template to read first |
|---|---|
| `.ai/01-PRD.md` | `references/prd.md` |
| `.ai/02-TRD.md` | `references/trd.md` |
| `.ai/03-APP-FLOW.md` | `references/app-flow.md` |
| `.ai/04-UI-UX-DESIGN.md` | `references/ui-ux-design.md` |
| `.ai/05-BACKEND-SCHEMA.md` | `references/backend-schema.md` |
| `.ai/06-IMPLEMENTATION.md` | `references/implementation.md` |

Write them in the order above, because each file builds on the previous ones.

If the project has no backend (pure static site, offline tool), still create `05-BACKEND-SCHEMA.md` and state clearly that there is no server, then document the local data shape (localStorage keys, file formats, in-memory structures) instead.

### Step 3: Consistency check

Before showing anything to the user, verify across all 6 files:

- Every feature in the PRD appears in at least one screen in APP FLOW, and in the IMPLEMENTATION phases.
- Every screen in APP FLOW has a design spec in UI/UX DESIGN.
- Every data entity used in APP FLOW or the TRD exists in BACKEND SCHEMA.
- Every tech choice in the TRD is used consistently (no file names a library the TRD does not list).
- IDs match (feature IDs `F-01`, screen IDs `S-01`, entity names, endpoint names).

Fix any mismatch silently. Do not ask the user about internal inconsistencies.

### Step 4: Short summary, then start

Give the user a brief summary (under 10 lines): project in one sentence, chosen stack, list of phases, and any assumptions they should double check. Do not paste the files into chat. Do not wait for approval, because the user wants the build to start right after the files are ready.

### Step 5: Build phase by phase

Follow `.ai/06-IMPLEMENTATION.md` strictly:

1. Before each phase, re-read the relevant sections of the 6 files.
2. Build only that phase's tasks. No extra features, no skipping ahead.
3. Check each acceptance criterion of the phase. Run the code or tests when possible.
4. Tick the phase's checkboxes in `06-IMPLEMENTATION.md` and add a one-line note under "Progress Log".
5. **Check in with the user** after every phase: what was built (2 to 4 lines), how to try it, and what the next phase is. Then stop and wait for the user to say go (or to request changes).

If the user changes requirements mid-build, update the affected `.ai/` files first, then continue coding. The `.ai/` files are the single source of truth and must never drift from the code.

## Writing rules for the 6 files (important)

These files are read by AI, so optimize for machine clarity:

- **Be specific, not descriptive.** Write "Password: min 8 chars, 1 number, 1 uppercase", not "secure password".
- **Use stable IDs** (`F-01` features, `S-01` screens, `E-01` entities, `API-01` endpoints, `P-01` phases) and refer to them across files.
- **Prefer tables, lists, and code blocks** over paragraphs. No marketing language, no filler, no motivational text.
- **State decisions, not options.** Pick one stack, one library per job, one color palette. Alternatives go in an "Rejected" line with the reason only if it prevents future confusion.
- **Include explicit "Do NOT" rules** where an AI is likely to over-build or go off track.
- **Every feature gets acceptance criteria** that can be checked as pass or fail.
- **Cover edge states:** empty, loading, error, offline, unauthorized, invalid input.
- **Each file starts with a header block** listing the file's purpose, the other files it depends on, and the project name, so any file can be read alone.
- Keep each file focused. No duplication between files: link by ID instead of repeating.

## Design quality bar

The user wants the result to look good. In `04-UI-UX-DESIGN.md`, commit to a distinct visual direction (not generic template styling) with concrete design tokens: exact hex colors, font families and sizes, spacing scale, radius, shadows, and motion. If the `frontend-design` skill is available, read it before writing that file and again before building any UI. Use real-looking content in designs, never lorem ipsum.

## Defaults when the user gives no preference

- Web app: Next.js (App Router) + TypeScript + Tailwind CSS
- Backend and data: PostgreSQL with an ORM; Supabase if auth and hosting simplicity matter
- Simple static page or small tool: single HTML/CSS/JS, no framework
- Mobile app: React Native with Expo
- Script, bot, or automation: Python

Always record the final stack and why in the TRD.

## Existing projects

If a `.ai/` folder already exists, do not recreate it. Read the files, then update only what the new request changes, and keep IDs stable.
