# US-027: Frontend Dashboard & Profile Pages

**Phase:** 4 — Results & Payment | **Depends on:** US-012, US-020 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Medium

## Description

Build the user dashboard (main landing page after login) and profile management page. The dashboard shows extraction history, credit balance, and quick actions. The profile page allows editing user information.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — dashboard is a key user-facing page
- `humanizer` — dashboard copy and empty states should be natural

## Acceptance Criteria

- [ ] Dashboard at `/dashboard` with: extraction list, credit balance card, quick stats
- [ ] Extraction list: rows with filename, date, status badge, property type, action buttons (view/delete)
- [ ] Status badges: color-coded (uploading=blue, processing=yellow, complete=green, failed=red)
- [ ] Credit balance card: current balance, "Buy credits" link
- [ ] Quick stats: total extractions, completed, processing, failed counts
- [ ] Delete extraction: confirmation dialog → calls DELETE endpoint → removes from list
- [ ] Empty state for new users: welcome message, "Upload your first lease" CTA
- [ ] Profile page at `/profile`: edit full_name, company, role via form
- [ ] Profile form validation with React Hook Form + Zod
- [ ] Extraction history cards use `StaggerChildren` for list entrance
- [ ] Empty state illustration fades in with `fadeIn` variant
- [ ] Status badge changes animate with `AnimatePresence` (exit old → enter new)
- [ ] Responsive layout: card grid on desktop, stacked on mobile

## Technical Details

### Files to Create/Modify

- Create: `frontend/app/(app)/dashboard/page.tsx`
- Create: `frontend/app/(app)/profile/page.tsx`
- Create: `frontend/components/dashboard/extraction-list.tsx`
- Create: `frontend/components/dashboard/credit-card.tsx`
- Create: `frontend/components/dashboard/quick-stats.tsx`
- Create: `frontend/components/dashboard/empty-state.tsx`
- Create: `frontend/components/profile/profile-form.tsx`
- Test: `frontend/__tests__/dashboard/dashboard.test.tsx`
- Test: `frontend/__tests__/profile/profile-form.test.tsx`

### Key Implementation Notes

- Dashboard data from `GET /api/v1/user/dashboard` via `useDashboard()` hook
- Extraction list: each row links to `/results/{id}` or `/processing/{id}` based on status
- Delete: `useMutation` → DELETE endpoint → `queryClient.invalidateQueries(['dashboard'])`
- Empty state: friendly illustration/icon + "Upload your first lease" button → `/upload`
- Profile: `useForm` with Zod validation, `useMutation` for PATCH /user/profile
- Status badges use Shadcn Badge component with variant colors

### Integration Points

- US-020 (Dashboard Endpoints) provides the API data
- US-012 (App Shell) provides the layout and navigation (Dashboard link in nav)
- Links to US-017 (Upload) for "Upload" action
- Links to US-022/US-024 (Results) for "View" action on extraction rows

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Dashboard and profile tests pass
# Manual: navigate to /dashboard — shows extraction list and stats
# Manual: navigate to /profile — edit and save profile
# Manual: new user sees empty state
```

## Reference Docs

- `docs/PRD.md` — Section 9: Dashboard requirements
- `docs/USER_FLOWS.md` — Flow 5: Credit balance display
