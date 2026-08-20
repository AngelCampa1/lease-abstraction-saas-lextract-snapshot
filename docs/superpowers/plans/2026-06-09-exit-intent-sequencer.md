# Exit-intent Popup → Tailored Lead Magnet → Sequencer Nurture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the exit-intent popup capture just an email, hand the visitor a page-tailored lead magnet, and silently enroll them into a per-magnet Sequencer nurture track — all behind Turnstile.

**Architecture:** Frontend popup → `/api/leads/download` (Next route, server-side) → marketing-data Worker `/lead-magnet` endpoint → Sequencer `downloadLeadMagnet(slug,…)` which serves the asset AND auto-enrolls into the magnet's fulfillment sequence. Four tailored sequences (+~20 React-Email templates) are authored in the `sequencer` repo and each magnet is repointed to its own track.

**Tech Stack:** Next.js 16 / React 19 / TS strict / Tailwind 4 (lextract frontend) · Cloudflare Worker + `@sequencer/sdk` (marketing-data) · Hono + Drizzle + D1 + React-Email + YAML sequences (sequencer) · vitest.

**Repos:** `lextract` = this repository · `sequencer` = `<sequencer-repo>`. Each repo's code work happens in its own git worktree. Marketing copy (popup + all emails) MUST pass `humanizer` then `third-grade-copy`. Buttons are pills.

**Reference spec:** `docs/superpowers/specs/2026-06-09-exit-intent-sequencer-design.md`

---

## Phase 0 — Credentials & preflight (lextract)

### Task 0.1: Verify / provision Sequencer CF Access service token for lextract

**Files:** none (infra + secret manager)

- [ ] **Step 1:** Check whether `SEQUENCER_CF_ACCESS_CLIENT_ID` / `SEQUENCER_CF_ACCESS_CLIENT_SECRET` already exist for lextract: inspect Cloudflare Zero Trust → Access → Service Tokens for a `lextract` token, and the worker's deployed secrets. Also confirm Sequencer D1 `seq_api_tokens` has a row whose `access_service_token_id` maps to product `lextract` (see `sequencer/docs/product-client-integration.md`).
- [ ] **Step 2:** If missing: create one CF Access service token named `lextract`, store client id + secret in lextract's worker secret manager (and frontend env if used), and insert the `*.access` client id into Sequencer D1 `seq_api_tokens` per `production-config-values.md`. (Stakeholder can grant a Cloudflare login via Playwright if needed.)
- [ ] **Step 3:** Record the verified base URL `https://sequencer.ventoralabs.com` and confirm the four lextract magnets are seeded (`scripts/seq/lib/required-lead-magnets.ts`).

**Acceptance:** A `curl` to `POST /api/v1/lead-magnets/lease-abstraction-checklist/download` with the CF-Access headers returns `200` + `asset_url` (smoke test, throwaway email). If creds cannot be provisioned now, proceed — all new code degrades gracefully — and flag this as a deploy blocker.

---

## Phase 1 — lextract: popup, mapping, route, worker (worktree `feat/exit-intent-sequencer`)

### Task 1.1: Page → magnet mapping module

