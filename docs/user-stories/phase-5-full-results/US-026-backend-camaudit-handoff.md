# US-026: Backend CamAudit Handoff

**Phase:** 5 — Full Results & Editing | **Depends on:** US-015b | **Blocks:** US-031
**Type:** Backend
**Estimated session size:** Medium

## Description

Build the CamAudit handoff endpoint that generates an encrypted JSON payload containing CAM-relevant extraction data for seamless transfer to the CamAudit.io platform. This is the key monetization bridge between the two products.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] `GET /api/v1/extractions/{id}/camaudit-payload` generates the handoff payload
- [ ] Payload includes all schema-marked CAM-relevant fields with their values and confidence scores
- [ ] Payload includes: `lextract_handoff: true`
- [ ] Payload encrypted with symmetric key (shared between Lextract and CamAudit)
- [ ] UTM parameters for attribution: `utm_source=lextract`, `utm_campaign=extraction_{id}`
- [ ] Returns redirect URL: `https://www.camaudit.io/scan?payload={encrypted}&extraction_id={id}&utm_source=lextract&utm_campaign=extraction_{id}`
- [ ] Only available for paid extractions with `should_show_camaudit = true`
- [ ] Returns 403 if extraction not eligible for CamAudit handoff
- [ ] Tests with mocked encryption and payload verification

## Technical Details

### Files to Create/Modify

- Create: `backend/app/services/camaudit.py` (CamAuditHandoffService)
- Modify: `backend/app/api/v1/extractions.py` (add camaudit-payload endpoint)
- Test: `backend/tests/test_camaudit_handoff.py`

### Key Implementation Notes

- **Schema-marked CAM-relevant fields** (from schema where `cam_relevant: true`; currently 19):
  rentable_square_footage, building_total_rsf, lease_structure_type, pro_rata_share, base_year, cam_cap_percentage, cam_cap_type, gross_up_percentage, management_fee_cap, cam_exclusions, audit_rights, hvac_responsibility, reconciliation_frequency, cam_audit_deadline_days, cap_cumulative_vs_annual, controllable_vs_noncontrollable_expenses, base_year_gross_up, cam_estimate_method, expense_stop_amount
- Encryption: use `cryptography.fernet` with a shared key stored as env var `CAMAUDIT_SHARED_KEY`
- Payload JSON: `{ "fields": {...}, "confidence_scores": {...}, "lextract_handoff": true, "extraction_id": "...", "timestamp": "..." }`
- URL encode the encrypted payload for safe URL transport
- Eligibility check: `should_show_camaudit(red_flags, extracted_data, confidence_scores)` from US-009

### Integration Points

- US-015b (Pipeline) provides the extraction data with CAM fields
- US-009 (Red Flags) provides `should_show_camaudit` eligibility check
- US-031 (Frontend CamAudit CTA) calls this endpoint and uses the redirect URL

## Verification

```bash
cd backend
pytest tests/test_camaudit_handoff.py -v  # Handoff tests pass
# Verify: payload contains all schema-marked CAM fields
# Verify: payload is encrypted and URL-safe
# Verify: redirect URL includes correct UTM params
# Verify: ineligible extractions return 403
```

## Reference Docs

- `docs/PRD.md` — Section 10: CamAudit integration, handoff payload
- `docs/USER_FLOWS.md` — Flow 4: CamAudit Handoff (full flow)
- `docs/lextract_field_schema.json` — Fields with `cam_relevant: true`
