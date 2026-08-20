# Engineering log

A dated record of specific events pulled from the working notes in `docs/`: a bug and what it
revealed, a decision and what forced it, each citing the file it came from. This is not a second
copy of [ARCHITECTURE.md](ARCHITECTURE.md); it is the incident history underneath it. Where a
source file carries no date, that is stated rather than guessed.

## Contents

- [2026-03-03: Three orientation docs, forced by parallel agents](#2026-03-03-three-orientation-docs-forced-by-parallel-agents)
- [2026-03-24: Auth is completely broken for logged-in users](#2026-03-24-auth-is-completely-broken-for-logged-in-users)
- [2026-03-24: A UUID compared against a string, always false](#2026-03-24-a-uuid-compared-against-a-string-always-false)
- [2026-03-24 (round 2): Eight indexed pages return 500](#2026-03-24-round-2-eight-indexed-pages-return-500)
- [2026-03-26: The real auth root cause: a 5-minute session cache](#2026-03-26-the-real-auth-root-cause-a-5-minute-session-cache)
- [2026-04-10: A conversion number forces an upload-page redesign](#2026-04-10-a-conversion-number-forces-an-upload-page-redesign)
- [2026-04-11: Same-day accessibility fix, verified by re-running the scan](#2026-04-11-same-day-accessibility-fix-verified-by-re-running-the-scan)
- [2026-04-25: A pricing table gets a "last verified" date](#2026-04-25-a-pricing-table-gets-a-last-verified-date)
- [2026-05-06: A public sample page asks anonymous visitors for an email](#2026-05-06-a-public-sample-page-asks-anonymous-visitors-for-an-email)
- [2026-05-06: Production auth breaks again, for a different reason](#2026-05-06-production-auth-breaks-again-for-a-different-reason)
- [2026-05-07: A PDF export opens a tab instead of downloading](#2026-05-07-a-pdf-export-opens-a-tab-instead-of-downloading)
- [2026-06-12: The Railway bill forces a one-day rewrite](#2026-06-12-the-railway-bill-forces-a-one-day-rewrite)
- [Undated: the bug-pinning convention itself](#undated-the-bug-pinning-convention-itself)

---

### 2026-03-03: Three orientation docs, forced by parallel agents

**Source:** `docs/plans/2026-03-03-architecture-design.md`

At this point the codebase did not exist yet: only a PRD and research files. The plan's own
"Context" section states the forcing constraint directly: multiple Claude Code agents were about
to build the system in parallel using git worktrees, and they needed a central reference to orient
themselves "without reading the full PRD every session." The decision was three files, not one:
`docs/ARCHITECTURE.md` (deep technical reference, laid out spatially: layout, data, contracts),
`docs/USER_FLOWS.md` (numbered step sequences per journey, for agents working on UI or pipeline
logic), and a lightweight `CLAUDE.md` (~30 lines, auto-loaded every session, stack-at-a-glance plus
pointers to the other two). The repo tree sketched in this plan still shows the original
`Vercel` + `Railway` layout and a flat `docs/` location for the two reference docs, both since
superseded, the first by the [Cloudflare rewrite](#2026-06-12-the-railway-bill-forces-a-one-day-rewrite)
and the second by the move into `portfolio/`.

---

### 2026-03-24: Auth is completely broken for logged-in users

**Source:** `docs/e2e-bug-report-2026-03-24.md`

The first recorded Playwright end-to-end pass found the entire authenticated API returning 401.
`getSession()` on the frontend returned an opaque session token, not a JWT; `frontend/lib/
api.ts:getAuthHeaders()` sent it as `Authorization: Bearer <opaque-token>` anyway, and
`backend/app/core/security.py:verify_jwt()` tried to decode it as an RS256 JWT against JWKS, which
threw `jwt.DecodeError`. The report calls this "the two systems are misaligned": the frontend
needed a real JWT before calling the backend, not the raw session token. Dashboard, profile,
credits balance, and upload were "all broken" for every registered user. This bug was still not
fully resolved two days later; see the [2026-03-26 entry](#2026-03-26-the-real-auth-root-cause-a-5-minute-session-cache)
for the actual root cause.

The same pass also found `/privacy` and `/terms` both 404ing off the footer, and a bundler artifact
(`ReferenceError: __name is not defined`) firing on every single page load: an OpenNext/esbuild
issue, not application logic.

---

### 2026-03-24: A UUID compared against a string, always false

**Source:** `docs/e2e-bug-report-2026-03-24.md`, Bug 2

Anonymous uploads returned 201 and queued correctly, but every subsequent status poll returned 404:
anonymous users could never see their own extraction progress. The cause was a Python type
mismatch in `backend/app/api/v1/extractions.py:_verify_ownership()`: it compared
`record.get("anonymous_session_id")`, a `uuid.UUID` object returned by `psycopg`, against
`str(current_user.id)`, a plain string. `uuid.UUID('…') != '…'` is always `True` in Python, so
the ownership check failed unconditionally and raised 404 regardless of whether the session
actually owned the extraction. The same class of bug was present in the `user_id` branch for
authenticated users too. The fix recorded in the report is a one-line wrap:
`str(record.get(...)) != str(current_user.id)`.

---

### 2026-03-24 (round 2): Eight indexed pages return 500

**Source:** `docs/e2e-bug-report-round2-2026-03-24.md`

A same-day follow-up audit (regression-testing the 15 bugs above plus new coverage across the
pSEO surface, mobile, and accessibility) found all 8 `/faq/[slug]` pages in the sitemap crashing
with HTTP 500 and an empty body, "an unhandled exception in the server-side render." It also
scored the regression set explicitly: **5 fully fixed, 3 partially fixed, 3 not fixed, 4
unverifiable** (the auth-dependent bugs above could not be checked without login credentials in
this pass). Duplicate `| Lextract | Lextract` page titles, present on individual hub pages before,
had spread to roughly 400 pSEO slug pages across all 18 verticals: the hub-level layout and the
individual page metadata both appended the suffix, so they stacked. Lighthouse scores on the pages
that did render were strong: Performance 99, Accessibility 95, Best Practices 96, SEO 100.

---

### 2026-03-26: The real auth root cause: a 5-minute session cache

**Source:** `docs/e2e-status-2026-03-26.md`

> This file is marked in its own header as "Historical artifact (Textract-era pipeline)":
> captured before the Gemini 3 Flash / OpenRouter / R2 migration. Its auth root-cause finding is
> cited here on its own merits; its pipeline stage names and timings describe a system this
> repository no longer runs.

The auth failures from two days earlier turned out not to be the frontend/backend JWT mismatch
first suspected: that was a symptom. The actual root cause: the Neon Auth SDK cached
`get-session` responses in a signed cookie for five minutes. A cached response was plain JSON with
no headers attached, so the `set-auth-jwt` header the frontend needed was simply absent for the
entire cache TTL after every login or signup. Commit `bb1f170` first tried a 600ms retry on
`get-session` as a workaround (later superseded); the actual fix, commit `8215477`, switched
`getAuthHeaders()` to call `/api/auth/token` instead, bypassing the cache entirely. With that fix
in place, this pass recorded a long list of previously-untestable flows now passing end to end:
full upload-to-results pipeline (~3 minutes), all three export formats, Stripe checkout opening
correctly, and credit balance updates reflecting immediately after a simulated webhook.

The same document separately flags a CORS bug that was still open: `POST /payments/use-credit`
preflight returned 405 with no `Access-Control-Allow-Origin` header. The stated root cause is a
Starlette ordering issue: `RateLimitMiddleware`, a `BaseHTTPMiddleware` subclass, ran before
`CORSMiddleware` in the stack, which can prevent the pure-ASGI `CORSMiddleware` from intercepting
`OPTIONS` requests. The documented fix is to make `CORSMiddleware` the outermost middleware.

---

### 2026-04-10: A conversion number forces an upload-page redesign

**Source:** `docs/superpowers/plans/2026-04-10-upload-page-cro.md`

The plan states its forcing metric in the first line of its Goal: increase the
`upload_file_selected` rate on `/upload` from roughly 9% to 20%+. The chosen mechanism was
showing proof before asking for the upload: a new `SampleTeaser` component rendering 5
hardcoded extracted fields with confidence badges, plus a restructured page that leads with a
dual call-to-action row and the teaser ahead of the dropzone. No new API calls or server-side
changes were required; this was framed and scoped as a pure frontend/content change against an
existing pipeline.

---

### 2026-04-11: Same-day accessibility fix, verified by re-running the scan

**Source:** `docs/audit/REPORT.md`

An axe-core WCAG-AA scan against the local stack scored the product **13 / 20**
("Acceptable: significant work needed") across accessibility, performance, responsive design,
theming, and anti-patterns, with 32 total findings (3 P0, 12 P1, 11 P2, 6 P3). The top finding: the
upload dropzone's file input had no accessible label at all (`frontend/components/upload/
dropzone.tsx:87`), a critical axe `label` violation that blocks screen-reader users outright. A
second P0 was structural: the `(auth)` layout wrapped its children in a plain `<div>` with no
`<main>` landmark and no `<h1>` on either `/login` or `/signup`.

The same file records same-day verification, not just the findings: an "After-Fix Verification"
section re-ran axe-core against the fixed build and reports 0 violations across every surface
that previously failed: home (was 0), `/pricing` desktop (was 10 → 0), `/pricing` mobile (was 6
→ 0), `/login` and `/signup` (were 8 to 10 each → 0), `/upload` in all four theme/viewport
combinations (was 4 each → 0), alongside "Full frontend test suite: 1881 / 1881 passing" and a
clean `tsc --noEmit`. The report also separately assesses whether the product "looks
AI-generated" and calls out specific tells that were not fixed in this pass: a hero-metric card
grid on the dashboard, a five-across uniform card grid on the landing page, a persistent floating
feedback pill that covers content on mobile, filed as P1/P2 design debt rather than
accessibility defects.

---

### 2026-04-25: A pricing table gets a "last verified" date

**Source:** `packages/extract-sdk/src/extract_sdk/extraction/pricing.py`, lines 13 and 32

The Python SDK's hand-maintained per-model OpenRouter pricing table carries a comment, "Last
verified: 2026-04-25," and a second comment on the table itself: "Verified live against OpenRouter
on 2026-04-25." This is the one piece of evidence in the repository for when that table was last
checked against reality. The root README's [multi-pass extraction
section](../README.md#multi-pass-extraction-as-it-actually-ships) already names the consequence:
production never used this table at all, trusting OpenRouter's own reported cost per call instead,
so the table's staleness never actually mattered to what shipped, even though it is presented in
the SDK as authoritative.

---

### 2026-05-06: A public sample page asks anonymous visitors for an email

**Source:** `docs/e2e-bug-report-2026-05-06.md`

`/results/sample` is meant to be inspectable by anyone, with no account, as the product's public
demo. This pass found an anonymous email-gate dialog ("Your extraction is ready!") covering the
sample teaser instead, blocking a page linked from the upload page as "See all 126 fields." Root
cause: `ResultsContent` opened the anonymous email gate for every unpaid, completed teaser without
excepting the special `SAMPLE_EXTRACTION_ID`: `TeaserView` already had that exception, but
`ResultsContent` did not apply it consistently. The fix excluded `SAMPLE_EXTRACTION_ID` from both
`emailGateOpen` and `needsEmailGate` in `frontend/components/results/results-content.tsx`, with
regression coverage added to `frontend/__tests__/results/teaser-view.test.tsx`, and the report
records the TDD cycle explicitly: a targeted test run failed red before the fix (dialog present),
passed green after, and the full `teaser-view.test.tsx` file passed with 77 tests.

The same report separately fixed a build-time issue: `npx tsc --noEmit` could not resolve
`*.html` module imports from `../workers/marketing-data/src/nurture-templates.ts` because
`frontend/tsconfig.json` did not include that package's `html.d.ts` declaration file. Fixed by
adding the include.

---

### 2026-05-06: Production auth breaks again, for a different reason

**Source:** `docs/audit/prod-auth-e2e-followup-2026-05-06.md`

A second, dedicated production-auth follow-up on the same day found logged-in users still getting
`Failed to load dashboard data` with `0 credits` shown, even though `GET /api/auth/token` on the
frontend returned 200. `GET /api/v1/payments/credits` and `GET /api/v1/user/dashboard` on the
backend both returned 401 with `Invalid token format`. This time the root cause was a URL
mismatch, not a caching bug: the frontend's auth proxy correctly validated sessions through
`${NEON_AUTH_BASE_URL}/get-session`, but the backend's opaque-token fallback called
`${NEON_AUTH_BASE_URL}/api/auth/get-session`, and production's `NEON_AUTH_BASE_URL` already
included the Better Auth route root (`/neondb/auth`), so the backend's constructed URL pointed at
a route that did not exist, which surfaced as the same JWT-decode failure seen in March. The report
marks this fixed and verified in production. The two incidents (the [March 26 cache
bug](#2026-03-26-the-real-auth-root-cause-a-5-minute-session-cache) and this one) share a
symptom (401s on every authenticated call) but have unrelated causes, which is worth noting on its
own: the same failure mode recurred twice from two different places in the auth path.

---

### 2026-05-07: A PDF export opens a tab instead of downloading

**Source:** `docs/audit/prod-e2e-remaining-bugs-2026-05-07.md`

A dedicated production sweep covering the cases an earlier May 7 audit had left open (fresh paid
extraction, credit unlock, all three export formats, malformed uploads, mobile viewports, signed-
out access, delete cleanup) found that selecting a PDF export opened a signed R2 URL directly in a
new browser tab, instead of triggering a download the way DOCX and XLSX already did. The fix added
an authenticated backend export-download endpoint that streams the completed export through the
API origin rather than exposing the signed R2 URL to the browser, and changed both the cached and
async export-completion handlers to fetch that endpoint as a blob and trigger a client-side
download. Vitest coverage was added proving neither export path calls `window.open`.

The same pass fixed a labeling gap: exported reports listed red flags under a plain "Red Flags"
heading with no indication they were an appendix. DOCX and PDF headings became "Appendix: Red
Flags"; XLSX gained a dedicated "Appendix - Red Flags" sheet with Field, Severity, and Description
columns. The report's own verification section is unusually explicit about the TDD cycle: three
named pytest tests and one Vitest test are listed as failing red before the implementation, then
the full backend export suite (115 tests), the full relevant frontend suite (76 tests), and a full
project-wide check (lint, `tsc --noEmit`, `vitest run --coverage`, `npm run build`, `ruff`,
`black`, `mypy`, and `pytest --cov` at "1214 passed, 5 skipped, total coverage 96.25%") are all
listed as passing green afterward.

---

### 2026-06-12: The Railway bill forces a one-day rewrite

**Source:** `docs/superpowers/plans/2026-06-12-cloudflare-native-backend.md`

The plan's stated Goal is a cost decision, not a technical one: "Eliminate the Railway bill by
replacing the Railway FastAPI web service, Celery worker, and Redis broker with Cloudflare
Workers-native API, Workflows, Queues, and R2 bindings while keeping Neon/Postgres for now." The
"Current Evidence" section names the constraint concretely: the traffic was bursty (a lease
arrives, minutes of real work happen, then nothing for hours), so an always-on Railway service was
paying for idle time by design. The plan runs 1,091 lines and opens by requiring the executing
agents to run under the `superpowers:subagent-driven-development` sub-skill specifically: the
non-negotiable design standards it lays out (routes parse and delegate only, SQL lives only in
repositories, one module owns state transitions, one module owns R2 key construction, every
external API sits behind an adapter) exist because the plan had to be followable by an executor
with no room to use judgement to fill a gap, which is also why it needed to run 1,091 lines rather
than a shorter, judgement-assuming one. The root README's [Built with AI
agents](../README.md#built-with-ai-agents) section states this executed as 29 commits in a single
day against this plan. What that rewrite kept and what it dropped is covered in the root README's
[the rewrite](../README.md#the-rewrite-python-to-cloudflare-native-and-what-it-cost) and [the
design that did not ship](../README.md#the-design-that-did-not-ship) sections, not repeated here.

---

### Undated: the bug-pinning convention itself

**Source:** `backend/tests/test_field_editor_cas_bug.py`,
`backend/tests/integration/test_credit_race_conditions.py`

Two files worth naming even without a date, because the convention they represent is real
evidence on its own: `test_field_editor_cas_bug.py`'s module docstring opens "Test for Bug #3:
Field editor `red_flags` update lacks CAS protection," describing a concurrent-edit bug where the
`extracted_data` write had a compare-and-swap guard on `updated_at` but the following `red_flags`
write did not, letting a concurrent edit leave the two fields inconsistent. Neither this file nor
`test_credit_race_conditions.py` records when its bug was found (no date in the file, no
companion report referencing it by name), so, per this log's own standard, that date is stated
as unknown rather than invented. See [TESTING.md's bug-pinning
section](TESTING.md#the-bug-pinning-convention) for what the convention itself looks like across
the suite.
