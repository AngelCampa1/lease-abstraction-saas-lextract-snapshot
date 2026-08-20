# Architecture Documentation Implementation Plan

> **Historical artifact.** This plan was written before the Gemini 3 Flash + Cloudflare R2 migration. The current architecture is described in `docs/ARCHITECTURE.md` and `docs/PRD.md`.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create three agent-oriented reference documents — `docs/ARCHITECTURE.md`, `docs/USER_FLOWS.md`, and `CLAUDE.md` — so any Claude Code agent dropping into a worktree immediately knows the system without reading the PRD.

**Architecture:** Monorepo (`frontend/` + `backend/`). Vercel deploys frontend, Railway deploys backend (3 processes). All content is derived from `docs/PRD.md` and the design doc at `docs/plans/2026-03-03-architecture-design.md`.

**Tech Stack:** Next.js 16 / React 19 / TypeScript (frontend) · FastAPI / Python 3.12 / Celery / Redis (backend) · Supabase / AWS S3+Textract / Anthropic Claude / Stripe (services)

---

### Task 1: Create `docs/ARCHITECTURE.md`

**Files:**
- Create: `docs/ARCHITECTURE.md`

**Step 1: Write the file with all 6 sections**

Create `docs/ARCHITECTURE.md` with exactly this content:

```markdown
# Lextract.io — Architecture Reference

> Agent orientation document. Read this before writing any code.
> Full product context: `docs/PRD.md` · User flows: `docs/USER_FLOWS.md`

---

## 1. Repo Layout

Monorepo. Vercel deploys `frontend/`, Railway deploys `backend/`.

```
lextract/
├── frontend/
│   ├── app/                        # Next.js App Router pages + layouts
│   │   ├── (auth)/                 # Login, signup routes
│   │   ├── (app)/                  # Protected routes (require session)
│   │   │   ├── upload/             # PDF upload page
│   │   │   ├── processing/[id]/    # Polling status page
│   │   │   ├── results/[id]/       # Teaser + full results view
│   │   │   └── dashboard/          # User dashboard (credits, history)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                     # Shadcn/Radix primitives
│   │   ├── upload/                 # UploadZone, ProgressBar
│   │   ├── results/                # FieldCard, CategoryAccordion, RedFlagPanel
│   │   ├── pdf-viewer/             # PdfViewer, SourceHighlight
│   │   └── export/                 # ExportButton, TemplateSelector
│   ├── lib/
│   │   ├── api.ts                  # Typed API client → FastAPI
│   │   ├── supabase.ts             # Supabase browser client
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useExtraction.ts        # TanStack Query hooks for extraction state
│   │   └── useCredits.ts           # Credit balance + usage
│   └── public/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── auth.py             # /api/v1/auth/* (4 routes)
│   │   │   ├── extractions.py      # /api/v1/extractions/* (8 routes)
│   │   │   ├── payments.py         # /api/v1/payments/* (4 routes)
│   │   │   ├── user.py             # /api/v1/user/* (3 routes)
│   │   │   └── webhooks.py         # /api/v1/webhooks/stripe
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings — reads all env vars
│   │   │   ├── deps.py             # FastAPI dependencies (get_current_user, get_db)
│   │   │   └── security.py         # JWT validation via Supabase public key
│   │   ├── models/
│   │   │   ├── extraction.py       # Pydantic models for extraction + fields
│   │   │   ├── payment.py          # Payment + credit transaction models
│   │   │   └── user.py             # User profile model
│   │   ├── services/
│   │   │   ├── textract.py         # StartDocumentAnalysis + GetDocumentAnalysis
│   │   │   ├── claude.py           # Claude Sonnet 4.6 extraction prompt + parse
│   │   │   ├── confidence.py       # Per-field confidence scoring (high/medium/low)
│   │   │   ├── red_flags.py        # 20-rule engine (RF-001 through RF-020)
│   │   │   ├── exports.py          # Word (python-docx), PDF (WeasyPrint), Excel (openpyxl)
│   │   │   └── stripe_service.py   # Checkout session creation + webhook processing
│   │   ├── tasks/
│   │   │   ├── celery_app.py       # Celery init (Redis broker + backend)
│   │   │   ├── ocr.py              # start_ocr_job, poll_textract
│   │   │   ├── extraction.py       # run_extraction, score_confidence, run_red_flags
│   │   │   └── export.py           # generate_export
│   │   └── main.py                 # FastAPI app entry point, router registration
│   ├── tests/
│   └── Dockerfile
├── docs/
│   ├── PRD.md                      # Full product requirements
│   ├── ARCHITECTURE.md             # This file
│   ├── USER_FLOWS.md               # Step-by-step user journey sequences
│   ├── lextract_field_schema.json  # 126-field extraction schema definition
│   └── plans/                      # Implementation plans
└── CLAUDE.md                       # Lightweight agent orientation
```

---

## 2. External Services Map

| Service | Role | Backend Env Var(s) | Frontend Env Var(s) |
|---------|------|--------------------|---------------------|
| **Supabase** | PostgreSQL 15 DB + Auth (JWT) | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **AWS S3** | PDF storage + export file storage | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME` | — |
| **AWS Textract** | OCR — async `StartDocumentAnalysis` | Same credentials as S3 | — |
| **Anthropic** | Claude Sonnet 4.6 — 126-field extraction | `ANTHROPIC_API_KEY` | — |
| **Redis** | Celery broker + result backend | `REDIS_URL` | — |
| **Stripe** | Checkout sessions, webhook events | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Resend** | Transactional email (extraction complete, CAM upsell) | `RESEND_API_KEY` | — |
| **Sentry** | Error tracking (backend + frontend) | `SENTRY_DSN` | `NEXT_PUBLIC_SENTRY_DSN` |
| **PostHog** | Product analytics + funnel tracking | — | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |

