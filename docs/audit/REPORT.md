# Lextract UI/UX Audit — 2026-04-11

## After-Fix Verification (same day)

Axe-core re-run against `localhost:3000` with the fixes applied:

| Surface | Before | After |
|---|---|---|
| `/` home (desktop + mobile, light + dark) | 0 | **0** ✓ |
| `/pricing` desktop light | 10 | **0** ✓ |
| `/pricing` mobile light | 6 | **0** ✓ |
| `/login` (all variants) | 8 each | **0** ✓ |
| `/signup` (all variants) | 10 each | **0** ✓ |
| `/upload` desktop light | 4 | **0** ✓ |
| `/upload` desktop dark | 4 | **0** ✓ |
| `/upload` mobile light | 4 | **0** ✓ |
| `/results/sample` (all variants) | 0 | **0** ✓ |

Full frontend test suite: 1881 / 1881 passing. `tsc --noEmit`: clean. Raw after-axe JSON: `docs/audit/axe-after3.json`. After-screenshots: `docs/audit/z*.png`.

---


**Target:** Production `https://lextract.io` (live). **Scope:** landing (`/`), `/pricing`, `/login`, `/signup`, `/upload` (anon + authed), `/dashboard`, `/profile`, `/results/sample`. SEO pages explicitly excluded.
**Method:** playwright-cli snapshots at 1440×900 + 390×844, light + dark themes, axe-core 4.10 WCAG-AA scan, console + network capture, static code grep.
**Screenshots + raw axe JSON:** `docs/audit/*.png`, `docs/audit/axe-*.json`.

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | **2 / 4** | Critical unlabeled file input on upload, 9× WCAG contrast fails on pricing, auth pages have no `<main>` landmark or `h1`. |
| 2 | Performance | **3 / 4** | Animations use transform/opacity, images lazy-loaded, no `useEffect` data fetching. Sentry DSN returns 403 on every page (no perf cost, but signal lost). |
| 3 | Responsive Design | **3 / 4** | Mobile layouts work, but pricing comparison table has horizontal scroll without keyboard access; floating Feedback pill covers content on mobile dashboard. |
| 4 | Theming | **3 / 4** | Solid teal token system, dark mode works. Off-brand coral/rose accents appear on auth pages. `primary-foreground/70` token is globally undersized for contrast. |
| 5 | Anti-Patterns | **2 / 4** | Classic hero-metric card grid on dashboard and "Verified extraction pipeline" section; identical 3–5-card grids are the dominant layout; persistent Feedback pill on every screen. |
| **Total** | | **13 / 20** | **Acceptable — significant work needed** |

---

## Anti-Patterns Verdict — Does this look AI-generated?

**Mostly no, but a few fingerprints remain.** The Bricolage Grotesque / Inter pairing, the committed teal palette, and the warmth of the empty states carry real intentionality. It does **not** read like generic v0/Lovable output. But there are tells:

- **Hero-metric card grid** on `/dashboard` — four identical cards with icon + number + label (Total / Completed / Processing / Failed). Textbook AI-slop layout.
- **Five-across uniform card grid** in the "Verified extraction pipeline" section on `/`. Same size, same structure, same icon-above-heading pattern.
- **"Icon above every heading"** tell in the "Upload. Extract. Done." three-card strip on `/` and the "What happens next" list on `/upload`.
- **Persistent floating "Feedback" pill** bottom-right on every page in the app shell — covers primary content on mobile.
- **Sticky "Extracted Fields (9 of 126 shown)" band** on `/` ends up parked alone in a sea of whitespace when you scroll past the section it belongs to (home-d-02). Reads like an animation hook that lost its scope.
- **Two off-brand accent colors** (`text-rose`, `text-coral`-ish `text-destructive`) on auth screens dilute the teal identity.

It's a B+ on the slop test — the bones are distinctive, the patterns are not.

---

## Executive Summary

