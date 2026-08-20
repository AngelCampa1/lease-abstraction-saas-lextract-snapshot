-- Add gap filler columns to extractions table
-- gap_fill_advisories: JSONB array of advisory messages for unfilled gaps
-- gap_fill_metadata: JSONB object with metrics (fields_analyzed, fields_filled, tokens, etc.)

ALTER TABLE extractions ADD COLUMN IF NOT EXISTS gap_fill_advisories JSONB DEFAULT '[]';
ALTER TABLE extractions ADD COLUMN IF NOT EXISTS gap_fill_metadata JSONB DEFAULT NULL;
