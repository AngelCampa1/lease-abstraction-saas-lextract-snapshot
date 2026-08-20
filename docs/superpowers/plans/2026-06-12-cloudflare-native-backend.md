# Cloudflare Native Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the Railway bill by replacing the Railway FastAPI web service, Celery worker, and Redis broker with Cloudflare Workers-native API, Workflows, Queues, and R2 bindings while keeping Neon/Postgres for now.

**Architecture:** Build a new TypeScript Worker backend at `workers/api` that serves the existing `/api/v1/*` contract on `api.lextract.io`. Port the stateless Python extraction SDK into a clean TypeScript package at `packages/extract-core`, then keep all Worker-specific concerns in thin adapter modules. Replace the Celery extraction chain with a Cloudflare Workflow and replace export/email/cleanup background dispatch with Workflow or Queue-backed status rows in Neon.

**Tech Stack:** Cloudflare Workers, Workflows, Queues, R2 bindings, Hyperdrive + `pg`, Hono, Zod, Vitest, `@cloudflare/vitest-pool-workers`, OpenRouter via `fetch` or `openai`, Stripe API, Resend API, Neon Auth JWT verification via `jose`.

---

## Non-Negotiable Design Standards

This is a rewrite, not a mechanical port. New code must be clean, organized, and easy to change.

- Route files only parse requests, call services, and return responses. No embedded SQL, OpenRouter prompts, Stripe business rules, or R2 key construction inside routes.
- Domain code lives in `packages/extract-core` and has zero Worker bindings. It must be testable in plain Vitest.
- Worker infrastructure lives in `workers/api/src/services` and is accessed through narrow functions/classes.
- Shared response and request schemas use Zod. Never use `any`; use `unknown` plus narrowing.
- SQL is centralized in repositories under `workers/api/src/repositories`. Transactions and `FOR UPDATE` semantics must be explicit.
- State transitions are centralized in `workers/api/src/domain/status.ts`; routes and Workflows cannot hand-roll status updates.
- R2 object keys are centralized in `workers/api/src/domain/object-keys.ts`.
- Error responses are centralized in middleware and must preserve the frontend's `detail`, optional `request_id`, and optional `tracking_id` behavior.
- External API calls are isolated behind adapters: OpenRouter, Stripe, Resend, PostHog, Marketing Worker, Neon Auth admin API.
- Tests must prove contract compatibility, not only unit behavior.

## Current Evidence

Read-only exploration found:

- Frontend expects `NEXT_PUBLIC_API_URL` to include `/api/v1`, usually `https://api.lextract.io/api/v1`.
- Frontend can keep the same API base URL if the new Worker owns `api.lextract.io`.
- Current Python backend routes are under `backend/app/api/v1/*`.
- Celery chain is `run_gemini_extraction_task -> score_confidence_task -> run_red_flags_task -> mark_extraction_complete`.
- Current DB access is direct Postgres through `psycopg_pool`, not the Neon Data API despite old comments.
- Risky Python-only pieces: FastAPI/Pydantic, Celery/Redis, `psycopg`, boto3, Python extract-sdk, `pypdf`, `python-docx`, `openpyxl`, WeasyPrint, Python Stripe/Resend SDKs.

## Target File Structure

Create:

```text
packages/extract-core/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts
    models.ts
    schema/
      field-definition.ts
      registry.ts
      lextract-schema.ts
    extraction/
      openrouter-client.ts
      prompt-builder.ts
      response-parser.ts
      orchestrator.ts
    confidence/
      score-confidence.ts
    red-flags/
      rules.ts
      detect-red-flags.ts
  tests/

workers/api/
  package.json
  tsconfig.json
  vitest.config.ts
  wrangler.jsonc
  src/
    index.ts
    env.ts
    types.ts
    middleware/
      cors.ts
      errors.ts
      auth.ts
      request-id.ts
    domain/
      status.ts
      object-keys.ts
      task-status.ts
    repositories/
      db.ts
      users.ts
      anonymous-sessions.ts
      extractions.ts
      payments.ts
      tasks.ts
    services/
      storage.ts
      stripe.ts
      resend.ts
      posthog.ts
      neon-auth.ts
      camaudit.ts
      marketing-worker.ts
      pdf.ts
    routes/
      auth.ts
      extractions.ts
      payments.ts
      user.ts
      tasks.ts
      leads.ts
      webhooks.ts
      health.ts
    workflows/
      extraction-workflow.ts
      export-workflow.ts
    queues/
      cleanup-consumer.ts
      email-consumer.ts
    tests/
```

