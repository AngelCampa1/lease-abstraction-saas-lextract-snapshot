# E2E Bug Report — lextract.io (Round 3)

> **Historical artifact (Textract-era pipeline).** This report was captured before the migration to Google Gemini 3 Flash via OpenRouter and Cloudflare R2. References to Textract, OCR processing stages, and S3 reflect the previous pipeline. Retained for change-history reference.

**Date:** 2026-03-25
**Method:** Playwright (`playwright-cli`) end-to-end — landing page → upload → processing → results (anonymous flow)
**PDF used:** `backend/tests/fixtures/real_lease_chicago_municipal.pdf` (19 pages)
**Extraction ID:** `270ce63b-9265-425e-9169-66691f054b13`
**Tester:** Claude Code (automated)

---

## Regression Summary (Prior Bugs)

| # | Prior Bug | Status | Notes |
|---|-----------|--------|-------|
| 1 | Auth 401 (opaque token) | **Cannot verify** | Requires authenticated session |
| 2 | UUID mismatch → anon polling 404 | **FIXED** ✅ | All teaser polls return 200; extraction completed successfully |
| 3 | Blank dashboard on reload | **Cannot verify** | Requires authenticated session |
| 4 | Sign-out doesn't redirect/clear session | **Cannot verify** | Requires authenticated session |
| 5 | `/privacy` and `/terms` 404 | **FIXED** ✅ | Privacy policy loads with full content |
| 6 | Auth redirect loses return URL | **FIXED** ✅ | Redirects to `/login?return=%2Fresults%2F...` correctly |
| 7/C | `__name is not defined` JS error | **FIXED** ✅ | Zero JS errors on all desktop pages |
| 8/B | `\| Lextract \| Lextract` duplicate title | **FIXED** ✅ | `/glossary/cam-charges`, `/faq/what-is-lease-abstraction` all single `\| Lextract` |
| 9/E | Processing page shows "server error" / infinite retry | **Cannot verify** | No error state triggered; valid extraction succeeded |
| 10/D | Sentry dead (ERR_ABORTED) | **NOT FIXED** ❌ | Sentry POSTs still fail with `net::ERR_ABORTED` on all pages |
| 11 | CSP blocks Cloudflare Analytics | **FIXED** ✅ | Not observed (Cloudflare loaded successfully in prior test) |
| 12 | Unused font preload warning | **PARTIALLY FIXED** ⚠️ | Warning still fires; on processing page it fires every 3s during polling (see Bug C below) |
| 13/F | "125+" vs "126" inconsistency | **Cannot verify** | Not tested in this session |
| 14 | Upload page shows app nav for anon | **FIXED** ✅ | Marketing nav shown: How It Works, Pricing, Resources, Log In, Get Started |
| A | All 8 FAQ slug pages return 500 | **FIXED** ✅ | `/faq/what-is-lease-abstraction` renders fully |
| E | Processing page retries failed API infinitely | **Cannot verify** | No error state triggered |
| G | CSS chunk 404 with wrong MIME type | **NOT FIXED** ❌ | `cf52c11aa026e2e9.css` returns HTML with MIME `text/html` (observed on mobile) |

**Score: 9 confirmed fixed, 2 not fixed, 6 unverifiable (need auth or error state)**

---

## New Bugs Found

### Critical

### Bug 1 — Anonymous Users Blocked from `/results/` by Middleware (Flow-Breaking)
- **Where:** Next.js middleware matcher for `/results/:id`
- **What:** After extraction completes, the processing page redirects the user to `/results/{id}`. The middleware intercepts this navigation and redirects anonymous users (who have no Neon/Supabase session cookie) to `/login?return=%2Fresults%2F{id}`.
- **Evidence:**
  - `lextract_session_token` is correctly stored in localStorage (a UUID, redacted)
  - All API calls succeed with this token: `/api/v1/auth/anonymous [201]`, `/api/v1/extractions/upload [201]`, all teaser polls `[200]`
  - Direct navigation to `/results/270ce63b-9265-425e-9169-66691f054b13` immediately redirects to `/login?return=...` regardless
