# Lextract.io: Architecture Reference

> [!IMPORTANT]
> **Status: retired.** Lextract ran in production until it was retired; lextract.io no longer
> serves it. This document describes the architecture as it ran in production, and the hostnames,
> Workers and external accounts named below no longer exist. Read it as a record, not as a live
> system map.

> Agent orientation document. Read this before writing any code. Full product context:
> `portfolio/PRD.md` · User flows: `portfolio/USER-FLOWS.md`

---

## 1. Repo Layout

Monorepo. Cloudflare Workers deployed `frontend/` via OpenNext, and `workers/api/` served the
backend API on `api.lextract.io`.

**Note:** the `docs/` subtree below is a pre-split historical snapshot, kept as originally written.
`PRD.md`, `ARCHITECTURE.md` and `USER_FLOWS.md` were later renamed and moved into `portfolio/`:
they now live at `portfolio/PRD.md`, `portfolio/ARCHITECTURE.md` and `portfolio/USER-FLOWS.md`
(hyphen, not underscore), and no longer exist at the `docs/` paths shown here.

```text
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
│   │   ├── api.ts                  # Typed API client → Cloudflare API Worker
│   │   ├── neon-auth/              # Neon Auth proxy/session helpers
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
│   │   │   ├── config.py           # Pydantic Settings: reads all env vars
│   │   │   ├── deps.py             # FastAPI dependencies (get_current_user, get_db)
│   │   │   └── security.py         # JWT validation via Neon Auth JWKS
│   │   ├── models/
│   │   │   ├── extraction.py       # Pydantic models for extraction + fields
│   │   │   ├── payment.py          # Payment + credit transaction models
│   │   │   └── user.py             # User profile model
│   │   ├── services/
│   │   │   ├── object_storage.py   # Cloudflare R2 upload/download/presign
│   │   │   ├── exports.py          # Word (python-docx), PDF (WeasyPrint), Excel (openpyxl)
│   │   │   └── stripe_service.py   # Checkout session creation + webhook processing
│   │   ├── tasks/
│   │   │   ├── celery_app.py       # Legacy local task app, not production
│   │   │   ├── extraction.py       # Legacy extraction wrapper reference
│   │   │   ├── scoring.py          # Legacy scoring wrapper reference
│   │   │   └── export.py           # generate_export
│   │   └── main.py                 # FastAPI app entry point, router registration
│   ├── tests/
│   └── Dockerfile                  # Legacy local container artifact, not production
├── workers/
│   └── api/                        # Cloudflare Worker API, Workflows, Queues
├── packages/
│   └── extract-sdk/                # Shared extraction library (Gemini 3 Flash via OpenRouter + 3-pass + scoring)
│       ├── pyproject.toml          # name="extract-sdk", deps: openai, pypdf, pydantic>=2.0, pybreaker
│       ├── src/
│       │   └── extract_sdk/
│       │       ├── __init__.py
│       │       ├── schema/              # Schema registry (schema-agnostic)
│       │       │   ├── base.py          # FieldDefinition dataclass
│       │       │   ├── registry.py      # FieldRegistry
│       │       │   └── lextract_schema.py  # 126-field Lextract registry
│       │       ├── extraction/          # Gemini 3 Flash extraction pipeline (3-pass adversarial validation)
│       │       │   ├── openrouter_client.py # OpenRouter client (OpenAI-compatible) + circuit breaker
│       │       │   ├── pdf_loader.py        # Load PDF bytes, base64-encode for multimodal input
│       │       │   ├── prompt_builder.py    # Schema-driven prompt generation (per-pass templates)
│       │       │   ├── pass1_extraction.py  # Pass 1: full extraction
│       │       │   ├── pass2_validation.py  # Pass 2: adversarial validation, sparse corrections patch
│       │       │   ├── pass3_escalation.py  # Pass 3: dispute resolution on critical fields
│       │       │   ├── orchestrator.py      # 3-pass orchestration + audit trail
│       │       │   └── response_parser.py   # JSON response parsing + thinking-tag stripping
│       │       ├── confidence.py        # Gemini self-reported confidence + Pass 2/3 outcome merge
│       │       ├── red_flags.py         # 20-rule engine (RF-001 through RF-020)
│       │       ├── models.py            # Shared Pydantic models
│       │       └── exceptions.py        # SDK exceptions
│       └── tests/
├── docs/
│   ├── PRD.md                      # Full product requirements
│   ├── ARCHITECTURE.md             # This file
│   ├── USER_FLOWS.md               # Step-by-step user journey sequences
│   ├── lextract_field_schema.json  # 126-field extraction schema definition
│   └── plans/                      # Implementation plans
└── CLAUDE.md                       # Lightweight agent orientation
```

