# Production Authenticated E2E Follow-Up - 2026-05-06

## Scope

Target: `https://lextract.io` and `https://api.lextract.io/api/v1`

Dedicated E2E account:
- Identifier and credentials: ignored local file `<repo-root>\.env.e2e.local`

## Environment Setup

- Pulled latest `master` before work.
- Created worktree: `.worktrees/fix/prod-auth-e2e-followup`
- Created ignored E2E credentials file.
- Added non-secret credential-location note to `CLAUDE.md`.

## Credit Seed Status

Complete.

- Seeded exactly one production E2E credit for the dedicated E2E user.
- Path used: backend `CreditService.add_credits()` with service-role database connection from ignored local frontend env.
- Ledger evidence: `/payments/credits` returned balance `1` and transaction description `Production E2E test credit 2026-05-06`.
- The immutable credit ledger was append-only; no `credit_transactions` rows were updated.

## Findings

### P0 - Authenticated Backend API Rejects Logged-In Production Users

Status: Fixed and verified in production.

Environment:
- Production frontend: `https://lextract.io`
- Production backend: `https://api.lextract.io/api/v1`
- Browser: `playwright-cli`
- Account: dedicated production E2E account; credentials were rotated after the initial browser run.

Steps:
1. Open `https://lextract.io/login`.
2. Sign in with the dedicated E2E account.
3. Observe redirect to `/dashboard`.
4. Observe dashboard cards and credit balance loading.

Expected:
- Dashboard data loads.
- `/payments/credits` and `/user/dashboard` return authenticated `200` responses.

Actual:
- Dashboard shows `Failed to load dashboard data.`
- Header shows `0 credits`.
- Console/network evidence:
  - `GET https://lextract.io/api/auth/token => 200`
  - `GET https://api.lextract.io/api/v1/payments/credits => 401`
  - `GET https://api.lextract.io/api/v1/user/dashboard => 401`
  - API detail from direct reproduction: `Invalid token format`

Root Cause:
- The frontend auth proxy correctly validates sessions through `${NEON_AUTH_BASE_URL}/get-session`.
- The backend opaque-token fallback called `${NEON_AUTH_BASE_URL}/api/auth/get-session`.
- Production `NEON_AUTH_BASE_URL` already includes the Better Auth route root (`/neondb/auth`), so the backend called a non-existent/wrong session URL and then returned the original JWT decode failure.

Fix:
- `backend/app/core/security.py`: use `${NEON_AUTH_BASE_URL}/get-session` for opaque session validation.
- `backend/tests/test_security.py`: added regression coverage for the configured Better Auth session URL and session/JWT error branches.
- Follow-up frontend/backend hardening:
  - `frontend/lib/neon-auth/server.ts`: `/api/auth/token` now returns the signed `__Secure-neon-auth.session_token` cookie value after upstream session validation, not the raw Better Auth DB session token.
  - `backend/app/core/security.py`: opaque session validation now falls back across configured Neon Auth, JWKS-derived Neon Auth, and frontend auth proxy session endpoints.

Local Verification:
- RED: `python -m pytest backend/tests/test_security.py -q` failed on URL mismatch.
- GREEN: `cd backend && python -m pytest tests/test_dependencies.py tests/test_security.py -q -o addopts="" --cov=app.core.security --cov-report=term-missing --cov-fail-under=95`
- Result: `26 passed`, `app.core.security.py` coverage `99%`.

Production Verification:
- `POST https://lextract.io/api/auth/sign-in/email => 200`
- `GET https://lextract.io/api/auth/token => 200`, returned signed cookie-sized token
- `GET https://api.lextract.io/api/v1/user/profile => 200`
- `GET https://api.lextract.io/api/v1/user/dashboard => 200`
- `GET https://api.lextract.io/api/v1/payments/credits => 200`

### P0 - Retried Extraction Fails On Idempotent Status Transition

Status: Fixed and production-verified past the original failure.

Environment:
- Production backend: `https://api.lextract.io/api/v1`
- Account: dedicated production E2E account
- Extraction ID: `addaaebc-a2dd-4dfe-b4e9-a8ab6cafef32`
- Fixture: `backend/tests/fixtures/real_lease_georgia_gov.pdf`

Steps:
1. Log in as the E2E user.
2. Upload a real PDF through `POST /extractions/upload`.
3. Poll `GET /extractions/{id}/teaser`.

Expected:
- Extraction may retry internally, but processing remains valid and eventually reaches `scoring` / `complete` or a real extraction error.

Actual:
- Extraction reached `failed`.
- Error message: `Invalid status transition from 'extracting' to 'extracting'`.

Root Cause:
- Celery retries can re-enter the extraction task after the first attempt already persisted `status='extracting'`.
- `update_extraction_status()` treated same-status calls as invalid instead of idempotent.

Fix:
- `backend/app/core/status.py`: same-status transitions now return as no-op before validation and before update.
- `backend/tests/test_status.py`: regression test for `extracting -> extracting` idempotency with no DB update.

