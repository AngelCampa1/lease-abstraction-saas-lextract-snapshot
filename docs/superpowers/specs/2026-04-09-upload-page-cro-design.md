# Upload Page CRO — Trust-First Redesign

**Date:** 2026-04-09
**Status:** Approved for implementation

---

## Context

PostHog data (non-Mexico, last 30 days) shows a 90.6% drop-off at the file-selection step on the `/upload` page:

```
Upload page viewed:   32  (100%)
File selected:         3  (9.4%)   ← primary drop-off
Upload started:        2  (6.3%)
Upload completed:      1  (3.1%)
Paywall viewed:        0
Payment completed:     0
```

Additionally, 2 of the 5 engaged users took the "Try Sample" path instead of uploading, suggesting users want proof before committing. The current page leads with the upload dropzone before establishing trust — users are asked to act before they understand the value.

**Goal:** Increase `upload_file_selected` rate from ~9% to 20%+ by reducing perceived risk and showing proof before asking for a PDF.

**Primary conversion event:** `upload_file_selected`

---

## What We're Changing

### 1. Layout — Flip the sequence

**Current order:**
1. Hero
2. Upload card (dropzone — primary CTA)
3. "Try Sample" button (secondary, below dropzone)
4. Social proof strip
5. "What happens next" steps

**New order:**
1. Hero (rewritten)
2. Dual CTA row — "Try Sample" (primary) + "Upload Your PDF" (secondary)
3. Inline sample teaser component (NEW)
4. Risk-reversal callout block
5. Upload card (moved below proof)
6. Social proof strip (updated copy)
7. "What happens next" steps

### 2. Hero copy

**Current:**
> "Extract 126 lease terms in minutes"

**New:**
> "Your lease has 126 data points. Know all of them in minutes."

Sub-copy unchanged. The "Free preview included. No signup required." line is removed from here and replaced by the risk-reversal callout block (Section 4).

### 3. Dual CTA row

Two buttons, side by side, directly below the hero:

| Button | Variant | Action |
|--------|---------|--------|
| "Try a Sample Lease" | filled/primary | `router.push('/results/SAMPLE_EXTRACTION_ID')` + `captureEvent(EVENTS.upload_sample_clicked, { location: 'hero_cta' })` |
| "Upload Your PDF" | outline/secondary | Scrolls to the upload card below |

The sample path becomes primary — it's the lowest-friction entry point and converts browsers into believers.

### 4. Inline sample teaser component — `<SampleTeaser />`

New static component rendered between the dual CTA and the upload card. Shows hardcoded fields from the existing sample extraction (no API call — purely presentational).

```
┌─────────────────────────────────────────────────┐
│  Sample extraction — 1250 Market St, Office     │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 126 fields found  │
├──────────────────────┬──────────────────────────┤
│ Base Rent            │ $42.50/sqft/yr    ✓ 98%  │
│ Lease Expiration     │ Dec 31, 2029      ✓ 99%  │
│ Renewal Option       │ 2 × 5-year        ✓ 94%  │
│ CAM Cap              │ 5% annual         ✓ 91%  │
│ Personal Guarantee   │ ⚠ Full term       ! 87%  │
├──────────────────────┴──────────────────────────┤
│  [See all 126 fields →]                         │
└─────────────────────────────────────────────────┘
```

- **"Personal Guarantee ⚠"** is intentional — demonstrates red flag detection without explaining it
- **"See all 126 fields →"** links to `/results/SAMPLE_EXTRACTION_ID`
- Data is hardcoded — no runtime dependency
- Styled using the same field/confidence badge components as the real results page (`FieldCard`, confidence badge pattern from `/results/[id]`)

**File to create:** `frontend/components/upload/sample-teaser.tsx`

### 5. Risk-reversal callout block

Placed directly above the upload card (after the teaser, before the dropzone):

```
👁  Free preview — see all extracted fields before paying anything
💳  $10 to unlock the full report + export. No subscription.
🔒  Stored securely per our data retention policy — permanently deleted on schedule.
```

Renders as a 3-row list with icons. "data retention policy" links to `/privacy`.

### 6. Social proof strip — copy update

**Current (vague) → New (specific):**

| Current | New |
|---------|-----|
| "Replaces 2-4 hours of manual work" | "Saves ~3 hours per lease vs. manual abstraction" |
| "Used by asset managers, brokers & paralegals" | "126 fields extracted: rent, options, CAM, insurance, termination & more" |
| "AES-256 encrypted" | "Stored securely per our data retention policy — permanently deleted on schedule." |

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/app/(public-app)/upload/page.tsx` | Restructure layout; add dual CTA, teaser, risk-reversal block; update hero copy and social proof |
| `frontend/components/upload/sample-teaser.tsx` | **New file** — static teaser component |
| `frontend/lib/posthog.ts` | Add `upload_sample_clicked` location value `'hero_cta'` (already typed via `Record<string, unknown>` — no change needed) |

### Existing patterns to reuse
- Confidence badge rendering: look at existing results page components for field/confidence display patterns
- `SAMPLE_EXTRACTION_ID` from `frontend/lib/sample-extraction.ts` — already imported in `upload/page.tsx`
- `captureEvent` + `EVENTS` — already imported in `upload/page.tsx`
- Lucide icons already imported (`Eye`, `Unlock`, `Shield`, `Clock`, `Users`, `Zap`)

---

## PostHog events to track (new)

| Event | When | Properties |
|-------|------|------------|
| `upload_sample_clicked` | User clicks "Try a Sample" in hero dual CTA | `{ location: 'hero_cta' }` |
| `upload_sample_clicked` | User clicks "See all 126 fields →" in teaser | `{ location: 'teaser_link' }` |

Both use the existing `EVENTS.upload_sample_clicked` event — no new event names needed.

---

## Success Metrics

- **Primary:** `upload_file_selected` rate on `/upload` (non-Mexico) — target 20%+ (from ~9%)
- **Secondary:** `upload_sample_clicked` volume — expect increase as it's now primary CTA
- **Watch:** `upload_completed` / `email_gate_submitted` — shouldn't regress

**Measurement window:** 30 days post-deploy. At current traffic (~32 non-Mexico upload visitors/month), statistical significance requires volume growth or a longer window — treat early data directionally.

---

## Verification

1. `npm run build` — no TypeScript errors
2. `npx vitest --coverage` — `sample-teaser.tsx` at 95%+ coverage; `upload/page.tsx` coverage maintained
3. Visually verify: sample teaser renders with correct hardcoded data; "Try a Sample Lease" fires `upload_sample_clicked` with `location: 'hero_cta'`; "Upload Your PDF" scrolls to dropzone; "See all 126 fields →" fires `upload_sample_clicked` with `location: 'teaser_link'`
4. PostHog: confirm `upload_sample_clicked` events appear in dashboard with correct location property after deploy
