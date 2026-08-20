# US-030: Frontend Export & Download

**Phase:** 5 — Full Results & Editing | **Depends on:** US-021a, US-024 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Small

## Description

Build the export UI that lets users choose a format (Word, PDF, Excel) and property-type template, then download the generated report. Integrates into the full results view.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — export UI is user-facing

## Acceptance Criteria

- [ ] Export section on results page with format picker (Word, PDF, Excel)
- [ ] Property-type template selector (Commercial, Office, Industrial, Retail)
- [ ] Download button triggers `GET /api/v1/extractions/{id}/export/{format}?template={template}`
- [ ] Loading state during export generation (may take a few seconds)
- [ ] Download via presigned S3 URL (opens browser download)
- [ ] Error handling: generation failure with retry option
- [ ] Previously generated exports can be re-downloaded without regeneration
- [ ] Export section only visible for paid extractions

## Technical Details

### Files to Create/Modify

- Create: `frontend/components/results/export-panel.tsx`
- Create: `frontend/components/results/format-picker.tsx`
- Create: `frontend/components/results/template-selector.tsx`
- Create: `frontend/hooks/use-export.ts` (export mutation hook)
- Modify: `frontend/components/results/full-results-view.tsx` (integrate export panel)
- Test: `frontend/__tests__/results/export-panel.test.tsx`

### Key Implementation Notes

- Format picker: radio buttons or segmented control with icons (Word=W, PDF=PDF, Excel=XLS)
- Template selector: dropdown or radio group, default to "Commercial"
- Export flow: click download → call API → receive presigned URL → `window.open(url)` to trigger download
- Handle 202 Accepted (async generation): poll for completion, then download
- Handle 200 with URL (already generated): immediate download
- Show estimated generation time: "Generating report... (~5 seconds)"

### Integration Points

- US-021a (Word Export) and US-021b (PDF/Excel) provide the backend export endpoints
- US-024 (Full Results) hosts the export panel
- US-005 (S3) provides the presigned download URLs

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Export panel tests pass
# Manual: select Word + Commercial → click download → .docx downloads
# Manual: loading state shows during generation
```

## Reference Docs

- `docs/USER_FLOWS.md` — Flow 3: Edit & Export (steps 6-9)
- `docs/PRD.md` — Section 7.3: Export UI requirements