S3 path convention:
- PDFs: `lextract-documents/{user_id}/{extraction_id}/original.pdf`
- Exports: `lextract-documents/{user_id}/{extraction_id}/exports/{format}.{ext}`
- Pre-signed URLs expire in 1 hour.

---

## 3. Data Model

### Tables

**`users`** — extends Supabase Auth
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | FK → auth.users(id) |
| email | TEXT | |
| full_name | TEXT | |
| company | TEXT | |
| role | TEXT | tenant_rep, broker, attorney, landlord, investor, other |
| credits_balance | INTEGER | default 0 |
| stripe_customer_id | TEXT | |

**`anonymous_sessions`** — upload-first, signup-later flow
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| session_token | TEXT UNIQUE | sent in Authorization header for anon users |
| linked_user_id | UUID | FK → users(id), set after signup |
| expires_at | TIMESTAMPTZ | 72 hours from creation |

**`extractions`** — core table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → users(id), null for anon |
| anonymous_session_id | UUID | FK → anonymous_sessions(id) |
| status | extraction_status | see enum below |
| document_filename | TEXT | original file name |
| document_s3_key | TEXT | S3 object key |
| document_page_count | INTEGER | |
| property_type | TEXT | commercial, office, industrial, retail |
| extracted_data | JSONB | full 126-field results |
| confidence_scores | JSONB | per-field: {field_name: {score, tier}} |
| red_flags | JSONB | array of triggered rule objects |
| payment_status | payment_status | unpaid → paid |
| payment_id | UUID | FK → payments(id) |

**`payments`**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| stripe_checkout_session_id | TEXT | |
| stripe_payment_intent_id | TEXT | |
| payment_type | payment_type | single, credit_pack_5, credit_pack_10 |
| amount_cents | INTEGER | 1500, 6500, or 12000 |
| status | TEXT | pending, completed, failed, refunded |

**`credit_transactions`** — immutable ledger
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| extraction_id | UUID FK | nullable — null for pack purchases |
| payment_id | UUID FK | nullable — null for credit usage |
| amount | INTEGER | positive = credit purchase, negative = usage |
| balance_after | INTEGER | denormalized for fast reads |
| description | TEXT | |

**`stripe_webhook_events`** — idempotency guard
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | Stripe event ID |
| event_type | TEXT | |
| processed_at | TIMESTAMPTZ | |

