# US-024: Frontend Full Results View

**Phase:** 5 — Full Results & Editing | **Depends on:** US-019, US-022 | **Blocks:** US-028, US-029, US-030, US-031
**Type:** Frontend
**Estimated session size:** Large

## Description

Build the complete results view shown after payment. Displays all 126 fields organized by 16 categories in an expandable accordion/tab layout, with per-field confidence badges and a red flag panel. This is the most data-rich page in the application.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — this is the core product page, must be exceptional

## Acceptance Criteria

- [ ] Route: `/results/[id]` when `payment_status = 'paid'`
- [ ] 14 category sections displayed as accordion or tabs, each expandable
- [ ] Per-field display: label, value, confidence badge (green/yellow/red with score), source text tooltip
- [ ] Red flag panel: sidebar or top banner with severity icons (High=red, Medium=yellow, Low=blue) and descriptions
- [ ] Summary header: property address, landlord/tenant names, key dates, lease term, lease structure type
- [ ] Confidence badges: green (High 0.85-1.0), yellow (Medium 0.60-0.84), red (Low 0.00-0.59)
- [ ] Fields with null values shown as "Not found in lease" with low confidence
- [ ] Category headers show: category name, field count, average confidence for that category
- [ ] Red flag panel shows: rule name, severity, description, triggered value
- [ ] Responsive layout: full-width on mobile, sidebar on desktop for red flags
- [ ] Category accordion expand/collapse uses `AnimatePresence` + `motion.div` with height auto-animation
- [ ] Field rows within expanded category enter with staggered `fadeUp`
- [ ] Confidence badges use `scaleIn` variant on first render

## Technical Details

### Files to Create/Modify

- Modify: `frontend/app/(app)/results/[id]/page.tsx` (switch between teaser and full based on payment_status)
- Create: `frontend/components/results/full-results-view.tsx`
- Create: `frontend/components/results/category-accordion.tsx`
- Create: `frontend/components/results/field-row.tsx`
- Create: `frontend/components/results/confidence-badge.tsx`
- Create: `frontend/components/results/red-flag-panel.tsx`
- Create: `frontend/components/results/results-header.tsx`
- Create: `frontend/types/extraction.ts` (typed interfaces for extraction data, fields, flags)
- Test: `frontend/__tests__/results/full-results.test.tsx`
- Test: `frontend/__tests__/results/field-row.test.tsx`

### Key Implementation Notes

- Fetch full data from `GET /api/v1/extractions/{id}` (requires paid status)
- Category accordion: use Shadcn Accordion component or custom with Headless UI
- Confidence badge component: reusable across full results, teaser, and inline editing
- Red flag panel: fixed sidebar on desktop (scrolls independently), collapsible section on mobile
- Consider virtualization if rendering all 126 fields causes performance issues
- Source text tooltip: show the original lease text that Claude extracted the value from
- Type definitions should be comprehensive — used by US-028, US-029, US-030, US-031

### Integration Points

- US-019 (Results Endpoints) provides the full extraction data
- US-022 (Teaser) shares the results page — this replaces teaser after payment
- US-028 (Inline Editing) adds edit capabilities to field rows
- US-029 (PDF Viewer) adds side-by-side PDF view
- US-030 (Export) adds export buttons to this page
- US-031 (CamAudit CTA) adds the CamAudit banner

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Full results tests pass
# Manual: navigate to /results/{id} (paid) — all 16 categories show
# Manual: expand category — fields with confidence badges display
# Manual: red flag panel shows with correct severity icons
# Manual: responsive layout works on mobile and desktop
```

## Reference Docs

- `docs/PRD.md` — Section 7.2: Full results view requirements
- `docs/lextract_field_schema.json` — Field names, categories, data types
- `docs/USER_FLOWS.md` — Flow 2: Post-payment results view