Local Verification:
- RED: `cd backend && python -m pytest tests/test_status.py -q --no-cov` failed on same-status transition.
- GREEN: `cd backend && python -m pytest tests/test_status.py tests/test_extraction_task.py -q --no-cov`
- Result: `38 passed`.

Production Verification:
- Uploaded `backend/tests/fixtures/real_lease_georgia_gov.pdf` again after deploy.
- Extraction IDs `8a8f3358-9c16-4298-af01-cd090ac170d1` and `bc4d902c-6d42-4e24-8087-26ceb7cdf06f` no longer failed with `Invalid status transition from 'extracting' to 'extracting'`.
- Both proceeded through processing and reached a deeper generic worker failure.

### P0 - Real PDF Worker Fails With Generic Extraction Error

Status: Fixed and verified in production.

Environment:
- Production backend: `https://api.lextract.io/api/v1`
- Account: dedicated production E2E account
- Extraction ID: `bc4d902c-6d42-4e24-8087-26ceb7cdf06f`
- Fixture: `backend/tests/fixtures/real_lease_georgia_gov.pdf`

Steps:
1. Log in as the E2E user.
2. Upload a valid commercial lease PDF.
3. Poll `GET /extractions/{id}/teaser`.

Expected:
- Extraction reaches `complete` with visible teaser data and can be unlocked with the seeded test credit.

Actual:
- Extraction reaches `failed`.
- User-facing error: `We were unable to extract data from your document. Please try uploading again.`
- DB row has no `document_page_count`, no `stage_summary`, no `pass_records`, and no extraction token/cost data.

Evidence Gathered:
- Auth and upload succeeded in production.
- `_fetch_document_reference()` was verified locally against production DB for the failed extraction and returned the stored object key and filename.
- Railway CLI is not authenticated in this environment, so worker logs are not accessible here yet.

Next Diagnostic Need:
- None for this root cause.

Root Cause:
- Production database was missing migration `backend/neon/migrations/00010_extraction_pipeline_events.sql`.
- The current worker writes `stage_summary`, `raw_extraction_object_keys`, and `extraction_cost_cents` while persisting extraction output.
- Those columns and the `extraction_pipeline_events` table did not exist in production, so a successful extraction could fail at persistence and then be marked failed with a generic user-facing message.

Fix:
- Applied existing production migration `00010_extraction_pipeline_events.sql` to Neon.

Production Verification:
- Verified production schema now includes:
  - `extractions.stage_summary`
  - `extractions.raw_extraction_object_keys`
  - `extractions.extraction_cost_cents`
  - `public.extraction_pipeline_events`
- Uploaded `real_lease_georgia_gov_after_migration.pdf`.
- Extraction ID `cc14ab4a-ce60-40f3-87fe-92d7025cb33a` reached `complete` after 8 polls.
- Completed row evidence:
  - `document_page_count`: `12`
  - extracted field count: `123`
  - red flag count: `6`
  - pass records: `3`
  - stage summary present: `true`
  - raw artifact keys: `3`
  - extraction cost: `4` cents
  - pipeline events: `pass1_extraction:succeeded`, `pass2_validation:succeeded`, `pass3_escalation:succeeded`

### P1 - Post-Delete Extraction Access Returns 503 Instead Of 404

Status: Fixed and verified in production.

Environment:
- Production backend: `https://api.lextract.io/api/v1`
- Account: dedicated production E2E account
- Extraction ID: `cd0136bd-15a9-4c34-abbb-d5d4d1d96565`

Steps:
1. Upload a malformed PDF named `bad.pdf`.
2. Wait for it to fail cleanly.
3. Delete it with `DELETE /extractions/{id}`.
4. Request `GET /extractions/{id}/teaser`.

Expected:
- Direct post-delete access returns `404 Extraction not found`.

Actual:
- `DELETE /extractions/{id}` returned `204`.
- The extraction disappeared from list and dashboard.
- Direct `GET /extractions/{id}/teaser` returned `503 Service temporarily unavailable`.

Root Cause:
- Production uses the direct Postgres client.
- `_fetch_extraction()` filters `deleted_at IS NULL` and calls `.single()`.
- When no row remains after filtering, the direct client raises `PostgrestSingleError("Row not found")`.
- `_fetch_extraction()` only mapped PostgREST string errors to `404`, so this local client error fell through to the `503` infrastructure-error branch.

Fix:
- `backend/app/api/v1/extractions.py`: classify `PostgrestSingleError` as not found.
- `backend/tests/test_results_endpoints.py`: added endpoint regression coverage for the direct Postgres `.single()` no-row error.

Local Verification:
- RED: `cd backend && python -m pytest tests/test_results_endpoints.py -q --no-cov -k "filtered_deleted_row_returns_404"` failed with `503 != 404`.
- GREEN: `cd backend && python -m pytest tests/test_results_endpoints.py -q --no-cov`
- Result: `68 passed, 3 skipped`.
- `python -m ruff check app/api/v1/extractions.py tests/test_results_endpoints.py`
- `python -m black --check app/api/v1/extractions.py tests/test_results_endpoints.py`
- `python -m mypy app/api/v1/extractions.py`

