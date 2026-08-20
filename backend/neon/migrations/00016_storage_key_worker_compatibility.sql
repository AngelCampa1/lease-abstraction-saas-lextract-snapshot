-- =============================================================================
-- Lextract.io - Cloudflare Worker storage key compatibility
-- Migration: 00016_storage_key_worker_compatibility.sql
--
-- Ensures the Cloudflare API Worker can write provider-neutral R2 object keys
-- while preserving read/delete compatibility for legacy document_s3_key rows.
-- Safe to run multiple times.
-- =============================================================================

ALTER TABLE public.extractions
  ADD COLUMN IF NOT EXISTS document_object_key TEXT;

ALTER TABLE public.extractions
  ADD COLUMN IF NOT EXISTS document_s3_key TEXT;

UPDATE public.extractions
SET document_object_key = COALESCE(document_object_key, document_s3_key)
WHERE document_object_key IS NULL
  AND document_s3_key IS NOT NULL;

ALTER TABLE public.extractions
  ALTER COLUMN document_s3_key DROP NOT NULL;

ALTER TABLE public.extractions
  ALTER COLUMN document_object_key SET NOT NULL;

COMMENT ON COLUMN public.extractions.document_object_key IS
  'Provider-neutral object storage key for the source lease PDF.';

COMMENT ON COLUMN public.extractions.document_s3_key IS
  'Legacy storage key retained temporarily for cleanup/backward compatibility.';
