-- =============================================================================
-- Lextract.io — Schema Verification Tests
-- File: backend/tests/test_migration.sql
--
-- Run after applying 00001_initial_schema.sql to verify schema correctness.
-- Execute with: psql -f backend/tests/test_migration.sql
-- Any assertion failure raises an exception and aborts the script.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions (defined at module level, dropped at end)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._assert(condition BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF NOT condition THEN
    RAISE EXCEPTION 'ASSERTION FAILED: %', message;
  END IF;
END;
$$;

-- Returns TRUE if a column exists on a public table
CREATE OR REPLACE FUNCTION public._col_exists(tbl TEXT, col TEXT)
RETURNS BOOLEAN LANGUAGE SQL AS $$
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = tbl AND column_name = col
  );
$$;

-- Returns the udt_name (e.g. 'jsonb', 'uuid', 'int4') for a column
CREATE OR REPLACE FUNCTION public._col_type(tbl TEXT, col TEXT)
RETURNS TEXT LANGUAGE SQL AS $$
  SELECT udt_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = tbl AND column_name = col
  LIMIT 1;
$$;

-- Returns TRUE if a column is NOT NULL
CREATE OR REPLACE FUNCTION public._col_not_null(tbl TEXT, col TEXT)
RETURNS BOOLEAN LANGUAGE SQL AS $$
  SELECT is_nullable = 'NO'
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = tbl AND column_name = col
  LIMIT 1;
$$;

-- Returns TRUE if a named index exists in the public schema
CREATE OR REPLACE FUNCTION public._idx_exists(idx_name TEXT)
RETURNS BOOLEAN LANGUAGE SQL AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = idx_name
  );
$$;

-- Returns TRUE if a FK exists: src_table.src_col → ref_table
CREATE OR REPLACE FUNCTION public._fk_exists(src_table TEXT, src_col TEXT, ref_table TEXT)
RETURNS BOOLEAN LANGUAGE SQL AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name   = rc.constraint_name
     AND kcu.constraint_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name   = rc.unique_constraint_name
     AND ccu.constraint_schema = rc.constraint_schema
    WHERE kcu.table_schema = 'public'
      AND kcu.table_name   = src_table
      AND kcu.column_name  = src_col
      AND ccu.table_name   = ref_table
  );
$$;

-- =============================================================================
-- 1. ENUMS EXIST WITH CORRECT VALUES
-- =============================================================================

DO $$
DECLARE
  enum_values TEXT[];
BEGIN
  -- extraction_status
  SELECT ARRAY_AGG(e.enumlabel ORDER BY e.enumsortorder)
  INTO enum_values
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'extraction_status'
    AND t.typnamespace = 'public'::regnamespace;

  PERFORM public._assert(
    enum_values = ARRAY['uploading','extracting','scoring','complete','failed'],
    'extraction_status enum values mismatch: ' || COALESCE(enum_values::TEXT, 'NULL')
  );

  -- payment_status
  SELECT ARRAY_AGG(e.enumlabel ORDER BY e.enumsortorder)
  INTO enum_values
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'payment_status'
    AND t.typnamespace = 'public'::regnamespace;

  PERFORM public._assert(
    enum_values = ARRAY['unpaid','paid','refunded'],
    'payment_status enum values mismatch: ' || COALESCE(enum_values::TEXT, 'NULL')
  );

  -- payment_type
  SELECT ARRAY_AGG(e.enumlabel ORDER BY e.enumsortorder)
  INTO enum_values
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'payment_type'
    AND t.typnamespace = 'public'::regnamespace;

  PERFORM public._assert(
    enum_values = ARRAY['single','credit_pack_5','credit_pack_10'],
    'payment_type enum values mismatch: ' || COALESCE(enum_values::TEXT, 'NULL')
  );

  RAISE NOTICE 'PASS: All 3 enums exist with correct values';
END;
$$;

-- =============================================================================
-- 2. TABLES EXIST (7 tables)
-- =============================================================================

DO $$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'users',
    'anonymous_sessions',
    'payments',
    'extractions',
    'credit_transactions',
    'stripe_webhook_events',
    'extraction_edits'
  ];
  tbl TEXT;
  tbl_count INTEGER;