---

## 1b. Animation System

The frontend uses **Motion** (Framer Motion v11+) for physics-based, Apple/Linear-style animations.
The goal is subtle polish, not flashy or distracting.

**Design tokens:** `frontend/lib/animations.ts`: shared spring presets (`gentle`, `snappy`,
`bouncy`), duration constants (`micro`, `standard`, `emphasis`), and reusable motion variants
(`fadeUp`, `fadeIn`, `scaleIn`, `staggerContainer`).

**Shared components:** `frontend/components/motion/`
- `FadeIn`: scroll-triggered fade-in wrapper (`whileInView`, configurable direction/delay)
- `StaggerChildren`: staggered entrance for lists/grids
- `PageTransition`: route-level `AnimatePresence` + fade transition

**Accessibility:** Motion automatically respects `prefers-reduced-motion`. No additional
configuration needed.

---

## 1c. Extract SDK (`packages/extract-sdk/`)

Shared Python library containing the original extraction logic. Used by CamAudit-v2 and retained as
a reference during the Worker migration. The SDK is stateless: no DB access, no queue broker, no
object-storage uploads. It takes input and returns structured output.

The SDK is **schema-agnostic** via `FieldRegistry`. Lextract uses a 126-field registry, CamAudit-v2
uses a 33-field registry. Same extraction code, different schemas.

Core modules (OpenRouter client, prompt builder, pass orchestrator) implement a 3-pass adversarial
validation pipeline against Google Gemini 3 Flash. CamAudit-v2 shares the same SDK and benefits from
the identical 3-pass extraction.

**Directory structure:**

```text
packages/extract-sdk/
  src/extract_sdk/
    schema/             # FieldDefinition, FieldRegistry, lextract + camaudit schemas
      base.py           # FieldDefinition dataclass
      registry.py       # FieldRegistry: schema-agnostic field lookup + weights
      lextract_schema.py  # 126-field Lextract registry
    extraction/         # Gemini 3 Flash extraction pipeline (3-pass adversarial validation)
      openrouter_client.py # OpenRouter client (OpenAI-compatible API) with circuit breaker + per-pass model fallback chain
      pdf_loader.py        # Load PDF bytes, base64-encode for multimodal input
      prompt_builder.py    # Schema-driven prompt generation from FieldRegistry (per-pass templates)
      pass1_extraction.py  # Pass 1: primary 126-field extraction directly from PDF
      pass2_validation.py  # Pass 2: adversarial validation re-reading the PDF, emit sparse corrections patch
      pass3_escalation.py  # Pass 3: escalation on disputed critical fields (conditional)
      orchestrator.py      # Chains the 3 passes + writes per-pass audit trail
      response_parser.py   # Parse Gemini JSON response, strip <think>...</think> blocks
    confidence.py       # Gemini self-reported confidence merged with Pass 2/3 outcomes (registry-driven weights)
    red_flags.py        # 20-rule engine (RF-001 through RF-020)
    models.py           # Shared Pydantic models
    exceptions.py       # SDK exceptions
```

**Module summary:**

| Module | Purpose |
|--------|---------|
| `schema/` | `FieldDefinition` + `FieldRegistry`: schema-agnostic field definitions, weights, and lookup |
| `extraction/openrouter_client.py` | OpenRouter call wrapper (OpenAI-compatible) with circuit breaker, retries, and per-pass fallback model chain |
| `extraction/pass1_extraction.py` | Primary extraction: send PDF + schema to Gemini 3 Flash → 126-field JSON |
| `extraction/pass2_validation.py` | Adversarial review: re-read the PDF, find errors in Pass 1, emit corrections patch |
| `extraction/pass3_escalation.py` | Conditional dispute resolution on critical fields (`base_rent_annual`, `pro_rata_share`, `lease_term_months`) |
| `extraction/orchestrator.py` | Run all 3 passes, merge results, write per-pass audit trail |
| `confidence.py` | Merge Gemini self-reported confidence with Pass 2/3 outcomes → per-field scores with tier labels |
| `red_flags.py` | 20-rule engine (RF-001 through RF-020) + CamAudit trigger logic |
| `models.py` | Pydantic request/response models for all SDK functions |
| `exceptions.py` | SDK-specific exception hierarchy |

**Installation:**
- Lextract backend (local dev): `pip install -e packages/extract-sdk`
- CamAudit-v2 (git dependency):
  `extract-sdk @ git+https://github.com/user/lextract.git#subdirectory=packages/extract-sdk`

**Design principle:** All functions/classes are stateless. They accept inputs (PDF bytes, extracted
data, OpenRouter clients) and return structured outputs. The calling application (Lextract backend
or CamAudit-v2) owns DB persistence, task scheduling, and file management.