Production Verification:
- Pushed `master` through `9e83c9e`; backend deploy picked up merge `81511ab`.
- Re-polled `GET /extractions/cd0136bd-15a9-4c34-abbb-d5d4d1d96565/teaser`.
- Before deploy propagation: attempts 1-2 returned `503`.
- After deploy propagation: attempt 3 returned `404 Extraction not found`.

### Security Note - E2E Credential Rotation

Status: Complete.

- During browser CLI testing, the previous ignored E2E password was echoed by `playwright-cli` command output.
- The dedicated E2E account password was immediately rotated through `/api/auth/change-password`.
- Verified the old password now returns `401` and the new ignored local password signs in successfully.

### P1 - Edit History Fails On Native Postgres Values

Status: Fixed and verified in production.

Environment:
- Production backend: `https://api.lextract.io/api/v1`
- Account: dedicated production E2E account
- Extraction ID: `cc14ab4a-ce60-40f3-87fe-92d7025cb33a`

Steps:
1. Unlock a completed extraction using the seeded E2E credit.
2. Edit field `audit_rights`.
3. Request `GET /extractions/{id}/edits`.

Expected:
- Edit history returns `200` with the saved edit.

Actual:
- Field edit returned `200`.
- Edit history returned `500`.

Root Cause:
- Direct Postgres returns JSONB edit values as native Python values, for example `False`, not JSON-encoded strings.
- `_safe_json_loads()` assumed strings and, after `json.loads(False)` raised `TypeError`, attempted `raw[:100]`, causing another `TypeError`.
- After fixing JSONB parsing, the endpoint still failed response validation because direct Postgres returns `UUID` and `datetime` objects for `id`, `edited_by`, and `edited_at`, while `EditHistoryItem` expects strings.

Fix:
- `backend/app/services/field_editor.py`: return non-string JSONB values unchanged; continue parsing legacy JSON strings.
- `backend/app/services/field_editor.py`: normalize edit history `id`, `edited_by`, and `edited_at` to response-model-safe strings.
- `backend/tests/test_field_editing.py`: added direct `get_edit_history()` regression coverage for native JSONB values and native UUID/datetime scalars.

Local Verification:
- RED: `cd backend && python -m pytest tests/test_field_editing.py -q --no-cov -k "safe_json_loads_returns_native_jsonb_values"` failed with `TypeError: 'bool' object is not subscriptable`.
- GREEN: `cd backend && python -m pytest tests/test_field_editing.py --cov=app.services.field_editor --cov-report=term-missing --cov-fail-under=95 -q -o addopts=""`
- Result: `25 passed`, `app.services.field_editor` coverage `99%`.
- `python -m ruff check app/services/field_editor.py tests/test_field_editing.py`
- `python -m black --check app/services/field_editor.py tests/test_field_editing.py`
- `python -m mypy app/services/field_editor.py`
- Follow-up RED: `cd backend && python -m pytest tests/test_field_editing.py -q --no-cov -k "response_model_safe_scalar_types"` failed because `id` was a UUID, not a string.
- Follow-up GREEN: `cd backend && python -m pytest tests/test_field_editing.py --cov=app.services.field_editor --cov-report=term-missing --cov-fail-under=95 -q -o addopts=""`
- Result: `26 passed`, `app.services.field_editor` coverage `99%`.

Production Verification:
- Pushed `master` through `175e094`; backend deploy picked up merge `e1a9243`.
- Re-polled `GET /extractions/cc14ab4a-ce60-40f3-87fe-92d7025cb33a/edits`.
- Before deploy propagation: attempts 1-2 returned `500`.
- After deploy propagation: attempt 3 returned `200`, `total=1`, and the saved `audit_rights` edit.

## Manual Test Matrix Status

- Auth journey: Passed for API and browser coverage. Login, protected-route redirect, dashboard, credits, extraction list, profile read/save, session persistence after reload, and new-tab session persistence were verified. Logout was not fully completed because credentials were rotated immediately after CLI echo exposure.
- Real PDF processing: Passed after applying missing production migration. Fresh extraction reached `complete`.
- Unlocked workflow: Passed for API coverage. Seeded credit unlocked the completed extraction, full results returned 123 fields and 6 red flags, field edit saved, edit history returned the saved edit, document proxy returned the original PDF, and DOCX/PDF/XLSX exports completed.
- Failure modes: Partially passed. Unauthenticated protected API returns `401`; invalid `text/plain` upload returns `400`; malformed PDF upload fails cleanly in processing; deletion removes the item from list/dashboard; post-delete direct access returns `404`.
- Mobile authenticated app: Partially passed. Mobile dashboard, nav drawer, upload page, and failed-results page render and are usable. Mobile full-results/PDF toggle/edit/export pass still needs a browser check after edit-history deployment.

## Follow-Up Needed After Deploy

1. Browser-check full results on desktop and mobile, including PDF viewer/toggle, field editing, export buttons, and logout.
2. CamAudit handoff remains `503` until `CAMAUDIT_SHARED_KEY` is configured in production or the CTA is hidden when unavailable.