**`extraction_edits`** — audit trail for user overrides
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| extraction_id | UUID FK | |
| field_name | TEXT | matches schema field_name |
| original_value | JSONB | AI-extracted value |
| edited_value | JSONB | user's override |
| edited_by | UUID FK | users(id) |

### Enums

```sql
extraction_status: uploading | ocr_processing | extracting | scoring | complete | failed
payment_status: unpaid | paid | refunded
payment_type: single | credit_pack_5 | credit_pack_10
```

### RLS Rules
- `users`: user reads/writes own row only
- `extractions`: user reads own rows; anonymous_session reads rows linked to its session_token; backend service key bypasses RLS
- `payments`, `credit_transactions`: user reads own rows; no client writes — backend only
- `stripe_webhook_events`: backend service key only — no client access
- `extraction_edits`: user reads/writes edits on their own extractions

---

## 4. API Surface

All routes prefixed `/api/v1/`. Auth via `Authorization: Bearer <supabase_jwt>` or `X-Session-Token: <anon_token>`.

### Auth
```
POST  /auth/signup          Email/password registration → Supabase user
POST  /auth/login           Email/password login → JWT
POST  /auth/anonymous       Create anonymous session → session_token
POST  /auth/link            Link anonymous session to registered account
```

### Extractions
```
POST  /extractions/upload           Upload PDF → start pipeline → return extraction_id
GET   /extractions                  List user's extractions (paginated, 20/page)
GET   /extractions/{id}             Full extraction record + status
GET   /extractions/{id}/teaser      Pre-payment: 5 visible fields + blurred summary
PATCH /extractions/{id}/fields      Update field values → re-run red flags
GET   /extractions/{id}/export/{format}  format: docx | pdf | xlsx  ?template=commercial|office|industrial|retail
GET   /extractions/{id}/camaudit-payload  Encrypted schema-driven CAM handoff payload
DELETE /extractions/{id}            Delete extraction + S3 objects
```

### Payments
```
POST  /payments/checkout    Create Stripe Checkout Session → return url
GET   /payments/credits     Current credit balance
GET   /payments/history     Paginated payment history
POST  /payments/use-credit  Apply 1 credit to unlock extraction
```

### User
```
GET   /user/profile         User profile
PATCH /user/profile         Update full_name, company, role
GET   /user/dashboard       Stats: total extractions, credits balance, red flags found
```

### Webhooks
```
POST  /webhooks/stripe      Stripe signature-verified webhook handler
```

---

## 5. Background Jobs

All tasks defined in `backend/app/tasks/`. Celery broker: Redis (`REDIS_URL`).

| Task | Module | Trigger | What It Does | On Failure |
|------|--------|---------|--------------|------------|
| `start_ocr_job` | `ocr.py` | POST /extractions/upload | Calls `StartDocumentAnalysis` (TABLES+FORMS+LAYOUT), stores Textract job ID, sets status=ocr_processing | Sets status=failed |
| `poll_textract` | `ocr.py` | Worker-driven retry chain | `GetDocumentAnalysis` — if IN_PROGRESS re-queue; if SUCCEEDED dispatch `run_extraction` | Retry up to 5x, then DLQ + status=failed |
| `run_extraction` | `extraction.py` | After poll_textract succeeds | Assembles OCR text, calls Claude Sonnet 4.6 with schema prompt, parses JSON response, stores `extracted_data`, sets status=extracting→scoring | Sets status=failed |
| `score_confidence` | `extraction.py` | Chained after run_extraction | Computes per-field confidence (OCR score × Claude certainty), stores `confidence_scores`, sets status=complete | Sets status=failed |
| `run_red_flags` | `extraction.py` | Chained after score_confidence | Evaluates RF-001 through RF-020 against `extracted_data`, stores `red_flags` array | Non-fatal — log error, don't fail extraction |
| `generate_export` | `export.py` | GET /extractions/{id}/export/{format} | Builds Word/PDF/Excel from extracted_data + template, uploads to S3 exports path, returns pre-signed URL | Returns 500 to client |

---

## 6. Deployment

