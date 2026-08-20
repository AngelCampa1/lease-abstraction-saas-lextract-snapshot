# Production E2E Audit: Upload, Results, Export, Delete

Date: May 7, 2026
Base URL: `LEXTRACT_E2E_BASE_URL`
API URL: `LEXTRACT_E2E_API_URL`
Account: stored `.env.e2e.local` E2E account
Artifacts: `e2e-artifacts/prod-e2e-2026-05-07/`

## Scope

Manual production E2E sweep with `playwright-cli` persistent session `prod-e2e-2026-05-07`.

Covered:
- Auth: invalid login, valid login, protected session reload/deep link, sign out.
- Upload: non-PDF, over-50MB PDF, malformed PDF.
- Processing: reload/wait behavior for malformed upload.
- Results: paid full-result deep link, teaser/full API behavior, deleted/missing result URL.
- Export: Word, PDF, Excel export from existing paid extraction; file content inspection.
- Delete: dashboard delete dialog, cancel path, confirm path, direct deleted URL.

Not covered or limited:
- Credit unlock was blocked because the E2E account had `0` credits. No Stripe flow was attempted.
- A new valid production extraction was not run to completion during this sweep; an existing paid complete extraction was used for full result/export validation.
- Password-protected PDF, duplicate upload, explicit network interruption, mobile viewport, and dark-mode passes were not completed in this run.

## High-Signal Findings

### BUG-001: Processing Page Polled Teaser Endpoint And Could Show Stale Uploading State

Severity: High

Routes:
- `/processing/316ea755-6d60-445c-9717-6a85eec975c3`
- `GET /api/v1/extractions/{id}/teaser`

Evidence:
- `e2e-artifacts/prod-e2e-2026-05-07/12-upload-malformed.png`
- `e2e-artifacts/prod-e2e-2026-05-07/13-malformed-after-wait.png`
- `e2e-artifacts/prod-e2e-2026-05-07/13-malformed-after-wait-network.txt`

Repro:
1. Sign in with the E2E account.
2. Upload `upload-fixtures/malformed.pdf`.
3. Wait on the processing route.
4. Observe polling requests to `/extractions/{id}/teaser` and UI still saying `Uploading your document...` after the backend has already created and later failed the extraction.

Expected:
Processing should poll the canonical extraction detail endpoint and reflect `failed` as soon as the backend status changes.

Actual:
The UI polled the teaser endpoint during processing and stayed at the upload step for the malformed file.

Suspected code:
- `frontend/hooks/use-processing.ts`
- `backend/app/api/v1/extractions.py`

Fix:
- Added `GET /api/v1/extractions/{id}/status`, an owner-scoped status endpoint that does not require payment.
- Changed processing polling from `/extractions/{id}/teaser` to `/extractions/{id}/status`.
- Added backend coverage in `backend/tests/test_results_endpoints.py`.
- Added/updated Vitest coverage in `frontend/__tests__/processing/use-processing.test.tsx`.

### BUG-002: Overall Confidence Accessible Label Used Decimal As Percent

Severity: Medium

Route:
- `/results/cc14ab4a-ce60-40f3-87fe-92d7025cb33a`

Evidence:
- `e2e-artifacts/prod-e2e-2026-05-07/05-paid-result-deeplink.yaml`

Repro:
1. Open the existing paid extraction.
2. Inspect the status label for the overall confidence badge.

Expected:
The status label should match the visible percentage, e.g. `Overall confidence: 81%`.

Actual:
The accessible status label used the raw decimal as a percentage, e.g. `Overall confidence: 0.8148%`, while the visible badge showed `81%`.

Suspected code:
- `frontend/components/results/results-header.tsx`

Fix:
- Rounded `overall_confidence * 100` for the status label.
- Added Vitest coverage in `frontend/__tests__/results/full-results.test.tsx`.

## Other Observations

### Sentry Ingest 403 Noise

Severity: Low

Evidence:
- `00-console.txt`
- `05-paid-result-console.txt`
- `16-dashboard-console.txt`