Modify:

```text
.env.example
docs/ARCHITECTURE.md
docs/DEPLOYMENT.md
docs/user-stories/TRACKER.md
frontend/.env.example
frontend/lib/api.ts
frontend/lib/api-upload.ts
frontend/hooks/use-upload.ts
frontend/app/(marketing)/unsubscribe/unsubscribe-content.tsx
```

Keep for comparison until final cutover:

```text
backend/
packages/extract-sdk/
```

Remove Railway references only after the Worker API is contract-compatible and verified:

```text
backend/Dockerfile
backend/railway.web.json
backend/railway.worker.json
```

---

## Task 1: Worker API Scaffold

**Files:**
- Create: `workers/api/package.json`
- Create: `workers/api/tsconfig.json`
- Create: `workers/api/vitest.config.ts`
- Create: `workers/api/wrangler.jsonc`
- Create: `workers/api/src/index.ts`
- Create: `workers/api/src/env.ts`
- Create: `workers/api/src/types.ts`
- Create: `workers/api/src/middleware/cors.ts`
- Create: `workers/api/src/middleware/errors.ts`
- Create: `workers/api/src/middleware/request-id.ts`
- Create: `workers/api/src/routes/health.ts`
- Test: `workers/api/src/tests/health.test.ts`

- [ ] **Step 1: Write failing health/CORS tests**

```ts
import { describe, expect, it } from 'vitest'
import app from '../index'

const env = {
  ENVIRONMENT: 'test',
  FRONTEND_URL: 'https://lextract.io',
} as never

describe('api worker health and cors', () => {
  it('returns health status at /health', async () => {
    const response = await app.fetch(new Request('https://api.lextract.io/health'), env)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  it('answers CORS preflight for frontend API calls', async () => {
    const request = new Request('https://api.lextract.io/api/v1/extractions', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://lextract.io',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, X-Session-Token',
      },
    })
    const response = await app.fetch(request, env)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://lextract.io')
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Session-Token')
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd workers/api && npm install && npm test -- --run src/tests/health.test.ts`

Expected: fail because package and Worker app do not exist yet.

- [ ] **Step 3: Implement scaffold**

`workers/api/package.json`:

```json
{
  "name": "@lextract/api-worker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "types": "wrangler types",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run test:coverage && wrangler deploy --dry-run"
  },
  "dependencies": {
    "hono": "^4.10.7",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.9.0",
    "@cloudflare/workers-types": "^4",
    "@vitest/coverage-v8": "^4.0.18",
    "typescript": "^5.9.3",
    "vitest": "^4.0.18",
    "wrangler": "^4.74.0"
  },
  "engines": {
    "node": ">=20.9.0"
  }
}
```

`workers/api/src/types.ts`:

```ts
export interface Env {
  ENVIRONMENT: 'development' | 'test' | 'staging' | 'production'
  FRONTEND_URL: string
  DOCUMENTS_BUCKET: R2Bucket
  HYPERDRIVE?: Hyperdrive
  EXTRACTION_WORKFLOW?: Workflow
  EXPORT_WORKFLOW?: Workflow
  CLEANUP_QUEUE?: Queue
  EMAIL_QUEUE?: Queue
}
```

`workers/api/src/index.ts`:

```ts
import { Hono } from 'hono'
import type { Env } from './types'
import { corsMiddleware } from './middleware/cors'
import { errorMiddleware } from './middleware/errors'
import { requestIdMiddleware } from './middleware/request-id'
import { healthRoutes } from './routes/health'

const app = new Hono<{ Bindings: Env }>()

app.use('*', requestIdMiddleware)
app.use('*', corsMiddleware)
app.use('*', errorMiddleware)
app.route('/', healthRoutes)

export default app
```