### Frontend (Vercel)
- Connect `lextract` repo → set root directory to `frontend/`
- Auto-deploys on push to `main`
- Domains: `lextract.io`
- Required env vars in Vercel dashboard: all `NEXT_PUBLIC_*` vars from External Services Map

### Backend (Railway)
- Connect `lextract` repo → root directory `backend/`
- Creates 3 Railway services from same `Dockerfile`:

| Service | Start Command | Notes |
|---------|--------------|-------|
| `web` | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | HTTP API |
| `worker` | `celery -A app.tasks.celery_app worker --loglevel=info` | Extraction jobs |
| `beat` | Not deployed | Scheduled database work is disabled so Neon compute can suspend while idle |

- Redis: Railway Redis addon — `REDIS_URL` injected automatically
- Domain: `api.lextract.io` → Railway web service

### All Backend Environment Variables
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
S3_BUCKET_NAME
ANTHROPIC_API_KEY
REDIS_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
SENTRY_DSN
```
```

**Step 2: Verify the file**

Check that `docs/ARCHITECTURE.md` exists and contains all 6 section headings:
- `## 1. Repo Layout`
- `## 2. External Services Map`
- `## 3. Data Model`
- `## 4. API Surface`
- `## 5. Background Jobs`
- `## 6. Deployment`

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: add ARCHITECTURE.md — layer-first agent reference"
```

---

### Task 2: Create `docs/USER_FLOWS.md`

**Files:**
- Create: `docs/USER_FLOWS.md`

**Step 1: Write the file with all 5 flows**

Create `docs/USER_FLOWS.md` with exactly this content:

```markdown
# Lextract.io — User Flows

> Step-by-step sequences for all user journeys.
> Architecture reference: `docs/ARCHITECTURE.md` · Product context: `docs/PRD.md`

---

## Flow 1: Upload & Extract (Anonymous)

1. User navigates to `lextract.io/upload`
2. Frontend calls `POST /api/v1/auth/anonymous` → receives `session_token` (72hr TTL), stored in localStorage
3. User drags a PDF (max 50MB) onto upload zone
4. Frontend calls `POST /api/v1/extractions/upload` with multipart file + `X-Session-Token` header
5. Backend:
   - Validates file type (PDF) and size
   - Uploads to S3: `lextract-documents/anon/{session_id}/{extraction_id}/original.pdf`
   - Creates `extractions` row: `status=uploading`, `payment_status=unpaid`
   - Dispatches `start_ocr_job` Celery task
   - Returns `{ extraction_id }`
6. Frontend redirects to `/processing/{extraction_id}`
7. Frontend polls `GET /api/v1/extractions/{id}` every 3 seconds; shows status messages:
   - `uploading` → "Uploading document..."
   - `ocr_processing` → "Running OCR analysis..."
   - `extracting` → "Extracting lease terms..."
   - `scoring` → "Scoring confidence..."
   - `complete` → redirect to `/results/{id}`
   - `failed` → show error, offer retry
8. On `complete`, frontend redirects to `/results/{id}` — teaser view renders

---

## Flow 2: Payment & Unlock

1. User is on `/results/{id}` — teaser view shows 5 visible fields, all others blurred
2. User clicks "Unlock full results for $15" or "Buy 5 credits for $65"
3. If anonymous: redirect to `/signup?return=/results/{id}` — must create account before paying
4. Frontend calls `POST /api/v1/payments/checkout` with `{ extraction_id, product: "single" | "credit_pack_5" | "credit_pack_10" }`
5. Backend creates Stripe Checkout Session, returns `{ url }`
6. Frontend redirects to Stripe-hosted checkout
7. User completes payment on Stripe
8. Stripe sends `checkout.session.completed` to `POST /api/v1/webhooks/stripe`
9. Backend webhook handler:
   - Checks `stripe_webhook_events` for this event ID (idempotency)
   - Inserts event into `stripe_webhook_events`
   - For **single** (`product=single`): sets `extractions.payment_status=paid`, inserts `credit_transactions` row `(amount=-1)`
   - For **credit pack**: inserts `payments` row, inserts `credit_transactions` row `(amount=+5 or +10)`, updates `users.credits_balance`
