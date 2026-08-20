# US-022: Frontend Teaser View

**Phase:** 4 — Results & Payment | **Depends on:** US-012, US-018 | **Blocks:** US-024
**Type:** Frontend
**Estimated session size:** Medium

## Description

Build the teaser results view shown to users before payment. Displays 3-5 sample extracted fields clearly, blurs the remaining fields, shows confidence distribution and red flag count, and presents the payment CTA.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — teaser view is a critical conversion page
- `humanizer` — CTA copy and descriptions must be compelling and natural

## Acceptance Criteria

- [ ] Route: `/results/[id]` when `payment_status = 'unpaid'`
- [ ] Displays 3-5 visible sample fields: Landlord, Tenant, Premises Address, Commencement Date, Base Rent
- [ ] Remaining fields blurred with CSS `backdrop-filter: blur()` or similar overlay
- [ ] Shows: total field count (99), category count (14), confidence distribution chart (high/medium/low)
- [ ] Red flag count badge: "X potential issues detected" (not full details)
- [ ] Payment CTA section: "Unlock full extraction for $15" button, "Buy 5 credits for $65" alternative
- [ ] If user has credits: "Use 1 credit (X remaining)" option
- [ ] Professional, conversion-optimized layout — the blur effect should create clear FOMO
- [ ] Blurred field previews fade in with stagger on page load
- [ ] Unlock CTA button uses spring hover effect (`whileHover`, `whileTap`)
- [ ] Copy is natural and compelling, not salesy or AI-generated

## Technical Details

### Files to Create/Modify

- Create: `frontend/app/(app)/results/[id]/page.tsx`
- Create: `frontend/components/results/teaser-view.tsx`
- Create: `frontend/components/results/blurred-fields.tsx`
- Create: `frontend/components/results/confidence-chart.tsx`
- Create: `frontend/components/results/payment-cta.tsx`
- Create: `frontend/components/results/field-display.tsx`
- Test: `frontend/__tests__/results/teaser-view.test.tsx`

### Key Implementation Notes

- Fetch data from `GET /api/v1/extractions/{id}/teaser`
- The page component checks `payment_status`: if `unpaid` → teaser view; if `paid` → full view (US-024)
- Blur effect: overlay div with `backdrop-filter: blur(8px)` over field grid
- Show field names (visible but values blurred) to increase perceived value
- Confidence chart: simple bar chart or donut — high (green), medium (yellow), low (red)
- Payment buttons: primary "Unlock for $15", secondary "Buy credits", tertiary "Use credit"
- Use TanStack Query to fetch teaser data, credit balance

### Integration Points

- US-019 (Results Endpoints) provides teaser data
- US-018 (Processing) redirects here on pipeline completion
- US-023 (Payment) handles the actual payment flow when CTA is clicked
- US-024 (Full Results) replaces this view after payment

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Teaser view tests pass
# Manual: navigate to /results/{id} with unpaid extraction — teaser shows
# Manual: visible fields display correctly, rest are blurred
# Manual: payment CTAs are visible and link correctly
```

## Reference Docs

- `docs/USER_FLOWS.md` — Flow 2: Payment & Unlock (step 1 — teaser view)
- `docs/PRD.md` — Section 7.1: Teaser view requirements
