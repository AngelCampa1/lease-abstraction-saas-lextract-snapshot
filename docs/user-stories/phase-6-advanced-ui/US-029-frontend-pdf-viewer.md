# US-029: Frontend PDF Side-by-Side Viewer

**Phase:** 6 — Advanced UI | **Depends on:** US-024 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Large

## Description

Build a split-screen view where extraction results are on the left and the original PDF document is on the right. Clicking a field scrolls the PDF to the source page and highlights the relevant text, enabling users to verify extractions against the source document.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — split-pane UX must be polished and functional

## Acceptance Criteria

- [ ] Split screen layout: results panel (left), PDF viewer (right)
- [ ] PDF rendered via `react-pdf` or `@react-pdf-viewer/core`
- [ ] Click a field in results → PDF scrolls to the source page
- [ ] Source text highlighted in the PDF (if page/position data available)
- [ ] Resizable split pane (drag handle between panels)
- [ ] PDF controls: page navigation (prev/next, page number input), zoom in/out, fit-to-width
- [ ] Toggle button to show/hide PDF panel (default: visible on desktop, hidden on mobile)
- [ ] PDF loaded via presigned S3 URL
- [ ] Graceful handling: no PDF available, PDF loading error, very large PDFs
- [ ] Keyboard shortcuts: arrow keys for page navigation when PDF focused

## Technical Details

### Files to Create/Modify

- Create: `frontend/components/results/pdf-viewer.tsx`
- Create: `frontend/components/results/split-pane.tsx`
- Create: `frontend/components/results/pdf-controls.tsx`
- Create: `frontend/hooks/use-pdf-viewer.ts` (PDF state management)
- Modify: `frontend/app/(app)/results/[id]/page.tsx` (integrate split layout)
- Test: `frontend/__tests__/results/pdf-viewer.test.tsx`
- Test: `frontend/__tests__/results/split-pane.test.tsx`

### Key Implementation Notes

- Use `react-pdf` (Mozilla PDF.js wrapper) for rendering
- PDF URL: fetch presigned URL from backend or use a dedicated endpoint
- Source linking: Claude extraction includes `source_text` per field — match against PDF text layers
- Page linking: if source page is available, navigate to that page; otherwise, text search
- Split pane: use a lightweight resizable split component (e.g., `react-resizable-panels`)
- Default split: 60% results / 40% PDF on desktop
- Mobile: PDF viewer in a bottom sheet or full-screen modal (not side-by-side)
- PDF.js worker: load from CDN to avoid bundling issues
- Large PDFs: render pages lazily (only visible pages in memory)

### Integration Points

- US-024 (Full Results) provides the results panel content
- US-005 (S3) provides the presigned PDF URL
- Field `source_text` data from Claude extraction enables source linking

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # PDF viewer tests pass
# Manual: open results with PDF panel → PDF renders correctly
# Manual: click a field → PDF navigates to source page
# Manual: drag split handle → panels resize smoothly
# Manual: page nav and zoom controls work
# Manual: toggle PDF panel on/off
```

## Reference Docs

- `docs/PRD.md` — Section 7.5: PDF viewer requirements
- `docs/USER_FLOWS.md` — Flow 3: Source verification
