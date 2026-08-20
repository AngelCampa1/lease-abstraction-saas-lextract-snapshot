-- =============================================================================
-- Lextract.io - Guest single-payment unlocks
-- Migration: 00017_guest_single_payments.sql
--
-- Anonymous single-extraction purchases are unlocked by anonymous_session_id.
-- Credit-pack purchases still require a user, but guest single payments need a
-- payment row before the extraction has been linked to a registered account.
-- =============================================================================

ALTER TABLE public.payments
  ALTER COLUMN user_id DROP NOT NULL;

