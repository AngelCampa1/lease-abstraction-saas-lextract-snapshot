# US-016: Backend Credit & Payment System

**Phase:** 3 — Integration | **Depends on:** US-004, US-010 | **Blocks:** US-023
**Type:** Backend
**Estimated session size:** Large

## Description

Build the complete credit ledger and payment processing system. This connects Stripe events to the credit system, handles single-purchase extraction unlocks and credit pack purchases, and enforces the immutable credit ledger convention.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] `POST /api/v1/payments/checkout` creates Stripe checkout session for single ($15) or credit pack ($65/$120)
- [ ] `POST /api/v1/payments/use-credit` deducts 1 credit and unlocks extraction (if balance >= 1)
- [ ] Stripe webhook processing: `checkout.session.completed` → creates payment row → adds credits or unlocks extraction
- [ ] Credit ledger: all transactions INSERT-only into `credit_transactions` — NEVER update existing rows
- [ ] `balance_after` computed and stored at insert time for every transaction
- [ ] Single purchase flow: Stripe success → `extractions.payment_status = 'paid'` + credit transaction `(amount=-1)`
- [ ] Credit pack flow: Stripe success → `credit_transactions(amount=+5 or +10)` + update `users.credits_balance`
- [ ] `GET /api/v1/payments/credits` returns current balance and recent transactions
- [ ] `GET /api/v1/payments/history` returns payment history with pagination
- [ ] Concurrency safety: credit deduction uses database-level locking to prevent double-spend
- [ ] Tests cover: checkout creation, webhook processing, credit deduction, insufficient balance, concurrent requests

## Technical Details

### Files to Create/Modify

- Create: `backend/app/api/v1/payments.py` (checkout, use-credit, credits, history endpoints)
- Create: `backend/app/services/credit_service.py` (credit ledger operations)
- Modify: `backend/app/api/v1/webhooks.py` (expand Stripe webhook handler with payment logic)
- Modify: `backend/app/api/v1/router.py` (include payments router)
- Test: `backend/tests/test_payments.py`
- Test: `backend/tests/test_credit_service.py`
- Test: `backend/tests/test_credit_concurrency.py`

### Key Implementation Notes

- **CRITICAL:** `credit_transactions` rows are NEVER updated — this is in CLAUDE.md. Always INSERT.
- `balance_after` calculation: query latest `balance_after` for user, add new `amount`, store result
- Use `SELECT ... FOR UPDATE` on the user's latest credit_transaction to prevent concurrent double-spend
- Webhook handler logic (extends US-010):
  - Check idempotency (stripe_webhook_events)
  - If `payment_type == 'single'`: set `extractions.payment_status = 'paid'`, insert credit_transaction(amount=0, description="Single purchase")
  - If `payment_type == 'credit_pack_5'`: insert credit_transaction(amount=+5), update users.credits_balance
  - If `payment_type == 'credit_pack_10'`: insert credit_transaction(amount=+10), update users.credits_balance
- `use-credit` endpoint: check balance >= 1, INSERT credit_transaction(amount=-1), update users.credits_balance, set extraction.payment_status = 'paid'

### Integration Points

- US-010 (Stripe) provides checkout session creation and webhook verification
- US-004 (Auth) provides user authentication
- US-023 (Frontend Payment) calls checkout and use-credit endpoints
- US-027 (Dashboard) calls credits and history endpoints

## Verification

```bash
cd backend
pytest tests/test_payments.py -v           # Payment endpoint tests pass
pytest tests/test_credit_service.py -v     # Credit ledger tests pass
pytest tests/test_credit_concurrency.py -v # Concurrency tests pass
# Verify: no UPDATE queries on credit_transactions in any test
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Payments" section: credit ledger, Stripe flow
- `docs/USER_FLOWS.md` — Flow 2 (Payment & Unlock), Flow 5 (Credit Pack)
- `docs/PRD.md` — Section 8: Pricing model
- `CLAUDE.md` — "Credit ledger is immutable" convention