10. Stripe redirects user to `/results/{id}?payment=success`
11. Frontend calls `GET /api/v1/extractions/{id}` — now returns full `extracted_data` + `red_flags`
12. Full results view renders: 14-category accordion, red flag panel, export buttons

---

## Flow 3: Edit & Export

1. User is on full results view (`/results/{id}`, `payment_status=paid`)
2. User clicks an extracted field value to edit inline
3. Input field appears with current AI-extracted value
4. On save (blur or Enter): `PATCH /api/v1/extractions/{id}/fields` with `{ field_name, value }`
5. Backend:
   - Inserts row into `extraction_edits` (preserves `original_value` + `edited_value`)
   - Updates `extractions.extracted_data` with new value
   - Re-runs all 20 red flag rules against updated data
   - Returns updated `red_flags`
6. Red flag panel in UI updates instantly
7. User selects export format (Word / PDF / Excel) and template (Commercial / Office / Industrial / Retail)
8. Frontend calls `GET /api/v1/extractions/{id}/export/{format}?template={template}`
9. Backend:
   - Dispatches `generate_export` Celery task
   - Returns `202 Accepted` with `{ job_id }`
10. Frontend polls job status until `complete`
11. Backend returns pre-signed S3 URL (1hr expiry)
12. Browser downloads file

Export report structure (all formats):
1. Cover page — property address, parties, extraction date
2. Executive summary — key terms, red flag count
3. Category-by-category field tables with values and confidence tiers
4. Red flag summary with explanations
5. Appendix — processing time, model version, confidence distribution

---

## Flow 4: CamAudit Handoff

**Trigger conditions** (any one fires the CTA):
- `audit_rights == true` in extracted data
- Any of RF-001–RF-006 or RF-013–RF-015 fires
- `lease_structure_type` is NNN or Modified Gross
- 3+ CAM-relevant fields have Medium or Low confidence

1. CamAudit banner appears in results view: "Your lease has [N] CAM risk factors. Get a forensic audit with CamAudit — paid handoff for tenant audit review."
2. User clicks banner
3. Frontend calls `GET /api/v1/extractions/{id}/camaudit-payload`
4. Backend compiles the schema-marked CAM-relevant fields + confidence scores into JSON, includes `lextract_handoff: true`, encrypts payload
5. Frontend redirects to:
   `https://www.camaudit.io/scan?payload={encrypted}&extraction_id={id}&utm_source=lextract&utm_campaign=extraction_{id}`
6. CamAudit reads payload, recognizes the paid handoff context, and pre-populates the tenant audit flow so the user skips manual lease entry

**Contextual upsell messages by flag:**
- RF-001 (management fee): "Management fees over 15% cost tenants thousands."
- RF-002 (no audit rights): "Without audit rights, you can't verify CAM charges."
- RF-003 (no CAM cap): "Uncapped CAM means unlimited annual increases."
- RF-004 (cumulative cap): "Cumulative caps compound year-over-year."
- RF-006 (no exclusions): "Without exclusions, capital expenditures can be passed through."

---

## Flow 5: Credit Pack Purchase & Usage

**Purchase:**
1. User clicks "Buy 10 credits for $120" from any CTA in the app
2. If anonymous: redirect to `/signup` first
3. Frontend calls `POST /api/v1/payments/checkout` with `{ product: "credit_pack_10" }`
4. Stripe checkout → `checkout.session.completed` webhook
5. Backend: inserts `payments` row (`amount_cents=17000`, `type=credit_pack_10`), inserts `credit_transactions` row (`amount=+10`), updates `users.credits_balance`
6. Stripe redirects to `/dashboard?purchase=success`
7. Dashboard header shows updated credit balance

**Usage (applying a credit):**
1. User on `/results/{id}` teaser view, has available credits
2. CTA shows: "Unlock with 1 credit (you have [N])"
3. User clicks — frontend calls `POST /api/v1/payments/use-credit` with `{ extraction_id }`
4. Backend:
   - Checks `users.credits_balance >= 1`
   - Sets `extractions.payment_status=paid`
   - Inserts `credit_transactions` row (`amount=-1`, `balance_after=prev-1`)
   - Updates `users.credits_balance`