- [ ] **Step 4: Run scaffold verification**

Run: `cd workers/api && npm run typecheck && npm test -- --run src/tests/health.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add workers/api/package.json workers/api/tsconfig.json workers/api/vitest.config.ts workers/api/wrangler.jsonc workers/api/src
git commit -m "feat(api): scaffold cloudflare worker backend"
```

---

## Task 2: TypeScript Extract Core Foundation

**Files:**
- Create: `packages/extract-core/package.json`
- Create: `packages/extract-core/tsconfig.json`
- Create: `packages/extract-core/vitest.config.ts`
- Create: `packages/extract-core/src/models.ts`
- Create: `packages/extract-core/src/schema/field-definition.ts`
- Create: `packages/extract-core/src/schema/registry.ts`
- Create: `packages/extract-core/src/schema/lextract-schema.ts`
- Create: `packages/extract-core/src/index.ts`
- Test: `packages/extract-core/tests/schema.test.ts`

- [ ] **Step 1: Write failing schema tests**

```ts
import { describe, expect, it } from 'vitest'
import { buildLextractRegistry } from '../src'

describe('lextract registry', () => {
  it('loads all schema fields from docs/lextract_field_schema.json', () => {
    const registry = buildLextractRegistry()
    expect(registry.fields.length).toBeGreaterThanOrEqual(99)
    expect(registry.getField('landlord_legal_name')?.fieldName).toBe('landlord_legal_name')
    expect(registry.categories.length).toBeGreaterThan(10)
  })

  it('returns fields by category without mutating registry state', () => {
    const registry = buildLextractRegistry()
    const first = registry.getFieldsByCategory('Parties & Property')
    const second = registry.getFieldsByCategory('Parties & Property')
    expect(first.length).toBeGreaterThan(0)
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd packages/extract-core && npm install && npm test -- --run tests/schema.test.ts`

Expected: fail because package does not exist.

- [ ] **Step 3: Implement registry**

Use `docs/lextract_field_schema.json` as the source of truth. Convert snake_case JSON keys to clean camelCase TypeScript properties at the boundary.

Core types:

```ts
export type FieldDataType =
  | 'string'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'boolean'
  | 'array'

export interface FieldDefinition {
  fieldName: string
  displayLabel: string
  category: string
  description: string
  aliases: readonly string[]
  dataType: FieldDataType
  required: boolean
  camRelevant: boolean
}
```

- [ ] **Step 4: Run schema verification**

Run: `cd packages/extract-core && npm run typecheck && npm test -- --run tests/schema.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/extract-core
git commit -m "feat(extract-core): add typed schema registry"
```

---

## Task 3: Extract Core Response Parsing, Confidence, And Red Flags

**Files:**
- Create: `packages/extract-core/src/extraction/response-parser.ts`
- Create: `packages/extract-core/src/confidence/score-confidence.ts`
- Create: `packages/extract-core/src/red-flags/rules.ts`
- Create: `packages/extract-core/src/red-flags/detect-red-flags.ts`
- Modify: `packages/extract-core/src/index.ts`
- Test: `packages/extract-core/tests/response-parser.test.ts`
- Test: `packages/extract-core/tests/confidence.test.ts`
- Test: `packages/extract-core/tests/red-flags.test.ts`

- [ ] **Step 1: Write failing parser tests**

```ts
import { describe, expect, it } from 'vitest'
import { parseModelJson } from '../src'

describe('parseModelJson', () => {
  it('strips thinking tags and parses fenced json', () => {
    const parsed = parseModelJson('<think>notes</think>```json\n{"a":1}\n```')
    expect(parsed).toEqual({ a: 1 })
  })

  it('throws a helpful error for invalid json', () => {
    expect(() => parseModelJson('not json')).toThrow(/model response/i)
  })
})
```

- [ ] **Step 2: Write failing confidence/red flag tests**