**Files:**
- Create: `frontend/lib/page-magnet-map.ts`
- Test: `frontend/__tests__/lib/page-magnet-map.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { magnetForPath } from '@/lib/page-magnet-map'

describe('magnetForPath', () => {
  it('maps CAM-related paths to the CAM checklist', () => {
    expect(magnetForPath('/red-flags/cam-overbilling')).toBe('cam-reconciliation-checklist')
    expect(magnetForPath('/clauses/operating-expense-gross-up')).toBe('cam-reconciliation-checklist')
  })
  it('maps diligence/acquisition paths to the due-diligence checklist', () => {
    expect(magnetForPath('/use-cases/acquisition-due-diligence')).toBe('due-diligence-checklist')
    expect(magnetForPath('/case-studies/portfolio-acquisition')).toBe('due-diligence-checklist')
  })
  it('maps audit/workflow/tool paths to the audit workbook', () => {
    expect(magnetForPath('/tools/lease-comparison')).toBe('lease-audit-workbook')
    expect(magnetForPath('/workflows/portfolio-qa')).toBe('lease-audit-workbook')
    expect(magnetForPath('/calculators/cam-cap')).toBe('lease-audit-workbook')
  })
  it('falls back to the lease-abstraction checklist as default', () => {
    expect(magnetForPath('/')).toBe('lease-abstraction-checklist')
    expect(magnetForPath('/pricing')).toBe('lease-abstraction-checklist')
    expect(magnetForPath('/fields/base-rent')).toBe('lease-abstraction-checklist')
  })
  it('is case-insensitive and tolerates trailing slashes', () => {
    expect(magnetForPath('/Red-Flags/CAM/')).toBe('cam-reconciliation-checklist')
  })
})
```

- [ ] **Step 2: Run test, verify it fails** — `cd frontend && npx vitest run __tests__/lib/page-magnet-map.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
import type { LeadMagnetSlug } from '@/data/lead-magnets'

const RULES: ReadonlyArray<{ test: RegExp; slug: LeadMagnetSlug }> = [
  { test: /\b(cam|operating-expense|reconciliation|gross-up)\b/i, slug: 'cam-reconciliation-checklist' },
  { test: /\b(due-diligence|diligence|acquisition|case-stud)/i, slug: 'due-diligence-checklist' },
  { test: /\b(audit|workbook|workflow|calculator|tool|template)/i, slug: 'lease-audit-workbook' },
]

const DEFAULT_MAGNET: LeadMagnetSlug = 'lease-abstraction-checklist'

export function magnetForPath(pathname: string): LeadMagnetSlug {
  const normalized = (pathname || '/').toLowerCase()
  for (const rule of RULES) {
    if (rule.test.test(normalized)) return rule.slug
  }
  return DEFAULT_MAGNET
}
```

> Note: confirm `LeadMagnetSlug` is exported from `frontend/data/lead-magnets.ts`; if only `LEAD_MAGNET_SLUGS` exists, add `export type LeadMagnetSlug = (typeof LEAD_MAGNET_SLUGS)[number]`.

- [ ] **Step 4: Run test, verify it passes.**
- [ ] **Step 5: Commit** — `git add frontend/lib/page-magnet-map.ts frontend/__tests__/lib/page-magnet-map.test.ts && git commit -m "feat(marketing): page->magnet mapping for exit popup"`

### Task 1.2: Rewrite ExitPopup to email-first + tailored + swappable

**Files:**
- Modify: `frontend/components/marketing/exit-popup.tsx`
- Test: `frontend/__tests__/marketing/exit-popup.test.tsx`

Behavior contract:
- On mount, compute `defaultSlug = magnetForPath(window.location.pathname)`; `selected` initializes to it.
- The tailored magnet is shown selected by default with its one-line description; the **email field is visible immediately** (no pre-selection step required).
- Primary CTA reads `Get the free <magnet.title>` (pill button).
- A `<button>`/disclosure "Want a different resource?" toggles a list of the other three magnets; selecting one updates `selected` + CTA label. (Swappable.)
- Submit posts to `/api/leads/download` with `{ email, magnetSlug: selected, placement:'exit-popup', sourcePath: window.location.pathname, company_website:'', turnstileToken }`.
- Copy never references emails-as-a-sequence; success says: "Your resource is ready, and we sent a copy to your inbox." Keep Turnstile + honeypot + PostHog events.

- [ ] **Step 1: Write/extend failing tests** covering: (a) renders the tailored magnet for a mocked pathname with email field visible and no forced picker; (b) shows the default magnet on `/`; (c) "Want a different resource?" reveals the other three and switching updates the CTA label; (d) happy-path submit calls `fetch('/api/leads/download', …)` with the selected slug + `sourcePath` and renders the success state with a Download Now link; (e) submit disabled until email valid + Turnstile token present. Mock `next/navigation`/`window.location.pathname`, `useAuth`, `fetch`, `captureEvent`, and `TurnstileField` (auto-emit a token).

