-- =============================================================================
-- Lextract.io — Initial Schema (Neon.tech)
-- Migration: 00001_initial_schema.sql
--
-- Adapted from Supabase schema. Key changes:
--   • Removed REFERENCES auth.users(id) on public.users — Neon Auth manages
--     its own user tables in neon_auth schema. The public.users.id column
--     stores the Neon Auth user ID (UUID) without a FK constraint.
--   • Created auth schema with user_id() function for RLS policies
--   • All other tables, constraints, indexes, and triggers are unchanged.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- AUTH SCHEMA — Neon provides auth.user_id() natively (returns TEXT).
-- No custom function needed. RLS policies cast auth.user_id()::uuid.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE public.extraction_status AS ENUM (
  'uploading',
  'ocr_processing',
  'extracting',
  'scoring',
  'complete',
  'failed'
);

CREATE TYPE public.payment_status AS ENUM (
  'unpaid',
  'paid',
  'refunded'
);

CREATE TYPE public.payment_type AS ENUM (
  'single',
  'credit_pack_5',
  'credit_pack_10'
);

-- -----------------------------------------------------------------------------
-- TABLES (in FK-dependency order)
-- -----------------------------------------------------------------------------

-- 1. users — app user profile, linked to Neon Auth user by ID
CREATE TABLE public.users (
  id                  UUID        PRIMARY KEY,
  email               TEXT        NOT NULL,
  full_name           TEXT,
  company             TEXT,
  role                TEXT,        -- tenant_rep, broker, attorney, landlord, investor, other
  credits_balance     INTEGER     NOT NULL DEFAULT 0,
  stripe_customer_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. anonymous_sessions — upload-first flow (72-hour TTL)
CREATE TABLE public.anonymous_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token   TEXT        UNIQUE NOT NULL,
  linked_user_id  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. payments — must be created before extractions (FK target)
--
-- payments.status is intentionally TEXT (not the payment_status enum).
-- Stripe checkout sessions pass through a 'pending' intermediate state that
-- does not exist in the extraction-level payment_status enum. Using TEXT here
-- avoids conflating Stripe's payment lifecycle with the extraction unlock state.
CREATE TABLE public.payments (
  id                          UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID                    NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  stripe_checkout_session_id  TEXT,
  stripe_payment_intent_id    TEXT,
  payment_type                public.payment_type     NOT NULL,
  amount_cents                INTEGER                 NOT NULL,
  currency                    TEXT                    NOT NULL DEFAULT 'usd',
  status                      TEXT                    NOT NULL DEFAULT 'pending',
  created_at                  TIMESTAMPTZ             NOT NULL DEFAULT now()
);

-- 4. extractions — core extraction records
CREATE TABLE public.extractions (
  id                      UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID                     REFERENCES public.users(id) ON DELETE SET NULL,
  anonymous_session_id    UUID                     REFERENCES public.anonymous_sessions(id) ON DELETE SET NULL,
  status                  public.extraction_status NOT NULL DEFAULT 'uploading',
  document_filename       TEXT                     NOT NULL,
  document_object_key     TEXT                     NOT NULL,
  document_page_count     INTEGER,
  property_type           TEXT,                    -- commercial, office, industrial, retail
  extracted_data          JSONB,                   -- full 126-field extraction results
  confidence_scores       JSONB,                   -- per-field confidence tiers
  red_flags               JSONB,                   -- triggered rules with details
  processing_started_at   TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  textract_job_id         TEXT,                    -- AWS Textract job ID for OCR polling
  ocr_text                TEXT,                    -- extracted OCR text
  ocr_metadata            JSONB,                   -- OCR metadata (page info, etc.)
  error_message           TEXT,                    -- error details on failure
  deleted_at              TIMESTAMPTZ,             -- soft delete timestamp
  payment_status          public.payment_status    NOT NULL DEFAULT 'unpaid',
  payment_id              UUID                     REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ              NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ              NOT NULL DEFAULT now(),

  -- Every extraction must have an owner: either a registered user or an anonymous session.
  CONSTRAINT extractions_has_owner CHECK (
    user_id IS NOT NULL OR anonymous_session_id IS NOT NULL
  )
);

-- 5. credit_transactions — immutable credit ledger
CREATE TABLE public.credit_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  extraction_id UUID        REFERENCES public.extractions(id) ON DELETE SET NULL,
  payment_id    UUID        REFERENCES public.payments(id) ON DELETE SET NULL,
  amount        INTEGER     NOT NULL,  -- positive = purchase, negative = usage
  balance_after INTEGER     NOT NULL,  -- balance after this transaction (computed at insert time)
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. stripe_webhook_events — idempotency guard
CREATE TABLE public.stripe_webhook_events (
  id             TEXT        PRIMARY KEY,  -- Stripe event ID (e.g. evt_...)
  event_type     TEXT        NOT NULL,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  failed_at      TIMESTAMPTZ,
  failure_reason TEXT
);

-- 7. extraction_edits — field edit history
CREATE TABLE public.extraction_edits (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id   UUID        NOT NULL REFERENCES public.extractions(id) ON DELETE CASCADE,
  field_name      TEXT        NOT NULL,
  original_value  JSONB,      -- original AI-extracted value
  edited_value    JSONB,      -- user's override value
  edited_by       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  edited_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- IMMUTABILITY CONSTRAINT — credit_transactions
-- Credit ledger rows are write-once. Updates and deletes are forbidden.
-- To reverse a transaction, insert a new compensating row.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_credit_transaction_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'credit_transactions rows are immutable. INSERT new rows instead of modifying existing ones.'
    USING ERRCODE = 'restrict_violation';
  RETURN NULL;
END;
$$;

CREATE TRIGGER credit_transactions_immutable
  BEFORE UPDATE OR DELETE ON public.credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_credit_transaction_mutation();

-- -----------------------------------------------------------------------------
-- updated_at AUTO-TRIGGER
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER extractions_updated_at
  BEFORE UPDATE ON public.extractions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------

-- extractions
CREATE INDEX idx_extractions_user_id              ON public.extractions(user_id);
CREATE INDEX idx_extractions_status               ON public.extractions(status);
CREATE INDEX idx_extractions_anonymous_session_id ON public.extractions(anonymous_session_id);
CREATE INDEX idx_extractions_created_at           ON public.extractions(created_at DESC);

-- payments
CREATE INDEX idx_payments_user_id                    ON public.payments(user_id);
CREATE INDEX idx_payments_stripe_checkout_session_id ON public.payments(stripe_checkout_session_id);

-- credit_transactions
CREATE INDEX idx_credit_transactions_user_id       ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_extraction_id ON public.credit_transactions(extraction_id);

-- anonymous_sessions
CREATE INDEX idx_anonymous_sessions_session_token ON public.anonymous_sessions(session_token);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY — enabled on all tables (policies added in 00002)
-- -----------------------------------------------------------------------------

ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extractions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_edits       ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- ROLES — Neon Data API uses 'authenticated' role for RLS
-- Grant permissions so authenticated users can interact via the Data API.
-- Service role (used by backend) bypasses RLS entirely.
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
