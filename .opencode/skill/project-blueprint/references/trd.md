# Template: `.ai/02-TRD.md` (Technical Requirements Document)

Purpose: defines HOW the system is built technically. Every technology decision is final here.

## Required structure

```markdown
# TRD: <Project Name>

> File purpose: technical decisions and architecture. Depends on: 01-PRD.md.

## 1. Tech Stack (final decisions)

| Layer                                                                 | Choice | Version | Reason |
| --------------------------------------------------------------------- | ------ | ------- | ------ |
| Language                                                              |        |         |        |
| Frontend framework                                                    |        |         |        |
| Styling                                                               |        |         |        |
| State management                                                      |        |         |        |
| Backend / runtime                                                     |        |         |        |
| Database                                                              |        |         |        |
| Auth                                                                  |        |         |        |
| Hosting / deploy                                                      |        |         |        |
| Testing                                                               |        |         |        |
| Rejected alternatives (one line each, only if likely to confuse): ... |

## 2. Architecture

- Style: (monolith / client-server / serverless / etc.)
- Component diagram (ASCII or Mermaid):
- Data flow in one paragraph:

## 3. Folder Structure
```

project/
├── .ai/
├── src/
│ ├── ...

```
(Annotate each folder with its single responsibility.)

## 4. Coding Standards
- Naming conventions (files, components, functions, DB columns)
- Formatting / linting tools and config
- Error handling pattern
- Logging pattern
- Do NOT rules (e.g. "no any types", "no inline styles", "no secrets in code")

## 5. Non-Functional Requirements
| Area | Requirement |
|------|-------------|
| Performance | e.g. LCP < 2.5s, API p95 < 300ms |
| Security | auth method, input validation, rate limiting, CORS, secrets handling |
| Accessibility | WCAG level |
| Responsiveness | breakpoints supported |
| Browser / device support | |
| Scalability | expected load |

## 6. Environment and Configuration
| Variable | Purpose | Example (fake) | Required |
|----------|---------|----------------|----------|

## 7. Third-Party Services and Dependencies
| Name | Purpose | Why chosen | Free tier limits |
|------|---------|-----------|------------------|

## 8. Testing Strategy
- Unit / integration / e2e: what is tested, tools, minimum coverage expectations

## 9. Deployment
- Build command, run command, hosting target, CI steps
```

## Notes

- If a choice is not forced by the PRD, pick the simplest option that works.
- Pin major versions. Do not add a library without a row in section 1 or 7.