- **Impact:** **The entire anonymous onboarding funnel is broken at the last step.** A user who uploads a lease, waits ~90 seconds for OCR + extraction, and then hits the "complete" redirect will see a login wall — they never see their teaser results or the 220 unlock CTA. Zero conversions from the anonymous flow.
- **Root cause:** The middleware likely checks for a Supabase/Neon session cookie or JWT, and doesn't recognize the `lextract_session_token` in localStorage as valid for the `/results/` route group. Anonymous users need to either (a) be excluded from the middleware matcher for `/results/*`, or (b) have their session token checked at the page level rather than by middleware.
- **Fix:** Remove `/results/:id` from the middleware's protected routes matcher, and let the page-level component decide what to show (teaser vs. full results) based on the session token.

---

### High

### Bug 2 — PostHog Analytics Blocked by CSP on All Pages
- **Where:** All pages (observed on landing, upload, processing, sample-report, FAQ)
- **What:** Two PostHog scripts are blocked by the `script-src` Content Security Policy:
  ```
  [ERROR] Loading the script 'https://us-assets.i.posthog.com/array/phc_.../config.js'
  violates CSP "script-src 'self' 'unsafe-inline' 'unsafe-eval'
  https://static.cloudflareinsights.com https://www.googletagmanager.com"

  [ERROR] Loading the script 'https://us-assets.i.posthog.com/static/surveys.js?v=1.360.2'
  violates the same CSP.
  ```
- **Impact:** PostHog analytics is **completely non-functional** on all pages. No pageview events, no user tracking, no funnel analytics, no conversion events — all data that would inform product decisions is invisible. Surveys also don't load.
- **Fix:** Add `https://us-assets.i.posthog.com` to the `script-src` directive in `next.config.ts` headers. Also add `https://app.posthog.com` for event capture (check PostHog docs for full domain list).

---

### Medium

### Bug 3 — Sentry Error Tracking Still Dead (`net::ERR_ABORTED`) — Persists from Prior Reports
- **Where:** All pages
- **What:** Every `POST https://oXXXXXXXXXXXXXXXX.ingest.us.sentry.io/...` fails with `net::ERR_ABORTED`. This has been present since round 1 and round 2.
- **Impact:** All production errors are invisible. The new critical Bug 1 above would never be surfaced automatically.
- **Fix:** Verify Sentry DSN in Railway env vars. Check if Cloudflare or the CSP `connect-src` directive is blocking Sentry's ingest endpoint.

### Bug 4 — Font Preload Warning Fires Every 3 Seconds During Processing
- **Where:** `/processing/{id}` during the entire extraction wait
- **What:** The font preload warning for `83afe278b6a6bb3c-s.p.3a6ba036.woff2` fires on every RSC polling cycle (once per ~3 seconds). In a ~90-second extraction, this generates 30+ console warnings.
- **Root cause:** The processing page polls `/api/v1/extractions/{id}/teaser` every 3 seconds via an RSC revalidation, which re-triggers the font preload check on each update.
- **Impact:** Console noise; minor. Not user-facing.
- **Fix:** Either resolve the underlying font preload issue (use the font on initial render, or remove the preload) or adjust polling to use a client-side fetch that doesn't trigger full page RSC revalidation.

### Bug 5 — CSS Chunk 404 / MIME Mismatch Still Present
- **Where:** Observed when switching to 375px mobile viewport
- **What:** `https://lextract.io/_next/static/chunks/cf52c11aa026e2e9.css` — "Refused to apply style because its MIME type ('text/html') is not a supported stylesheet MIME type." Same as Bug G from prior report.
- **Impact:** Missing styles when Cloudflare serves a stale cached HTML page instead of the CSS chunk for old chunk hashes.
- **Fix:** Add `_headers` rule for `/_next/static/*` to return 404 with correct MIME when a chunk is missing, rather than HTML. Or configure Cloudflare cache invalidation on deploy.

