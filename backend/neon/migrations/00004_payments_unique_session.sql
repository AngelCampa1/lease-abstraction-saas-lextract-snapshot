-- Migration: Add UNIQUE constraint on payments.stripe_checkout_session_id
--
-- Without this constraint, two concurrent Stripe webhook deliveries for the
-- same checkout.session.completed event can both pass the maybe_single()
-- idempotency check in CreditService.record_payment() and both INSERT,
-- causing duplicate payment records and double credit grants.
--
-- The UNIQUE constraint is the authoritative guard; the application-level
-- maybe_single() check remains as defense-in-depth.

ALTER TABLE payments
    ADD CONSTRAINT payments_stripe_checkout_session_id_key
    UNIQUE (stripe_checkout_session_id);
