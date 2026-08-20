# US-009: Backend Red Flag Detection

**Phase:** 2 — Independent Modules | **Depends on:** US-002 | **Blocks:** US-015b
**Type:** Backend
**Estimated session size:** Medium

## Description

Implement the 20 red flag detection rules that analyze extracted lease data for concerning terms and missing protections. Red flags drive the CamAudit upsell funnel and provide immediate value to users.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] All 20 rules implemented: RF-001 through RF-020
- [ ] Each rule evaluates extracted_data fields and returns flag if triggered
- [ ] Severity levels: High, Medium, Low assigned per rule
- [ ] CamAudit trigger logic: RF-001-006, RF-013-015 activate CamAudit CTA
- [ ] Additional CamAudit triggers: `audit_rights == true`, NNN/Modified Gross structure, 3+ CAM fields with Medium/Low confidence
- [ ] Output: `red_flags` JSONB array `[{ "rule_id": "RF-001", "name": "Excessive Management Fee", "severity": "high", "description": "...", "triggered_value": "18%" }]`
- [ ] `should_show_camaudit(red_flags, extracted_data, confidence_scores)` returns boolean
- [ ] 100% test coverage — every rule tested with triggering and non-triggering data

## Technical Details

### Files to Create/Modify

**Extract SDK (core logic):**
- Create: `packages/extract-sdk/src/extract_sdk/red_flags.py` (detect_red_flags function, should_show_camaudit function)
- Test: `packages/extract-sdk/tests/test_red_flags.py` (SDK unit tests)
- Create: `packages/extract-sdk/tests/fixtures/sample_extraction_for_flags.json`

> **Note:** No backend Celery wrapper needed — the pipeline task in `backend/app/tasks/pipeline.py` calls `extract_sdk.red_flags.detect_red_flags()` directly.

### Key Implementation Notes

**Rules:**
| ID | Condition | Severity |
|----|-----------|----------|
| RF-001 | management_fee_cap > 15% or null | High |
| RF-002 | audit_rights is false or null | High |
| RF-003 | cam_cap_percentage is null | High |
| RF-004 | cap_cumulative_vs_annual == "cumulative" | Medium |
| RF-005 | lease_structure_type == "NNN" and gross_up_percentage is null | Medium |
| RF-006 | cam_exclusions is null or empty | High |
| RF-007 | monetary_cure_period < 10 days | Medium |
| RF-008 | holdover_rate > 200% | Medium |
| RF-009 | has_termination_option is false and lease_term_months > 60 | Low |
| RF-010 | restoration_requirement is null or unclear | Low |
| RF-011 | has_renewal_option is false | Low |
| RF-012 | recapture_right is true | Medium |
| RF-013 | base_year_gross_up is false or null | Medium |
| RF-014 | reconciliation_frequency is null | Medium |
| RF-015 | cam_audit_deadline_days < 60 | Medium |

- This is a **pure function** — takes `extracted_data` dict, returns flags list
- `should_show_camaudit` is separate function — checks flags + additional criteria
- **Lextract-specific module** — not ported from CamAudit-v2. CamAudit has a separate 18-rule detection engine for statement overcharges; lextract's red flags are simpler lease-only field checks. CamAudit's detection engine stays in camaudit

### Integration Points

- US-015b (Full Pipeline) calls this after confidence scoring
- Output stored in `extractions.red_flags`
- US-022 (Teaser) shows red flag count; US-024 (Full Results) shows full details
- US-031 (CamAudit CTA) uses `should_show_camaudit` result

## Verification

```bash
cd backend
pytest tests/test_red_flags.py -v  # All 20 rules tested, all pass
```

## Reference Docs

- `docs/PRD.md` — Section 6.2: Red flag rules (RF-001 through RF-020)
- `docs/PRD.md` — Section 10: CamAudit integration, trigger conditions