BEGIN
  FOREACH tbl IN ARRAY expected_tables LOOP
    SELECT COUNT(*) INTO tbl_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = tbl AND table_type = 'BASE TABLE';
    PERFORM public._assert(tbl_count = 1, 'Table missing: public.' || tbl);
  END LOOP;

  RAISE NOTICE 'PASS: All 7 tables exist';
END;
$$;

-- =============================================================================
-- 3. COLUMN EXISTENCE ON ALL 7 TABLES
-- =============================================================================

DO $$
BEGIN
  -- users
  PERFORM public._assert(public._col_exists('users','id'),                'users.id missing');
  PERFORM public._assert(public._col_exists('users','email'),             'users.email missing');
  PERFORM public._assert(public._col_exists('users','full_name'),         'users.full_name missing');
  PERFORM public._assert(public._col_exists('users','company'),           'users.company missing');
  PERFORM public._assert(public._col_exists('users','role'),              'users.role missing');
  PERFORM public._assert(public._col_exists('users','credits_balance'),   'users.credits_balance missing');
  PERFORM public._assert(public._col_exists('users','stripe_customer_id'),'users.stripe_customer_id missing');
  PERFORM public._assert(public._col_exists('users','created_at'),        'users.created_at missing');
  PERFORM public._assert(public._col_exists('users','updated_at'),        'users.updated_at missing');

  -- anonymous_sessions
  PERFORM public._assert(public._col_exists('anonymous_sessions','id'),             'anonymous_sessions.id missing');
  PERFORM public._assert(public._col_exists('anonymous_sessions','session_token'),  'anonymous_sessions.session_token missing');
  PERFORM public._assert(public._col_exists('anonymous_sessions','linked_user_id'), 'anonymous_sessions.linked_user_id missing');
  PERFORM public._assert(public._col_exists('anonymous_sessions','expires_at'),     'anonymous_sessions.expires_at missing');
  PERFORM public._assert(public._col_exists('anonymous_sessions','created_at'),     'anonymous_sessions.created_at missing');

  -- payments
  PERFORM public._assert(public._col_exists('payments','id'),                         'payments.id missing');
  PERFORM public._assert(public._col_exists('payments','user_id'),                    'payments.user_id missing');
  PERFORM public._assert(public._col_exists('payments','stripe_checkout_session_id'), 'payments.stripe_checkout_session_id missing');
  PERFORM public._assert(public._col_exists('payments','stripe_payment_intent_id'),   'payments.stripe_payment_intent_id missing');
  PERFORM public._assert(public._col_exists('payments','payment_type'),               'payments.payment_type missing');
  PERFORM public._assert(public._col_exists('payments','amount_cents'),               'payments.amount_cents missing');
  PERFORM public._assert(public._col_exists('payments','currency'),                   'payments.currency missing');
  PERFORM public._assert(public._col_exists('payments','status'),                     'payments.status missing');
  PERFORM public._assert(public._col_exists('payments','created_at'),                 'payments.created_at missing');

  -- extractions
  PERFORM public._assert(public._col_exists('extractions','id'),                      'extractions.id missing');
  PERFORM public._assert(public._col_exists('extractions','user_id'),                 'extractions.user_id missing');
  PERFORM public._assert(public._col_exists('extractions','anonymous_session_id'),    'extractions.anonymous_session_id missing');
  PERFORM public._assert(public._col_exists('extractions','status'),                  'extractions.status missing');
  PERFORM public._assert(public._col_exists('extractions','document_filename'),       'extractions.document_filename missing');
  PERFORM public._assert(public._col_exists('extractions','document_object_key'),      'extractions.document_object_key missing');
  PERFORM public._assert(NOT public._col_exists('extractions','document_s3_key'),      'extractions.document_s3_key should not exist');
  PERFORM public._assert(public._col_exists('extractions','document_page_count'),     'extractions.document_page_count missing');
  PERFORM public._assert(public._col_exists('extractions','property_type'),           'extractions.property_type missing');
  PERFORM public._assert(public._col_exists('extractions','extracted_data'),          'extractions.extracted_data missing');
  PERFORM public._assert(public._col_exists('extractions','confidence_scores'),       'extractions.confidence_scores missing');
  PERFORM public._assert(public._col_exists('extractions','red_flags'),               'extractions.red_flags missing');
  PERFORM public._assert(public._col_exists('extractions','processing_started_at'),   'extractions.processing_started_at missing');
  PERFORM public._assert(public._col_exists('extractions','processing_completed_at'), 'extractions.processing_completed_at missing');
  PERFORM public._assert(public._col_exists('extractions','payment_status'),          'extractions.payment_status missing');
  PERFORM public._assert(public._col_exists('extractions','payment_id'),              'extractions.payment_id missing');
  PERFORM public._assert(public._col_exists('extractions','created_at'),              'extractions.created_at missing');
  PERFORM public._assert(public._col_exists('extractions','updated_at'),              'extractions.updated_at missing');

  -- credit_transactions
  PERFORM public._assert(public._col_exists('credit_transactions','id'),            'credit_transactions.id missing');
  PERFORM public._assert(public._col_exists('credit_transactions','user_id'),       'credit_transactions.user_id missing');
  PERFORM public._assert(public._col_exists('credit_transactions','extraction_id'), 'credit_transactions.extraction_id missing');
  PERFORM public._assert(public._col_exists('credit_transactions','payment_id'),    'credit_transactions.payment_id missing');
  PERFORM public._assert(public._col_exists('credit_transactions','amount'),        'credit_transactions.amount missing');
  PERFORM public._assert(public._col_exists('credit_transactions','balance_after'), 'credit_transactions.balance_after missing');
  PERFORM public._assert(public._col_exists('credit_transactions','description'),   'credit_transactions.description missing');
  PERFORM public._assert(public._col_exists('credit_transactions','created_at'),    'credit_transactions.created_at missing');

  -- stripe_webhook_events
  PERFORM public._assert(public._col_exists('stripe_webhook_events','id'),           'stripe_webhook_events.id missing');
  PERFORM public._assert(public._col_exists('stripe_webhook_events','event_type'),   'stripe_webhook_events.event_type missing');
  PERFORM public._assert(public._col_exists('stripe_webhook_events','claimed_at'),   'stripe_webhook_events.claimed_at missing');
  PERFORM public._assert(public._col_exists('stripe_webhook_events','processed_at'), 'stripe_webhook_events.processed_at missing');
  PERFORM public._assert(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stripe_webhook_events'
        AND column_name = 'processed_at'
        AND is_nullable = 'YES'
    ),
    'stripe_webhook_events.processed_at must be nullable'
  );

  -- extraction_edits
  PERFORM public._assert(public._col_exists('extraction_edits','id'),             'extraction_edits.id missing');
  PERFORM public._assert(public._col_exists('extraction_edits','extraction_id'),  'extraction_edits.extraction_id missing');
  PERFORM public._assert(public._col_exists('extraction_edits','field_name'),     'extraction_edits.field_name missing');
  PERFORM public._assert(public._col_exists('extraction_edits','original_value'), 'extraction_edits.original_value missing');
  PERFORM public._assert(public._col_exists('extraction_edits','edited_value'),   'extraction_edits.edited_value missing');
  PERFORM public._assert(public._col_exists('extraction_edits','edited_by'),      'extraction_edits.edited_by missing');
  PERFORM public._assert(public._col_exists('extraction_edits','edited_at'),      'extraction_edits.edited_at missing');

  RAISE NOTICE 'PASS: All columns exist on all 7 tables';
