-- =============================================================================
-- Migration 00014: Lock down historical OCR archive table
-- =============================================================================
-- Migration 00007 copied legacy OCR text into an archive table after the initial
-- authenticated grants were installed. Keep the table available to database
-- owners for emergency audit/rollback work, but never expose it through the
-- authenticated Data API role.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.extractions_archive_ocr') IS NOT NULL THEN
    ALTER TABLE public.extractions_archive_ocr ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.extractions_archive_ocr FROM authenticated;
    REVOKE ALL ON TABLE public.extractions_archive_ocr FROM PUBLIC;
  END IF;
END $$;

COMMIT;
