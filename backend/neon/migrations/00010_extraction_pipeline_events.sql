-- =============================================================================
-- Lextract.io — Extraction pipeline observability + dual-extract scaffolding
-- Migration: 00010_extraction_pipeline_events.sql
--
-- Adds:
--   1. extraction_pipeline_events — durable per-stage timeline rows.
--      One row per (extraction_id, stage, attempt_number). Lifecycle:
--      INSERT with status='started' → UPDATE to 'succeeded'/'failed'/'skipped'.
--   2. extractions.stage_summary       — compact pointer JSON written at end.
--   3. extractions.raw_extraction_object_keys — R2 keys for raw model dumps.
--   4. extractions.extraction_cost_cents      — running LLM spend in cents.
--
-- Adapted from camaudit-v2 migration 20260422000001_audit_pipeline_events.sql.
-- Lextract differences:
--   • Renamed audit_pipeline_events → extraction_pipeline_events to match
--     domain language (Lextract has no "audit" concept; an extraction IS the
--     unit of work).
--   • FK extraction_id → extractions(id) instead of audit_id → audits(id).
--   • document_id removed; in Lextract every extraction has exactly one
--     source document, so extraction_id is sufficient.
--   • Trimmed PIPELINE_STAGES to Lextract's actual pipeline (no Textract,
--     no pdfplumber sidecar). Added sibling/judge stages for dual mode.
--   • RLS uses Lextract's auth.user_id()::uuid pattern (see 00002).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.extraction_pipeline_events (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id   UUID         NOT NULL REFERENCES public.extractions(id) ON DELETE CASCADE,
  stage           TEXT         NOT NULL CHECK (
    stage IN (
      'document_fetch',
      'pass1_extraction',
      'pass2_validation',
      'pass3_escalation',
      'sibling_extraction',
      'judge_arbitration',
      'persistence'
    )
  ),
  attempt_number  INTEGER      NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  status          TEXT         NOT NULL CHECK (
    status IN ('started', 'succeeded', 'failed', 'skipped')
  ),
  started_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,
  model           TEXT,
  fallback_models JSONB        NOT NULL DEFAULT '[]'::jsonb,
  retry_count     INTEGER      NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  error_class     TEXT,
  metadata        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extraction_pipeline_events_extraction
  ON public.extraction_pipeline_events(extraction_id, created_at);

CREATE INDEX IF NOT EXISTS idx_extraction_pipeline_events_stage_status
  ON public.extraction_pipeline_events(stage, status);

ALTER TABLE public.extraction_pipeline_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users see events only for their own extractions (joins via
-- extractions table; reuses the user_id / anonymous_session_id ownership
-- model from 00002).
CREATE POLICY extraction_pipeline_events_select_own_user
  ON public.extraction_pipeline_events
  FOR SELECT
  TO authenticated
  USING (
    extraction_id IN (
      SELECT id FROM public.extractions
      WHERE user_id = auth.user_id()::uuid
    )
  );

CREATE POLICY extraction_pipeline_events_select_own_anon
  ON public.extraction_pipeline_events
  FOR SELECT
  TO authenticated
  USING (
    extraction_id IN (
      SELECT id FROM public.extractions
      WHERE anonymous_session_id IN (
        SELECT id FROM public.anonymous_sessions
        WHERE session_token = (
          current_setting('request.jwt.claims', true)::json->>'session_token'
        )
      )
    )
  );

-- The Celery worker writes events via the service role / direct connection
-- (bypasses RLS), so no INSERT policy is required for end users.

-- Compact summary pointer; written once at end-of-pipeline so the API can
-- answer "what happened to my extraction" without scanning every event.
ALTER TABLE public.extractions
  ADD COLUMN IF NOT EXISTS stage_summary JSONB;

-- R2 object keys for raw Pass-1/2/3/sibling/judge response dumps.
-- Schema: {pass1: "extractions/{id}/raw/pass1-{model}.json", ...}
ALTER TABLE public.extractions
  ADD COLUMN IF NOT EXISTS raw_extraction_object_keys JSONB;

-- Running LLM spend across all passes for this extraction, in cents.
-- Used to enforce max_extraction_llm_cost_usd ceiling on Pass-2/3 escalation.
ALTER TABLE public.extractions
  ADD COLUMN IF NOT EXISTS extraction_cost_cents INTEGER NOT NULL DEFAULT 0;

COMMENT ON TABLE public.extraction_pipeline_events IS
  'Durable per-stage timeline for each extraction attempt. One row per '
  '(extraction_id, stage, attempt_number).';

COMMENT ON COLUMN public.extractions.stage_summary IS
  'Compact end-of-pipeline summary pointing into extraction_pipeline_events.';

COMMENT ON COLUMN public.extractions.raw_extraction_object_keys IS
  'R2 object keys for raw model response JSON, keyed by pass kind '
  '(pass1, pass2, pass3, sibling, judge). Forensic replay only.';

COMMENT ON COLUMN public.extractions.extraction_cost_cents IS
  'Total LLM spend in cents across all passes for this extraction.';