END;
$$;

-- =============================================================================
-- 4. NOT NULL CONSTRAINTS ON REQUIRED COLUMNS
-- =============================================================================

DO $$
BEGIN
  -- users
  PERFORM public._assert(public._col_not_null('users','id'),              'users.id should be NOT NULL');
  PERFORM public._assert(public._col_not_null('users','email'),           'users.email should be NOT NULL');
  PERFORM public._assert(public._col_not_null('users','credits_balance'), 'users.credits_balance should be NOT NULL');
  PERFORM public._assert(public._col_not_null('users','created_at'),      'users.created_at should be NOT NULL');
  PERFORM public._assert(public._col_not_null('users','updated_at'),      'users.updated_at should be NOT NULL');

  -- anonymous_sessions
  PERFORM public._assert(public._col_not_null('anonymous_sessions','session_token'), 'anonymous_sessions.session_token should be NOT NULL');
  PERFORM public._assert(public._col_not_null('anonymous_sessions','expires_at'),    'anonymous_sessions.expires_at should be NOT NULL');

  -- payments
  PERFORM public._assert(public._col_not_null('payments','user_id'),      'payments.user_id should be NOT NULL');
  PERFORM public._assert(public._col_not_null('payments','payment_type'), 'payments.payment_type should be NOT NULL');
  PERFORM public._assert(public._col_not_null('payments','amount_cents'),  'payments.amount_cents should be NOT NULL');
  PERFORM public._assert(public._col_not_null('payments','currency'),      'payments.currency should be NOT NULL');
  PERFORM public._assert(public._col_not_null('payments','status'),        'payments.status should be NOT NULL');

  -- extractions
  PERFORM public._assert(public._col_not_null('extractions','status'),            'extractions.status should be NOT NULL');
  PERFORM public._assert(public._col_not_null('extractions','document_filename'), 'extractions.document_filename should be NOT NULL');
  PERFORM public._assert(public._col_not_null('extractions','document_object_key'),'extractions.document_object_key should be NOT NULL');
  PERFORM public._assert(public._col_not_null('extractions','payment_status'),    'extractions.payment_status should be NOT NULL');

  -- credit_transactions
  PERFORM public._assert(public._col_not_null('credit_transactions','user_id'),       'credit_transactions.user_id should be NOT NULL');
  PERFORM public._assert(public._col_not_null('credit_transactions','amount'),        'credit_transactions.amount should be NOT NULL');
  PERFORM public._assert(public._col_not_null('credit_transactions','balance_after'), 'credit_transactions.balance_after should be NOT NULL');

  -- stripe_webhook_events
  PERFORM public._assert(public._col_not_null('stripe_webhook_events','id'),         'stripe_webhook_events.id should be NOT NULL');
  PERFORM public._assert(public._col_not_null('stripe_webhook_events','event_type'), 'stripe_webhook_events.event_type should be NOT NULL');

  -- extraction_edits
  PERFORM public._assert(public._col_not_null('extraction_edits','extraction_id'), 'extraction_edits.extraction_id should be NOT NULL');
  PERFORM public._assert(public._col_not_null('extraction_edits','field_name'),    'extraction_edits.field_name should be NOT NULL');

  RAISE NOTICE 'PASS: All required NOT NULL constraints are in place';
