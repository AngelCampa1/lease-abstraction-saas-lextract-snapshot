# US-011: Frontend Auth Pages

**Phase:** 2 — Independent Modules | **Depends on:** US-001 | **Blocks:** US-017, US-018
**Type:** Frontend
**Estimated session size:** Medium

## Description

Build the authentication pages and auth infrastructure for the frontend. This includes login, signup, Supabase Auth client setup, session management, anonymous session creation, and the account-linking flow where anonymous users sign up and retain their uploads.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — auth pages are user-facing
- `humanizer` — auth pages contain user-facing copy

## Acceptance Criteria

- [ ] Login page at `/login` with email/password form + Google OAuth button
- [ ] Signup page at `/signup` with email/password form + Google OAuth button
- [ ] Supabase Auth client configured with `@supabase/ssr` for server-side session management
- [ ] Auth context/provider wraps the app, exposes `user`, `session`, `signIn`, `signOut`, `signUp`
- [ ] Anonymous session creation: on first upload attempt without auth, create session via `POST /api/v1/auth/anonymous`, store `session_token` in localStorage
- [ ] Signup supports `?return=` query param: after signup, calls `POST /api/v1/auth/link` with session token, then redirects to return URL
- [ ] Protected route wrapper redirects unauthenticated users to `/login?return={current_path}`
- [ ] Session persistence across page refreshes
- [ ] Form validation with React Hook Form + Zod
- [ ] Error states: invalid credentials, email already registered, network errors
- [ ] Loading states on form submission
- [ ] Form submission errors use subtle shake animation via Motion
- [ ] Page transitions between login/signup use fade transition
- [ ] Auth layout sets `robots: { index: false, follow: false }` metadata — auth pages must not be indexed by search engines

## Technical Details

### Files to Create/Modify

- Create: `frontend/app/(auth)/login/page.tsx`
- Create: `frontend/app/(auth)/signup/page.tsx`
- Create: `frontend/app/(auth)/layout.tsx` (centered card layout)
- Create: `frontend/lib/supabase/client.ts` (browser Supabase client)
- Create: `frontend/lib/supabase/server.ts` (server-side Supabase client)
- Create: `frontend/lib/supabase/middleware.ts` (session refresh middleware)
- Create: `frontend/hooks/use-auth.ts` (auth context hook)
- Create: `frontend/components/auth/auth-provider.tsx`
- Create: `frontend/components/auth/login-form.tsx`
- Create: `frontend/components/auth/signup-form.tsx`
- Create: `frontend/components/auth/oauth-buttons.tsx`
- Create: `frontend/components/auth/protected-route.tsx`
- Modify: `frontend/app/layout.tsx` (wrap with AuthProvider)
- Modify: `frontend/middleware.ts` (session refresh)
- Test: `frontend/__tests__/auth/login.test.tsx`
- Test: `frontend/__tests__/auth/signup.test.tsx`

### Key Implementation Notes

- Use `@supabase/ssr` (not `@supabase/auth-helpers-nextjs` which is deprecated)
- Anonymous sessions: store `session_token` in localStorage under key `lextract_session_token`
- Account linking flow: signup page checks for `?return=` param AND localStorage session token → if both present, call `POST /api/v1/auth/link` after successful signup
- Google OAuth: use Supabase's built-in OAuth support (`supabase.auth.signInWithOAuth({ provider: 'google' })`)
- Auth pages should have a clean, professional SaaS look — not the default Supabase UI
- Auth layout must export `metadata` with `robots: { index: false, follow: false }` — login/signup pages should never appear in search results

### Integration Points

- US-004 (Backend Auth) provides the API endpoints this calls
- US-012 (App Shell) uses the auth context for header user display
- US-017 (Upload) and US-018 (Processing) require auth state from this story

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Auth tests pass
# Manual: navigate to /login, /signup — pages render correctly
# Manual: login flow works end-to-end with backend running
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Authentication" section: Supabase Auth, anonymous flow
- `docs/USER_FLOWS.md` — Flow 1 (anonymous upload → signup → linking)
- `docs/PRD.md` — Section 12: Authentication requirements