- Audit Health Score: **13 / 20** (Acceptable — significant work needed).
- Issue count: **3 P0**, **12 P1**, **11 P2**, **6 P3** (32 total).
- Top 5 critical issues:
  1. **`/upload` dropzone has an unlabeled `<input>`** (critical axe label violation, blocks screen-reader users).
  2. **Dropzone is a nested interactive** (axe `nested-interactive`, serious) — `role="button"` + `tabIndex={0}` on the wrapper fights react-dropzone's own root-props and the hidden input.
  3. **`/login` and `/signup` have no `<main>` landmark and no `h1`** — `(auth)` layout wraps children in a plain `<div>`. Screen-reader orientation fails.
  4. **9 WCAG contrast failures on `/pricing`** stemming from `text-primary-foreground/70` in the comparison table — 3.07:1 vs 4.5:1 required.
  5. **New signups land at `/dashboard` with 0 credits and no clear "Buy credits" CTA** — the "0 credits" pill in the header isn't a link, and Upload Your First Lease leads to a page where extraction can't complete for free. Activation cliff.
- Recommended next steps: fix P0/P1 in order (accessibility → flow) before any polish. Most fixes are small and ripple through many surfaces because the root cause is a handful of shared components.

---

## Detailed Findings (grouped by surface, severity descending)

### Global / shared