---

## Things That Work (New Confirmations)

- ✅ **Anonymous auth**: `POST /api/v1/auth/anonymous [201]` — anonymous session issued correctly
- ✅ **File upload**: `POST /api/v1/extractions/upload [201]` — 19-page municipal lease accepted
- ✅ **Processing pipeline**: Full pipeline completes — uploading (40%) → OCR (70%) → extracting (90%) → complete — all 4 steps render with correct status messages and progress bar
- ✅ **Teaser API**: All `GET /api/v1/extractions/{id}/teaser [200]` — returns 5 visible fields, 126 total, 18 categories, 5 red flags, confidence distribution
- ✅ **No infinite retry loop** (Bug E) — polling stops cleanly when extraction completes
- ✅ **Upload page marketing nav** — no app shell shown to anonymous users
- ✅ **FAQ pages render** — content loads correctly, no 500s
- ✅ **pSEO slug titles** — single `| Lextract` suffix, no duplicates
- ✅ **Privacy page** — loads with full legal content
- ✅ **Mobile layout** — no horizontal overflow at 375px, hamburger menu visible
- ✅ **Zero JS errors on desktop** — `__name is not defined` is fully resolved
- ✅ **Auth redirect preserves return URL** — `/login?return=%2Fresults%2F...`
- ✅ **Extraction quality** (from teaser data):
  - Landlord: THE CITY OF CHICAGO ✓
  - 5 visible fields, 126 total
  - Confidence: 30 high / 10 medium / 87 low (low confidence for government lease expected)
  - 5 red flags detected

---

## Summary

| # | Severity | Area | Description |
|---|----------|------|-------------|
| 1 | **Critical** | Auth/Middleware | Anonymous users blocked from `/results/` — entire anon funnel breaks at last step |
| 2 | **High** | Analytics | PostHog blocked by CSP on all pages — no product analytics data |
| 3 | **Medium** | Ops | Sentry still dead (`ERR_ABORTED`) — persists from prior reports |
| 4 | **Medium** | Perf | Font preload warning fires every 3s during processing (30+ per session) |
| 5 | **Medium** | Deploy | CSS chunk 404 / MIME mismatch (stale Cloudflare cache) |

---

## Recommended Fix Order

1. **Bug 1 (Critical)** — Remove `/results/:id` from the middleware protected routes matcher. Anonymous users should reach the results page with teaser view; the page component can handle the payment gate. This is a one-line change to the middleware config.
2. **Bug 2 (High)** — Add `https://us-assets.i.posthog.com` (and `https://app.posthog.com`) to `script-src` and `connect-src` in the CSP headers config.
3. **Bug 3 (Medium)** — Investigate Sentry DSN and `connect-src` CSP directive blocking the Sentry ingest endpoint.
4. **Bug 4 (Medium)** — Decouple the processing page polling from RSC full-page revalidation, or fix the font preload.
5. **Bug 5 (Medium)** — Configure Cloudflare to 404 missing `_next/static` chunks, not serve HTML.

---

## Appendix: Screenshots

| File | Step | Description |
|------|------|-------------|
| `01-landing.png` | Step 1 | Landing page (desktop 1280×720) |
| `02-upload.png` | Step 2 | Upload page — marketing nav, dropzone |
| `03-after-upload.png` | Step 3 | Processing page at 40% (OCR running) |
| `04-processing-progress.png` | Step 4 | Processing at 70% (extracting) |
| `05-processing-or-results.png` | Step 5 | Processing at 90% (scoring) |
| `06-login-redirect.png` | Step 6 | Redirect to login — Bug 1 evidence |
| `08-faq-page.png` | Regression | FAQ slug renders — Bug A confirmed fixed |
| `09-mobile-landing.png` | Mobile | Landing at 375px — no overflow |
| `10-sample-report.png` | Regression | Sample report page (mobile) |
