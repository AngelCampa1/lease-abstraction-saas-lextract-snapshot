# Exit-intent popup → tailored lead magnet → Sequencer nurture

**Date:** 2026-06-09
**Status:** Approved (design); ready for implementation plan
**Repos touched:** `lextract` (this repository) and `sequencer` (`<sequencer-repo>`)

## Problem

The exit-intent popup still exists and is mounted in `frontend/app/(marketing)/layout.tsx`, but it
does not do what the business needs:

1. It forces the visitor to **pick** one of four lead magnets before entering an email. We want
   email-first capture: visitor enters just their email and gets a resource.
2. It delivers a **single** email (lextract backend → R2 presigned URL + one Resend send). The
   visitor is never enrolled in a nurture sequence. We want enrollment into a genuinely helpful
   sequence that sends more resources/info and moves them toward signing up. **The sequence must
   never be mentioned to the visitor** — UI copy only ever says "we'll send a copy to your inbox."
3. The same four choices show on every page. We want the offered resource **tailored to the page**
   the visitor is on.
4. Bot protection (Cloudflare Turnstile) must remain.

The Sequencer (`sequencer.ventoralabs.com`) already has the enrollment API, a TypeScript SDK
(`@sequencer/sdk`), seeded lextract lead magnets, and a `downloadLeadMagnet(slug, …)` endpoint that
**serves the asset and auto-enrolls in one call**. The lextract `workers/marketing-data` Worker
already holds a working Sequencer client (CF-Access service-token auth, `SEQUENCER_BASE_URL`
configured) but currently only enrolls a generic capture into `lextract-onboarding`.

## Decisions (locked with stakeholder)

- **Popup UX:** Email-first. Show ONE page-tailored resource selected by default; email field always
  visible; primary CTA `Get the free <resource>`. A quiet "Want a different resource?" disclosure
  reveals the other three (swappable).
- **Enrollment:** Via the Sequencer.
- **Page→magnet mapping:** Category-based by URL path, with a default.
- **Sequence content:** Author tailored sequences per magnet — **full depth, ~5–6 unique emails each**
  (~20+ new templates). Every email is topic-specific.
- **Credentials:** Probably already exist in Cloudflare; verify first. If missing, provision a CF
  Access service token (stakeholder can grant a Cloudflare login via Playwright). Code degrades
  gracefully (still serves a download) when creds absent.
- **Ship scope:** Merge **and** deploy both repos once green and reviewed.
- **Magnet delivery:** Move fully to the Sequencer (`downloadLeadMagnet` serves the file).

## Architecture

### Capture + delivery flow (target)

```
Visitor on a marketing page
  └─ ExitPopup (mouse-leave, 5s after load, unauthenticated, once per session)
       ├─ page-magnet-map.ts picks tailored magnet slug from window.location.pathname
       ├─ email field + Turnstile + honeypot
       └─ POST /api/leads/download  { email, magnetSlug, placement:'exit-popup',
                                       turnstileToken, company_website, sourcePath }
            ├─ verify Turnstile, honeypot, rate-limit (unchanged)
            ├─ Apollo CRM upsert (unchanged)
            └─ POST marketing-data Worker  /lead-magnet   (NEW worker endpoint)
                 └─ SequencerClient.downloadLeadMagnet(slug, { email, source, utm })
                      ├─ returns asset_url (presigned R2 from sequencer's lextract-lead-magnets)
                      └─ auto-enrolls contact into the magnet's fulfillment sequence
            ← { success, downloadUrl: asset_url, emailed:true }
       └─ success state: "Your resource is ready, and we sent a copy to your inbox." + Download Now
```

The Sequencer client lives in the **marketing-data Worker** (already has the CF-Access creds and
base URL), not in the Next.js frontend. The frontend route calls the worker over the existing
shared-secret channel. This avoids adding the private-registry SDK dependency to the frontend and
keeps Sequencer credentials in one place.

The legacy path (frontend route → lextract backend `/leads/magnet` → backend R2 + single Resend
email) is **removed** once the new path is green, to prevent double emails. The backend
`/leads/magnet` endpoint and `EmailService.send_lead_magnet_delivery` are retired (or left dormant
and unreferenced) in a dedicated cleanup step.

### Page → magnet mapping

`frontend/lib/page-magnet-map.ts` exports `magnetForPath(pathname: string): LeadMagnetSlug`.
Matching is by case-insensitive substring/segment of the path, first match wins, else default:

| Magnet slug | Trigger path keywords (examples) |
|---|---|
| `cam-reconciliation-checklist` | `cam`, `operating-expense`, `reconciliation`, red-flags/clauses about CAM |
| `due-diligence-checklist` | `due-diligence`, `diligence`, `acquisition`, `case-stud`, relevant use-cases |
| `lease-audit-workbook` | `audit`, `workbook`, `workflow`, `calculator`, `tools`, `templates` |
| `lease-abstraction-checklist` (default) | home, `features`, `pricing`, `fields`, `glossary`, `industries`, `locations`, `property-types`, `lease-types`, `about`, `resources`, everything else |

Mapping is unit-tested against a representative path list. The mapping is data-driven (ordered array
of `{ test: RegExp, slug }`) so new pages are easy to slot in.

### Sequencer: four tailored sequences