```tsx
// sketch — flesh out with the project's existing test utilities/patterns
vi.mock('@/components/marketing/turnstile-field', () => ({
  TurnstileField: ({ onTokenChange }: { onTokenChange: (t: string) => void }) => {
    onTokenChange('test-token'); return null
  },
}))
// set pathname per test, e.g. Object.defineProperty(window, 'location', { value: { pathname: '/red-flags/cam' }, writable: true })
```

- [ ] **Step 2: Run tests, verify they fail.**
- [ ] **Step 3: Implement the rewrite.** Reuse existing `PROMOTED_LEAD_MAGNETS`, `FREEBIE_COPY`, Dialog, Turnstile, PostHog. Replace the "select one of four cards then reveal email" flow with: tailored card + email + Turnstile + CTA always present, and a collapsible "other resources" section. Keep `SESSION_KEY`, `TRIGGER_DELAY_MS`, mouse-leave trigger, and unauthenticated/once-per-session guards. **Run the popup copy through `humanizer` then `third-grade-copy` before finalizing strings.**
- [ ] **Step 4: Run tests, verify they pass;** run `npx vitest run __tests__/marketing/exit-popup.test.tsx` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git add frontend/components/marketing/exit-popup.tsx frontend/__tests__/marketing/exit-popup.test.tsx && git commit -m "feat(marketing): email-first, page-tailored exit popup"`

### Task 1.3: Add `/lead-magnet` endpoint to marketing-data Worker (Sequencer download+enroll)

**Files:**
- Modify: `workers/marketing-data/src/index.ts`
- Test: `frontend/__tests__/workers/marketing-data.test.ts` (existing worker test file — add cases here)

Contract: `POST /lead-magnet`, authed exactly like `/capture` — `Authorization: Bearer <MARKETING_WORKER_SECRET>` (see `isAuthorized` at index.ts:108-112). Route matched via `url.pathname === '/lead-magnet'` in the fetch switch (alongside `/capture`, `/unsubscribe` at index.ts:469-475). Body `{ email, magnetSlug, firstName?, company?, sourcePath?, placement? }`. Handler uses the **existing `callSequencer` helper** (raw fetch with CF-Access headers from `getSequencerConfig`) to `POST /api/v1/lead-magnets/${magnetSlug}/download` with body `{ email, first_name, source: placement ?? 'exit-popup', utm: { source_path: sourcePath } }` and an `Idempotency-Key: ${email}:${magnetSlug}` header. The worker does NOT use `@sequencer/sdk` (not a dependency). Parse `asset_url` from the response → return `{ success:true, downloadUrl: asset_url, emailed:true }`. If Sequencer config absent or the call throws on **enrollment**, still return any `asset_url` obtained; only a missing `asset_url` is a hard failure (`502`). Enrollment failure must not block download.

- [ ] **Step 1: Write failing tests:** (a) valid request → calls sequencer download with slug + payload, returns `downloadUrl`; (b) missing creds → returns graceful response/clear error without throwing; (c) bad secret → 401; (d) enrollment error path still returns `asset_url` when present. Stub the sequencer fetch.
- [ ] **Step 2: Run tests, verify they fail.**
- [ ] **Step 3: Implement.** Use the existing `callSequencer` helper hitting `/api/v1/lead-magnets/${magnetSlug}/download`. Add `if (request.method === 'POST' && url.pathname === '/lead-magnet')` to the worker's fetch switch, gated by `isAuthorized(request, env)`.
- [ ] **Step 4: Run tests, verify they pass.** `cd frontend && npx vitest run __tests__/workers/marketing-data.test.ts`.
- [ ] **Step 5: Commit** — `git add workers/marketing-data/src/index.ts workers/marketing-data/test/lead-magnet.test.ts && git commit -m "feat(marketing-worker): sequencer-backed lead-magnet download+enroll endpoint"`

### Task 1.4: Point `/api/leads/download` at the Worker; accept `sourcePath`

**Files:**
- Modify: `frontend/app/api/leads/download/route.ts`
- Test: `frontend/__tests__/api/leads/download.test.ts`

- [ ] **Step 1: Update tests** so the route, after Turnstile/honeypot/rate-limit/Apollo, calls the **worker** `/lead-magnet` (via `MARKETING_WORKER_URL` + `MARKETING_WORKER_SECRET`) instead of the backend `/leads/magnet`, forwards `magnetSlug` + new `sourcePath`, and returns `{ success, downloadUrl, emailed }` from the worker response. Keep existing abuse-protection tests. Mock worker fetch.
- [ ] **Step 2: Run tests, verify they fail.**
- [ ] **Step 3: Implement.** Add `sourcePath: z.string().optional()` to the schema. Replace the `${apiUrl}/leads/magnet` fetch block with a POST to `${MARKETING_WORKER_URL}/lead-magnet` with header `Authorization: Bearer ${MARKETING_WORKER_SECRET}` and body `{ email, magnetSlug, firstName, company, sourcePath, placement }`. Map worker `downloadUrl`→response. Keep Sentry breadcrumbs. If `MARKETING_WORKER_URL`/secret is unset, surface the existing error path.
- [ ] **Step 4: Run tests, verify they pass;** `npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git add frontend/app/api/leads/download/route.ts frontend/__tests__/api/leads/download.test.ts && git commit -m "feat(marketing): route lead-magnet download through sequencer worker"`

### Task 1.5: Env documentation

**Files:** Modify `frontend/.env.example`, `.env.example`, `workers/marketing-data/wrangler.jsonc` (already has `SEQUENCER_BASE_URL`; ensure secrets are documented), and `workers/marketing-data/README.md`.

- [ ] **Step 1:** Document `SEQUENCER_CF_ACCESS_CLIENT_ID` and `SEQUENCER_CF_ACCESS_CLIENT_SECRET` as worker secrets (not committed). Note that `/api/leads/download` now requires `MARKETING_WORKER_URL` + `MARKETING_WORKER_SECRET` for magnet delivery.
- [ ] **Step 2: Commit** — `git commit -m "docs(env): document sequencer worker secrets for lead-magnet delivery"`

### Task 1.6: Retire the legacy backend single-shot delivery (post-cutover cleanup)

**Files:** `backend/app/api/v1/leads.py` (`/leads/magnet`), `backend/app/services/email.py` (`send_lead_magnet_delivery`), related tests.

> Do this only after Tasks 1.3–1.4 are green and the worker path is verified, to avoid a no-delivery gap.

- [ ] **Step 1:** Remove (or guard behind a clearly dead flag) the `/leads/magnet` route and `send_lead_magnet_delivery`, plus their now-unused nurture step-0 templates. Update/remove `backend/tests/api/v1/test_leads.py` cases for that route. Keep `/leads/unsubscribe`.
- [ ] **Step 2:** Run `cd backend && python -m pytest tests/api/v1/test_leads.py -q` and the lead-magnet registry test → green.
- [ ] **Step 3: Commit** — `git commit -m "chore(backend): retire legacy single-shot lead-magnet delivery (moved to sequencer)"`

### Task 1.7: Full lextract verification

- [ ] `cd frontend && npx vitest run` (touched files ≥95% per-file) · `npm run lint` · `npx tsc --noEmit` · `npm run build`.
- [ ] `cd workers/marketing-data && npx vitest run`.
- [ ] `cd backend && python -m pytest` (if Task 1.6 done).
- [ ] Commit any fixups.

---

## Phase 2 — sequencer: four tailored nurture tracks (worktree `feat/lextract-magnet-sequences`)

> Repo: `<sequencer-repo>`. Reference: `sequencer/docs/product-client-integration.md`. All email copy passes `humanizer` then `third-grade-copy`. Pills for CTAs (`pillCtaStyle`). Brand color `#7c3aed`, productName `Lextract`.

