# US-006b: Backend Gemini PDF Extraction

**Phase:** 2 — Independent Modules | **Depends on:** US-002 | **Blocks:** US-015a
**Type:** Backend
**Estimated session size:** Medium

> **Replaces:** US-006 (Backend Textract OCR Service). The original Textract-based OCR pipeline has been removed in favor of Google Gemini 3 Flash via OpenRouter, which accepts PDFs as native multimodal input — no separate OCR step is required. The original `start_ocr_job` and `poll_textract` Celery tasks are gone; the pipeline is now a single `run_gemini_extraction_task` that calls the SDK's 3-pass orchestrator.

## Description

Build the Gemini 3 Flash PDF extraction integration. The backend downloads the uploaded PDF from Cloudflare R2, hands it to the `extract-sdk` orchestrator, and the SDK runs a 3-pass adversarial validation pipeline against Google Gemini 3 Flash (via OpenRouter's OpenAI-compatible API). Each pass logs an audit row to `extraction_passes` for cost, timing, and reproducibility tracking.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] `OpenRouterClient.extract_pdf(pdf_bytes, prompt, model_chain)` sends a multimodal request to OpenRouter with the PDF base64-encoded as a `file` content part
- [ ] `extract_sdk.extraction.orchestrator.run_three_pass_extraction(pdf_bytes, registry)` orchestrates the full 3-pass run and returns merged extraction + per-pass audit records
- [ ] Pass 1 (primary extraction): always runs, returns 126-field JSON with Gemini self-reported confidence per field
- [ ] Pass 2 (adversarial validation): always runs, re-reads the PDF, emits a sparse corrections patch
- [ ] Pass 3 (escalation): runs only when Pass 2 corrected a critical field (`base_rent_annual`, `pro_rata_share`, `lease_term_months`) or a critical field has confidence < 0.80
- [ ] Per-pass fallback chain: each pass tries primary model → fallback 1 → fallback 2 (configured in `backend/app/core/config.py`); first success wins
- [ ] Circuit breaker (`pybreaker`) wraps every OpenRouter call to prevent cascading failures
- [ ] R2 download: `run_gemini_extraction_task` fetches the PDF from R2 using a pre-signed URL or direct S3 client call before invoking the SDK
- [ ] Audit trail: each pass writes a row to `extraction_passes` with `extraction_id`, `pass_number`, `model_slug`, `input_tokens`, `output_tokens`, `cost_usd`, `duration_ms`, `raw_response_jsonb`
- [ ] Status updates: sets extraction status to `extracting` on start, transitions to `scoring` after the chain hands off to confidence scoring; `failed` with error message on permanent failure
- [ ] Handles documents up to 200 pages (Gemini 3 Flash 1M token context easily covers this)
- [ ] All tests use mocked OpenRouter responses; no live API calls in CI

## Technical Details

### Files to Create/Modify

**Extract SDK (core logic):**
- Create: `packages/extract-sdk/src/extract_sdk/extraction/openrouter_client.py` (OpenRouter wrapper, OpenAI-compatible, circuit breaker, fallback chain)
- Create: `packages/extract-sdk/src/extract_sdk/extraction/pdf_loader.py` (PDF bytes → base64 multimodal payload)
- Create: `packages/extract-sdk/src/extract_sdk/extraction/pass1_extraction.py` (Pass 1: primary extraction)
- Create: `packages/extract-sdk/src/extract_sdk/extraction/pass2_validation.py` (Pass 2: adversarial validation)
- Create: `packages/extract-sdk/src/extract_sdk/extraction/pass3_escalation.py` (Pass 3: escalation, conditional)
- Create: `packages/extract-sdk/src/extract_sdk/extraction/orchestrator.py` (3-pass chain + audit trail)
- Create: `packages/extract-sdk/src/extract_sdk/extraction/prompt_builder.py` (per-pass schema-driven prompts)
- Create: `packages/extract-sdk/src/extract_sdk/extraction/response_parser.py` (JSON parsing, strip `<think>` blocks)
- Test: `packages/extract-sdk/tests/test_openrouter_client.py`
- Test: `packages/extract-sdk/tests/test_orchestrator.py`
- Test: `packages/extract-sdk/tests/test_pass2_validation.py`
- Test: `packages/extract-sdk/tests/test_pass3_escalation.py`

**Backend (Celery wrapper + R2 download):**
- Create: `backend/app/tasks/extraction.py` (`run_gemini_extraction_task` Celery task)
- Modify: `backend/app/services/r2.py` (add `download_to_bytes(key)` helper for SDK ingestion)
- Modify: `backend/app/core/config.py` (Pass 1/2/3 model slugs + fallback model env vars)
- Migration: `supabase/migrations/XXXX_extraction_passes_table.sql` (audit trail table)
- Test: `backend/tests/test_extraction_task.py`
- Create: `backend/tests/fixtures/sample_gemini_response.json`
- Create: `backend/tests/fixtures/real_lease_sample.pdf` (small redacted lease for integration tests)

### Key Implementation Notes

- **Native PDF input:** OpenRouter accepts the PDF as a `file` content part in the multimodal request (base64-encoded `application/pdf`). No OCR pre-processing is needed.
- **No polling:** Unlike the previous Textract pipeline, OpenRouter requests are synchronous. The Celery task `await`s the SDK call.
- **3-pass orchestration lives in the SDK** — the backend Celery task is a thin wrapper that downloads the PDF from R2, calls `orchestrator.run_three_pass_extraction()`, persists the audit trail, and returns the merged extraction.
- **Critical fields for Pass 3 trigger:** `base_rent_annual`, `pro_rata_share`, `lease_term_months` (configurable per registry).
- **Model configuration:** see `docs/MODEL_CONFIGURATION.md` for the full per-pass model + fallback chain.
- **Cost tracking:** OpenRouter returns token counts and the per-call cost in the response metadata; persist these in `extraction_passes`.
- **Document size:** OCR text was previously truncated to 100K chars; with native PDF input, the PDF is sent as-is (Gemini handles 1M tokens of context).

### Integration Points

- US-014 (Upload) dispatches `run_gemini_extraction_task` after successful R2 upload
- US-015a (Pipeline orchestration) chains this task into `run_gemini_extraction_task → score_confidence_task → run_red_flags_task → mark_extraction_complete`
- US-008 (Confidence Scoring) consumes the merged Pass 1 + Pass 2 + Pass 3 output

## Verification

```bash
cd packages/extract-sdk
python -m pytest tests/test_orchestrator.py -v        # 3-pass orchestration tests pass
python -m pytest tests/test_openrouter_client.py -v   # OpenRouter wrapper tests pass

cd backend
python -m pytest tests/test_extraction_task.py -v     # Celery task tests pass
```

## Reference Docs

- `docs/MODEL_CONFIGURATION.md` — per-pass model + fallback chain, cost per lease
- `docs/PRD.md` Section 5 — Processing pipeline definition
- `docs/ARCHITECTURE.md` Section 1c — extract-sdk module layout
- `docs/CAMAUDIT_REUSE.md` US-006b — porting reference for the OpenRouter client and pass modules
