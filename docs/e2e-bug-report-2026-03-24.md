# E2E Bug Report — lextract.io
**Date:** 2026-03-24
**Method:** Playwright end-to-end smoke test (landing page → signup → upload → processing → results → payment → dashboard)
**Tester:** Claude Code (automated)

---

## Critical

### Bug 1 — Entire Authenticated API Broken (All API calls return 401)
- **Where:** All endpoints at `api.lextract.io`
- **What:** `getSession()` returns an opaque session token (`rULLN7W2VeLoW…`), not a JWT. The frontend sends `Authorization: Bearer <opaque-token>`. The backend tries to decode it as an RS256 JWT → `jwt.DecodeError` → "Invalid token format" → 401 on every request.
- **Root cause:** `frontend/lib/api.ts:getAuthHeaders()` reads `data.session.token` (an opaque string returned by the Neon Auth `get-session` endpoint), but `backend/app/core/security.py:verify_jwt()` expects an RS256-signed JWT validated against JWKS. The two systems are misaligned — the frontend needs to obtain a JWT (not the raw session token) before calling the backend.
- **Impact:** Dashboard, profile, credits balance, and upload for logged-in users are **all broken**. Every feature behind auth is non-functional for registered users.

---

### Bug 2 — Anonymous Extraction Polling Returns 404 (UUID Type Mismatch)
- **Where:** `GET /api/v1/extractions/{id}` for anonymous sessions; `backend/app/api/v1/extractions.py:_verify_ownership()`
- **What:** Anonymous upload returns 201 (extraction created and queued). Every subsequent status poll returns 404. Anonymous users can never see their extraction progress or results.
- **Root cause:** `_verify_ownership()` compares `record.get("anonymous_session_id")` — a Python `uuid.UUID` object returned by psycopg — against `str(current_user.id)` (a string). In Python, `uuid.UUID('…') != '…'` is always `True`, so the ownership check always fails and raises 404. The same logic bug is present in the `user_id` branch for authenticated users.
- **Fix:** Wrap the record value: `str(record.get("anonymous_session_id")) != str(current_user.id)`.

---

### Bug 3 — Dashboard Renders Blank After Page Reload
- **Where:** `/dashboard` after signup or any hard reload
- **What:** After signup the user lands on `/dashboard`, which immediately shows "Loading dashboard." On reload the page renders as a completely empty shell — only the toast notification region, no nav, no content.
- **Steps to reproduce:** Sign up → auto-redirect to `/dashboard` → reload page.
- **Note:** Closely related to Bug 1 (API returns 401, so data never loads), but the blank render happens even before the API calls resolve.

---

## High

### Bug 4 — Sign-Out Doesn't Redirect or Fully Clear Session
- **Where:** User menu → "Sign out"
- **What:** Clicking "Sign out" clears the `__Secure-neon-auth.local.session_data` cookie but does **not** clear the `__Secure-neon-auth.session_token` cookie. The page stays on the current URL and the user still appears logged in. A manual reload continues to show the logged-in state.
- **Expected:** All session cookies cleared, redirect to `/login` or `/`.

---

### Bug 5 — `/privacy` and `/terms` Return 404
- **Where:** `https://lextract.io/privacy`, `https://lextract.io/terms` — both linked from the footer
- **What:** Both pages show the generic "Page not found" error. The pages do not exist.
- **Risk:** Legal and compliance exposure; breaks trust for paying customers who follow footer links.

---

### Bug 6 — Auth Redirect Loses Return URL
- **Where:** Middleware-protected routes: `/dashboard`, `/results/:id`, `/profile`
- **What:** When an unauthenticated user visits a protected route they are redirected to `/login` with no `?return=…` query parameter. After logging in they land on the default post-login page and lose their original destination.
- **Key scenario:** A user who clicked "Unlock for $15", completed Stripe checkout, and was redirected to `/results/{id}?payment=success` while not logged in — they will not reach the results page after login.

---

## Medium

### Bug 7 — JavaScript Error `__name is not defined` on All Pages
- **Where:** Every page (marketing and app routes)
- **What:** `ReferenceError: __name is not defined` fires at `https://lextract.io/:10:11` on every page load. This is an OpenNext/esbuild bundler artifact where the `__name` helper function is referenced before it is defined.
- **Risk:** Could cause unpredictable failures in any runtime code path that touches the affected module. Appears on every page, logged-in and logged-out.

---

### Bug 8 — Page Title "Lextract" Duplicated on Most Pages
- **Where:** Most marketing and pSEO pages (inconsistent — some pages are correct)
- **What:** Titles end with `| Lextract | Lextract`. Example: `"AI Lease Abstraction Software — 126 Fields, $15/Lease | Lextract | Lextract"`.
- **Not affected:** Auth pages (`/login`, `/signup`), some content routes (`/glossary`, `/resources/articles`, individual article pages).
- **SEO impact:** Duplicate brand name hurts click-through rate and looks broken in SERPs and social share cards.

---

