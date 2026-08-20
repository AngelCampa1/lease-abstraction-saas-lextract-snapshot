# US-010: Backend Stripe Integration

**Phase:** 2 — Independent Modules | **Depends on:** US-002 | **Blocks:** US-016
**Type:** Backend
**Estimated session size:** Medium

## Description

Build the Stripe payment integration: creating checkout sessions for single extractions and credit packs, handling webhooks for payment completion, ensuring idempotent event processing, and verifying webhook signatures.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] `create_checkout_session(user_id, product_type, extraction_id?)` creates Stripe Checkout Session
- [ ] Supports 3 product types: single ($15), credit_pack_5 ($65), credit_pack_10 ($120)
- [ ] Webhook endpoint `POST /api/v1/webhooks/stripe` handles `checkout.session.completed`
- [ ] Stripe signature verification on all webhook requests
- [ ] Idempotency: duplicate events detected via `stripe_webhook_events` table
- [ ] Returns proper error on invalid signature (400) or duplicate event (200 with no-op)
- [ ] Tests use Stripe test mode or fully mocked Stripe SDK

## Technical Details

### Files to Create/Modify

- Create: `backend/app/services/stripe_service.py` (StripeService class)
- Create: `backend/app/api/v1/webhooks.py` (Stripe webhook endpoint)
- Test: `backend/tests/test_stripe_service.py`
- Test: `backend/tests/test_webhooks.py`

### Key Implementation Notes

- Use `stripe` Python SDK with `STRIPE_SECRET_KEY`
- Checkout session metadata must include: `user_id`, `product_type`, `extraction_id` (for single purchases)
- Webhook verification: `stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)`
- Idempotency check: before processing, try INSERT into `stripe_webhook_events`; if duplicate key, skip
- Success/cancel URLs: `https://lextract.io/results/{extraction_id}?payment=success` and `?payment=cancelled`
- The webhook handler does NOT directly update credits or extraction status — that's US-016's job. This story just verifies the event and stores it.

### Integration Points

- US-016 (Credits & Payments) builds the business logic on top of this (credit ledger, unlock extraction)
- US-023 (Frontend Payment) calls the checkout session creation endpoint
- Webhook events feed into credit/payment processing in US-016

## Verification

```bash
cd backend
pytest tests/test_stripe_service.py -v  # Stripe service tests pass
pytest tests/test_webhooks.py -v        # Webhook tests pass
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Payments" section: Stripe flow, webhook handling
- `docs/PRD.md` — Section 8: Pricing model ($15/single, $65/5-pack, $120/10-pack)
- `docs/USER_FLOWS.md` — Flow 2: Payment & Unlock
