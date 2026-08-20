# US-002: Scaffold Backend

**Phase:** 1 — Foundation | **Depends on:** None | **Blocks:** US-004 through US-010, US-033
**Type:** Backend
**Estimated session size:** Medium

## Description

Initialize the FastAPI backend application with project structure, Pydantic v2 models for all 7 database tables, Celery configuration, environment variable management, and dependency injection framework. This is the base every backend story builds on.

## Required Skills

- `superpowers:test-driven-development` — write tests for Pydantic models and config validation

## Acceptance Criteria

- [ ] FastAPI app starts with `uvicorn app.main:app`
- [ ] Project structure matches ARCHITECTURE.md: `app/api/v1/`, `app/core/`, `app/models/`, `app/services/`, `app/tasks/`
- [ ] Pydantic v2 models defined for all 7 tables: `users`, `anonymous_sessions`, `extractions`, `payments`, `credit_transactions`, `stripe_webhook_events`, `extraction_edits`
- [ ] 3 enums defined: `ExtractionStatus`, `PaymentStatus`, `PaymentType`
- [ ] Celery app configured with Redis broker URL from env
- [ ] Config module loads all 12 environment variables from ARCHITECTURE.md
- [ ] Supabase client factory in dependencies module
- [ ] `get_current_user` dependency placeholder (returns mock user)
- [ ] Health check endpoint at `GET /health`
- [ ] CORS middleware placeholder (permissive for dev)
- [ ] `pytest` discovers and runs tests
- [ ] `requirements.txt` or `pyproject.toml` with all dependencies pinned

## Technical Details

### Files to Create/Modify

- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py` (FastAPI app, middleware, router includes)
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/config.py` (Settings class with all env vars)
- Create: `backend/app/core/dependencies.py` (Supabase client, get_current_user)
- Create: `backend/app/core/celery_app.py` (Celery instance + Redis config)
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/extraction.py` (Extraction, ExtractionStatus enum)
- Create: `backend/app/models/payment.py` (Payment, PaymentStatus, PaymentType enums)
- Create: `backend/app/models/user.py` (User, AnonymousSession)
- Create: `backend/app/models/credit.py` (CreditTransaction)
- Create: `backend/app/models/webhook.py` (StripeWebhookEvent)
- Create: `backend/app/models/edit.py` (ExtractionEdit)
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/v1/__init__.py`
- Create: `backend/app/api/v1/router.py` (main v1 router)
- Create: `backend/app/services/.gitkeep`
- Create: `backend/app/tasks/__init__.py`
- Create: `backend/pyproject.toml` or `requirements.txt`
- Create: `backend/pytest.ini` or config in pyproject.toml
- Test: `backend/tests/test_models.py`
- Test: `backend/tests/test_health.py`

### Key Implementation Notes

- **Pydantic v2 is mandatory** per CLAUDE.md — use `model_validator`, `field_validator`, `ConfigDict`
- **ExtractionStatus enum:** `uploading`, `extracting`, `scoring`, `complete`, `failed` *(the original `ocr_processing` value was removed in the Gemini/R2 migration — Gemini accepts the PDF natively, no separate OCR step exists)*
- **PaymentStatus enum:** `unpaid`, `paid`, `refunded`
- **PaymentType enum:** `single`, `credit_pack_5`, `credit_pack_10`
- Config env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `OPENROUTER_API_KEY`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`
- The `credit_transactions` model must document the immutability rule: rows are NEVER updated
- Celery beat schedule stays empty; scheduled DB work must not run without user or operator action

### Integration Points

- Every Phase 2 backend story (US-004 through US-010) imports models, config, and dependencies from here
- US-033 adds Sentry middleware to the FastAPI app created here
- The Pydantic models must match the database tables created in US-003a exactly

## Verification

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000  # Starts without error
curl http://localhost:8000/health                   # Returns {"status": "ok"}
pytest                                              # Tests pass
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Backend" section: directory structure, env vars, services
- `docs/PRD.md` — Section 11.2: Data model, enums, table definitions
