-- =============================================================================
-- Lextract.io — RLS Policies (Neon.tech)
-- Migration: 00002_rls_policies.sql
--
-- Adapted from Supabase RLS policies. Key changes:
--   • auth.uid() → auth.user_id()::uuid  (defined in 00001 as custom function)
--   • JWT claims extraction stays the same — Neon Data API (PostgREST) sets
--     the request.jwt.claims GUC identically to Supabase.
--   • All policies target the 'authenticated' role (Neon Data API convention)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. users — read/update own row only
-- -----------------------------------------------------------------------------

CREATE POLICY users_select_own
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.user_id()::uuid = id);

CREATE POLICY users_update_own
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.user_id()::uuid = id);

-- -----------------------------------------------------------------------------
-- 2. anonymous_sessions — match by session token from JWT claims OR linked user
-- -----------------------------------------------------------------------------

CREATE POLICY anon_sessions_select_own
  ON public.anonymous_sessions
  FOR SELECT
  TO authenticated
  USING (
    session_token = (current_setting('request.jwt.claims', true)::json->>'session_token')
    OR linked_user_id = auth.user_id()::uuid
  );

-- -----------------------------------------------------------------------------
-- 3. extractions — authenticated users + anonymous session access
-- -----------------------------------------------------------------------------

CREATE POLICY extractions_select_own_user
  ON public.extractions
  FOR SELECT
  TO authenticated
  USING (auth.user_id()::uuid = user_id);

CREATE POLICY extractions_select_own_anon
  ON public.extractions
  FOR SELECT
  TO authenticated
  USING (
    anonymous_session_id IN (
      SELECT id FROM public.anonymous_sessions
      WHERE session_token = (current_setting('request.jwt.claims', true)::json->>'session_token')
    )
  );

CREATE POLICY extractions_insert_own
  ON public.extractions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.user_id()::uuid = user_id);

CREATE POLICY extractions_update_own
  ON public.extractions
  FOR UPDATE
  TO authenticated
  USING (auth.user_id()::uuid = user_id)
  WITH CHECK (auth.user_id()::uuid = user_id);

CREATE POLICY extractions_delete_own
  ON public.extractions
  FOR DELETE
  TO authenticated
  USING (auth.user_id()::uuid = user_id);

-- -----------------------------------------------------------------------------
-- 4. payments — read-only for authenticated users
-- -----------------------------------------------------------------------------

CREATE POLICY payments_select_own
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (auth.user_id()::uuid = user_id);

-- -----------------------------------------------------------------------------
-- 5. credit_transactions — read-only, immutable ledger
-- -----------------------------------------------------------------------------

CREATE POLICY credit_transactions_select_own
  ON public.credit_transactions
  FOR SELECT
  TO authenticated
  USING (auth.user_id()::uuid = user_id);

-- -----------------------------------------------------------------------------
-- 6. stripe_webhook_events — zero user-facing policies
--    Only the service role (which bypasses RLS) accesses this table.
-- -----------------------------------------------------------------------------

-- (no policies — service role bypasses RLS entirely)

-- -----------------------------------------------------------------------------
-- 7. extraction_edits — users read/write edits on their own extractions
-- -----------------------------------------------------------------------------

CREATE POLICY extraction_edits_select_own_editor
  ON public.extraction_edits
  FOR SELECT
  TO authenticated
  USING (edited_by = auth.user_id()::uuid);

CREATE POLICY extraction_edits_select_own_extraction
  ON public.extraction_edits
  FOR SELECT
  TO authenticated
  USING (
    extraction_id IN (
      SELECT id FROM public.extractions WHERE user_id = auth.user_id()::uuid
    )
  );

CREATE POLICY extraction_edits_insert_own
  ON public.extraction_edits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    extraction_id IN (
      SELECT id FROM public.extractions WHERE user_id = auth.user_id()::uuid
    )
  );

CREATE POLICY extraction_edits_update_own
  ON public.extraction_edits
  FOR UPDATE
  TO authenticated
  USING (edited_by = auth.user_id()::uuid)
  WITH CHECK (edited_by = auth.user_id()::uuid);