Use fixtures from `packages/extract-sdk/tests/fixtures/sample_extraction_for_flags.json` and mirror the Python rule outcomes for RF-001 through RF-020.

- [ ] **Step 3: Implement pure domain logic**

Rules must be table-driven:

```ts
export interface RedFlagRule {
  id: string
  name: string
  severity: 'low' | 'medium' | 'high'
  evaluate(data: Record<string, unknown>): RedFlag | null
}
```

Do not put Worker, DB, R2, or fetch code in this package.

- [ ] **Step 4: Run extract-core tests**

Run: `cd packages/extract-core && npm run typecheck && npm run test:coverage`

Expected: pass with at least 95% coverage for touched files.

- [ ] **Step 5: Commit**

```bash
git add packages/extract-core
git commit -m "feat(extract-core): port parsing confidence and red flags"
```

---

## Task 4: Worker DB, Auth, And Storage Adapters

**Files:**
- Create: `workers/api/src/repositories/db.ts`
- Create: `workers/api/src/services/storage.ts`
- Create: `workers/api/src/services/neon-auth.ts`
- Create: `workers/api/src/middleware/auth.ts`
- Create: `workers/api/src/domain/object-keys.ts`
- Modify: `workers/api/src/types.ts`
- Test: `workers/api/src/tests/auth.test.ts`
- Test: `workers/api/src/tests/storage.test.ts`
- Test: `workers/api/src/tests/db.test.ts`

- [ ] **Step 1: Write failing adapter tests**

Auth tests must prove:

```ts
expect(await getAuthContext(requestWithBearer, env)).toMatchObject({
  kind: 'user',
  id: 'user-id-from-sub',
})
expect(await getAuthContext(requestWithSessionToken, env)).toMatchObject({
  kind: 'anonymous',
})
```

Storage tests must prove R2 keys match current conventions:

```ts
expect(documentKey({ ownerId: 'u1', extractionId: 'e1' }))
  .toBe('lextract-documents/u1/e1/original.pdf')
```

- [ ] **Step 2: Implement adapters**

DB adapter:

```ts
import pg from 'pg'
import type { Env } from '../types'

export function createDb(env: Env): pg.Pool {
  if (!env.HYPERDRIVE) throw new Error('HYPERDRIVE binding is required')
  return new pg.Pool({ connectionString: env.HYPERDRIVE.connectionString })
}
```

Auth adapter must verify Neon Auth JWKS with `jose` and load public user rows from Neon. Anonymous auth must load `anonymous_sessions` where token is valid, unlinked, and unexpired.

- [ ] **Step 3: Run adapter verification**

Run: `cd workers/api && npm run typecheck && npm test -- --run src/tests/auth.test.ts src/tests/storage.test.ts src/tests/db.test.ts`

Expected: pass.

- [x] **Step 4: Commit**

```bash
git add workers/api/src/repositories workers/api/src/services workers/api/src/middleware workers/api/src/domain workers/api/src/types.ts workers/api/src/tests
git commit -m "feat(api): add worker db auth and storage adapters"
```

---

## Task 5: Auth And User Routes

**Files:**
- Create: `workers/api/src/repositories/users.ts`
- Create: `workers/api/src/repositories/anonymous-sessions.ts`
- Create: `workers/api/src/routes/auth.ts`
- Create: `workers/api/src/routes/user.ts`
- Modify: `workers/api/src/index.ts`
- Test: `workers/api/src/tests/auth-routes.test.ts`
- Test: `workers/api/src/tests/user-routes.test.ts`

- [ ] **Step 1: Write failing route contract tests**

Cover:

- `POST /api/v1/auth/anonymous`
- `PATCH /api/v1/auth/anonymous/email`
- `POST /api/v1/auth/link`
- `POST /api/v1/auth/sync-user`
- `GET /api/v1/user/profile`
- `PATCH /api/v1/user/profile`
- `GET /api/v1/user/dashboard`
- `DELETE /api/v1/user`

- [ ] **Step 2: Implement thin routes and repositories**

Route handlers call repository functions only. Example:

```ts
auth.post('/anonymous', async (c) => {
  const session = await createAnonymousSession(c.env)
  return c.json(session, 201)
})
```