END;
$$;

-- =============================================================================
-- 5. JSONB COLUMNS HAVE CORRECT TYPE
-- =============================================================================

DO $$
BEGIN
  PERFORM public._assert(public._col_type('extractions','extracted_data')    = 'jsonb', 'extractions.extracted_data is not JSONB');
  PERFORM public._assert(public._col_type('extractions','confidence_scores') = 'jsonb', 'extractions.confidence_scores is not JSONB');
  PERFORM public._assert(public._col_type('extractions','red_flags')          = 'jsonb', 'extractions.red_flags is not JSONB');
  PERFORM public._assert(public._col_type('extraction_edits','original_value') = 'jsonb', 'extraction_edits.original_value is not JSONB');
  PERFORM public._assert(public._col_type('extraction_edits','edited_value')   = 'jsonb', 'extraction_edits.edited_value is not JSONB');

  RAISE NOTICE 'PASS: All JSONB columns have correct type';
END;
$$;

-- =============================================================================
-- 6. FOREIGN KEYS EXIST
-- =============================================================================

DO $$
BEGIN
  -- anonymous_sessions → users
  PERFORM public._assert(public._fk_exists('anonymous_sessions','linked_user_id','users'),         'FK: anonymous_sessions.linked_user_id → users missing');

  -- payments → users
  PERFORM public._assert(public._fk_exists('payments','user_id','users'),                           'FK: payments.user_id → users missing');

  -- extractions → users
  PERFORM public._assert(public._fk_exists('extractions','user_id','users'),                        'FK: extractions.user_id → users missing');

  -- extractions → anonymous_sessions
  PERFORM public._assert(public._fk_exists('extractions','anonymous_session_id','anonymous_sessions'), 'FK: extractions.anonymous_session_id → anonymous_sessions missing');

  -- extractions → payments
  PERFORM public._assert(public._fk_exists('extractions','payment_id','payments'),                  'FK: extractions.payment_id → payments missing');

  -- credit_transactions → users
  PERFORM public._assert(public._fk_exists('credit_transactions','user_id','users'),                'FK: credit_transactions.user_id → users missing');

  -- credit_transactions → extractions
  PERFORM public._assert(public._fk_exists('credit_transactions','extraction_id','extractions'),    'FK: credit_transactions.extraction_id → extractions missing');

  -- credit_transactions → payments
  PERFORM public._assert(public._fk_exists('credit_transactions','payment_id','payments'),          'FK: credit_transactions.payment_id → payments missing');

  -- extraction_edits → extractions
  PERFORM public._assert(public._fk_exists('extraction_edits','extraction_id','extractions'),       'FK: extraction_edits.extraction_id → extractions missing');

  -- extraction_edits → users
  PERFORM public._assert(public._fk_exists('extraction_edits','edited_by','users'),                 'FK: extraction_edits.edited_by → users missing');

  RAISE NOTICE 'PASS: All foreign keys exist';
