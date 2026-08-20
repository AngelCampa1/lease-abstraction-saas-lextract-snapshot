# US-015a: Pipeline Orchestration & Status Tracking

**Phase:** 3 — Integration | **Depends on:** US-006 | **Blocks:** US-015b, US-019, US-021a, US-032
**Type:** Backend
**Estimated session size:** Large

## Description

Build the Celery task chain that orchestrates the entire extraction pipeline and the status tracking system. This defines the state machine for extraction status transitions and the framework that later stories (US-015b) will wire the AI services into.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] Celery chain defined: `run_gemini_extraction_task → score_confidence_task → run_red_flags_task → mark_extraction_complete` (4 tasks, no polling)
- [ ] Extraction status state machine: `uploading → extracting → scoring → complete` (no `ocr_processing` state — Gemini accepts the PDF natively)
- [ ] Error state: any step failure → status = `failed` with error message stored
- [ ] Status update function: `update_extraction_status(extraction_id, new_status, error_msg=None)`
- [ ] Retry framework: configurable retry count and backoff per task (transient OpenRouter errors retry up to 3x)
- [ ] Dead letter handling: after max retries, mark as `failed`
- [ ] No beat polling required — OpenRouter calls are synchronous, no async job IDs to poll
- [ ] Pipeline is extensible — US-015b wires the SDK orchestrator into `run_gemini_extraction_task`
- [ ] Status transitions are atomic (no inconsistent states)
- [ ] Tests verify: happy path chain, failure at each step, retry behavior

## Technical Details

### Files to Create/Modify

- Create: `backend/app/tasks/pipeline.py` (chain definition, status machine, `mark_extraction_complete` task)
- Create: `backend/app/core/status.py` (update_extraction_status, status transition validation)
- Create: `backend/app/tasks/extraction.py` (`run_gemini_extraction_task` placeholder; US-015b wires the real SDK orchestrator)
- Create: `backend/app/tasks/scoring.py` (`score_confidence_task`, `run_red_flags_task` placeholders; US-015b wires the SDK)
- Modify: `backend/app/core/celery_app.py` (chain registration; no beat schedule needed)
- Test: `backend/tests/test_pipeline.py`
- Test: `backend/tests/test_status.py`

### Key Implementation Notes

- Use Celery's `chain()` for sequential pipeline steps
- Status transitions must be validated — can't go backwards (e.g., `complete` → `extracting`)
- The chain: `run_gemini_extraction_task → score_confidence_task → run_red_flags_task → mark_extraction_complete`
- US-015b wires the real SDK orchestrator (`extract_sdk.extraction.orchestrator.run_three_pass_extraction`) into `run_gemini_extraction_task`
- No Celery beat polling needed — Gemini via OpenRouter returns synchronously per call; the 3 passes inside the SDK orchestrator are sequential awaits
- Error handling pattern: `try/except` in each task → on failure, call `update_extraction_status(id, 'failed', str(error))`
- Store `pipeline_step_timestamps` JSONB for timing analysis (per-pass durations come from `extraction_passes`)

### Integration Points

- US-006b (Gemini PDF Extraction) provides the SDK orchestrator wired into `run_gemini_extraction_task`
- US-015b (Full Pipeline) wires Gemini extraction, confidence, red flags — all via `extract_sdk.*` imports
- US-019 (Results Endpoints) reads status set by this pipeline
- US-018 (Frontend Processing) polls status set by this pipeline
- US-032 (Email) triggers on pipeline completion

## Verification

```bash
cd backend
pytest tests/test_pipeline.py -v  # Pipeline chain tests pass
pytest tests/test_status.py -v    # Status machine tests pass
# Manual: dispatch a test pipeline task, verify status transitions in DB
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Background Jobs" section: task chain, intentionally empty beat schedule
- `docs/USER_FLOWS.md` — Flow 1: Processing status steps
- `docs/PRD.md` — Section 5: Processing pipeline definition