Do not duplicate SQL between routes.

- [ ] **Step 3: Verify**

Run: `cd workers/api && npm run typecheck && npm test -- --run src/tests/auth-routes.test.ts src/tests/user-routes.test.ts`

Expected: pass.

- [x] **Step 4: Commit**

```bash
git add workers/api/src
git commit -m "feat(api): port auth and user routes"
```

---

## Task 6: Payment And Stripe Webhook Routes

**Files:**
- Create: `workers/api/src/repositories/payments.ts`
- Create: `workers/api/src/services/stripe.ts`
- Create: `workers/api/src/services/posthog.ts`
- Create: `workers/api/src/routes/payments.ts`
- Create: `workers/api/src/routes/webhooks.ts`
- Modify: `workers/api/src/index.ts`
- Test: `workers/api/src/tests/payments.test.ts`
- Test: `workers/api/src/tests/stripe-webhook.test.ts`

- [ ] **Step 1: Write failing payment tests**

Cover:

- authenticated checkout requires owned unpaid extraction for single purchase
- guest checkout stores `guest_email` on anonymous extraction
- use-credit deducts exactly one credit transaction inside a transaction
- credit balance/history match existing frontend shapes
- webhook idempotency claims event before side effects
- duplicate webhook returns `{ received: true }` without duplicate ledger rows

- [ ] **Step 2: Implement transactional payment repository**

The immutable credit ledger invariant must be preserved:

```sql
SELECT credits_balance FROM users WHERE id = $1 FOR UPDATE;
INSERT INTO credit_transactions (..., balance_after) VALUES (...);
UPDATE users SET credits_balance = $2 WHERE id = $1;
```

- [ ] **Step 3: Implement Stripe fetch adapter**

Use Stripe's official Node package only if it works in Workers with `nodejs_compat`; otherwise use direct `fetch` calls and HMAC signature verification with Web Crypto.

- [ ] **Step 4: Verify**

Run: `cd workers/api && npm run typecheck && npm test -- --run src/tests/payments.test.ts src/tests/stripe-webhook.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add workers/api/src
git commit -m "feat(api): port payments and stripe webhooks"
```

---

## Task 7: Extraction Read Routes And Upload Route

**Files:**
- Create: `workers/api/src/repositories/extractions.ts`
- Create: `workers/api/src/services/pdf.ts`
- Create: `workers/api/src/routes/extractions.ts`
- Modify: `workers/api/src/index.ts`
- Test: `workers/api/src/tests/extractions-read.test.ts`
- Test: `workers/api/src/tests/upload.test.ts`
- Test: `workers/api/src/tests/extractions-repository.test.ts`
- Test: `workers/api/src/tests/pdf.test.ts`

- [x] **Step 1: Write failing read/upload tests**

Cover:

- `GET /api/v1/extractions/:id/status`
- `GET /api/v1/extractions/:id/teaser`
- `GET /api/v1/extractions/:id`
- `GET /api/v1/extractions`
- `DELETE /api/v1/extractions/:id`
- `POST /api/v1/extractions/upload` multipart `file`
- ownership returns 404, not 403, for another user's extraction
- unpaid full result returns 402 or 403 consistently with current frontend behavior

- [x] **Step 2: Implement PDF validation**

Worker upload must enforce:

- PDF only
- 50 MB max
- page count limit from current `MAX_PDF_PAGES`
- R2 upload under the current key convention
- extraction row inserted as `uploading`
- Workflow started after successful row insert

- [x] **Step 3: Verify**

Run: `cd workers/api && npm run typecheck && npm test -- --run src/tests/extractions-read.test.ts src/tests/upload.test.ts`

Expected: pass.

- [x] **Step 4: Commit**

```bash
git add workers/api/src
git commit -m "feat(api): port extraction reads and upload"
```

---

## Task 8: Cloudflare Extraction Workflow