### Task 2.1: Author email templates (per track)

**Files (create, one `.tsx` per email):** `packages/emails/src/templates/lextract/<track>-<step>.tsx`
**Register each in:** `packages/emails/src/template-catalog.ts` (`RENDERABLE_TEMPLATE_SLUGS`), `packages/emails/src/index.ts` (exports), `apps/api/src/lib/template-renderer.ts` (`templateMap`).

Template count: 4 tracks × ~5–6 unique emails. Reuse the existing `BaseLayout`, `pillCtaStyle`, `TemplateProps` shape from `templates/lextract/fulfillment-welcome.tsx`. Each template = default React component + `renderEmail(props)` named export.

Per-template recipe (repeat for every email):
- [ ] **Step A:** Create the `.tsx` following the existing lextract template structure (props: `firstName?`, `unsubscribeUrl`, `productName?`).
- [ ] **Step B:** Write the body + subject copy for the step's purpose (see track arcs below), then **run it through `humanizer` then `third-grade-copy`**. CTA is a pill linking to `https://lextract.io` signup/upload. Never mention "sequence" or "drip"; write as one helpful human.
- [ ] **Step C:** Register the slug in catalog + index + renderer `templateMap`.
- [ ] **Step D:** Add a render test (assert HTML renders, contains the unsubscribe URL and the CTA href) alongside existing `packages/emails/src/resource-nurture.test.ts` patterns.
- [ ] **Step E (per track, after its templates):** Commit — `git commit -m "feat(emails): lextract <track> nurture templates"`.

