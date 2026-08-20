# US-033: Error Tracking & Analytics

**Phase:** 2 — Independent Modules | **Depends on:** US-001, US-002 | **Blocks:** None
**Type:** Full-stack
**Estimated session size:** Small

## Description

Add Sentry for error tracking and PostHog for product analytics to both frontend and backend. Error tracking should be in place early so every subsequent story benefits from automatic error capture.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] Backend: Sentry SDK initialized in FastAPI middleware, captures unhandled exceptions
- [ ] Backend: Sentry includes user context (user_id) on authenticated requests
- [ ] Frontend: Sentry SDK initialized in root layout, captures client-side errors
- [ ] Frontend: PostHog provider in root layout for page view tracking
- [ ] PostHog: automatic page view events on route changes
- [ ] PostHog: `posthog.capture()` wrapper for custom events (placeholder for future use)
- [ ] Environment-aware: Sentry and PostHog disabled when `NODE_ENV=development` / `ENVIRONMENT=development`
- [ ] Sentry source maps configured for meaningful stack traces in production
- [ ] No performance impact in development (SDKs not loaded)

## Technical Details

### Files to Create/Modify

- Create: `backend/app/core/sentry.py` (Sentry init for FastAPI)
- Modify: `backend/app/main.py` (add Sentry middleware)
- Create: `frontend/lib/sentry.ts` (Sentry client init)
- Create: `frontend/lib/posthog.ts` (PostHog client init)
- Create: `frontend/components/providers/analytics-provider.tsx`
- Modify: `frontend/app/layout.tsx` (add AnalyticsProvider)
- Modify: `frontend/next.config.ts` (Sentry source maps config)
- Test: `backend/tests/test_sentry.py` (verify Sentry captures exceptions)
- Test: `frontend/__tests__/analytics/providers.test.tsx`

### Key Implementation Notes

- Backend Sentry: use `sentry-sdk[fastapi]` integration
- Frontend Sentry: use `@sentry/nextjs` with automatic instrumentation
- PostHog: use `posthog-js` with Next.js app router integration
- Env vars: `SENTRY_DSN` (backend), `NEXT_PUBLIC_SENTRY_DSN` (frontend), `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- Development check: `if (process.env.NODE_ENV === 'production')` before init

### Integration Points

- Every subsequent story automatically gets error tracking
- PostHog events can be added in any future story via the capture wrapper
- Sentry alerts will catch bugs introduced in later stories

## Verification

```bash
cd backend
pytest tests/test_sentry.py -v  # Sentry integration test passes
cd frontend
npm run build                    # Build passes with Sentry config
npm test                         # Analytics provider tests pass
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Observability" section: Sentry, PostHog configuration
- `docs/PRD.md` — Section 11.5: Monitoring requirements