**Files:**
- Create: `packages/extract-core/src/extraction/openrouter-client.ts`
- Create: `packages/extract-core/src/extraction/prompt-builder.ts`
- Create: `packages/extract-core/src/extraction/orchestrator.ts`
- Create: `workers/api/src/workflows/extraction-workflow.ts`
- Create: `workers/api/src/domain/status.ts`
- Modify: `workers/api/src/types.ts`
- Modify: `workers/api/src/routes/extractions.ts`
- Test: `packages/extract-core/tests/prompt-builder.test.ts`
- Test: `packages/extract-core/tests/orchestrator.test.ts`
- Test: `workers/api/src/tests/extraction-workflow.test.ts`

- [x] **Step 1: Write failing workflow tests**

Prove the Workflow runs these ordered steps with idempotent status writes:

```text
uploading -> extracting -> scoring -> complete
```

Also prove failure writes:

```text
status=failed
error_message=<user-safe message>
processing_completed_at=<timestamp>
```

- [x] **Step 2: Port OpenRouter orchestration**

The TypeScript orchestrator must preserve:

- pass 1 model list
- pass 2 model list
- pass 3 conditional escalation threshold
- cost ceiling
- pass records
- raw response capture when enabled
- parsed extracted field shape `{ value, confidence, source_text }`

- [x] **Step 3: Implement Workflow**

Workflow input:

```ts
export interface ExtractionWorkflowInput {
  extractionId: string
}
```

Workflow steps:

```ts
await step.do('load extraction and PDF', ...)
await step.do('run OpenRouter extraction', ...)
await step.do('score confidence', ...)
await step.do('detect red flags', ...)
await step.do('mark complete and enqueue emails', ...)
```

- [x] **Step 4: Verify**

Run:

```bash
cd packages/extract-core && npm run typecheck && npm run test:coverage
cd ../../workers/api && npm run typecheck && npm test -- --run src/tests/extraction-workflow.test.ts
```

Expected: pass.

- [x] **Step 5: Commit**

```bash
git add packages/extract-core workers/api/src
git commit -m "feat(api): replace celery extraction pipeline with workflows"
```

---

## Task 9: Field Editing, Document Proxy, CamAudit, Tasks, And Exports

**Files:**
- Create: `workers/api/src/services/camaudit.ts`
- Create: `workers/api/src/domain/task-status.ts`
- Create: `workers/api/src/repositories/tasks.ts`
- Create: `workers/api/src/routes/tasks.ts`
- Create: `workers/api/src/workflows/export-workflow.ts`
- Modify: `workers/api/src/routes/extractions.ts`
- Test: `workers/api/src/tests/field-editing.test.ts`
- Test: `workers/api/src/tests/document-proxy.test.ts`
- Test: `workers/api/src/tests/camaudit.test.ts`
- Test: `workers/api/src/tests/export-workflow.test.ts`
- Test: `workers/api/src/tests/tasks.test.ts`

- [x] **Step 1: Write failing tests**

Cover:

- `PATCH /extractions/:id/fields`
- `GET /extractions/:id/edits`
- `GET /extractions/:id/document-url`
- `GET /extractions/:id/document`
- `GET /extractions/:id/camaudit-payload`
- `POST /extractions/:id/export/:format`
- `GET /extractions/:id/export/:format/download`
- `GET /tasks/:task_id/status`

- [x] **Step 2: Implement field editing**

Preserve:

- registered users only
- paid extraction only
- immutable `extraction_edits`
- red flags recomputed after edit
- `updated_at` bump to invalidate export cache

- [x] **Step 3: Implement document proxy**

Do not expose R2 directly. Return a signed Worker URL from `document-url`, then stream R2 object from `document`.

- [x] **Step 4: Implement export Workflow**

Minimum acceptable cutover:

- DOCX and XLSX must generate Worker-native files.
- PDF route may return a clear `400` unavailable response only if tests and frontend messaging already tolerate unavailable PDF. If current product requires PDF, implement HTML-to-PDF through a Cloudflare-native compatible path before completion.

- [x] **Step 5: Verify**

Run: `cd workers/api && npm run typecheck && npm test -- --run src/tests/field-editing.test.ts src/tests/document-proxy.test.ts src/tests/camaudit.test.ts src/tests/export-workflow.test.ts src/tests/tasks.test.ts`