Track arcs (each step is a unique email; subjects are first-draft seeds to be humanized):
- **checklist** (`lease-abstraction-checklist`): 1) Here's your checklist + the 3 fields people miss · 2) Manual review vs. what software catches · 3) The red flags that cost the most · 4) See it on a real lease (upload CTA) · 5) From checklist to done in minutes.
- **cam** (`cam-reconciliation-checklist`): 1) Your CAM checklist + how to use it this week · 2) Caps, exclusions, gross-up — where landlords overbill · 3) A 4-step CAM reconciliation walkthrough · 4) Spotting management-fee stacking · 5) Audit your next CAM statement with Lextract · 6) What recovered overbilling looks like.
- **diligence** (`due-diligence-checklist`): 1) Your diligence checklist + a deal-week game plan · 2) Rent roll vs. lease truth · 3) Reading a lease stack under deadline · 4) The clauses that kill deals · 5) Batch a whole stack with Lextract · 6) Hand the team a report they can read.
- **audit** (`lease-audit-workbook`): 1) Your workbook + fastest way to start · 2) Portfolio QA without the spreadsheet sprawl · 3) Never miss a key date · 4) Standardize abstraction across a portfolio · 5) When to graduate from the workbook to Lextract · 6) Export reports stakeholders actually open.

### Task 2.2: Author the four sequence YAMLs

**Files (create):** `sequences/lextract/checklist-nurture.yaml`, `cam-nurture.yaml`, `diligence-nurture.yaml`, `audit-nurture.yaml`.

- [ ] **Step 1:** For each, define `slug` (`lextract-<track>-nurture`), `product: lextract`, `version: 1`, `goal: first_extraction`, `exit_conditions: [{event: first_extraction_completed},{event: unsubscribed}]`, `enroll: { trigger: lead_magnet_download, lead_magnet: <magnet-slug> }`, and `steps` referencing the Task 2.1 template slugs with delays `0m, 3d, 4d, 4d, 7d, 7d` and `skip_if: { first_extraction_completed: true }` (later steps add `replied: true`). Mirror the existing `lead-magnet-nurture.yaml` shape.
- [ ] **Step 2:** `pnpm seq compile` → expect success (validates YAML + that every template slug is known). Fix any unknown-slug errors.
- [ ] **Step 3: Commit** — `git commit -m "feat(sequences): four tailored lextract lead-magnet nurture tracks"`