Production pages repeatedly logged 403s from Sentry ingest:
`https://oXXXXXXXXXXXXXXXX.ingest.us.sentry.io/api/.../envelope/`

Impact:
This does not block user flows, but it pollutes console/network audits and can hide real frontend errors.

### Font Preload Warning Still Appears

Severity: Low

Evidence:
- `02-invalid-login-console.txt`
- `06-export-console-after.txt`
- `16-dashboard-console.txt`

The browser still reports the preloaded WOFF2 was not used shortly after load on some routes.

### PDF Export Opens A Signed R2 URL In A New Tab

Severity: Low

Evidence:
- `06-export-network-after.txt`
- `08-pdf-tab.png`
- `downloads/export-pdf.pdf`

Word and Excel fired normal browser downloads. PDF export opened the signed R2 PDF in a new tab, requiring manual save/fetch for file validation. The PDF itself was valid and readable.

## Passing Checks

Auth:
- Invalid login shows `Invalid email or password` and returns 401.
- Stored E2E credentials sign in successfully.
- Dashboard session survives reload.
- Paid result deep link works while signed in.
- Sign out redirects to `/login`.

Upload:
- Non-PDF is blocked client-side with `Only PDF files are accepted.`
- Over-50MB PDF is blocked client-side with `File exceeds the 50 MB limit.`
- Malformed PDF creates a backend extraction and eventually appears as failed on dashboard.

Results:
- Existing paid full result renders categories, red flags, search, source controls, edit affordances, PDF viewer button, and export panel.
- Deleted extraction URL shows `Extraction not found` with explanatory copy and upload CTA.

Exports:
- DOCX downloaded and contained executive summary, field tables, and core values.
- PDF downloaded/opened and contained executive summary, red flags, field tables, pagination, and core values.
- XLSX downloaded and contained summary, red flags, sheets, headers, and field values.

Delete:
- Delete dialog copy is clear.
- Cancel path keeps the extraction.
- Confirm path sends `DELETE /api/v1/extractions/{id}` with 204 and removes the test-created extraction from the dashboard.

## Export File Validation

Files:
- `downloads/export-word.docx`
- `downloads/export-pdf.pdf`
- `downloads/export-excel.xlsx`

Inspection artifacts:
- `downloads/export-word.docx.text.txt`
- `downloads/export-pdf.pdf.text.txt`
- `downloads/export-excel.xlsx.text.txt`

Validated content:
- `GEORGIA BUILDING AUTHORITY`
- `Executive Summary`
- field table headers and values
- confidence tiers
- red flag content in PDF/XLSX

Report structure caveat:
The generated exports are readable, but explicit `Appendix` labeling was not present in the extracted text. The PRD calls for an appendix section, so this remains a product/report-template follow-up rather than a blocking runtime bug.

## Code Changes Made

- `frontend/hooks/use-processing.ts`
- `frontend/components/results/results-header.tsx`
- `frontend/__tests__/processing/use-processing.test.tsx`
- `frontend/__tests__/results/full-results.test.tsx`
- `backend/app/api/v1/extractions.py`
- `backend/app/models/results.py`
- `backend/tests/test_results_endpoints.py`

Focused tests:
- `python -m pytest tests/test_results_endpoints.py -q --no-cov`
- `npx vitest run __tests__/processing/use-processing.test.tsx`
- `npx vitest run __tests__/results/full-results.test.tsx -t "overall confidence"`

Full verification:
- `python -m pytest --cov=app --cov-report=term-missing` — 1204 passed, 5 skipped, total coverage 96.24%.
- `python -m ruff check app tests/test_results_endpoints.py` — passed.
- `python -m black --check app tests/test_results_endpoints.py` — passed.
- `python -m mypy app` — passed.
- `CI=1 npx vitest run --coverage` — 155 files passed, 2213 tests passed; touched frontend files were 100% covered.
- `npm run lint` — passed with one existing `app/opengraph-image.tsx` `no-img-element` warning.
- `npx tsc --noEmit` — passed.
- `npm run build` — exited 0, compiled successfully, generated 388 static pages; Next logged Windows `.next` traced-file copy warnings.
