-- =============================================================================
-- Lextract.io - Guest checkout and anonymous notification emails
-- Migration: 00012_extraction_guest_notify_emails.sql
--
-- Adds extraction columns currently written/read by application code:
--   - guest_email: set during anonymous Stripe checkout and used by webhook
--     metadata/account provisioning flows.
--   - notify_email: read by mark_extraction_complete to send results-ready
--     email for anonymous extractions.
--
-- Both columns are nullable so existing rows are unaffected.
-- =============================================================================

ALTER TABLE public.extractions
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS notify_email TEXT;

CREATE INDEX IF NOT EXISTS idx_extractions_guest_email
  ON public.extractions(guest_email)
  WHERE guest_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_extractions_notify_email
  ON public.extractions(notify_email)
  WHERE notify_email IS NOT NULL;
