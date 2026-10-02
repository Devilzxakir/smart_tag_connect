# Template: `.ai/06-IMPLEMENTATION.md`

Purpose: the ordered build plan the AI follows phase by phase. It is also the live progress tracker. Write it last so it can reference IDs from all other files.

## Required structure

```markdown
# IMPLEMENTATION: <Project Name>
> File purpose: build order, tasks, acceptance checks, progress log. Depends on: all other .ai/ files.

## 1. Build Rules (AI must follow)
- Read the listed `.ai/` sections before starting each phase.
- Build ONLY the current phase. Do not add features outside the PRD.
- Match names, routes, tokens, and schema exactly as written in the other files.
- After each phase: run/verify acceptance checks, tick checkboxes, add a Progress Log line, then STOP and check in with the user.
- If a requirement is wrong or missing, update the relevant `.ai/` file first, then code.

## 2. Phase Overview
| Phase | Name | Goal | Features | Depends on |
|-------|------|------|----------|-----------|
| P-01 | Foundation | project setup, tooling, base layout | - | - |
| P-02 | Data and Backend | schema, migrations, seed, core APIs | F-01.. | P-01 |
| P-03 | Core Feature UI | main screens and flows | F-01.. | P-02 |
| P-04 | Secondary Features | | | P-03 |
| P-05 | Polish and Edge States | empty/loading/error states, responsive, a11y, animations | all | P-04 |
| P-06 | Testing and Deploy | tests, build, deployment, README | all | P-05 |
(Adapt the phases to the project. Every MUST feature must land in a phase before any COULD feature.)

## 3. Phase Details
### P-01: Foundation
- Read first: 02-TRD.md (sections 1, 3, 4), 04-UI-UX-DESIGN.md (section 2)
- Tasks:
  - [ ] T-01.1 Initialize project with the exact stack from TRD
  - [ ] T-01.2 Create folder structure from TRD section 3
  - [ ] T-01.3 Set up design tokens (colors, fonts, spacing) as CSS variables / Tailwind config
  - [ ] T-01.4 Add linting, formatting, env file template
- Acceptance checks:
  - [ ] Project runs with one command and shows the base layout
  - [ ] Tokens match 04-UI-UX-DESIGN.md exactly
- Check-in message to user: what was built, how to run it, next phase.
(repeat for every phase, each with Read first, Tasks, Acceptance checks)

## 4. Testing Checklist
| Feature | Test | Type | Phase |
|---------|------|------|-------|

## 5. Definition of Done (whole project)
- [ ] All MUST features pass their acceptance criteria (PRD section 4)
- [ ] Every screen in 03-APP-FLOW.md exists and matches 04-UI-UX-DESIGN.md
- [ ] Every API in 05-BACKEND-SCHEMA.md is implemented and validated
- [ ] No console errors, no TODO placeholders, no lorem ipsum
- [ ] README explains setup, env vars, and run commands

## 6. Progress Log
| Date | Phase | Status | Notes |
|------|-------|--------|-------|
```

## Notes
- Each task is small enough to finish and verify in one step.
- Tasks reference IDs (F-, S-, E-, API-) instead of repeating details.
- The Progress Log is updated by the AI after every phase.
