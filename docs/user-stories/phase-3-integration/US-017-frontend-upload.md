# US-017: Frontend Upload Page

**Phase:** 3 — Integration | **Depends on:** US-011, US-012 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Medium

## Description

Build the upload page where users drag-and-drop or click-to-select a PDF file for extraction. Includes file validation, upload progress, and redirect to the processing status page on success.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — upload page is user-facing
- `humanizer` — upload page contains user-facing copy and instructions

## Acceptance Criteria

- [ ] Upload page at `/upload` with drag-and-drop zone (react-dropzone)
- [ ] Accepts only PDF files — rejects other types with clear error message
- [ ] Enforces 50MB file size limit with user-friendly error
- [ ] Upload progress bar during file transfer
- [ ] Calls `POST /api/v1/extractions/upload` via API client
- [ ] On success: redirects to `/processing/{extraction_id}`
- [ ] On error: shows error message with retry option
- [ ] Works for both authenticated and anonymous users (anonymous session created automatically)
- [ ] Drag-over visual feedback (border highlight, icon change)
- [ ] Dropzone border pulses with spring animation on drag-over state
- [ ] Upload progress bar uses Motion `animate` for smooth fill transitions
- [ ] File validation error messages enter with `fadeIn` animation
- [ ] Copy is clear and professional — not AI-generated tone

## Technical Details

### Files to Create/Modify

- Create: `frontend/app/(app)/upload/page.tsx`
- Create: `frontend/components/upload/dropzone.tsx`
- Create: `frontend/components/upload/upload-progress.tsx`
- Create: `frontend/components/upload/file-validation.tsx`
- Test: `frontend/__tests__/upload/upload-page.test.tsx`
- Test: `frontend/__tests__/upload/dropzone.test.tsx`

### Key Implementation Notes

- Use `react-dropzone` with `accept: { 'application/pdf': ['.pdf'] }`, `maxSize: 50 * 1024 * 1024`
- For anonymous users: automatically call `POST /api/v1/auth/anonymous` if no session exists before upload
- Upload uses `FormData` with the API client from US-012
- Progress tracking via `XMLHttpRequest` or `fetch` with ReadableStream
- Consider showing estimated processing time after upload starts ("Typically 1-3 minutes")
- If user is not logged in and no anonymous session, create one transparently

### Integration Points

- US-011 (Auth) provides anonymous session creation
- US-012 (App Shell) provides API client and app layout
- US-014 (Backend Upload) is the endpoint this page calls
- US-018 (Processing Status) is where this page redirects after successful upload

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Upload page tests pass
# Manual: drag a PDF → upload progress → redirect to /processing/{id}
# Manual: drag a .doc → error message shown
# Manual: drag a 60MB PDF → size error shown
```

## Reference Docs

- `docs/USER_FLOWS.md` — Flow 1: Upload & Extract (steps 1-5)
- `docs/PRD.md` — Section 4: Upload requirements (50MB, PDF only)
