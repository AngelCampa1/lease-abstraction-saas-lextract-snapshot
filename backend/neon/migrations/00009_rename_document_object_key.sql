-- =============================================================================
-- Lextract.io - Rename extraction storage key column
-- Migration: 00009_rename_document_object_key.sql
--
-- Renames public.extractions.document_s3_key to document_object_key so the
-- persisted schema matches the Cloudflare R2 / provider-neutral storage layer.
-- Safe to run multiple times.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'extractions'
      AND column_name = 'document_s3_key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'extractions'
      AND column_name = 'document_object_key'
  ) THEN
    ALTER TABLE public.extractions
      RENAME COLUMN document_s3_key TO document_object_key;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'extractions'
      AND column_name = 'document_s3_key'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'extractions'
      AND column_name = 'document_object_key'
  ) THEN
    EXECUTE $sql$
      UPDATE public.extractions
      SET document_object_key = COALESCE(document_object_key, document_s3_key)
      WHERE document_s3_key IS NOT NULL
    $sql$;

    ALTER TABLE public.extractions
      DROP COLUMN document_s3_key;
  END IF;
END;
$$;
