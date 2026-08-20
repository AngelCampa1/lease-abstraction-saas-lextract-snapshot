# US-025: Backend Field Editing & History

**Phase:** 5 — Full Results & Editing | **Depends on:** US-015b | **Blocks:** US-028
**Type:** Backend
**Estimated session size:** Medium

## Description

Build the API endpoint for editing individual extracted field values. When a user corrects a field, the original value is preserved in the audit trail (extraction_edits table), the extraction data is updated, and red flags are re-evaluated.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] `PATCH /api/v1/extractions/{id}/fields` accepts `{ field_name, value }` body
- [ ] Validates field_name exists in the 126-field schema
- [ ] Creates `extraction_edits` row: original_value, edited_value, field_name, edited_by, timestamp
- [ ] Updates the field in `extractions.extracted_data` JSONB
- [ ] Re-runs red flag detection after field edit (flags may change)
- [ ] Returns updated extraction data with new red_flags in response
- [ ] Supports reverting to original value (edit with original_value)
- [ ] `GET /api/v1/extractions/{id}/edits` returns edit history for an extraction
- [ ] Only extraction owner can edit (enforced by auth + RLS)
- [ ] Only paid extractions can be edited (payment_status = 'paid')
- [ ] Tests: edit field, verify audit trail, verify red flags re-evaluated, revert, unauthorized access

## Technical Details

### Files to Create/Modify

- Modify: `backend/app/api/v1/extractions.py` (add field edit and edit history endpoints)
- Create: `backend/app/services/field_editor.py` (FieldEditorService)
- Test: `backend/tests/test_field_editing.py`

### Key Implementation Notes

- JSONB update: use PostgreSQL `jsonb_set` or read-modify-write pattern
- Red flag re-evaluation: call `detect_red_flags(updated_extracted_data)` after edit
- Audit trail pattern: INSERT into extraction_edits, not UPDATE on extractions (though extracted_data JSONB is updated)
- Field validation: check field_name against known schema fields
- Revert: client sends PATCH with original value — creates another edit record showing revert
- The edit history endpoint returns all edits ordered by timestamp, showing the full audit trail

### Integration Points

- US-015b (Pipeline) provides the initial extracted_data that gets edited
- US-009 (Red Flags) provides `detect_red_flags` for re-evaluation
- US-028 (Frontend Inline Editing) calls this endpoint

## Verification

```bash
cd backend
pytest tests/test_field_editing.py -v  # All field editing tests pass
# Verify: edit creates audit trail row
# Verify: red flags recalculated after edit
# Verify: only owner can edit, only paid extractions
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Extractions API" section: field editing
- `docs/USER_FLOWS.md` — Flow 3: Edit & Export (steps 2-5)
- `docs/PRD.md` — Section 7.4: Field editing requirements
