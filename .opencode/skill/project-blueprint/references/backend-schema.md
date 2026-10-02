# Template: `.ai/05-BACKEND-SCHEMA.md`

Purpose: the exact data model, API contract, and server rules. If the project has no server, state "No backend" and document local data shapes (localStorage keys, file formats, in-memory state) in the same structure.

## Required structure

```markdown
# BACKEND SCHEMA: <Project Name>
> File purpose: database, API, auth, validation. Depends on: 01-PRD.md, 02-TRD.md, 03-APP-FLOW.md.

## 1. Entity Overview
| ID | Entity | Purpose | Related features |
|----|--------|---------|------------------|
| E-01 | User | account holder | F-01 |

Relationship summary (ERD in Mermaid):
```mermaid
erDiagram
  USER ||--o{ POST : writes
```

## 2. Tables / Collections
### E-01: users
| Column | Type | Null | Default | Constraints | Notes |
|--------|------|------|---------|-------------|-------|
| id | uuid | no | gen_random_uuid() | PK | |
| email | text | no | | UNIQUE, lowercase | |
| created_at | timestamptz | no | now() | | |
Indexes: (list with reason)
Foreign keys and ON DELETE behavior:
Row-level security / access rules:
(repeat for every entity)

## 3. Ready-to-run Schema
Full SQL (or Prisma / Drizzle / Mongoose schema, matching the TRD) in one code block that can be executed as is.

## 4. API Contract
| ID | Method | Path | Auth | Purpose | Feature |
|----|--------|------|------|---------|---------|
| API-01 | POST | /api/auth/signup | public | create account | F-01 |

### API-01: POST /api/auth/signup
- Request body (JSON with types and validation):
- Success response: status code + JSON example
- Error responses: table of status, error code, message
- Side effects: (emails sent, rows created)
(repeat for every endpoint)

Standard error format used everywhere:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

## 5. Authentication and Authorization
- Method (sessions / JWT / OAuth), token lifetime, refresh behavior
- Password rules and hashing algorithm
- Permission matrix: role x endpoint

## 6. Validation and Business Rules
| Rule ID | Rule | Enforced where |
|---------|------|----------------|

## 7. Background Jobs, Webhooks, Integrations
(Cron jobs, queues, third-party callbacks. "None" if not applicable.)

## 8. Seed Data
Sample rows for development (realistic, matching UI sample content).

## 9. Migrations
Order and naming of migration files.
```

## Notes
- Every entity referenced in 03-APP-FLOW.md must exist here, with matching names.
- Every user action in APP FLOW that touches data must map to an API ID.
- Never store secrets or plain-text passwords; state this under Do NOT.
