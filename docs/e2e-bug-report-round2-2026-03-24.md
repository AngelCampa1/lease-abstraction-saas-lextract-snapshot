# E2E Bug Report — lextract.io (Round 2)
**Date:** 2026-03-24
**Method:** Playwright end-to-end comprehensive audit — regression testing of 15 prior bugs + new coverage across pSEO pages, mobile viewport, forms, edge cases, accessibility, Lighthouse
**Tester:** Claude Code (automated)

---

## Regression Summary (Prior 15 Bugs)

| # | Prior Bug | Status | Notes |
|---|-----------|--------|-------|
| 1 | Auth 401 (opaque token) | **Cannot verify** | Requires login credentials; protected routes redirect to `/login` correctly |
| 2 | UUID mismatch (anon polling) | **Cannot verify** | Requires file upload + backend running |
| 3 | Blank dashboard on reload | **Cannot verify** | Requires authenticated session |
| 4 | Sign-out doesn't redirect | **Cannot verify** | Requires authenticated session |
| 5 | `/privacy` and `/terms` 404 | **FIXED** | Both pages load with proper content |
| 6 | Auth redirect loses return URL | **FIXED** | `/dashboard` redirects to `/login?return=%2Fdashboard`, `/profile` to `/login?return=%2Fprofile`, `/results/X` to `/login?return=%2Fresults%2FX` |
| 7 | `__name is not defined` JS error | **NOT FIXED** | `ReferenceError: __name is not defined` fires on every single page load |
| 8 | Duplicate `\| Lextract \| Lextract` title | **PARTIALLY FIXED** | Hub pages fixed. All individual slug pages across 18 verticals still have duplicate (see Bug A below) |
| 9 | Processing page shows "server error" for 404 | **NOT FIXED** | `/processing/{invalid-uuid}` still shows "Something went wrong — server error" instead of "not found" |
| 10 | Sentry 403 / dead error tracking | **NOT FIXED** | Sentry ingest requests fail with `net::ERR_ABORTED` (was 403 before) |
| 11 | CSP blocks Cloudflare Analytics | **FIXED** | `static.cloudflareinsights.com/beacon.min.js` loads successfully (status 200) |
| 12 | Unused font preload warning | **FIXED** | Old font `017d9bea...` replaced; current font `83afe278...` loads fine. Console preload warning still present but non-blocking. |
| 13 | "125+" vs "126" field count | **PARTIALLY FIXED** | Landing page says "126" consistently. But `/pricing`, `/fields`, and `/workflows/pdf-to-excel` body text still says "125+" (see Bug F below) |
| 14 | `/upload` shows app nav for anon users | **FIXED** | Upload page now shows marketing nav (How It Works, Pricing, Resources, Log In, Get Started) |
| 15 | `llms.txt` encoding | **MOSTLY FIXED** | Content has proper UTF-8 em dashes. `Content-Type: text/plain` header lacks `charset=utf-8` declaration. |

**Score: 5 fully fixed, 3 partially fixed, 3 not fixed, 4 unverifiable (need auth)**

---

## New Bugs Found

### Critical

### Bug A — All 8 FAQ Slug Pages Return 500 (Server Crash)
- **Where:** `/faq/what-is-lease-abstraction`, `/faq/how-long-does-lease-abstraction-take`, `/faq/what-fields-are-in-a-lease-abstract`, `/faq/what-is-nnn-lease-abstraction`, `/faq/is-ai-lease-abstraction-accurate`, `/faq/how-much-does-lease-abstraction-cost`, `/faq/what-is-cam-reconciliation`, `/faq/lease-abstraction-vs-lease-review`
- **What:** All 8 FAQ individual pages (listed in sitemap.xml) return HTTP 500 with an empty response body. The server crashes when rendering these pages.
- **Impact:** 8 pages in the sitemap are completely broken. Google will crawl these, discover 500 errors, and may reduce crawl budget/trust for the domain. Users who click FAQ links from search results see a blank page.
- **Likely cause:** The `/faq/[slug]` dynamic route has a rendering error — possibly an undefined variable, missing MDX content file, or a component import failure. The empty body suggests an unhandled exception in the server-side render.

---

### High

