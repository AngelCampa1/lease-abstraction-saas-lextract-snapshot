# US-023: Frontend Payment Flow

**Phase:** 4 — Results & Payment | **Depends on:** US-012, US-016 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Medium

## Description

Build the complete frontend payment flow: creating Stripe checkout sessions, redirecting to Stripe, handling return URLs with success/failure states, and using existing credits to unlock extractions.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — payment UI is user-facing
- `humanizer` — payment copy must be clear and trustworthy

## Acceptance Criteria

- [ ] "Pay $15" button → calls `POST /api/v1/payments/checkout` → redirects to Stripe Checkout
- [ ] "Buy credits" option → creates credit pack checkout → redirects to Stripe
- [ ] "Use credit" button (if `credits_balance > 0`) → calls `POST /api/v1/payments/use-credit` → instantly unlocks
- [ ] Stripe return URL handling: `/results/{id}?payment=success` → success toast → re-fetch extraction
- [ ] `/results/{id}?payment=cancelled` → info toast → back to teaser view
- [ ] Loading states on all payment buttons during API calls
- [ ] Error handling: network failure, insufficient credits, Stripe errors
- [ ] Anonymous users: redirect to `/signup?return=/results/{id}` before payment
- [ ] After successful payment, page transitions from teaser to full results view

## Technical Details

### Files to Create/Modify

- Create: `frontend/components/payment/payment-buttons.tsx`
- Modify: `frontend/components/results/payment-cta.tsx` (embedded "Use credit" action)
- Create: `frontend/hooks/use-payment.ts` (payment mutation hooks)
- Modify: `frontend/app/(app)/results/[id]/page.tsx` (handle payment query params)
- Test: `frontend/__tests__/payment/payment-flow.test.tsx`

### Key Implementation Notes

- Stripe Checkout is entirely server-side redirect — no Stripe.js needed on frontend
- Flow: click button → POST to backend → receive Stripe URL → `window.location.href = stripeUrl`
- Return URL handling: check `searchParams.get('payment')` on page load
- On `payment=success`: show Sonner success toast, invalidate TanStack Query cache for extraction, re-fetch
- Credit use: optimistic update — show loading, call API, on success invalidate extraction + credits queries
- Anonymous guard: check auth state before payment — if not authenticated, redirect to signup with return URL

### Integration Points

- US-016 (Credits) provides the payment and credit API endpoints
- US-022 (Teaser) contains the payment CTAs that trigger this flow
- US-011 (Auth) provides anonymous → signup redirect

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Payment flow tests pass
# Manual: click "Pay $15" → redirected to Stripe → complete → back to results with success
# Manual: click "Use credit" (with credits) → instant unlock → full results shown
# Manual: click "Pay $15" as anonymous → redirected to signup
```

## Reference Docs

- `docs/USER_FLOWS.md` — Flow 2: Payment & Unlock (full flow)
- `docs/USER_FLOWS.md` — Flow 5: Credit Pack Purchase & Usage
- `docs/PRD.md` — Section 8: Pricing and payment requirements
