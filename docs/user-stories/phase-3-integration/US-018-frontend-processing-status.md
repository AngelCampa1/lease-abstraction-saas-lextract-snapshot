# US-018: Frontend Processing Status Page

**Phase:** 3 — Integration | **Depends on:** US-011, US-012 | **Blocks:** US-022
**Type:** Frontend
**Estimated session size:** Medium

## Description

Build the processing status page that shows real-time progress as a lease document moves through the extraction pipeline. Polls the backend every 3 seconds and displays step-by-step progress.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — processing page is user-facing

## Acceptance Criteria

- [ ] Processing page at `/processing/[id]`
- [ ] Polls `GET /api/v1/extractions/{id}` every 3 seconds via TanStack Query
- [ ] Displays step progress with visual indicators for each pipeline stage:
  - uploading → "Uploading document..."
  - extracting → "Extracting lease terms..." (covers all 3 Gemini passes)
  - scoring → "Scoring confidence..."
  - complete → redirect to `/results/{id}`
  - failed → show error with retry/contact options
- [ ] Animated progress indicator (stepper or progress bar)
- [ ] Estimated time remaining based on current step
- [ ] Stops polling on `complete` or `failed` status
- [ ] Cancel option (optional — nice to have)
- [ ] Progress stepper step completions animate with spring transition (scale pop + checkmark)
- [ ] Stage transitions use `AnimatePresence` for smooth swap between states
- [ ] Overall progress bar fills with spring-based animation
- [ ] Handles: page refresh (resumes polling), invalid extraction_id (404)

## Technical Details

### Files to Create/Modify

- Create: `frontend/app/(app)/processing/[id]/page.tsx`
- Create: `frontend/components/processing/step-progress.tsx`
- Create: `frontend/components/processing/time-estimate.tsx`
- Test: `frontend/__tests__/processing/processing-page.test.tsx`

### Key Implementation Notes

- Use TanStack Query with `refetchInterval: 3000` and `enabled: status !== 'complete' && status !== 'failed'`
- Step order for display: uploading (1/4) → extracting (2/4) → scoring (3/4) → complete (4/4)
- Time estimates: uploading ~5s, extracting ~30s-2min (covers all 3 Gemini passes), scoring ~5s
- On `complete`: use `router.push(\`/results/${id}\`)` for redirect
- On `failed`: show error message from API response, suggest retry or contact support
- Use the `useExtraction(id)` hook from US-012

### Integration Points

- US-012 (App Shell) provides the `useExtraction` hook and layout
- US-015a (Pipeline) sets the status values this page reads
- US-017 (Upload) redirects here after successful upload
- US-022 (Teaser) is where this redirects on completion

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Processing page tests pass
# Manual: navigate to /processing/{id} — shows current status
# Manual: status progresses and eventually redirects to /results/{id}
```

## Reference Docs

- `docs/USER_FLOWS.md` — Flow 1: Upload & Extract (step 6 — polling)
- `docs/PRD.md` — Section 5: Processing status UI requirements