### Bug B — Duplicate Title (`| Lextract | Lextract`) on All pSEO Slug Pages
- **Where:** Every individual slug page across all 18 pSEO verticals: `/glossary/[slug]`, `/fields/[slug]`, `/for/[slug]`, `/red-flags/[slug]`, `/use-cases/[slug]`, `/lease-types/[slug]`, `/industries/[slug]`, `/locations/[slug]`, `/clauses/[slug]`, `/property-types/[slug]`, `/templates/[slug]`, `/integrations/[slug]`, `/workflows/[slug]`, `/calculators/[slug]`, `/case-studies/[slug]`, `/resources/states/[slug]`
- **What:** Page titles end with `| Lextract | Lextract` instead of `| Lextract`. Example: `"Base Rent — Commercial Lease Glossary | Lextract | Lextract"`
- **Not affected:** Hub pages (`/glossary`, `/fields`, etc.), articles, guides, comparisons, and core pages (landing, pricing, about, etc.) have correct single `| Lextract` suffix.
- **Impact:** ~400+ pages in SERPs show the duplicate brand suffix. Hurts CTR and looks unprofessional. The hub-level layout already appends `| Lextract` in its metadata template, and the individual page metadata also includes `| Lextract` — they stack.
- **Fix:** Remove `| Lextract` from the individual slug page metadata, or remove it from the layout metadata template for these route groups.

---

### Bug C — `__name is not defined` JS Error on Every Page (Still Unfixed)
- **Where:** Every page on the entire site — landing, marketing, auth, app, pSEO
- **What:** `ReferenceError: __name is not defined` at line 10:11 / 17:11 on every page load. This is an OpenNext/Cloudflare/esbuild bundler artifact.
- **Impact:** While the site appears to render correctly despite this error, it pollutes the console, may break source maps and debugging, and could cause subtle issues in code paths that depend on the `__name` helper. It also means every page fires a JS error event, which would flood Sentry if Sentry were working.

---

### Bug D — Sentry Error Tracking Still Dead
- **Where:** All pages
- **What:** `POST https://oXXXXXXXXXXXXXXXX.ingest.us.sentry.io/.../envelope/` fails with `net::ERR_ABORTED` on every page. Previously was 403, now appears to be blocked/aborted entirely.
- **Impact:** No production errors are being captured. All the bugs in this report are invisible to the team through Sentry.
- **Fix:** Verify the Sentry DSN and project auth token. Check if the Cloudflare Pages configuration or CSP is blocking Sentry requests.

---

### Bug E — Processing Page Retries Failed API Call Infinitely
- **Where:** `/processing/{any-invalid-uuid}`
- **What:** After the backend returns a failure for the extraction lookup, the frontend retries the `GET /api/v1/extractions/{id}` call in a tight loop — 10+ failed requests in 5 seconds. Also still shows "Something went wrong — server error" instead of "Extraction not found" (original Bug 9).
- **Impact:** A user with a stale bookmark or bad link will generate continuous failed API requests, wasting backend resources and Sentry credits (if Sentry were working).
- **Fix:** Add exponential backoff and max retry limit to the polling logic. Distinguish 404 from 5xx and show appropriate messaging.

---

### Medium

### Bug F — "125+" Field Count Still Appears on Multiple Pages
- **Where:** `/pricing` body text, `/fields` body text, `/workflows/pdf-to-excel` title and body text
- **What:** While the landing page now consistently says "126 fields", several other pages still reference "125+ fields" or "125+ structured fields" in their copy.
- **Examples:**
  - `/pricing`: "Upload a lease PDF and get 125+ structured fields in under 3"
  - `/fields`: "Lextract extracts 125+ structured fields across 14..."
  - `/workflows/pdf-to-excel` title: "Extract 125+ Fields in Minutes"
- **Fix:** Search-and-replace "125+" with "126" across all MDX content files and page components.

---

### Bug G — CSS Chunk Returns 404 with Wrong MIME Type (Intermittent)
- **Where:** `/_next/static/chunks/d98c1ef12197e703.css`
- **What:** On some page navigations, a CSS chunk fails to load: "Refused to apply style from ... because its MIME type ('text/html') is not a supported stylesheet MIME type." This appears to be a stale chunk reference from a previous deployment that Cloudflare/Vercel still tries to resolve.
- **Impact:** Could cause missing styles on affected pages. Intermittent — depends on client-side navigation patterns and caching.
- **Likely cause:** After a new deployment, old CSS chunk hashes become invalid but are still referenced by cached HTML. The server returns an HTML error page (MIME type `text/html`) instead of 404 for the missing CSS file.

---

