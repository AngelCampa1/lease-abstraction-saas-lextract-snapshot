# US-028: Frontend Inline Field Editing

**Phase:** 6 — Advanced UI | **Depends on:** US-024, US-025 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Medium

## Description

Add inline editing capabilities to the full results view. Users can click any field value to edit it in-place, save changes to the backend, and see red flags update in real-time. Includes edit indicators and undo functionality.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — inline editing UX must be smooth and intuitive

## Acceptance Criteria

- [ ] Click field value → transforms into inline edit input (text, number, date, boolean as appropriate)
- [ ] Save on blur or Enter key → calls `PATCH /api/v1/extractions/{id}/fields`
- [ ] Cancel on Escape key → reverts to original displayed value
- [ ] Edit indicator: pencil icon on hover, "edited" badge on modified fields
- [ ] Red flag panel updates after save (re-evaluated by backend)
- [ ] Undo: "Revert to AI value" option restores original extraction value
- [ ] Optimistic update: UI updates immediately, rolls back on API failure
- [ ] Loading state on the field being saved (subtle spinner or opacity change)
- [ ] Only editable for paid extractions (payment_status = 'paid')
- [ ] Edit mode transition (text → input) uses `AnimatePresence` for smooth swap
- [ ] Save confirmation uses brief `scaleIn` animation on the "saved" indicator
- [ ] Revert button enters/exits with `fadeIn` transition
- [ ] Edit history accessible: tooltip or expandable showing original value and edit timestamp

## Technical Details

### Files to Create/Modify

- Create: `frontend/components/results/editable-field.tsx`
- Create: `frontend/components/results/edit-indicator.tsx`
- Create: `frontend/hooks/use-field-edit.ts` (edit mutation with optimistic updates)
- Modify: `frontend/components/results/field-row.tsx` (wrap value in EditableField)
- Modify: `frontend/components/results/red-flag-panel.tsx` (reactive to data changes)
- Test: `frontend/__tests__/results/editable-field.test.tsx`
- Test: `frontend/__tests__/results/field-edit-flow.test.tsx`

### Key Implementation Notes

- EditableField component: renders value normally, on click switches to input mode
- Input type depends on field data_type from schema: string→text, number→number, currency→number, date→date, boolean→checkbox, percentage→number with % suffix
- Use TanStack Query `useMutation` with optimistic update pattern:
  - `onMutate`: update cache optimistically
  - `onError`: roll back cache
  - `onSettled`: invalidate to refetch latest data (including updated red flags)
- Undo: store original AI value client-side, send PATCH with that value to revert
- Consider keyboard navigation: Tab between fields, Enter to save, Escape to cancel

### Integration Points

- US-025 (Backend Field Editing) provides the PATCH endpoint
- US-024 (Full Results) hosts the field rows that become editable
- US-009 (Red Flags) re-evaluates flags after edits (via backend)

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Inline editing tests pass
# Manual: click a field → edit → save → value persists on refresh
# Manual: edit a field that affects red flags → red flag panel updates
# Manual: click "Revert to AI value" → original value restored
# Manual: press Escape → edit cancelled, original value shown
```

## Reference Docs

- `docs/USER_FLOWS.md` — Flow 3: Edit & Export (steps 2-5)
- `docs/PRD.md` — Section 7.4: Inline editing requirements