Each magnet gets its own fulfillment sequence (full depth, ~5–6 unique topic-specific emails),
exiting on `first_extraction_completed` / `unsubscribed`, each step `skip_if first_extraction_completed`
(and later steps `skip_if replied`). Arc per track: **deliver/frame the resource → 2–3 topic value
emails → 1–2 "move toward first extraction / signup" emails.**

| Magnet | New sequence slug | Theme |
|---|---|---|
| `lease-abstraction-checklist` | `lextract-checklist-nurture` | What the 126 fields catch; manual vs. automated review; first extraction |
| `cam-reconciliation-checklist` | `lextract-cam-nurture` | CAM caps/exclusions/gross-up; overbilling recovery; audit your CAM with Lextract |
| `due-diligence-checklist` | `lextract-diligence-nurture` | Lease-stack review under deadline; rent roll vs. lease truth; batch diligence |
| `lease-audit-workbook` | `lextract-audit-nurture` | Portfolio QA; key-date tracking; export reports; scale beyond the workbook |

Implementation in `sequencer` repo:
1. Author ~20+ React-Email templates under `packages/emails/src/templates/lextract/`, register each
   in `template-catalog.ts` (`RENDERABLE_TEMPLATE_SLUGS`), `index.ts` (exports), and
   `apps/api/src/lib/template-renderer.ts` (`templateMap`).
2. Add four sequence YAMLs under `sequences/lextract/`, each with
   `enroll: { trigger: lead_magnet_download, lead_magnet: <slug> }`.
3. Repoint each magnet's `fulfillmentSequenceSlug` in
   `scripts/seq/lib/required-lead-magnets.ts` to its new sequence; regenerate seed SQL.
4. `pnpm seq compile` → `pnpm seq sync --remote`; apply lead-magnet SQL to prod D1; deploy worker.

All popup copy and all email copy pass through the **humanizer** then **third-grade-copy** skills
before they are considered done (per CLAUDE.md marketing-copy rule). Buttons are pills (design canon).

## Components / files

### lextract repo
- `frontend/components/marketing/exit-popup.tsx` — rewritten email-first + tailored + swappable.
- `frontend/lib/page-magnet-map.ts` — NEW, page→magnet mapping (+ test).
- `frontend/app/api/leads/download/route.ts` — call worker `/lead-magnet` instead of backend; accept
  `sourcePath`; keep Turnstile/honeypot/rate-limit/Apollo.
- `workers/marketing-data/src/index.ts` — NEW `/lead-magnet` endpoint using
  `SequencerClient.downloadLeadMagnet`; reuse existing `getSequencerConfig`/`callSequencer`.
- `frontend/.env.example`, `.env.example`, `backend/.env.example`, worker `wrangler.jsonc` — env docs.
- Remove/retire backend `/leads/magnet` + `send_lead_magnet_delivery` after cutover (separate step).
- Tests: `__tests__/marketing/exit-popup.test.tsx`, page-map test, `__tests__/api/leads/download.test.ts`,
  worker test for `/lead-magnet`.

### sequencer repo
- `packages/emails/src/templates/lextract/*.tsx` (~20+ new), `template-catalog.ts`, `index.ts`,
  `apps/api/src/lib/template-renderer.ts`.
- `sequences/lextract/{checklist,cam,diligence,audit}-nurture.yaml` (4 new).
- `scripts/seq/lib/required-lead-magnets.ts` (repoint fulfillment slugs).
- Tests: `packages/emails` template tests; `scripts/seq/__tests__/parser.test.ts`; route tests.

## Error handling
- Turnstile / honeypot / rate-limit failures: return generic error (no enumeration) — unchanged.
- Sequencer unreachable or creds absent: worker still returns a usable `downloadUrl` if it can obtain
  one; if download itself fails, frontend shows the existing "Something went wrong" error and the
  visitor can retry. Enrollment failure must NOT block the download response.
- `downloadLeadMagnet` `no_sequence` status: still serve the asset; log a warning (means a magnet is
  not repointed yet). After cutover all four magnets have sequences, so this should not occur in prod.
- Idempotency: pass an idempotency key (email+slug) to avoid duplicate enrollments on retries.

## Testing strategy
- Frontend: vitest — popup renders tailored magnet per path, email-only happy path, swap disclosure,
  Turnstile gating, error state; page-map exhaustive cases; route handler maps to worker and returns
  `downloadUrl`. Mocks only at external boundaries (worker fetch, Turnstile, Apollo).
- Worker: unit test `/lead-magnet` calls `downloadLeadMagnet` with correct slug/payload and forwards
  `asset_url`; degrades gracefully without creds.
- Sequencer: `pnpm seq compile` validates YAML + template slugs; template render tests; parser tests.
- 95% per-file coverage on every touched file (both repos), per CLAUDE.md.

## Out of scope
- The generic `lextract-onboarding` capture enrollment in the worker (unchanged).
- Redesigning other popups (email-gate, results survey).
- Net-new lead magnet assets — reuse the four existing seeded magnets/files.

## Open items to confirm during build
1. Verify CF Access service token for lextract exists; if not, provision and store
   `SEQUENCER_CF_ACCESS_CLIENT_ID/SECRET` (frontend/worker secret manager) + insert client id into
   Sequencer D1 `seq_api_tokens`.
2. Final copy for ~20+ emails (subject + body) authored through humanizer + third-grade-copy.
