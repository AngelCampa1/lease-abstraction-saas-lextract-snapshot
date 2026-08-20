# US-005: Backend S3 File Service

**Phase:** 2 — Independent Modules | **Depends on:** US-002 | **Blocks:** US-014
**Type:** Backend
**Estimated session size:** Small

## Description

Build a reusable S3 client wrapper for all file operations: uploading PDFs, generating presigned download URLs, and deleting files. Follows the path convention from ARCHITECTURE.md.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] `upload_file(user_id, extraction_id, file_bytes, filename)` uploads to correct S3 path
- [ ] `generate_presigned_url(s3_key, expiry=3600)` returns a 1-hour presigned URL
- [ ] `delete_file(s3_key)` removes file from S3
- [ ] Path convention enforced: `lextract-documents/{user_id}/{extraction_id}/original.pdf`
- [ ] Export path: `lextract-documents/{user_id}/{extraction_id}/exports/{format}.{ext}`
- [ ] File validation: rejects non-PDF files and files over 50MB
- [ ] All tests use mocked S3 (moto library)
- [ ] Service is injectable as a FastAPI dependency

## Technical Details

### Files to Create/Modify

- Create: `backend/app/services/s3.py` (S3Service class)
- Test: `backend/tests/test_s3_service.py`

### Key Implementation Notes

- Use `boto3` with env vars: `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- Validate content type is `application/pdf` and size <= 50MB before upload
- Presigned URLs expire in 1 hour (configurable)
- Use `moto` library to mock S3 in tests — no real AWS calls
- The service should be stateless and instantiated via dependency injection

### Integration Points

- US-014 (Upload Flow) calls `upload_file` when user uploads a PDF
- US-021a (Export) calls `upload_file` for generated exports and `generate_presigned_url` for download links
- US-019 (Results) may call `delete_file` on soft delete

## Verification

```bash
cd backend
pytest tests/test_s3_service.py -v  # All S3 tests pass with moto mocks
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "S3 Storage" section: path conventions, presigned URL expiry
- `docs/PRD.md` — Section 11.4: File storage requirements (50MB limit, 90-day retention)