END;
$$;

-- =============================================================================
-- 7. INDEXES EXIST
-- =============================================================================

DO $$
BEGIN
  -- extractions
  PERFORM public._assert(public._idx_exists('idx_extractions_user_id'),              'Index idx_extractions_user_id missing');
  PERFORM public._assert(public._idx_exists('idx_extractions_status'),               'Index idx_extractions_status missing');
  PERFORM public._assert(public._idx_exists('idx_extractions_anonymous_session_id'), 'Index idx_extractions_anonymous_session_id missing');
  PERFORM public._assert(public._idx_exists('idx_extractions_created_at'),           'Index idx_extractions_created_at missing');

  -- payments
  PERFORM public._assert(public._idx_exists('idx_payments_user_id'),                     'Index idx_payments_user_id missing');
  PERFORM public._assert(public._idx_exists('idx_payments_stripe_checkout_session_id'),   'Index idx_payments_stripe_checkout_session_id missing');

  -- credit_transactions
  PERFORM public._assert(public._idx_exists('idx_credit_transactions_user_id'),       'Index idx_credit_transactions_user_id missing');
  PERFORM public._assert(public._idx_exists('idx_credit_transactions_extraction_id'),  'Index idx_credit_transactions_extraction_id missing');

  -- anonymous_sessions
  PERFORM public._assert(public._idx_exists('idx_anonymous_sessions_session_token'), 'Index idx_anonymous_sessions_session_token missing');

  RAISE NOTICE 'PASS: All indexes exist';
END;
$$;

-- =============================================================================
-- 8. IMMUTABILITY TRIGGER ON credit_transactions
-- =============================================================================

DO $$
DECLARE
  trigger_row_count INTEGER;
BEGIN
  -- Check both UPDATE and DELETE event rows for the trigger
  SELECT COUNT(*) INTO trigger_row_count
  FROM information_schema.triggers
  WHERE trigger_schema     = 'public'
    AND event_object_table = 'credit_transactions'
    AND trigger_name       = 'credit_transactions_immutable'
    AND event_manipulation IN ('UPDATE', 'DELETE');

  -- PostgreSQL expands "BEFORE UPDATE OR DELETE" into two rows in information_schema.triggers
  PERFORM public._assert(
    trigger_row_count = 2,
    'Immutability trigger must fire on both UPDATE and DELETE; found ' || trigger_row_count || ' event(s)'
  );

  RAISE NOTICE 'PASS: Immutability trigger exists on credit_transactions for UPDATE and DELETE';
END;
$$;

-- =============================================================================
-- 9. updated_at TRIGGERS EXIST
-- =============================================================================

DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND event_object_table = 'users'
    AND trigger_name = 'users_updated_at';
  PERFORM public._assert(trigger_count > 0, 'updated_at trigger missing on users');

  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND event_object_table = 'extractions'
    AND trigger_name = 'extractions_updated_at';
  PERFORM public._assert(trigger_count > 0, 'updated_at trigger missing on extractions');

  RAISE NOTICE 'PASS: updated_at triggers exist on users and extractions';
END;
$$;

-- =============================================================================
-- 10. RLS ENABLED ON ALL 7 TABLES
-- =============================================================================

