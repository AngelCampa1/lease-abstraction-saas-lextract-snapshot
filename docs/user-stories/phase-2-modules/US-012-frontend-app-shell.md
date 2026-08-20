# US-012: Frontend App Shell

**Phase:** 2 — Independent Modules | **Depends on:** US-001 | **Blocks:** US-017, US-018, US-022, US-023, US-027
**Type:** Frontend
**Estimated session size:** Medium

## Description

Build the application shell that wraps all authenticated pages: header with logo and navigation, user menu, credit balance display, TanStack Query setup, typed API client, and core data-fetching hooks. This is the frame every in-app page lives inside.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — the shell is user-facing UI

## Acceptance Criteria

- [ ] Root layout for `(app)/` route group with consistent header and navigation
- [ ] Header: Lextract logo (left), nav links (Dashboard, Upload), credit balance badge, user menu dropdown (right)
- [ ] User menu: profile link, theme toggle, sign out button
- [ ] Protected route wrapper: redirects to `/login` if unauthenticated
- [ ] TanStack Query provider configured with sensible defaults (staleTime, refetchOnWindowFocus)
- [ ] Typed API client at `lib/api.ts` with JWT/session-token interceptors
- [ ] API client automatically attaches `Authorization: Bearer {jwt}` or `X-Session-Token: {token}` header
- [ ] `useExtraction(id)` hook shell (calls GET /extractions/{id})
- [ ] `useExtractions()` hook shell (calls GET /extractions with pagination)
- [ ] `useCredits()` hook shell (calls GET /payments/credits)
- [ ] Responsive layout: mobile hamburger menu, desktop full nav
- [ ] 404 page for unmatched routes
- [ ] Mobile navigation menu slides in with spring animation via Motion
- [ ] Dropdown menus use `AnimatePresence` for enter/exit transitions
- [ ] Page content wrapped in `PageTransition` component for route transitions
- [ ] App layout sets `robots: { index: false, follow: false }` metadata — all authenticated app pages must not be indexed by search engines

## Technical Details

### Files to Create/Modify

- Create: `frontend/app/(app)/layout.tsx` (app shell with header, nav, main content area)
- Create: `frontend/components/layout/header.tsx`
- Create: `frontend/components/layout/nav.tsx`
- Create: `frontend/components/layout/user-menu.tsx`
- Create: `frontend/components/layout/credit-badge.tsx`
- Create: `frontend/components/layout/mobile-nav.tsx`
- Create: `frontend/lib/api.ts` (typed API client with interceptors)
- Create: `frontend/lib/query-client.ts` (TanStack Query client config)
- Create: `frontend/hooks/use-extraction.ts`
- Create: `frontend/hooks/use-extractions.ts`
- Create: `frontend/hooks/use-credits.ts`
- Create: `frontend/components/providers/query-provider.tsx`
- Modify: `frontend/app/layout.tsx` (add QueryProvider)
- Create: `frontend/app/not-found.tsx`
- Test: `frontend/__tests__/layout/header.test.tsx`
- Test: `frontend/__tests__/api-client.test.ts`

### Key Implementation Notes

- API client base URL: `process.env.NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api/v1`)
- Interceptor logic: check auth state → if JWT available, use Bearer token; if anonymous session, use X-Session-Token header
- TanStack Query defaults: `staleTime: 30_000`, `refetchOnWindowFocus: true`
- Hook shells should define the query keys and fetcher functions but can return placeholder data until backends exist
- Credit badge shows: "{N} credits" with icon, or "0 credits" with muted style
- Mobile breakpoint: < 768px shows hamburger menu
- App shell layout must export `metadata` with `robots: { index: false, follow: false }` — this prevents all `(app)/` routes from being indexed (dashboard, results, processing, upload, etc.)

### Integration Points

- US-011 (Auth) provides the auth context used for interceptors and protected route
- Every Phase 3+ frontend story renders inside this shell
- The API client is used by every frontend story that talks to the backend

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Shell tests pass
# Manual: navigate to /dashboard (or any app route) — header renders with nav
# Manual: resize browser — responsive menu works
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Frontend" section: route groups, API client pattern
- `docs/PRD.md` — Section 12: UI shell requirements, navigation structure
