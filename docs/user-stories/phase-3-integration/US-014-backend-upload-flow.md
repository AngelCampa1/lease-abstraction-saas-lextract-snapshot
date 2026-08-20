# US-014: Backend Upload Flow

**Phase:** 3 — Integration | **Depends on:** US-004, US-005 | **Blocks:** None
**Type:** Backend
**Estimated session size:** Medium

## Description

Wire together auth and R2 storage into a complete upload endpoint. When a user uploads a PDF, this endpoint validates the file, uploads it to Cloudflare R2, creates an extraction database row, and kicks off the Gemini extraction Celery chain. Handles both authenticated users (JWT) and anonymous sessions (X-Session-Token).

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] `POST /api/v1/extractions/upload` accepts multipart PDF upload
- [ ] Validates: file is PDF, size <= 50MB
- [ ] Uploads to Cloudflare R2 at `lextract-documents/{user_id}/{extraction_id}/original.pdf` (or `anon/{session_id}/...` for anonymous)
- [ ] Creates `extractions` row with status `uploading`, document_filename, document_r2_key
- [ ] Dispatches the extraction Celery chain (4 tasks: `run_gemini_extraction_task → score_confidence_task → run_red_flags_task → mark_extraction_complete`) with extraction_id
- [ ] Returns `{ extraction_id, status: "uploading" }` with 201 status
- [ ] Works with both JWT auth (user_id from token) and anonymous session (X-Session-Token header)
- [ ] Returns 400 for invalid file type or size
- [ ] Returns 401 for missing auth
- [ ] Integration test: upload → R2 object exists → DB row created → Celery chain dispatched

## Technical Details

### Files to Create/Modify

- Create: `backend/app/api/v1/extractions.py` (upload endpoint)
- Modify: `backend/app/api/v1/router.py` (include extractions router)
- Test: `backend/tests/test_upload.py`
- Test: `backend/tests/test_upload_integration.py`

### Key Implementation Notes

- Use `UploadFile` from FastAPI for multipart handling
- Generate UUID for extraction_id before upload
- The `get_current_user` dependency from US-004 handles both auth types
- For anonymous uploads, store `anonymous_session_id` on the extraction row
- Celery chain dispatch: `chain(run_gemini_extraction_task.s(extraction_id), score_confidence_task.s(), run_red_flags_task.s(), mark_extraction_complete.s()).delay()`
- R2 upload uses the R2Service from US-005

### Integration Points

- US-004 (Auth) provides `get_current_user` dependency
- US-005 (R2) provides `R2Service.upload_file()` and `R2Service.download_to_bytes()`
- US-006b (Gemini PDF Extraction) provides `run_gemini_extraction_task` Celery task
- US-017 (Frontend Upload) calls this endpoint

## Verification

```bash
cd backend
pytest tests/test_upload.py -v              # Unit tests pass
pytest tests/test_upload_integration.py -v  # Integration test passes
# Manual: curl -X POST -F "file=@test.pdf" http://localhost:8000/api/v1/extractions/upload
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Extractions API" section: upload endpoint
- `docs/USER_FLOWS.md` — Flow 1: Upload & Extract (steps 3-4)