DO $$
DECLARE
  expected_tables TEXT[] := ARRAY[
    'users',
    'anonymous_sessions',
    'payments',
    'extractions',
    'credit_transactions',
    'stripe_webhook_events',
    'extraction_edits'
  ];
  tbl TEXT;
  rls_enabled BOOLEAN;
BEGIN
  FOREACH tbl IN ARRAY expected_tables LOOP
    SELECT c.relrowsecurity INTO rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = tbl AND c.relkind = 'r';

    PERFORM public._assert(rls_enabled IS TRUE, 'RLS not enabled on public.' || tbl);
  END LOOP;

  RAISE NOTICE 'PASS: RLS enabled on all 7 tables';
END;
$$;

-- =============================================================================
-- 11. UNIQUE CONSTRAINT on anonymous_sessions.session_token
-- =============================================================================

DO $$
DECLARE
  uniq_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO uniq_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name   = tc.constraint_name
   AND kcu.constraint_schema = tc.constraint_schema
  WHERE tc.table_schema    = 'public'
    AND tc.table_name      = 'anonymous_sessions'
    AND tc.constraint_type = 'UNIQUE'
    AND kcu.column_name    = 'session_token';

  PERFORM public._assert(uniq_count > 0, 'UNIQUE constraint missing on anonymous_sessions.session_token');

  RAISE NOTICE 'PASS: UNIQUE constraint on anonymous_sessions.session_token';
END;
$$;

-- =============================================================================
-- 12. CHECK CONSTRAINT: extractions must have an owner
-- =============================================================================

DO $$
DECLARE
  check_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO check_count
  FROM information_schema.check_constraints cc
  JOIN information_schema.table_constraints tc
    ON tc.constraint_name   = cc.constraint_name
   AND tc.constraint_schema = cc.constraint_schema
  WHERE tc.table_schema    = 'public'
    AND tc.table_name      = 'extractions'
    AND tc.constraint_type = 'CHECK'
    AND cc.constraint_name = 'extractions_has_owner';

  PERFORM public._assert(check_count > 0, 'CHECK constraint extractions_has_owner missing on extractions');

  RAISE NOTICE 'PASS: CHECK constraint extractions_has_owner exists';
END;
$$;

-- =============================================================================
-- SUMMARY
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'All schema assertions passed. Migration verified.';
  RAISE NOTICE '=================================================';
END;
$$;

-- =============================================================================
-- 13. RENAME MIGRATION PRESERVES EXISTING DATA
-- =============================================================================

BEGIN;

CREATE TEMP TABLE _migration_key_counts AS
SELECT COUNT(*)::INTEGER AS key_count
FROM public.extractions
WHERE document_object_key IS NOT NULL;

ALTER TABLE public.extractions
  RENAME COLUMN document_object_key TO document_s3_key;

\i backend/neon/migrations/00009_rename_document_object_key.sql

DO $$
DECLARE
  expected_count INTEGER;
  actual_count INTEGER;
BEGIN
  SELECT key_count INTO expected_count
  FROM _migration_key_counts
  LIMIT 1;

  SELECT COUNT(*) INTO actual_count
  FROM public.extractions
  WHERE document_object_key IS NOT NULL;

  PERFORM public._assert(
    public._col_exists('extractions','document_object_key'),
    'rename migration should recreate extractions.document_object_key'
  );
  PERFORM public._assert(
    NOT public._col_exists('extractions','document_s3_key'),
    'rename migration should remove extractions.document_s3_key'
  );
  PERFORM public._assert(
    actual_count = expected_count,
    'rename migration should preserve existing document key values'
  );

  RAISE NOTICE 'PASS: rename migration preserves document object key data';
END;
$$;

ROLLBACK;

-- Clean up helper functions
DROP FUNCTION IF EXISTS public._assert(BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public._col_exists(TEXT, TEXT);
DROP FUNCTION IF EXISTS public._col_type(TEXT, TEXT);
DROP FUNCTION IF EXISTS public._col_not_null(TEXT, TEXT);
DROP FUNCTION IF EXISTS public._idx_exists(TEXT);
DROP FUNCTION IF EXISTS public._fk_exists(TEXT, TEXT, TEXT);
