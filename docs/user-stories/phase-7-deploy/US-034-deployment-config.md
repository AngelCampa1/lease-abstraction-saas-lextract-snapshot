# US-034: Deployment Configuration

**Phase:** 7 — Deploy & Polish | **Depends on:** All prior stories | **Blocks:** None
**Type:** Infrastructure
**Estimated session size:** Medium

## Description

Configure production deployment for both frontend (Vercel) and backend (Railway). Includes CI/CD via GitHub Actions, environment variable management, Docker configuration, and domain setup.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] **Vercel:** `vercel.json` configured with build settings, environment variables, domain (`lextract.io`)
- [ ] **Railway:** Dockerfile for backend with multi-stage build (slim Python image)
- [ ] **Railway:** 2 service configurations: `web` (uvicorn), `worker` (celery -A app.core.celery_app worker); no `beat` service
- [ ] **Railway:** Redis addon configured as Celery broker
- [ ] **GitHub Actions:** CI pipeline — lint (frontend + backend), test (frontend + backend), type check
- [ ] **GitHub Actions:** CD pipeline — deploy to Vercel (frontend) and Railway (backend) on push to `main`
- [ ] Environment variables documented and configured for all services
- [ ] Health check endpoints available for manual operator checks, with automated platform healthchecks disabled
- [ ] CORS configured for production domain (`lextract.io` → `api.lextract.io`)
- [ ] SSL/TLS configured via platform defaults (Vercel and Railway handle this)

## Technical Details

### Files to Create/Modify

- Create: `frontend/vercel.json`
- Create: `backend/Dockerfile`
- Create: `backend/docker-compose.yml` (local development)
- Create: `backend/.railway/` or `railway.toml` (Railway config)
- Create: `.github/workflows/ci.yml` (lint + test)
- Create: `.github/workflows/deploy.yml` (deploy on push to main)
- Create: `backend/Procfile` or equivalent for Railway services
- Create: `.env.example` (all env vars documented, no actual secrets)
- Test: CI pipeline runs successfully on a test push

### Key Implementation Notes

- **Dockerfile:** Multi-stage build — builder stage installs deps, runner stage copies only needed files
- Base image: `python:3.12-slim`
- Install system deps: WeasyPrint needs `libpango`, `libcairo` for PDF generation
- **Railway services:** Each service runs a different command from the same Docker image:
  - web: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - worker: `celery -A app.core.celery_app worker --loglevel=info --concurrency=4`
- Do not deploy Celery beat. Scheduled database work wakes Neon compute when no user is active.
- **GitHub Actions CI:** Run `npm run lint && npm run build && npm test` (frontend) and `ruff check && pytest` (backend)
- **Environment variables** (12 backend + 4 frontend):
  - Backend: SUPABASE_URL, SUPABASE_SERVICE_KEY, R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, OPENROUTER_API_KEY, REDIS_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, SENTRY_DSN
  - Frontend: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST

### Integration Points

- All stories must be complete before production deployment
- Frontend calls backend at `https://api.lextract.io/api/v1/`
- Stripe webhook URL: `https://api.lextract.io/api/v1/webhooks/stripe`

## Verification

```bash
# Local verification
docker build -t lextract-backend backend/
docker-compose up  # All services start

# CI verification
# Push to a test branch → GitHub Actions runs → lint + test pass

# Production verification
curl https://api.lextract.io/health  # Returns {"status": "ok"}
curl https://lextract.io             # Returns landing page HTML
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Deployment" section: Vercel, Railway, service configuration
- `docs/PRD.md` — Section 11.5: Deployment requirements