### Task 2.3: Repoint each magnet to its own fulfillment sequence

**Files:** Modify `scripts/seq/lib/required-lead-magnets.ts`.

- [ ] **Step 1:** Change each lextract magnet's `fulfillmentSequenceSlug` from `lextract-lead-magnet-nurture` to its new track slug (checklist→`lextract-checklist-nurture`, cam→`lextract-cam-nurture`, diligence→`lextract-diligence-nurture`, audit→`lextract-audit-nurture`).
- [ ] **Step 2:** Regenerate seed SQL — `pnpm seq lead-magnet-sql --out dist/required-lead-magnets.sql`.
- [ ] **Step 3:** Run sequencer parser/route tests — `pnpm test` (or the targeted `scripts/seq/__tests__/parser.test.ts` + emails tests). Green.
- [ ] **Step 4: Commit** — `git commit -m "feat(lead-magnets): point lextract magnets at per-magnet nurture tracks"`

### Task 2.4: Sequencer verification

- [ ] `pnpm seq compile` clean · `pnpm test` green · template render tests cover every new template (≥95% per-file on touched files).

---

## Phase 3 — Review, merge, deploy

### Task 3.1: Code review (each repo) — REQUIRED before merge
- [ ] In the lextract worktree, invoke `superpowers:requesting-code-review`; fix every issue; re-run Task 1.7. Repeat until clean.
- [ ] In the sequencer worktree, invoke `superpowers:requesting-code-review`; fix every issue; re-run Task 2.4. Repeat until clean.

### Task 3.2: Merge
- [ ] Merge sequencer worktree to its master via `superpowers:finishing-a-development-branch`.
- [ ] Merge lextract worktree to master via `superpowers:finishing-a-development-branch`.

### Task 3.3: Deploy (after creds confirmed in Phase 0)
- [ ] **Sequencer:** `pnpm seq sync --remote`; apply `dist/required-lead-magnets.sql` to prod D1 (`wrangler d1 execute sequencer-db --remote --file dist/required-lead-magnets.sql`); deploy the worker per `sequencer/docs/deploy.md`.
- [ ] **marketing-data worker:** set `SEQUENCER_CF_ACCESS_CLIENT_ID/SECRET` secrets; `wrangler deploy` from `workers/marketing-data`.
- [ ] **lextract frontend:** manual `build:cf` then `deploy:cf` (per deploy mechanics — frontend is NOT auto-deployed). Backend auto-deploys on push to master.

### Task 3.4: Production smoke
- [ ] On a tailored marketing page (e.g. a CAM page), trigger the popup, submit a throwaway email, confirm: download link works, delivery email arrives, and the contact is enrolled in the correct per-magnet track (Sequencer dashboard / `getContactTimeline`). Confirm a homepage submit gets the default checklist track.

---

## Self-review notes
- Every spec requirement maps to a task: (1) email-only → 1.2; (2) silent sequence enrollment → 1.3/2.x; (3) Turnstile → preserved in 1.2/1.4; (4) page-tailored → 1.1/1.2. Delivery-via-sequencer → 1.3; merge+deploy → Phase 3; full-depth per-magnet sequences → 2.1–2.3.
- Email final copy is intentionally produced via the marketing-copy skills at author time (acceptance criteria), not pre-baked, because CLAUDE.md mandates those passes own the copy.
- Type consistency: `LeadMagnetSlug` (1.1) reused in route schema (1.4) and worker (1.3); `magnetForPath` name stable; worker endpoint `/lead-magnet` referenced identically in 1.3 and 1.4.