Expected: pass.

- [x] **Step 6: Commit**

```bash
git add workers/api/src
git commit -m "feat(api): port editing documents camaudit and exports"
```

---

## Task 10: Email, Cleanup, Leads, And Operational Queues

**Files:**
- Create: `workers/api/src/services/resend.ts`
- Create: `workers/api/src/services/marketing-worker.ts`
- Create: `workers/api/src/queues/email-consumer.ts`
- Create: `workers/api/src/queues/cleanup-consumer.ts`
- Create: `workers/api/src/routes/leads.ts`
- Modify: `workers/api/src/index.ts`
- Test: `workers/api/src/tests/email-queue.test.ts`
- Test: `workers/api/src/tests/cleanup-queue.test.ts`
- Test: `workers/api/src/tests/leads.test.ts`

- [x] **Step 1: Write failing queue and leads tests**

Cover:

- extraction complete email payload
- CAM flags follow-up payload
- anonymous notify email payload
- account deletion queues cleanup
- cleanup deletes all document and export prefixes
- `/api/v1/leads/unsubscribe` forwards to marketing Worker with shared secret

- [x] **Step 2: Implement Queue consumers**

Queue messages carry IDs only, never full lease data.

- [x] **Step 3: Verify**

Run: `cd workers/api && npm run typecheck && npm test -- --run src/tests/email-queue.test.ts src/tests/cleanup-queue.test.ts src/tests/leads.test.ts`

Expected: pass.

- [x] **Step 4: Commit**

```bash
git add workers/api/src
git commit -m "feat(api): add email cleanup and leads queues"
```

---

## Task 11: Frontend API Base Cleanup And Contract Tests

**Files:**
- Modify: `.env.example`
- Modify: `frontend/.env.example`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/lib/api-upload.ts`
- Modify: `frontend/hooks/use-upload.ts`
- Modify: `frontend/app/(marketing)/unsubscribe/unsubscribe-content.tsx`
- Test: `frontend/__tests__/api-base-url.test.ts`

- [ ] **Step 1: Write failing frontend base URL tests**

Prove local default and production examples include `/api/v1` exactly once.

- [ ] **Step 2: Normalize docs and code comments**

The expected setting is:

```bash
NEXT_PUBLIC_API_URL=https://api.lextract.io/api/v1
```

Do not change frontend runtime behavior unless tests reveal a real bug.

- [ ] **Step 3: Verify**

Run:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npx vitest run __tests__/api-base-url.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add .env.example frontend/.env.example frontend/lib/api.ts frontend/lib/api-upload.ts frontend/hooks/use-upload.ts frontend/app/(marketing)/unsubscribe/unsubscribe-content.tsx frontend/__tests__/api-base-url.test.ts
git commit -m "fix(frontend): document api base url contract"
```

---

## Task 12: Deployment Docs And Railway Removal

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `.env.example`
- Modify: `backend/.env.example`
- Delete: `backend/railway.web.json`
- Delete: `backend/railway.worker.json`
- Optional delete after final review: `backend/Dockerfile`
- Create: `docs/operations/cloudflare-api-cutover.md`

- [x] **Step 1: Write documentation checklist**

`docs/operations/cloudflare-api-cutover.md` must include:

```text
1. Create Hyperdrive for Neon pooled connection.
2. Create R2 bucket binding to existing lextract-documents bucket.
3. Create Workflows bindings.
4. Create Queues and DLQs.
5. Set Worker secrets.
6. Deploy lextract-api Worker.
7. Move api.lextract.io custom domain to Worker.
8. Update Stripe webhook endpoint if required.
9. Run smoke tests.
10. Stop Railway web, worker, and Redis services.
11. Confirm no requests hit Railway for 24 hours.
12. Delete Railway project/resources.
```

- [x] **Step 2: Update architecture/deployment**

Docs must say:

