# Production E2E Bug Report - 2026-05-06

Audit targets:

- `https://lextract.io`
- `https://api.lextract.io`

Artifact directory: `e2e-artifacts/prod-e2e-2026-05-06/`

Payment safety scope: no live card submitted. Checkout completion was not attempted.

## Summary

| ID | Severity | Area | Status |
| --- | --- | --- | --- |
| BUG-2026-05-06-01 | Medium | Results / sample report | fixed locally |
| BUG-2026-05-06-02 | Low | Frontend build / TypeScript | fixed locally |

## BUG-2026-05-06-01 - Public Sample Results Show The Anonymous Email Gate

**Severity:** Medium

**Area:** Results / sample report / upload sample CTA

**Status:** fixed locally

**Production evidence:**

- Snapshot: `e2e-artifacts/prod-e2e-2026-05-06/results-sample.snapshot.yaml`
- Screenshot: `e2e-artifacts/prod-e2e-2026-05-06/results-sample.png`
- Console/network logs: `results-sample.console.txt`, `results-sample.network.txt`

**Repro steps:**

1. Open `https://lextract.io/upload`.
2. Click the sample teaser link, or open `https://lextract.io/results/sample` directly.
3. Observe the page after the sample teaser finishes loading.

**Expected behavior:**

The sample results page should be inspectable without asking for an email. It should show the sample teaser and the sample-specific "Upload Your Lease" CTA.

**Actual behavior:**

An anonymous email-gate dialog appears over the sample teaser with the title "Your extraction is ready!" and a work email field. This blocks a public sample route that is linked from the upload page as "See all 126 fields".

**Root cause:**

`ResultsContent` opened the anonymous email gate for every unpaid, completed teaser. `TeaserView` already treats `SAMPLE_EXTRACTION_ID` as a special public sample, but `ResultsContent` did not apply the same exception.

**Fix:**

`frontend/components/results/results-content.tsx` now excludes `SAMPLE_EXTRACTION_ID` from `emailGateOpen` and `needsEmailGate`. Regression coverage was added in `frontend/__tests__/results/teaser-view.test.tsx`.

**Verification:**

- RED: `npx vitest run __tests__/results/teaser-view.test.tsx --testNamePattern "does not show the anonymous email gate on sample results"` failed because the dialog was present.
- GREEN: the same targeted test passed after the fix.
- Regression file: `npx vitest run __tests__/results/teaser-view.test.tsx` passed with 77 tests.

**Production verification:**

Pending deploy. Current production still shows the bug until this branch is deployed.

## BUG-2026-05-06-02 - Frontend Typecheck Cannot Resolve Worker HTML Templates

**Severity:** Low

**Area:** Frontend build / TypeScript config

**Status:** fixed locally

**Evidence:**

- `npx tsc --noEmit` failed with `Cannot find module './templates/nurture/lease-abstraction-checklist_step_0.html'`.
- `npm run build` compiled the app, then failed during TypeScript on the same worker template imports.

**Repro steps:**

1. In `frontend/`, run `npx tsc --noEmit`.
2. Observe TypeScript errors from `../workers/marketing-data/src/nurture-templates.ts`.

**Expected behavior:**

Frontend typechecking should include the worker `*.html` module declaration when frontend tests import the marketing worker.

**Actual behavior:**

The HTML template files exist, but the frontend TypeScript program did not include `workers/marketing-data/src/html.d.ts`, so `*.html` imports were unresolved.

**Fix:**

`frontend/tsconfig.json` now includes `../workers/marketing-data/src/html.d.ts`.

**Verification:**

- RED: `npx tsc --noEmit` failed on missing worker HTML module declarations.
- GREEN: `npx tsc --noEmit` passed after the include fix.
- `npm run build` passed after the include fix.

## Route Audit Notes

Primary route pass evidence:

- `route-audit-summary-final.json`
- `route-audit-summary-final2.json`

Routes checked successfully with no page-level console errors:

- Marketing and product: `/`, `/pricing`, `/sample-report`, `/resources`, `/resources/articles`, `/resources/guides`, `/resources/comparisons`, `/lease-abstraction-software`, `/about`
- SEO/content: `/glossary`, `/glossary/base-rent`, `/faq`, `/for/tenant-representatives`, `/resources/states`, `/resources/states/california`
- Tools: `/calculators`, `/calculators/nnn-lease-cost-calculator`, `/tools`, `/tools/lease-comparison`
- Legal/auth/app entry: `/privacy`, `/terms`, `/login`, `/signup`, `/dashboard`, `/upload`

Stale guessed routes were checked and are not counted as product bugs because they are not the implemented route shapes:

- `/for/tenant-reps` returns 404; implemented slug is `/for/tenant-representatives`.
- `/commercial-lease-abstraction/california` returns 404; implemented state route is `/resources/states/california`.
- `/locations/california` returns 404; location pages use city-specific slugs such as `/locations/los-angeles-commercial-lease-abstraction`.

## Auth And Upload Notes

**Invalid login:** verified `https://lextract.io/login` shows "Invalid email or password" after an invalid credential submission. Evidence: `auth-invalid-login.snapshot.yaml`, `auth-invalid-login.console.txt`, `auth-invalid-login.network.txt`.

**Signup empty validation:** verified required-field messages for full name, email, password, and confirm password. Evidence: `signup-empty-validation.snapshot.yaml`.

**Protected dashboard redirect:** verified anonymous `/dashboard` redirects to `/login?return=%2Fdashboard`. Evidence: `route-audit-summary-final.json`.

**Anonymous upload page:** verified `/upload` loads with the file input and marketing/sample panels. Evidence: `final__upload.png`, `upload-invalid-file-v2.snapshot.yaml`.

## API, CORS, CSP, And Network Notes

API evidence:

- `api-health-get-checks.json`
- `api-health-checks.json`
- `api-cors-preflight.json`

Findings:

- `GET https://api.lextract.io/health` returns `200` with `{"status":"ok"}`.
- `OPTIONS https://api.lextract.io/api/v1/extractions` from `Origin: https://lextract.io` returns `200` and allows `Authorization`, `Content-Type`, `X-Session-Token`, and standard methods.
- `GET https://lextract.io/api/auth/get-session` returns `200`.
- `https://api.lextract.io/docs` returns `404`, which appears intentional for production.

CSP: no CSP violation was observed during the route pass. Production pages include the expected `connect-src` coverage for `api.lextract.io`, Neon, PostHog, Sentry, Cloudflare, downloads, and Cloudflare storage.

Console notes: repeated font preload warnings were observed on some navigations. They did not block rendering or interaction and are not marked as a functional bug in this round.

## Coverage Limitations

The following were not fully exercised in production because no reusable production account/session credentials were available in the fresh worktree and no live card transaction may be submitted:

- Authenticated dashboard/profile with a valid account.
- Real PDF upload through completed extraction processing.
- Stripe payment completion.
- Seeded-credit unlock.
- Full paid results, exports, PDF viewer, CamAudit handoff, and deletion on a fresh extraction.

The audit did verify public entry points, auth validation, protected-route redirect behavior, sample/teaser behavior, API health, and CORS preflight.
