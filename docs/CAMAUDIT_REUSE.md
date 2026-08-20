# CamAudit-v2 Reuse Reference

Maps upcoming Lextract stories to specific CamAudit-v2 source files for porting. Source repo: `<camaudit-v2-repo>`.

> **Shared SDK:** Extraction logic (Gemini 3 Flash via OpenRouter, 3-pass adversarial validation, confidence, red flags) now lives in `packages/extract-sdk/` instead of `backend/app/services/`. CamAudit-v2 can install the SDK via git dependency (`extract-sdk @ git+https://github.com/user/lextract.git#subdirectory=packages/extract-sdk`) instead of copying these modules. CamAudit-v2 also migrated from Textract+Claude to Gemini 3 Flash via OpenRouter — the shared SDK is the single source of truth for both products' extraction pipelines.

## Already Ported (Infrastructure)

| Lextract File | CamAudit-v2 Source | Adaptations |
|---|---|---|
| `backend/app/core/exceptions.py` | `core/exceptions.py` | Dropped `DemandLetterError`, `ApolloError`, `ExpiredShareTokenError`. Added `ResendError`. |
| `backend/app/schemas/errors.py` | `schemas/errors.py` | Copied verbatim (domain-neutral). |
| `backend/app/core/log_scrubber.py` | `core/log_scrubber.py` | Copied verbatim. |
| `backend/app/core/logging.py` | `core/logging.py` | Updated import path to `app.core.log_scrubber`. |
| `backend/app/core/rate_limiting.py` | `core/rate_limiting.py` | Updated import to `app.core.config`. |
| `backend/app/core/middleware.py` | `core/middleware.py` | Updated imports; added `/health/ready` to exempt paths. |
| `backend/app/database/client.py` | `database/client.py` | Uses `supabase_service_key` (not `supabase_service_role_key`). |

## US-004: Backend Auth & Security

| CamAudit-v2 File | Reuse For | Adaptations |
|---|---|---|
| `core/security.py` | JWT validation, `get_current_user` dependency | Replace Supabase public key fetch if needed; adapt user model shape |
| `api/v1/auth.py` | Auth routes (login, signup, refresh, logout) | Rename audit-specific references |
| `core/middleware.py` (already ported) | CORS, security headers, rate limiting | Already done |

## US-005: PDF Upload & R2 Storage

| CamAudit-v2 File | Reuse For | Adaptations |
|---|---|---|
| `services/storage/r2_client.py` | R2 upload/download, presigned URLs (Cloudflare client) | Change bucket name to `lextract-documents`; reuse the R2 endpoint config helper |
| `api/v1/upload.py` | Upload endpoint structure | Simplify (camaudit version is 300+ lines); extract into service class |
| `services/storage/validation.py` | File validation (size, MIME type) | Adjust max size (leases are larger than audit docs) |

## US-006b: Gemini PDF Extraction (replaces former Textract pipeline)

| CamAudit-v2 File | Reuse For | Target Location | Adaptations |
|---|---|---|---|
| `services/extraction/openrouter_client.py` | OpenRouter (OpenAI-compatible) call wrapper with circuit breaker, retries, fallback model chain | `packages/extract-sdk/src/extract_sdk/extraction/openrouter_client.py` | Decouple from camaudit settings; accept explicit API key + base URL in constructor |
| `services/extraction/openrouter_client.extract_pdf` | Multimodal PDF call to Gemini 3 Flash with native PDF input | `packages/extract-sdk/src/extract_sdk/extraction/pass1_extraction.py` | Wire into Pass 1 of the 3-pass orchestrator; preserve PDF base64 encoding helper |
| `services/extraction/pdf_loader.py` | Load PDF bytes, base64-encode for multimodal payload | `packages/extract-sdk/src/extract_sdk/extraction/pdf_loader.py` | Copy verbatim; works with any R2-backed source |
| `tasks/extraction.py` | Celery task orchestration for the 3-pass run | `backend/app/tasks/extraction.py` | Replace OCR-then-extract two-step with single `run_gemini_extraction_task` that calls the SDK orchestrator |

## US-007: Gemini 3-Pass Extraction Pipeline