### Bug 9 — Processing Page Shows "Server Error" for Missing Extraction (Should Be "Not Found")
- **Where:** `/processing/{invalid-uuid}`
- **What:** Shows "Something went wrong — We encountered a server error while loading your extraction. Please try again later." The `/results/{invalid-uuid}` page correctly shows "Extraction not found." The processing page conflates 404 with 500/503.
- **Fix:** Handle 404 separately in the processing page's error state and show "Extraction not found" instead.

---

### Bug 10 — Sentry Error Tracking Dead (403)
- **Where:** All pages
- **What:** `POST https://oXXXXXXXXXXXXXXXX.ingest.us.sentry.io/…/envelope/` returns 403 on every page. Production errors are not being captured in Sentry.
- **Risk:** All the above bugs are invisible in Sentry. No alerts, no stack traces.

---

### Bug 11 — Cloudflare Analytics Blocked by CSP
- **Where:** All pages
- **What:** `static.cloudflareinsights.com/beacon.min.js` is blocked by the `script-src` Content Security Policy. Cloudflare Web Analytics is not loading on any page.
- **Fix:** Add `https://static.cloudflareinsights.com` to the `script-src` directive (or add a dedicated `script-src-elem` entry).

---

### Bug 12 — Unused Font Preload Warning
- **Where:** All pages
- **What:** `83afe278b6a6bb3c-s.p.3a6ba036.woff2` is preloaded via `<link rel="preload">` but not used within a few seconds of `window.load`. Generates a browser warning and wastes a preload slot.

---

## Low

### Bug 13 — Field Count Inconsistency: "125+" vs "126"
- **Where:** Landing page hero badge and "How It Works" step 2 say "125+ fields"; the page heading, pricing section, and upload page say "126 fields" or "126 key terms."
- **Fix:** Standardize on "126 fields" everywhere.

---

### Bug 14 — `/upload` Shows App Nav and "AC" Avatar for Anonymous Users
- **Where:** `/upload` (intentionally excluded from the auth middleware matcher)
- **What:** Anonymous users see the app-shell navigation (Dashboard, Upload links) and an "AC" placeholder avatar. The logo links to `/dashboard`, which immediately redirects anonymous users to `/login`. The experience is confusing and looks broken.
- **Expected:** Anonymous users on `/upload` should see a marketing-style header or a prompt to sign in, not a broken app shell.

---

### Bug 15 — `llms.txt` Has UTF-8 Encoding Issue
- **Where:** `https://lextract.io/llms.txt`
- **What:** Em dash characters (`—`) are served as raw UTF-8 bytes interpreted as Latin-1, appearing as `â€"`. LLMs indexing this file will see garbled text.
- **Fix:** Ensure the response is served with `Content-Type: text/plain; charset=utf-8`.

---

## Summary

| # | Severity | Area | Description |
|---|----------|------|-------------|
| 1 | Critical | Auth | Opaque token sent as Bearer JWT → 401 on all API calls |
| 2 | Critical | Anonymous flow | `uuid.UUID != str` in `_verify_ownership` → always 404 |
| 3 | Critical | Dashboard | Blank page on reload |
| 4 | High | Auth | Sign-out doesn't redirect or clear session |
| 5 | High | Legal | `/privacy` and `/terms` are 404 |
| 6 | High | Auth | Login redirect loses return URL |
| 7 | Medium | JS | `__name is not defined` on all pages |
| 8 | Medium | SEO | `| Lextract | Lextract` duplicate title on most pages |
| 9 | Medium | UX | Processing page shows "server error" instead of "not found" |
| 10 | Medium | Ops | Sentry 403 — error tracking dead |
| 11 | Medium | Analytics | CSP blocks Cloudflare Analytics |
| 12 | Medium | Perf | Unused font preload warning |
| 13 | Low | Content | "125+" vs "126" field count inconsistency |
| 14 | Low | UX | `/upload` shows app nav with "AC" avatar for anonymous users |
| 15 | Low | SEO | `llms.txt` em dash encoded as `â€"` |

---

## Recommended Fix Order

1. **Bug 1** (Auth token mismatch) — blocks all logged-in functionality. Likely requires the frontend to call a token-exchange endpoint that returns a proper JWT, or the backend to accept the Neon Auth session token directly.
2. **Bug 2** (`_verify_ownership` type mismatch) — one-line fix, unblocks the entire anonymous upload flow.
3. **Bug 5** (Privacy/Terms 404) — legal risk, should be quick to add pages or redirect to a policy document.
4. **Bug 4** (Sign-out) — investigate the Neon Auth sign-out method; ensure `session_token` cookie is cleared and redirect fires.
5. **Bug 3** (Blank dashboard) — likely resolves once Bug 1 is fixed; investigate separately if not.
6. **Bug 6** (Return URL) — add `?return=<path>` to the middleware redirect and handle it post-login.
7. **Bug 8** (Duplicate title) — fix the metadata template in the affected route group layouts.
8. **Bug 10** (Sentry 403) — verify DSN and project auth token in Railway environment variables.
9. **Bug 11** (CSP / Cloudflare) — update `next.config` headers.
10. Bugs 7, 9, 13–15 — cleanup pass.
