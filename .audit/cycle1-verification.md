# Cycle 1 — Verification of audit findings against main (f424476)

The 6 lite-audit agents produced many **false-positive "missing feature"** findings. Independent verification on main shows the prior 30+ bug-fix rounds already implemented almost everything. Verified existing-on-main:

| Audit claim | Reality on main |
|---|---|
| No password reset UI | EXISTS: `(auth)/forgot-password`, `(auth)/reset-password` + tests |
| No payment-history page | EXISTS: `(app)/billing/page.tsx` + test, linked in user-menu |
| No marketing 404 | EXISTS: `(marketing)/not-found.tsx` |
| No lead-magnet integrity check | EXISTS: `scripts/check-lead-magnets.mjs` wired into `prebuild` |
| No page-count upload guard | EXISTS: `MAX_PDF_PAGES` check, extractions.py:968 |
| No delete idempotency | EXISTS: `deleted_at` guard, extractions.py:878 |
| No stuck-job recovery | EXISTS: `cleanup_stuck_extractions`, pipeline.py:247 |
| No retry endpoint | EXISTS: `POST /{id}/retry`, extractions.py:628 + frontend wiring |
| No per-field type validation | EXISTS: `_coerce_field_value`, field_editor.py:79 |
| No upload timeout | EXISTS: `UPLOAD_TIMEOUT_MS`/`UploadTimeoutError`, api-upload.ts |
| Credit cache not invalidated | EXISTS: `useInvalidateCredits()`, use-credits.ts |
| PDF viewer no missing-object state | EXISTS: `PdfUnavailable`, results/pdf-viewer.tsx |
| Anon→user transfer not atomic | EXISTS: CAS + `.eq(anonymous_session_id)` filter, auth.py:227-258 |
| CamAudit key not validated | Partially: `Fernet(key_bytes)` in `__init__` raises on bad key (camaudit.py:53) |
| Session-validation errors not differentiated | Partially: transport_error branch, security.py:172 |

## GENUINELY-REAL defects confirmed

1. **Export cache key omits `updated_at`** → 2 FAILING tests (`test_export_cache_invalidation.py`). Stale export served after a field edit. → backend-extraction agent.
2. **`DELETE /api/v1/user` endpoint MISSING** while frontend account-deletion modal calls `apiDelete('/user')` → 404/405 today. Real broken wiring. → backend-auth agent.
3. **Possible**: guest-checkout ownership invariant — verify webhooks.py sets `anonymous_session_id = NULL` when assigning `user_id` (inconclusive from grep). → backend-auth agent.
4. **Minor**: CamAudit raises raw Fernet error vs. a friendly ValueError; session-validation could map to 503. Low value.

## Frontend worktree (ab796d8b568083720)
**Empty** — agent reported deletions/`.gitignore` work that does NOT exist in the worktree (hallucinated). Nothing to merge. Will drop it. The 2 untracked root PNGs (`glossary-360.png`, `prophia-comparison-360.png`) on main are cosmetic; handle directly.

## E2E gap (for cycle 2)
No Playwright/browser E2E exists. Coverage today: 162 frontend Vitest integration tests + 1320 backend pytest. True browser E2E against the full stack needs external creds (Neon/R2/Redis/OpenRouter/Stripe). Assess feasibility; otherwise treat the integration suites as the system-test layer and add a minimal Playwright smoke harness for the unauthenticated marketing + auth happy-path.

## Conclusion
System is far more complete than the audit implied. Remaining real work is small: fix #1 and #2 (in flight), verify #3, then a clean full-suite run. The "nothing left to fix" bar is close.
