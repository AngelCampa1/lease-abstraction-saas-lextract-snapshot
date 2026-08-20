# Cycle 1 — Synthesized Findings

Triaged from 6 parallel domain audits. Filtered out nitpicks, speculative concerns, and findings the auditors themselves marked "verified correct". Grouped by fix-agent ownership for parallel execution.

## Fix Group A — Auth security & UX hardening

1. **Open-redirect vulnerability**: `frontend/components/auth/signup-form.tsx:147` and `login-form.tsx:180` — `returnToParam.startsWith('/') && !returnToParam.startsWith('//')` is correct prefix check, but verify it's applied uniformly. Audit claimed `//evil.com` is allowed; reality is the negation prevents it. **VERIFY first** — if check is missing the `!//`, add it.
2. **Anonymous→user link extraction transfer race**: `backend/app/api/v1/auth.py:225-263` — the CAS on `linked_user_id` is correct, but the subsequent extraction transfer is non-atomic. Make the extraction transfer scoped to `.eq("anonymous_session_id", session_id).is_("user_id", "null")` so a concurrent winner doesn't re-transfer.
3. **Token endpoint exposure**: `frontend/lib/neon-auth/server.ts:244-253` `/api/auth/token` echoes the session token in JSON body. This is a real concern for XSS exfil. Either remove the endpoint or restrict to same-origin SSR-only contexts and verify nothing in client code reads it from response body.
4. **CSRF `Sec-Fetch-Site` fallback**: `frontend/lib/neon-auth/server.ts:156-203` — add Origin header check as a secondary gate so the CSRF guard doesn't fall through when `Sec-Fetch-Site` is missing but cookies are present.
5. **Session-validation error messages indistinguishable**: `backend/app/core/security.py:172-187` — differentiate "outage" vs "invalid token" so the frontend can show a useful error instead of silently bouncing to login.

## Fix Group B — Upload/Pipeline hardening

1. **Page-count guard at upload time**: `backend/app/api/v1/extractions.py` upload endpoint — reject PDFs over `MAX_PAGES` (set 500) before queuing extraction to avoid running expensive Gemini passes on a 10k-page document.
2. **Stuck-job recovery beat task**: add to `backend/app/tasks/` — sweep extractions stuck in `extracting`/`scoring` for >1h and mark them `failed` with a message so the UI shows error+retry.
3. **Failed-state retry UI**: `frontend/app/(app)/processing/[id]/` — if extraction is `failed`, show a Retry button that re-dispatches the pipeline (new endpoint `POST /extractions/{id}/retry`).
4. **Delete-extraction R2 cleanup ordering**: `backend/app/api/v1/extractions.py:743` `_delete_extraction_objects` runs before soft-delete — wrap in idempotency check on `deleted_at` so concurrent deletes don't double-cleanup.
5. **Upload XHR timeout**: `frontend/lib/api-upload.ts` — set a 5-minute hard timeout and surface a clear timeout message.

## Fix Group C — Results / Payment / Export wiring

1. **Stale export cache on field edit**: `backend/app/api/v1/extractions.py` export cache key — include `extractions.updated_at` (or a hash of edited_data) so edits invalidate the cache.
2. **Credit balance cache invalidation**: `frontend/hooks/use-credits.ts` + payment success handler + use-credit mutation — explicitly invalidate `useCredits` on those events instead of waiting 30s.
3. **Guest checkout ownership invariant**: `backend/app/api/v1/webhooks.py:306-331` — when associating extraction with a user_id, also set `anonymous_session_id = NULL` so an extraction has exactly one owner.
4. **PDF viewer 404 / missing-object UX**: `frontend/components/pdf-viewer/*` — when `documentUrlData?.url` is null, show "PDF unavailable" message instead of rendering nothing.
5. **PaymentCta return URL absolute origin**: build success/cancel URLs from a shared `SITE_URL` env, not `window.location.origin` (which can be wrong if redirected through a different subdomain).

## Fix Group D — Dashboard / Profile / Payment History

1. **Payment history page**: backend has `GET /payments/history` but no frontend UI — add `frontend/app/(app)/billing/page.tsx` listing payments and credit transactions.
2. **`/results/sample` empty-state link target**: `frontend/components/dashboard/empty-state.tsx:41` — verify a sample extraction exists at that route; if it's a marketing sample, link to `/sample-report` instead.
3. **Profile-form double-submit guard**: `frontend/components/profile/profile-form.tsx` — disable inputs (not just button) while submitting; await `signOut()` in the delete-account handler.
4. **GDPR / account deletion**: replace mailto fallback with a real `DELETE /user` endpoint that soft-deletes user + extractions + R2 cleanup, then signs out.

## Fix Group E — Marketing / SEO polish

1. **Stale sitemap dates**: `frontend/app/sitemap.ts` and `[competitor]`/`[state]` route metadata — derive last-modified from MDX frontmatter, not a hard-coded constant.
2. **Marketing 404 page**: add `frontend/app/(marketing)/not-found.tsx` matching marketing layout.
3. **Lead-magnet file integrity check**: build-time validation that every slug in `LEAD_MAGNET_SLUGS` has a non-zero-byte file at `public/lead-magnets/`.
4. **Untracked PNGs at repo root** (`glossary-360.png`, `prophia-comparison-360.png`): grep for references; if used, move to `frontend/public/`; if unused, delete.
5. **MDX frontmatter schema validation** at build time via Zod so missing required fields fail the build instead of rendering broken pages.

## Fix Group F — Field editing / SDK / Coverage

1. **Field-edit audit trail not transactional**: `backend/app/services/field_editor.py:200-210` — if audit insert fails after the data update succeeds, the edit is silently unlogged. Insert audit row first (or use a single transaction); on insert failure, return 500 and don't return success.
2. **Per-field type validation on PATCH /fields**: validate the incoming `value` against the schema's field type (string/number/date/boolean) and bounds before writing. Reject mismatched types with 422.
3. **Re-compute confidence on field edit**: `backend/app/services/field_editor.py` — after a field is edited, re-run cross-field confidence validations (date ordering, pro-rata sums) and store updated `confidence_scores`.
4. **Field-edit input debounce**: `frontend/hooks/use-field-edit.ts` — debounce 500ms before firing PATCH so rapid typing doesn't spam the backend.
5. **CamAudit Fernet key validation at startup**: `backend/app/services/camaudit.py:51-54` — validate the key in `__init__` and raise at boot, not at first request.
6. **Coverage**: `confidence.py` is only ~19% covered per audit — add a focused test suite hitting cross-field validators (date order, pro-rata sum, lease term).

## Items dropped (verified false/nitpick after spot-check)

- Login schema `.min(1)` "brute-force" finding — login is for already-set passwords; backend enforces strength on signup.
- `frontend/lib/api-upload.ts:115` hardcoded URL — already uses configured base URL.
- Multiple "type mismatch" findings where the frontend interface is intentionally a subset of the backend response.
- Most "missing aria-label" nits on already-labeled containers.
- "PDF viewer CSP" — already addressed in prior fix rounds per commit history.