- **[P0] Unlabeled file input inside dropzone** — `frontend/components/upload/dropzone.tsx:87`. Axe critical (`label`). Hidden `<input type="file">` from react-dropzone has no `aria-label`. Fix: pass `aria-label="Upload a lease PDF"` via `getInputProps({ 'aria-label': 'Upload a lease PDF' })`. WCAG 3.3.2, 4.1.2. Suggested: `/harden`.
- **[P0] Nested interactive controls in dropzone** — `frontend/components/upload/dropzone.tsx:84–87`. The wrapper already gets `role="button" + tabIndex=0` from react-dropzone's `getRootProps()`; the component redundantly adds both, *and* the hidden input gets a negative tabIndex. Fix: remove the explicit `role="button"` and `tabIndex={0}` — trust react-dropzone. WCAG 4.1.2. Suggested: `/harden`.
- **[P1] `text-primary-foreground/70` utility fails AA on teal (#008377)** — `frontend/components/upload/sample-teaser.tsx:57`, `frontend/app/(marketing)/pricing/page.tsx` (3 hits), plus ~20 SEO-page occurrences. 3.07:1 vs 4.5:1. Two options: raise opacity to `/85` (≈4.7:1) or replace with a dedicated `--color-primary-foreground-muted` token. Suggested: `/colorize` or `/normalize`. WCAG 1.4.3.
- **[P1] Persistent floating Feedback pill covers content on mobile** — `frontend/components/feedback/feedback-button.tsx:197`. `fixed bottom-4 right-4 … max-sm:bottom-20` still overlaps the primary CTA on `/dashboard` mobile (see `06c-dashboard-mobile-light.png`). Fix: give it `aria-hidden` when a modal/sheet is open, and consider a collapsed icon-only variant below `sm`. Suggested: `/adapt`.
- **[P2] Footer on `/` appears twice in scroll capture** (home-d-09 vs home-d-10). Likely a trailing section padding issue rather than duplicate DOM — verify by snapshot. If real, one is dead DOM. Suggested: `/distill`.
- **[P2] Sentry DSN returns 403 on every page** — console log, every surface. Either the key is wrong or the project/org mismatches. Not a UX bug per se, but means production errors are not being captured. Out of scope for this audit but worth flagging to the team.

### `/` (landing)

- **[P1] CTA/pricing dissonance in hero** — the primary button says "Try It Free — Upload a Lease" right below "$10 per lease". First-time reader parses "free" and "$10" in the same glance. Fix: make it "Upload a Lease" or "Start Free Preview — $10 to Unlock". Suggested: `/clarify`.
- **[P2] Sticky "Extracted Fields (9 of 126 shown)" band detaches from its section** — `home-d-02.png` shows it parked at the top with a huge empty viewport below. Either drop the sticky behavior or constrain it to the section's scroll container. Suggested: `/normalize`.
- **[P2] Five-across "pipeline" card grid is a slop tell** — same-size cards, same structure, same icon-over-heading. Break rhythm: one hero card, four supporting. Suggested: `/arrange` or `/bolder`.
- **[P2] Hero subhead merges two separate promises** — "Upload free. Preview results instantly. Pay only for the full report — $10 per lease. No subscription, no contract, no minimum." Four beats. Trim to two. Suggested: `/clarify` or `/distill`.
- **[P3] "Lextract" wordmark in nav has an underline artifact** visible in some captures (home-d-02). Verify that's intentional branding and not a link-style leak. Suggested: `/polish`.
- **[P3] Monitor icon in header (light/dark toggle) is icon-only, no label** — `aria-label` is fine if set, but title-on-hover would help sighted users. Verify. Suggested: `/clarify`.

### `/pricing`

- **[P1] 9× color-contrast violations** on the comparison-table sub-text (`text-primary-foreground/70`) — axe `color-contrast` serious. Root cause same as above. Fix once, benefits every table. WCAG 1.4.3.
- **[P1] Empty `<th>` in comparison table** — axe `empty-table-header`. Add a visually-hidden label like "Provider" for the first column. Suggested: `/harden`.
- **[P1] Scrollable comparison table on mobile lacks keyboard focus** — axe `scrollable-region-focusable`. Add `tabindex="0"` and `role="group"` (with aria-label) to the `.overflow-x-auto` container. WCAG 2.1.1.
- **[P2] Mixed accent colors on tier pills** ("Single Lease" green, "5-Pack" coral, "10-Pack" green). Either all teal or all coral-accent; the current mix looks unintentional. Suggested: `/normalize`.
- **[P2] "How Lextract Compares" table is comparing Lextract against two generic personas, not named competitors.** The page already links to `/resources/comparisons/*` elsewhere — either reference those or drop the table. Suggested: `/clarify`.

### `/login` and `/signup`

- **[P0] No `<main>` landmark in `(auth)` layout** — axe `landmark-one-main`, `region`, `page-has-heading-one` all trace to `frontend/app/(auth)/layout.tsx:12`. Wrap `{children}` in `<main>`. WCAG 1.3.1, 2.4.1.
- **[P1] No `h1` on either page** — CardTitle renders as a `<div>`, and the real page heading lives only inside a card. Promote it: either render CardTitle as `h1` when it's the page's primary heading, or add a visually-hidden `<h1>Sign in</h1>` / `<h1>Create your account</h1>` above the card. WCAG 2.4.6.
- **[P2] "Sign up" heading wraps to two lines on desktop** (`04a-signup-desktop-light.png`). The card is `max-w-md` but the `text-2xl` font-display makes "Create your account" overflow. Options: narrower heading ("Create account") or allow the card to grow. Suggested: `/typeset` or `/arrange`.
- **[P2] "Forgot password?" is a mailto: link** — `frontend/components/auth/login-form.tsx:109`. Silent acknowledgment that real password reset is unbuilt. Either implement reset (proper scope) or relabel "Email us to reset" so users know what clicking does. Suggested: `/clarify`.
- **[P2] Muted "OR" divider and "Email cannot be changed" copy use low-contrast rose/coral text** on the light card background. Verify against AA; replace with `text-muted-foreground`. Suggested: `/colorize`.
- **[P3] Card is lonely** — huge negative space above and below on desktop (`03a`, `04a`). A subtle background pattern, a left-side value-prop panel, or a tighter vertical centering would feel less "floating lead magnet, forgot to design around it". Suggested: `/arrange`.

### `/upload` (anon + authed)

- **[P0] See dropzone P0s above** — both the unlabeled input and nested-interactive apply here.
- **[P1] Heading-order violation** — `frontend/app/(public-app)/upload/page.tsx:181` uses `<h3>` directly under `h1` with no intervening `h2`. Bump to `h2` or remove the heading and let the card styling carry the hierarchy. WCAG 1.3.1.
- **[P1] Privacy-policy link is low-contrast + undistinguishable in dark mode** — axe `link-in-text-block`, 2.27:1. `frontend/app/(public-app)/upload/page.tsx:120` needs `underline` or a higher-contrast color (e.g., `text-primary` with `underline-offset-4 hover:no-underline`). WCAG 1.4.1.
- **[P2] "Free preview" / "$10 to unlock" content is repeated** three times on this page: risk-reversal strip (lines 101–129), social-proof strip (164–176), and "What happens next" list (179–205). Pick one. Suggested: `/distill`.
- **[P2] Hero h1 is a clever but long sentence** — "Your lease has 126 data points. Know all of them in minutes." sells well but is two sentences crammed into one heading. Break or shorten. Suggested: `/clarify`.
- **[P3] Dropzone drag-active style uses `scale-[1.02]`** — fine in principle, but triggers parent-layout reflow on some browsers. Prefer `transform: scale(…)` on the wrapper via CSS variable, no change needed functionally. Suggested: `/polish`.

### `/dashboard`

- **[P1] "0 credits" pill in header is not a link** — `06a-dashboard-desktop-light.png`. New signup has 0 credits; the only purchase paths are `/pricing` (from the nav) or completing an upload and being prompted. Make the pill a link to `/pricing` with aria-label "Buy credits — 0 remaining". Conversion impact. Suggested: `/clarify`.
- **[P2] Hero-metric card grid (Total / Completed / Processing / Failed)** is a textbook AI-slop layout and, for a user with 0 extractions, shows four `0`s. Suggested: hide metrics until there's ≥1 extraction, or fold them into a single inline summary. `/distill` or `/arrange`.
- **[P2] Welcome banner loses differentiation against page bg in dark mode** — `06b-dashboard-desktop-dark.png`. Add a subtle teal tint or 1px border. Suggested: `/normalize`.
- **[P3] "Or view a sample report first →" link is small and below the primary CTA** — secondary but valuable action. Give it more visual weight on first-visit (empty state). Suggested: `/onboard`.

### `/profile`

- **[P1] "Save Changes" button is permanently low-contrast-looking** — appears faded/disabled even when enabled (`07a-profile-desktop-light.png`). Likely a `disabled={!isDirty}` state that doesn't visibly change when the user edits a field. Verify and, if true, make the enabled state full-contrast primary. Suggested: `/polish` + `/harden`.
- **[P2] No sign-out button on the profile page** — sign-out lives in the avatar dropdown in the header only. Add a tertiary "Sign out" button in the profile view as a conventional discoverability. Suggested: `/clarify`.
- **[P2] No danger zone / delete account** — legal implication for paid service; worth adding at least "Contact us to delete your account" with a mailto. Suggested: `/onboard`.
- **[P3] Email placeholder styling on a filled read-only input looks like an empty placeholder** — the email shows as ghost text. Use a real disabled/read-only input styling so users see it as "your email, locked". Suggested: `/polish`.

### `/results/sample`

- **[P1] "1 fields" pluralization bug** on confidence distribution at mobile (`10c-results-mobile-light.png`, bottom of confidence bar). Fix with `Intl.PluralRules` or a `pluralize` helper. Suggested: `/clarify`.
- **[P2] No PDF preview pane** — the product is "we extract from your PDF", and the results page shows just the fields without the source PDF. Reviewers want to click a field and jump to the clause. Large feature, but worth flagging as a gap. Suggested: `/arrange` / future scope.
- **[P2] "Unlock all 116 remaining fields" gated section uses a big blurred placeholder**  — fine pattern, but the blur region has no `aria-label`/`aria-describedby`, so screen readers land on blank content. Add a descriptive label. Suggested: `/harden`.
- **[P3] Confidence distribution has horizontal bars with no numeric aria-label** — screen readers hear "89 fields / 22 fields". Add `aria-label="High confidence: 89 of 126 fields"`. Suggested: `/harden`.

---

## Patterns & Systemic Issues

1. **Contrast token debt.** `text-primary-foreground/70` is used in ~30 places and fails AA everywhere it sits on the `--color-primary` teal. One fix (a new token or raising to `/85`) eliminates 9+ axe violations and improves every teal banner. Single-file, global impact.
2. **Auth layout missing landmarks.** `(auth)/layout.tsx` wraps children in a plain `<div>`; every auth page inherits three axe moderate violations (landmark-one-main, region, page-has-heading-one). Single-file fix.
3. **Card-grid uniformity.** Dashboard metric cards, pipeline cards on `/`, pricing tier cards, and "What happens next" all use the same rhythm: equal-width, icon-over-label, padded box. Break rhythm in at least the dashboard (empty state) and pipeline section to kill the slop feel.
4. **Persistent overlays.** Feedback pill is always visible; on mobile it covers content. A surveys popup (separate component) also fires on `/results`. Consolidate overlay rules so at most one is visible and none covers the primary action.
5. **Copy duplication on `/upload`.** Three separate spots repeat "free preview / $10 to unlock / secure storage". DRY the page by picking the single strongest placement.

---

## Positive Findings

- **Committed palette.** Teal holds up in both themes; hero gradients don't collapse to muddy purple/cyan. No gradient text on metrics. No glassmorphism.
- **Typography.** Bricolage Grotesque for display + Inter for body is a real choice. No system-font default.
- **Dropzone visuals.** Drag-active state, file rejection messaging, retry button, progress component — all present and behaving.
- **Empty states.** Dashboard "No extractions yet" with an illustration + CTA is a genuine empty state (not "no data"), and the "Welcome to Lextract" three-step banner is a strong first-run affordance.
- **Axe-clean pages.** `/`, `/dashboard`, `/profile`, `/results/sample` — all zero violations at default axe config. That's real work.
- **Architecture.** No `useEffect` fetching, no `any` keyword misuse, `eslint-disable` directives all carry justification comments. CLAUDE.md conventions are being followed.
- **Animation discipline.** `motion/react` used sparingly, transform/opacity only, sensible durations.

---

## Recommended Actions (priority order)

1. **[P0] `/harden`** — fix dropzone a11y (`aria-label` on input, drop redundant role/tabIndex, fix nested-interactive). `frontend/components/upload/dropzone.tsx`.
2. **[P0] `/harden`** — add `<main>` + `h1` to `(auth)` layout and promote CardTitle to h1 on login/signup. `frontend/app/(auth)/layout.tsx`, `frontend/components/auth/{login,signup}-form.tsx`.
3. **[P1] `/colorize`** — introduce a contrast-safe `primary-foreground-muted` token (or raise to `/85`) and replace every `text-primary-foreground/70`. `frontend/app/globals.css`, `frontend/components/upload/sample-teaser.tsx`, `frontend/app/(marketing)/pricing/page.tsx`.
4. **[P1] `/harden`** — empty-th label + scrollable-region keyboard access on pricing comparison table. `frontend/app/(marketing)/pricing/page.tsx`.
5. **[P1] `/harden`** — heading-order fix on `/upload` (h3 → h2) and privacy-policy link underline/contrast. `frontend/app/(public-app)/upload/page.tsx`.
6. **[P1] `/clarify`** — make "0 credits" pill a link to `/pricing`; rewrite hero CTA to resolve the "free vs $10" ambiguity; fix "1 fields" pluralization on results. `frontend/components/layout/*`, `frontend/app/page.tsx`, `frontend/components/results/confidence-distribution.tsx`.
7. **[P1] `/adapt`** — Feedback pill: hide on mobile while primary modals/sheets are open; shrink below `sm`. `frontend/components/feedback/feedback-button.tsx`.
8. **[P2] `/normalize`** — unify pricing tier pill colors; differentiate dashboard welcome banner from page bg in dark mode; fix the sticky-fields detach on `/`.
9. **[P2] `/distill`** — DRY the triple-message redundancy on `/upload`; trim hero subhead on `/`.
10. **[P2] `/arrange`** — break the five-across pipeline grid on `/`; consider emptying the 4-metric grid on new-user dashboard.
11. **[P3] `/polish`** — final pass: focus rings, profile Save-Changes button state, auth card loneliness, read-only email styling, footer duplication check.

---

> You can ask me to run these one at a time, all at once, or in any order you prefer. Re-run this audit after fixes to see the score improve.