| CamAudit-v2 File | Reuse For | Target Location | Adaptations |
|---|---|---|---|
| `services/extraction/lease_prompts.py` | Per-pass prompt templates (extract / validate / escalate) | `packages/extract-sdk/src/extract_sdk/extraction/prompt_builder.py` | Generalize with `ExtractionPromptBuilder(registry)` — auto-generate prompts from any FieldRegistry; accept `pass_role` parameter |
| `services/extraction/pass2_validation.py` | Adversarial validation pass — re-read PDF as hostile reviewer, emit corrections patch | `packages/extract-sdk/src/extract_sdk/extraction/pass2_validation.py` | Copy structure; make critical-field set pluggable per schema |
| `services/extraction/pass3_escalation.py` | Escalation pass — resolve disputes between Pass 1 and Pass 2 on critical fields | `packages/extract-sdk/src/extract_sdk/extraction/pass3_escalation.py` | Copy structure; lextract critical fields = `base_rent_annual`, `pro_rata_share`, `lease_term_months` |
| `services/extraction/orchestrator.py` | 3-pass chain + audit trail writes | `packages/extract-sdk/src/extract_sdk/extraction/orchestrator.py` | Decouple DB write from SDK; return `ExtractionPassRecord[]` so the calling Celery task persists the audit trail |
| `services/extraction/confidence.py` | Confidence scoring logic | `packages/extract-sdk/src/extract_sdk/confidence.py` | Use `FieldRegistry.get_field_weights()` for registry-driven weighted average; merge Gemini self-reported confidence with Pass 2/3 outcomes |
| `services/extraction/response_parser.py` | JSON parsing from Gemini response, strip `<think>` blocks | `packages/extract-sdk/src/extract_sdk/extraction/response_parser.py` | Adapt to Lextract field schema |

## US-008: Red Flag Detection

| CamAudit-v2 File | Reuse For | Target Location | Adaptations |
|---|---|---|---|
| N/A | CamAudit has no equivalent | `packages/extract-sdk/src/extract_sdk/red_flags.py` | Build from scratch using lease-specific rules |

## US-009: Export (PDF/Excel/JSON)

| CamAudit-v2 File | Reuse For | Adaptations |
|---|---|---|
| `services/export/pdf_generator.py` | PDF report generation pattern | Replace audit report layout with lease abstraction layout |
| `services/export/excel_generator.py` | Excel export pattern | Adapt columns to 126-field lease schema |

## US-010: Credit System & Billing

| CamAudit-v2 File | Reuse For | Adaptations |
|---|---|---|
| `services/billing/volume_pricing.py` | Credit ledger logic, balance computation | **Fix TOCTOU race** (use atomic RPC instead of SELECT+INSERT) |
| `services/billing/checkout.py` | Stripe Checkout session creation | Adapt pricing tiers ($15/lease vs audit pricing) |
| `api/v1/webhooks.py` | Stripe webhook handler | **Fix event deletion on failure** (use `failed_at` timestamp) |

## US-011: Stripe Integration

| CamAudit-v2 File | Reuse For | Adaptations |
|---|---|---|
| `services/billing/stripe_client.py` | Stripe API wrapper | Copy; add Lextract-specific product/price IDs |
| `api/v1/checkout.py` | Checkout flow | Adapt to credit-pack pricing |

## US-012: Email Notifications (Resend)

| CamAudit-v2 File | Reuse For | Adaptations |
|---|---|---|
| `services/email/client.py` | Resend API wrapper | Copy verbatim |
| `services/email/triggers.py` | Event-driven email dispatch | **Fix hardcoded URLs** — use `settings.frontend_url` |
| `services/email/templates/` | Email template structure | Replace audit-specific copy with lease-specific copy |

## US-013: Dashboard & Lease List

| CamAudit-v2 File | Reuse For | Adaptations |
|---|---|---|
| `api/v1/audits.py` | List/detail/delete endpoints pattern | Rename to leases; adapt query filters |
| `frontend/src/app/(app)/dashboard/` | Dashboard page structure | Replace audit cards with lease cards |

## US-014: Manual Edit & Override

| CamAudit-v2 File | Reuse For | Adaptations |
|---|---|---|
| N/A | CamAudit has no field-level edit | Build from scratch with edit history tracking |

## US-015a: Landing Page & Marketing

| CamAudit-v2 File | Reuse For | Adaptations |
|---|---|---|
| `frontend/src/app/(marketing)/` | Marketing page layout, nav, footer | Replace brand, copy, and imagery |
| `frontend/src/components/ui/` | Shadcn component library setup | Copy component configs; Lextract uses same stack |