5. Full results unlock immediately — no Stripe redirect
```

**Step 2: Verify the file**

Check that `docs/USER_FLOWS.md` exists and contains all 5 flow headings:
- `## Flow 1: Upload & Extract (Anonymous)`
- `## Flow 2: Payment & Unlock`
- `## Flow 3: Edit & Export`
- `## Flow 4: CamAudit Handoff`
- `## Flow 5: Credit Pack Purchase & Usage`

**Step 3: Commit**

```bash
git add docs/USER_FLOWS.md
git commit -m "docs: add USER_FLOWS.md — 5 step-by-step user journey sequences"
```

---

### Task 3: Create `CLAUDE.md`

**Files:**
- Create: `CLAUDE.md`

**Step 1: Write the file**

Create `CLAUDE.md` at the repo root with exactly this content:

```markdown
# Lextract.io

AI-powered commercial lease abstraction — PDF in, 126 structured fields out, $15/lease.

## Stack

**Frontend** (`frontend/`) — Next.js 16 / React 19 / TypeScript strict / Tailwind 4 / Shadcn UI / TanStack Query — deployed on Vercel (`lextract.io`)

**Backend** (`backend/`) — FastAPI / Python 3.12 / Pydantic v2 / Celery + Redis / boto3 / anthropic SDK — deployed on Railway as 2 services: `web` (uvicorn) and `worker` (celery). Celery beat is not deployed because scheduled database work wakes Neon compute without user activity.

**Services** — Supabase (PostgreSQL 15 + Auth) · AWS S3 + Textract (OCR) · Anthropic Claude Sonnet 4.6 (extraction) · Stripe (payments) · Redis (job queue)

## Key Docs

- `docs/ARCHITECTURE.md` — repo layout, services map, data model, API surface, background jobs, deployment
- `docs/USER_FLOWS.md` — 5 step-by-step user journeys (upload, pay, edit/export, CamAudit handoff, credits)
- `docs/PRD.md` — full product requirements
- `docs/lextract_field_schema.json` — 126-field extraction schema

## Critical Conventions

1. **TypeScript strict** — no `any`, no implicit returns, everywhere in `frontend/`
2. **Pydantic v2** — all backend request/response models use `model_validator`, `field_validator`
3. **RLS on every table** — no Supabase table is created without Row-Level Security policies
4. **Credit ledger is immutable** — never update `credit_transactions` rows; always insert new rows; `balance_after` must be computed and stored at insert time
```

**Step 2: Verify**

Check `CLAUDE.md` is under 50 lines and contains all four section headings:
- `## Stack`
- `## Key Docs`
- `## Critical Conventions`

And that it references both `docs/ARCHITECTURE.md` and `docs/USER_FLOWS.md`.

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md — lightweight agent orientation for all sessions"
```

---

### Task 4: Final Verification

**Step 1: Confirm all three files exist**

```bash
ls docs/ARCHITECTURE.md docs/USER_FLOWS.md CLAUDE.md
```

Expected: all three paths listed without error.

**Step 2: Confirm git log**

```bash
git log --oneline -5
```

Expected output (most recent first):
```
<hash> docs: add CLAUDE.md — lightweight agent orientation for all sessions
<hash> docs: add USER_FLOWS.md — 5 step-by-step user journey sequences
<hash> docs: add ARCHITECTURE.md — layer-first agent reference
<hash> Add architecture design doc for agent-oriented technical reference
<hash> Initial commit: add PRD and field schema for Lextract.io
```

**Step 3: Spot-check ARCHITECTURE.md section count**

```bash
grep "^## " docs/ARCHITECTURE.md | wc -l
```

Expected: `6`

**Step 4: Spot-check USER_FLOWS.md flow count**

```bash
grep "^## Flow" docs/USER_FLOWS.md | wc -l
```

Expected: `5`

**Step 5: Spot-check CLAUDE.md line count**

```bash
wc -l CLAUDE.md
```

Expected: under 50 lines.
