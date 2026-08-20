# Production E2E Audit: Remaining Upload, Unlock, Results, Export, UI Cases

Date: May 7, 2026
Base URL: `LEXTRACT_E2E_BASE_URL`
API URL: `LEXTRACT_E2E_API_URL`
Account: stored `.env.e2e.local` E2E account
Artifacts: `e2e-artifacts/prod-e2e-remaining-2026-05-07/`

## Scope

Manual production E2E sweep with `playwright-cli` persistent session `prod-e2e-remaining-2026-05-07`, covering the cases left open by the earlier May 7 audit.

Covered:
- Fresh valid production extraction: `31f4703a-c594-4407-b9f6-27a8ed5794ab`.
- Credit unlock with one immutable seeded E2E test credit.
- Full result rendering, reload persistence, inline edit save/reload.
- DOCX/PDF/XLSX export downloads and file-content inspection.
- Non-PDF, over-50MB PDF, password-protected PDF, network-interrupted upload, retry affordance.
- Mobile/light, mobile/dark, signed-out direct result URL, delete cleanup.

Cleanup:
- Deleted `31f4703a-c594-4407-b9f6-27a8ed5794ab` through the dashboard UI.
- Deleted password-protected extraction `8b9d5200-4d68-46ca-8d81-885629eddde3` through the dashboard UI.
- Direct visit to the deleted paid result shows `Extraction not found`.

## Findings And Fixes

### BUG-003: PDF Export Opens A Signed R2 URL In A New Tab

Severity: Low

Evidence:
- `18-export-pdf-after-click.yaml`
- `18-tabs-after-pdf.txt`
- `downloads/fresh-export-pdf.pdf`

Repro:
1. Open a paid result.
2. Select PDF export.
3. Click Download.

Expected:
PDF export should behave like DOCX/XLSX and initiate a download from the current page.

Actual:
The browser opens a signed R2 URL in a new tab.

Fix:
- Added an authenticated backend export-download endpoint that streams completed exports through the API origin, avoiding direct browser fetches to signed R2 URLs.
- Changed cached and async export completion handling to fetch that API download endpoint as a blob and trigger a client-side download.
- Added Vitest coverage proving cached and async exports do not call `window.open`, and async exports keep the originally requested format even if the picker changes while generation is pending.

### BUG-004: Export Reports Did Not Explicitly Label Red Flags As Appendix

Severity: Low

Evidence:
- Prior audit export text files.
- Fresh export text files under `downloads/`.

Expected:
Report exports should include an explicit appendix label for red flags.

Actual:
DOCX/PDF used `Red Flags` without the appendix label; XLSX had no dedicated appendix sheet.

Fix:
- DOCX/PDF headings now use `Appendix: Red Flags`.
- XLSX now includes an `Appendix - Red Flags` sheet with Field, Severity, and Description columns.
- Added backend tests for all three export formats.

## Production Observations

### Prior Code Fixes Not Yet Visible In Production

Production still showed:
- Overall confidence ARIA label as `Overall confidence: 0.8148%`.
- Password-protected failed extraction stuck on `Uploading your document...` even though Neon showed `status = failed`.

Both map to code paths fixed in the previous merged sweep:
- `frontend/components/results/results-header.tsx`
- `frontend/hooks/use-processing.ts`
- `backend/app/api/v1/extractions.py`

This audit treats them as deployment lag or environment version drift, not new code fixes.

### Sentry Ingest 403 Still Reproducible

Severity: Low

Evidence:
- `02-dashboard-console.txt`
- `13-credit-unlock-console.txt`

Production still emits 403s to Sentry ingest. The repo initializes Sentry only when `NEXT_PUBLIC_SENTRY_DSN` is present, so this needs a production environment variable correction or Sentry project/client-key correction.

### Font Preload Warning Still Reproducible

Severity: Low

Evidence:
- `02-dashboard-console.txt`

The browser still warns about a WOFF2 preload on some routes. Local layout config preloads only the primary `Inter` font and disables preload for `Bricolage_Grotesque`, so this should be rechecked after the latest frontend deploy.

## Passing Checks

Upload:
- Non-PDF blocked with `Only PDF files are accepted.`
- Over-50MB PDF blocked with `File exceeds the 50 MB limit.`
- Network interruption shows `Network error during upload` and a `Try again` affordance.
- Password-protected PDF creates an extraction and backend marks it failed.
- Duplicate content was accepted as a separate extraction; no duplicate-prevention product rule is currently enforced.

Processing/results:
- Fresh valid extraction completed and redirected to results.
- Credit unlock succeeded; credit balance moved from 1 to 0.
- Full result rendered categories, search, red flags, PDF control, export panel, and edit affordances.
- Inline edit to Landlord Name saved and survived reload.
- Mobile light/dark result layouts had no horizontal overflow (`scrollWidth = 390`, `innerWidth = 390`).
- Signed-out direct paid result URL showed `Sign in required` without leaking data.
- Deleted paid result URL showed `Extraction not found`.

Exports:
- DOCX downloaded and contained cover, executive summary, field tables, confidence tiers, edited field value, and red flags.
- PDF was readable after manually fetching the signed URL and contained cover, executive summary, field tables, confidence tiers, edited field value, pagination, and red flags.
- XLSX downloaded and contained expected sheets, headers, confidence tiers, and edited field value.

## Verification

TDD red checks:
- `python -m pytest tests/test_word_export.py::test_word_exporter_labels_red_flags_as_appendix tests/test_pdf_export.py::test_html_labels_red_flags_as_appendix tests/test_excel_export.py::test_excel_exporter_adds_red_flags_appendix_sheet -q --no-cov` failed before implementation.
- `npx vitest run __tests__/results/export-panel.test.tsx -t "downloads cached exports without opening a new tab"` failed before implementation once the test harness was corrected.

Focused checks:
- `npx vitest run __tests__/results/export-panel.test.tsx` passed: 24 tests.
- `npx vitest run __tests__/results/export-panel.test.tsx __tests__/results/full-results.test.tsx __tests__/processing/use-processing.test.tsx` passed: 76 tests.
- `python -m pytest tests/test_word_export.py tests/test_pdf_export.py tests/test_excel_export.py tests/test_export_task.py -q --no-cov` passed: 115 tests.

Full checks:
- `npm run lint` passed with one existing warning in `frontend/app/opengraph-image.tsx` about `<img>` in an Open Graph image route.
- `npx tsc --noEmit` passed.
- `npx vitest run --coverage` passed.
- `npm run build` passed. Next.js emitted existing warnings about the deprecated `middleware` convention, edge runtime static generation limits, and Windows-only traced-file copy failures for chunk names containing `node:...`; the command exited 0.
- `python -m ruff check app tests` passed.
- `python -m black --check app tests` passed.
- `python -m mypy app` passed.
- `python -m pytest --cov=app --cov-report=term-missing` passed: 1214 passed, 5 skipped, total coverage 96.25%. Touched backend export files remained above 95% coverage.
