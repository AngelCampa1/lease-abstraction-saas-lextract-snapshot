-- Add columns for pipeline metadata that tasks write but were never in the schema.

ALTER TABLE public.extractions
  -- Multi-pass extraction metadata
  ADD COLUMN IF NOT EXISTS extraction_tokens  JSONB,              -- {input_tokens, output_tokens, total_tokens}
  ADD COLUMN IF NOT EXISTS pass_records       JSONB,              -- array of per-pass records (model, tokens, duration)
  ADD COLUMN IF NOT EXISTS pass2_patch        JSONB,              -- adversarial validation diff from pass 2
  ADD COLUMN IF NOT EXISTS pass3_overrides    JSONB,              -- escalation overrides from pass 3
  ADD COLUMN IF NOT EXISTS dual_extraction_disagreements JSONB,   -- legacy dual-extract field disagreements
  -- Scoring & red flags
  ADD COLUMN IF NOT EXISTS overall_confidence DOUBLE PRECISION,   -- overall confidence score (0.0–1.0)
  ADD COLUMN IF NOT EXISTS show_camaudit      BOOLEAN DEFAULT false;  -- CamAudit upsell eligibility flag