---

## 2. External Services Map

| Service | Role | Backend Env Var(s) | Frontend Env Var(s) |
|---------|------|--------------------|---------------------|
| **Neon** | PostgreSQL 15 + Neon Auth (Better Auth JWT/session backend) | `HYPERDRIVE` binding, `NEON_AUTH_BASE_URL` | `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` |
| **Cloudflare R2** | PDF storage + export file storage (zero egress) | `DOCUMENTS_BUCKET` binding | none |
| **OpenRouter** | 3-pass adversarial extraction pipeline (Pass 1/2/3 against Google Gemini 3 Flash + fallbacks) | `OPENROUTER_API_KEY` | none |
| **Cloudflare Hyperdrive** | Neon Postgres connection pooling for the API Worker | `HYPERDRIVE` binding | none |
| **Cloudflare Workflows** | Extraction and export background orchestration | `EXTRACTION_WORKFLOW`, `EXPORT_WORKFLOW` bindings | none |
| **Cloudflare Queues** | Async email and user-data cleanup dispatch | `EMAIL_QUEUE`, `CLEANUP_QUEUE` bindings | none |
| **Stripe** | Checkout sessions, webhook events | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Resend** | Transactional email (extraction complete, CAM upsell) | `RESEND_API_KEY` | none |
| **Sentry** | Error tracking (backend + frontend) | `SENTRY_DSN` | `NEXT_PUBLIC_SENTRY_DSN` |
| **PostHog** | Product analytics + funnel tracking | none | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |
| **Cloudflare D1 marketing Worker** | Lead capture, unsubscribe, and nurture persistence | `MARKETING_WORKER_URL`, `MARKETING_WORKER_SECRET` | `MARKETING_WORKER_URL`, `MARKETING_WORKER_SECRET` |

Frontend API clients require `NEXT_PUBLIC_API_URL=https://api.lextract.io/api/v1`. The `/api/v1`
prefix is part of the configured base URL; client code appends route paths such as `/extractions`.

R2 path convention:
- PDFs: `lextract-documents/{user_id}/{extraction_id}/original.pdf`
- Exports: `lextract-documents/{user_id}/{extraction_id}/exports/{format}.{ext}`
- Pre-signed URLs expire in 1 hour.

---

## 3. Data Model

### Tables

**`users`**: app profile linked to Neon Auth user ID
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Neon Auth user ID; no public FK |
| email | TEXT | |
| full_name | TEXT | |
| company | TEXT | |
| role | TEXT | tenant_rep, broker, attorney, landlord, investor, other |
| credits_balance | INTEGER | default 0 |
| stripe_customer_id | TEXT | |

**`anonymous_sessions`**: upload-first, signup-later flow
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| session_token | TEXT UNIQUE | sent in Authorization header for anon users |
| linked_user_id | UUID | FK → users(id), set after signup |
| expires_at | TIMESTAMPTZ | 72 hours from creation |

**`extractions`**: core table
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | FK → users(id), null for anon |
| anonymous_session_id | UUID | FK → anonymous_sessions(id) |
| status | extraction_status | see enum below |
| document_filename | TEXT | original file name |
| document_object_key | TEXT | Cloudflare R2 object key |
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

**`credit_transactions`**: immutable ledger
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK | |
| extraction_id | UUID FK | nullable (null for pack purchases) |
| payment_id | UUID FK | nullable (null for credit usage) |
| amount | INTEGER | positive = credit purchase, negative = usage |
| balance_after | INTEGER | denormalized for fast reads |
| description | TEXT | |
| uniqueness | partial index | `payment_id` unique for positive purchases |

**`stripe_webhook_events`**: idempotency guard
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | Stripe event ID |
| event_type | TEXT | |
| claimed_at | TIMESTAMPTZ | active processing lease timestamp |
| processed_at | TIMESTAMPTZ | nullable until processing succeeds |
| failed_at | TIMESTAMPTZ | set for permanent failures |
| failure_reason | TEXT | permanent failure detail |

**`extraction_edits`**: audit trail for user overrides
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
extraction_status: uploading | extracting | scoring | complete | failed
payment_status: unpaid | paid | refunded
payment_type: single | credit_pack_5 | credit_pack_10
```

### RLS Rules
- `users`: user reads/writes own row only
- `extractions`: user reads own rows; anonymous_session reads rows linked to its session_token;
  backend service key bypasses RLS
- `payments`, `credit_transactions`: user reads own rows; no client writes; backend only
- `stripe_webhook_events`: backend service key only; no client access
- `extraction_edits`: user reads/writes edits on their own extractions

---

## 4. API Surface

All routes prefixed `/api/v1/`. Auth via `Authorization: Bearer <neon_auth_jwt>` or
`X-Session-Token: <anon_token>`.

### Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/signup` | Email/password registration via Neon Auth |
| POST | `/auth/login` | Email/password login → JWT |
| POST | `/auth/anonymous` | Create anonymous session → session_token |
| POST | `/auth/link` | Link anonymous session to registered account |

