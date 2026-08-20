# US-019: Backend Results Endpoints

**Phase:** 4 — Results & Payment | **Depends on:** US-015a, US-004 | **Blocks:** US-024
**Type:** Backend
**Estimated session size:** Medium

## Description

Build the API endpoints that serve extraction results to the frontend. The teaser endpoint returns limited fields for unpaid extractions (to entice payment). The full endpoint returns all 126 fields for paid extractions. Also includes extraction listing and soft-delete.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] `GET /api/v1/extractions/{id}/teaser` — returns 3-5 visible fields + blurred field count + red flag count + confidence summary
- [ ] `GET /api/v1/extractions/{id}` — returns full extraction (requires `payment_status = 'paid'`)
- [ ] Full endpoint returns 403 if `payment_status != 'paid'`
- [ ] `GET /api/v1/extractions` — lists user's extractions with pagination (limit, offset) and optional status filter
- [ ] `DELETE /api/v1/extractions/{id}` — soft delete (marks deleted, schedules S3 cleanup)
- [ ] Teaser visible fields: `landlord_legal_name`, `tenant_legal_name`, `premises_address`, `commencement_date`, `base_rent_annual`
- [ ] Teaser includes: total_field_count, category_count, confidence_distribution (high/medium/low counts), red_flag_count
- [ ] All endpoints enforce user ownership (user can only see own extractions)
- [ ] Tests cover: teaser vs full access, pagination, status filter, ownership, soft delete

## Technical Details

### Files to Create/Modify

- Modify: `backend/app/api/v1/extractions.py` (add results endpoints)
- Create: `backend/app/models/results.py` (TeaserResponse, FullResultsResponse, ExtractionListResponse)
- Test: `backend/tests/test_results_endpoints.py`

### Key Implementation Notes

- Teaser endpoint: filter `extracted_data` to only return the 5 visible fields; count the rest
- Confidence distribution: count fields in each tier (high/medium/low) from `confidence_scores`
- Full endpoint: check `payment_status == 'paid'` before returning data; 403 otherwise
- Pagination: `GET /extractions?limit=20&offset=0&status=complete`
- Soft delete: set a `deleted_at` timestamp (or `is_deleted` flag), don't actually remove the row
- S3 cleanup: dispatch a Celery task to delete the S3 object after soft delete
- RLS handles ownership — but also validate in application code for defense in depth

### Integration Points

- US-015a (Pipeline) populates the data these endpoints serve
- US-004 (Auth) provides authentication
- US-022 (Teaser View) calls the teaser endpoint
- US-024 (Full Results) calls the full endpoint
- US-027 (Dashboard) calls the list endpoint

## Verification

```bash
cd backend
pytest tests/test_results_endpoints.py -v  # All results tests pass
# Verify: teaser returns exactly 5 fields + counts
# Verify: full endpoint returns 403 for unpaid extraction
# Verify: list endpoint paginates correctly
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Extractions API" section: results endpoints
- `docs/USER_FLOWS.md` — Flow 1 (teaser), Flow 2 (full unlock)
- `docs/PRD.md` — Section 7: Results display requirements
