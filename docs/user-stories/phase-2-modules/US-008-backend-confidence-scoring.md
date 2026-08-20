# US-008: Backend Confidence Scoring

**Phase:** 2 — Independent Modules | **Depends on:** US-002 | **Blocks:** US-015b
**Type:** Backend
**Estimated session size:** Small

## Description

Build the confidence scoring module that merges Gemini's self-reported per-field confidence with adjustments from the Pass 2 / Pass 3 outcomes, applies cross-field validation rules, and assigns tier labels. There is no separate OCR layer in the Gemini pipeline — the LLM accepts the PDF natively and reports its own confidence. This is a pure function with no external dependencies.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] Starts from Gemini Pass 1's self-reported confidence (0.0-1.0) per field
- [ ] Pass 2 outcome adjustments:
  - If Pass 2 left the field untouched → small confidence boost (validation upheld)
  - If Pass 2 corrected the field → confidence is replaced with Pass 2's reported confidence (Pass 2 wins by default for non-critical fields)
- [ ] Pass 3 outcome adjustments (critical fields only): final confidence is the Pass 3 winner's reported confidence; if Pass 3 confirmed Pass 2's correction, mark `pass_provenance="pass3"`
- [ ] Cross-field validation: `pro_rata_share` checked against `tenant_rsf / building_rsf`
- [ ] Cross-field validation: date consistency (commencement < expiration, rent commencement between them)
- [ ] Tier assignment: High (0.85-1.00 green), Medium (0.60-0.84 yellow), Low (0.00-0.59 red)
- [ ] Output: JSONB structure `{ "field_name": { "score": 0.92, "tier": "high", "gemini_confidence": 0.89, "pass_provenance": "pass1" | "pass2" | "pass3" } }`
- [ ] 100% unit test coverage — this is a pure function

## Technical Details

### Files to Create/Modify

**Extract SDK (core logic):**
- Create: `packages/extract-sdk/src/extract_sdk/confidence.py` (score_confidence function)
- Test: `packages/extract-sdk/tests/test_confidence.py` (SDK unit tests)
- Create: `packages/extract-sdk/tests/fixtures/sample_confidence_input.json`

> **Note:** No backend Celery wrapper needed — the pipeline task in `backend/app/tasks/pipeline.py` calls `extract_sdk.confidence.score_confidence()` directly.

### Key Implementation Notes

- **Port from CamAudit-v2:** Confidence scoring pattern adapted from `camaudit-v2/backend/app/services/extraction/confidence.py` (post-Gemini-migration version)
- Uses `FieldRegistry.get_field_weights()` for weighted average — registry-driven, not hardcoded weights
- Pluggable cross-field validators via `CrossFieldValidator` callable — allows different validation rules per schema
- Scoring formula: `combined = gemini_pass1_confidence` adjusted by:
  - +0.05 if Pass 2 upheld the field (capped at 1.0)
  - replaced by Pass 2's reported confidence if Pass 2 corrected the field
  - replaced by Pass 3's winning confidence for critical fields when escalation ran
- Cross-field rules are bonus validators that can lower confidence:
  - If `pro_rata_share` doesn't match `rentable_square_footage / building_total_rsf` (within 2% tolerance), lower confidence
  - If `lease_term_months` doesn't match month diff between commencement and expiration, lower confidence
- Null fields get confidence 0.0, tier "low"
- This is a **pure function** — takes `(extracted_data, pass_records)` → returns `confidence_scores` JSONB

### Integration Points

- US-015b (Full Pipeline) calls this after Claude extraction
- Output stored in `extractions.confidence_scores`
- US-022 (Teaser) and US-024 (Full Results) display confidence badges using this data

## Verification

```bash
cd backend
pytest tests/test_confidence.py -v  # All scoring tests pass
```

## Reference Docs

- `docs/PRD.md` — Section 6.1: Confidence scoring tiers, cross-field rules
- `docs/lextract_field_schema.json` — Field definitions (data_type informs validation)
