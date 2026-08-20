# US-015b: Full Pipeline Integration

**Phase:** 4 — Results & Payment | **Depends on:** US-015a, US-007, US-008, US-009 | **Blocks:** US-025, US-026
**Type:** Backend
**Estimated session size:** Large

## Description

Wire all AI services into the extraction pipeline: Gemini 3-pass extraction, confidence scoring, and red flag detection. After this story, the full pipeline works end-to-end: PDF upload → Gemini 3-pass extraction (Pass 1 primary, Pass 2 adversarial validation, Pass 3 conditional escalation) → confidence scoring → red flag detection → stored results. There is no separate OCR step.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] Pipeline chain wired: `run_gemini_extraction_task (3-pass orchestrator) → score_confidence_task → run_red_flags_task → mark_extraction_complete`
- [ ] `run_gemini_extraction_task` downloads the PDF from R2 and invokes `extract_sdk.extraction.orchestrator.run_three_pass_extraction()`
- [ ] Pass 1 + Pass 2 + Pass 3 (when triggered) run inside the SDK orchestrator; the Celery task persists the per-pass audit trail to `extraction_passes`
- [ ] Gemini extraction output feeds into confidence scoring
- [ ] Extracted data + confidence scores feed into red flag detection
- [ ] All results stored in extraction row: `extracted_data`, `confidence_scores`, `red_flags` JSONB columns
- [ ] Status transitions correctly: `uploading → extracting → scoring → complete`
- [ ] Error at any step: status = `failed`, error message stored, partial results preserved
- [ ] End-to-end integration test with sample lease PDF through full chain
- [ ] Performance: full pipeline completes within processing time targets (~30s-2min depending on doc size; see `docs/PRD.md` Section 5.4)

## Technical Details

### Files to Create/Modify

- Modify: `backend/app/tasks/pipeline.py` (replace placeholder chain with real chain)
- Modify: `backend/app/tasks/scoring.py` (wire SDK calls for `score_confidence_task` + `run_red_flags_task`)
- Modify: `backend/app/tasks/extraction.py` (wire `run_gemini_extraction_task` to the SDK orchestrator + R2 download + `extraction_passes` persistence)
- Test: `backend/tests/test_full_pipeline.py` (end-to-end integration)
- Create: `backend/tests/fixtures/sample_full_pipeline.json` (Pass 1 → Pass 2 → Pass 3 → scores → flags)

### Key Implementation Notes

- Chain: `chain(run_gemini_extraction_task.s(extraction_id), score_confidence_task.s(), run_red_flags_task.s(), mark_extraction_complete.s())`
- The `run_gemini_extraction_task` step internally runs the 3-pass orchestrator (Pass 1 always, Pass 2 always, Pass 3 conditionally) — these are sequential awaits inside the SDK, not separate Celery tasks
- Pipeline flow: `run_gemini_extraction_task (Pass 1 → Pass 2 → Pass 3) → score_confidence_task → run_red_flags_task → mark_extraction_complete`
- Each task receives the extraction_id and reads/writes to the extraction row
- `run_gemini_extraction_task` downloads the PDF from R2, calls the SDK orchestrator, and persists every pass's audit row to `extraction_passes`
- Gemini extraction returns 126-field structured data with per-field confidence + pass provenance
- Confidence scoring receives extracted_data + pass records, returns scored fields
- Red flags receives extracted_data + confidence_scores, returns flags array
- All JSONB writes are atomic per-column updates
- Partial failure: if Gemini extraction succeeds but scoring fails, extracted_data is preserved

### Integration Points

- US-015a (Pipeline Framework) provides the chain structure and status machine
- US-006b (Gemini PDF) provides the OpenRouter client and PDF loader
- US-007 (Gemini 3-Pass Pipeline) provides `extract_sdk.extraction.orchestrator.run_three_pass_extraction`
- US-008 (Confidence) provides `extract_sdk.confidence.score_confidence`
- US-009 (Red Flags) provides `extract_sdk.red_flags.detect_red_flags` and `extract_sdk.red_flags.should_show_camaudit`
- All extraction logic is imported from `extract_sdk.*`, not from `app.services.*`
- US-019 (Results Endpoints) reads the data stored by this pipeline
- US-025 (Field Editing) modifies data stored by this pipeline
- US-026 (CamAudit) reads red flags and CAM data stored by this pipeline

## Verification

```bash
cd backend
pytest tests/test_full_pipeline.py -v  # End-to-end pipeline test passes
# Verify: extraction row has populated extracted_data, confidence_scores, red_flags
# Verify: status transitions correctly through all steps
# Verify: failure at any step stores error and preserves partial data
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Background Jobs" section: full task chain
- `docs/USER_FLOWS.md` — Flow 1: processing pipeline steps
- `docs/PRD.md` — Section 5: End-to-end pipeline requirements