### Extractions

| Method | Path | Description |
| --- | --- | --- |
| POST | `/extractions/upload` | Upload PDF → start pipeline → return extraction_id |
| GET | `/extractions` | List user's extractions (paginated, 20/page) |
| GET | `/extractions/{id}` | Full extraction record + status |
| GET | `/extractions/{id}/teaser` | Pre-payment: 5 visible fields + blurred summary |
| PATCH | `/extractions/{id}/fields` | Update field values → re-run red flags |
| GET | `/extractions/{id}/export/{format}` | `format`: docx \| pdf \| xlsx (`?template=commercial\|office\|industrial\|retail`) |
| GET | `/extractions/{id}/camaudit-payload` | Encrypted schema-driven CAM handoff payload |
| DELETE | `/extractions/{id}` | Delete extraction + object-storage objects |

### Payments

| Method | Path | Description |
| --- | --- | --- |
| POST | `/payments/checkout` | Create Stripe Checkout Session → return url |
| GET | `/payments/credits` | Current credit balance |
| GET | `/payments/history` | Paginated payment history |
| POST | `/payments/use-credit` | Apply 1 credit to unlock extraction |

### User

| Method | Path | Description |
| --- | --- | --- |
| GET | `/user/profile` | User profile |
| PATCH | `/user/profile` | Update full_name, company, role |
| GET | `/user/dashboard` | Stats: total extractions, credits balance, red flags found |

### Webhooks

| Method | Path | Description |
| --- | --- | --- |
| POST | `/webhooks/stripe` | Stripe signature-verified webhook handler |

---

## 5. Background Jobs

Production background work runs on Cloudflare-native primitives. There is no production queue broker
process, worker dyno, or scheduled beat process.

| Work | Primitive | Trigger | What It Does | On Failure |
|------|-----------|---------|--------------|------------|
| Extraction pipeline | `EXTRACTION_WORKFLOW` | `POST /extractions/upload` | Loads the PDF from R2, runs the 3-pass OpenRouter extraction, persists extracted data, scores confidence, detects red flags, marks completion, and enqueues email notifications. | Marks the extraction failed with a safe user-facing message. |
| Export generation | `EXPORT_WORKFLOW` | `GET /extractions/{id}/export/{format}` | Builds DOCX/PDF/XLSX exports from stored extraction data, writes export objects to R2, and records task status. | Marks the export task failed and returns failure through task status. |
| Transactional email | `EMAIL_QUEUE` | Workflow completion | Loads recipient/extraction data server-side, sends extraction complete, CAM flags, and anonymous notify emails through Resend. Queue messages carry IDs only. | Retries through Cloudflare Queues; email failures do not fail completed extractions. |
| User-data cleanup | `CLEANUP_QUEUE` | Account deletion workflow | Deletes soft-deleted user document, raw response, and export objects from R2. | Attempts every known key/prefix, reports aggregate failures, and retries the queue message. |

---

## 6. Deployment

### Frontend (Cloudflare Workers)
- Deploy from `frontend/` with OpenNext (`npm run build:cf`, then `npm run deploy:cf`)
- Domains: `lextract.io`, `www.lextract.io`
- Required env vars: `NEXT_PUBLIC_API_URL=https://api.lextract.io/api/v1`, `NEON_AUTH_BASE_URL`,
  `NEON_AUTH_COOKIE_SECRET`
- Marketing routes additionally require `MARKETING_WORKER_URL` and `MARKETING_WORKER_SECRET`

### Backend API (Cloudflare Worker)
- Deploy from `workers/api/` with Wrangler (`npm run check`, then `wrangler deploy`).
- Domain: `api.lextract.io`.
- Database: Neon Postgres through the `HYPERDRIVE` binding.
- Storage: R2 through the `DOCUMENTS_BUCKET` binding.
- Background extraction: `EXTRACTION_WORKFLOW`.
- Export generation: `EXPORT_WORKFLOW`.
- Async email and cleanup: `EMAIL_QUEUE` and `CLEANUP_QUEUE`.

### All Backend Environment Variables
```text
NEON_AUTH_BASE_URL
OPENROUTER_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
RESEND_FROM_ADDRESS
SENTRY_DSN
MARKETING_WORKER_URL
MARKETING_WORKER_SECRET
CAMAUDIT_SHARED_KEY
```

