-- =============================================================================
-- Migration 00007: Drop Textract columns and swap extraction_status enum
-- =============================================================================
-- Context: Lextract migrated from AWS Textract OCR to direct Gemini PDF
-- extraction. The ocr_processing status value and Textract-specific columns
-- (textract_job_id, ocr_text, ocr_metadata) are no longer needed.
--
-- Safety: historical ocr_text/ocr_metadata rows are archived before dropping
-- so the data is not permanently lost (audit defensibility).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Archive historical OCR data before dropping the columns
-- ---------------------------------------------------------------------------
-- Preserves any rows that had OCR text populated, for audit/rollback purposes.
CREATE TABLE IF NOT EXISTS public.extractions_archive_ocr AS
SELECT id, ocr_text, ocr_metadata, created_at
FROM public.extractions
WHERE ocr_text IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Drop Textract-specific columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.extractions DROP COLUMN IF EXISTS textract_job_id;
ALTER TABLE public.extractions DROP COLUMN IF EXISTS ocr_text;
ALTER TABLE public.extractions DROP COLUMN IF EXISTS ocr_metadata;

-- ---------------------------------------------------------------------------
-- 3. Swap the extraction_status enum
--    Must drop the column DEFAULT before ALTER TYPE, then restore it.
--    Any rows stuck in 'ocr_processing' are migrated to 'extracting'.
-- ---------------------------------------------------------------------------

-- Step 3a: Drop the default so ALTER TYPE can proceed
ALTER TABLE public.extractions ALTER COLUMN status DROP DEFAULT;

-- Step 3b: Rename old type out of the way
ALTER TYPE public.extraction_status RENAME TO extraction_status_old;

-- Step 3c: Create the new type without ocr_processing
CREATE TYPE public.extraction_status AS ENUM (
    'uploading',
    'extracting',
    'scoring',
    'complete',
    'failed'
);

-- Step 3d: Migrate the column — rows in ocr_processing become extracting
ALTER TABLE public.extractions
    ALTER COLUMN status TYPE public.extraction_status
    USING (
        CASE WHEN status::text = 'ocr_processing'
             THEN 'extracting'::public.extraction_status
             ELSE status::text::public.extraction_status
        END
    );

-- Step 3e: Restore the column default
ALTER TABLE public.extractions
    ALTER COLUMN status SET DEFAULT 'uploading'::public.extraction_status;

-- Step 3f: Clean up the old type
DROP TYPE public.extraction_status_old;

COMMIT;