- frontend: Cloudflare Workers/OpenNext
- backend API: Cloudflare Worker at `api.lextract.io`
- background extraction: Cloudflare Workflows
- async email/cleanup: Cloudflare Queues
- database: Neon Postgres through Hyperdrive
- storage: R2 binding
- no Railway
- no Redis
- no Celery beat

- [x] **Step 3: Verify docs**

Run: `rg -n "Railway|Redis|Celery|Dockerfile" docs .env.example backend/.env.example workers/api`

Expected: only historical notes or explicit migration notes remain; no production instructions tell the user to deploy Railway.

- [ ] **Step 4: Commit**

```bash
git add docs/ARCHITECTURE.md docs/DEPLOYMENT.md docs/operations/cloudflare-api-cutover.md .env.example backend/.env.example backend/railway.web.json backend/railway.worker.json
git commit -m "docs(deploy): replace railway backend with cloudflare api worker"
```

---

## Task 13: Full Verification And Review Cycles

**Files:**
- Modify as needed based on review findings.

- [x] **Step 1: Run package checks**

```bash
cd packages/extract-core
npm run typecheck
npm run test:coverage
```

- [x] **Step 2: Run Worker checks**

```bash
cd workers/api
npm run typecheck
npm run test:coverage
npm run check
```

- [x] **Step 3: Run frontend checks**

```bash
cd frontend
npm run lint
npx tsc --noEmit
npx vitest
npm run build:cf
```

- [x] **Step 4: Run retained Python checks**

Python remains in the repo for comparison/CamAudit SDK compatibility until explicitly removed:

```bash
cd backend
python -m pytest
ruff check app/
black --check app/
mypy app/

cd ../packages/extract-sdk
python -m pytest
ruff check src/
mypy src/
```

- [x] **Step 5: Mandatory code review**

Use `superpowers:requesting-code-review`.

Reviewer must specifically check:

- route contract compatibility
- clean module boundaries
- no `any`
- no route-level SQL
- no lease data in queue messages or logs
- idempotency around workflows/webhooks/credits
- R2 object key compatibility
- Stripe raw-body signature correctness
- PDF/export parity
- Railway/Redis/Celery production references removed

- [x] **Step 6: Fix every review issue and rerun checks**

No skipping or deferring reviewer findings.

- [x] **Step 7: Commit fixes**

```bash
git add <explicit files>
git commit -m "fix(api): address cloudflare migration review findings"
```

---

## Task 14: Tracker Completion And Branch Finish

**Files:**
- Modify: `docs/user-stories/TRACKER.md`

- [ ] **Step 1: Update tracker**

Change:

```text
[~] **infra/cloudflare-native-backend-2026-06-12** — in progress on `feat/cloudflare-native-backend`
```

to:

```text
[x] **infra/cloudflare-native-backend-2026-06-12** — complete — merge: <merge-sha>
```

- [ ] **Step 2: Commit tracker completion**

```bash
git add docs/user-stories/TRACKER.md
git commit -m "chore(tracker): mark cloudflare backend migration complete"
```

- [ ] **Step 3: Finish branch**

Use `superpowers:finishing-a-development-branch`.

---

## Self-Review

Spec coverage:

- Eliminates Railway bill: Tasks 1, 8, 10, 12 replace web, worker, Redis, and deployment docs with Cloudflare-native services.
- Keeps Neon: Tasks 4, 5, 6, 7 use Hyperdrive/Postgres, not D1.
- Uses Workers paid included primitives: Worker API, Workflows, Queues, R2 bindings, Hyperdrive.
- Plans carefully before implementation: this document is the implementation control plan.
- Sub-agent driven: plan requires subagent-driven-development and review/fix cycles.
- Multiple review/fix cycles: Task 13 mandates code review and fix/re-run cycle.
- Clean, organized new code: design standards and structure require domain/infrastructure/route separation.

Placeholder scan:

- No deferred-work markers or intentionally empty implementations are present.
- The only optional item is `backend/Dockerfile` deletion, which depends on whether Python backend remains as a comparison artifact during cutover. Production Railway configs still must be removed.

Type consistency:

- Worker `Env`, `ExtractionWorkflowInput`, domain module names, and route paths are consistent across tasks.