### Bug H — Font File 404 (Intermittent)
- **Where:** `/_next/static/media/017d9bea37084d9b-s.p.a6d6de71.woff2`
- **What:** A font file from a previous deployment returns 404 on some navigations. Observed on `/pricing`, `/about`, `/glossary`, `/for`, `/sample-report` during client-side navigations.
- **Impact:** Font may flash or fall back to system font on affected page loads.
- **Likely cause:** Same as Bug G — stale asset reference from previous deployment.

---

### Bug I — `llms.txt` Missing `charset=utf-8` in Content-Type Header
- **Where:** `https://lextract.io/llms.txt`
- **What:** Response header is `Content-Type: text/plain` without `charset=utf-8`. While the content itself is valid UTF-8, some HTTP clients and LLM crawlers may default to Latin-1 interpretation without the explicit charset declaration.
- **Fix:** Set `Content-Type: text/plain; charset=utf-8` in the response headers (via Next.js route handler or Cloudflare headers config).

---

### Low

### Bug J — Excessive RSC Prefetch Requests on Landing Page
- **Where:** Landing page initial load
- **What:** The landing page fires 5 prefetch requests for `/sample-report`, 4 for `/upload`, 4 for `/login`, 3 for `/resources`, 3 for `/pricing` — over 20 RSC prefetch requests on a single page load. Many appear to be duplicates with different `_rsc` tokens.
- **Impact:** Increases server load, bandwidth usage, and TTFB for the landing page. May slow down initial interactivity on slow connections.

---

## Things That Work Well

- **Lighthouse scores excellent**: Performance 99, Accessibility 95, Best Practices 96, SEO 100
- **Mobile responsive**: No horizontal overflow on any tested page. Mobile hamburger menu works correctly.
- **Form validation**: Signup form validates name length, email format, password length, and password match. Login form validates required fields.
- **Internal links**: All internal links from `/glossary/cam-charges` (30 unique links) resolve correctly.
- **RSS feed**: `/feed.xml` returns 200 with correct `application/rss+xml; charset=utf-8` content type.
- **Sitemap**: `/sitemap.xml` returns valid XML with all pages listed.
- **Auth redirect flow**: Protected routes properly redirect to `/login?return=<path>`.
- **No missing alt text** on landing page images.
- **No horizontal overflow** on mobile (375px) for any tested page.

---

## Summary

| # | Severity | Type | Description |
|---|----------|------|-------------|
| A | **Critical** | Server | All 8 FAQ slug pages return 500 (server crash) |
| B | **High** | SEO | `\| Lextract \| Lextract` duplicate title on ~400 pSEO slug pages |
| C | **High** | JS | `__name is not defined` error fires on every page (regression, unfixed) |
| D | **High** | Ops | Sentry error tracking still dead (`ERR_ABORTED`) |
| E | **High** | UX/Perf | Processing page retries failed API call infinitely + wrong error message |
| F | **Medium** | Content | "125+" vs "126" field count inconsistency on /pricing, /fields, /workflows |
| G | **Medium** | Deploy | CSS chunk 404 with wrong MIME type (stale deployment artifact) |
| H | **Medium** | Deploy | Font file 404 (stale deployment artifact) |
| I | **Medium** | SEO | `llms.txt` missing `charset=utf-8` in Content-Type header |
| J | **Low** | Perf | 20+ duplicate RSC prefetch requests on landing page |

---

## Recommended Fix Order

1. **Bug A** (FAQ 500s) — Server crash affecting 8 indexed pages. Check the `/faq/[slug]` route for render errors.
2. **Bug B** (Duplicate titles) — SEO impact across ~400 pages. Fix the metadata template stacking in pSEO layout vs. page.
3. **Bug D** (Sentry dead) — Without error tracking, all other bugs are invisible in production.
4. **Bug E** (Infinite retry) — Add max retry + backoff to processing page polling; distinguish 404 from 5xx.
5. **Bug C** (`__name` error) — Investigate OpenNext/esbuild bundler config for the `__name` helper.
6. **Bug F** ("125+" copy) — Grep for "125" across MDX content and replace with "126".
7. **Bugs G, H** (Stale assets) — May self-resolve after next deployment; consider adding `_headers` file to return proper 404 for missing `_next/static` assets.
8. **Bug I** (llms.txt charset) — One-line header fix.
9. **Bug J** (RSC prefetch) — Investigate Next.js prefetch behavior; may need `prefetch={false}` on some Link components.
