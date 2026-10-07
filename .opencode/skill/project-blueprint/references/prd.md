# Template: `.ai/01-PRD.md` (Product Requirements Document)

Purpose: defines WHAT is being built and WHY. No technical implementation details here.

## Required structure

```markdown
# PRD: <Project Name>

> File purpose: product definition. Depends on: none. Read first.

## 1. Summary

- One-sentence description:
- Problem solved:
- Platform: (web / mobile / desktop / API / CLI)

## 2. Target Users

| ID   | Persona | Goal | Pain point |
| ---- | ------- | ---- | ---------- |
| U-01 | ...     | ...  | ...        |

## 3. Goals and Non-Goals

**Goals** (measurable where possible):

- G-01: ...
  **Non-Goals** (explicitly out of scope, AI must NOT build these):
- NG-01: ...

## 4. Features

### F-01: <Feature name> [Priority: MUST / SHOULD / COULD]

- Description (1-2 lines):
- User story: As a <persona>, I want <action> so that <outcome>.
- Acceptance criteria (pass/fail, testable):
  - [ ] AC-01.1 ...
  - [ ] AC-01.2 ...
- Edge cases: (empty, error, invalid input, permissions)
  (repeat for every feature)

## 5. User Roles and Permissions

| Role | Can | Cannot |
| ---- | --- | ------ |

## 6. Success Metrics

| Metric | Target |
| ------ | ------ |

## 7. Constraints

- Budget / timeline / legal / platform / performance limits

## 8. Assumptions

(Decisions the AI made because the user did not specify. User may correct these.)

- A-01: ...

## 9. Open Questions

(Only truly unresolved items. Leave "None" if empty.)
```

## Notes

- MUST features define the MVP. Phase 1 to N in the implementation plan covers all MUST first.
- Keep features atomic: one feature = one user-visible capability.
- Do not mention frameworks, databases, or libraries in this file.
