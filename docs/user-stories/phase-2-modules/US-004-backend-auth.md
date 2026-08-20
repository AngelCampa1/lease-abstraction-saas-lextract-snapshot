# US-004: Backend Auth & Security

**Phase:** 2 — Independent Modules | **Depends on:** US-002, US-003a | **Blocks:** US-014, US-016, US-019, US-020
**Type:** Backend
**Estimated session size:** Large

## Description

Implement the full authentication and security layer for the backend. This includes Supabase JWT validation middleware, 4 auth endpoints (signup, login, anonymous session, account linking), CORS restrictions, and rate limiting. This story is the gateway for every authenticated endpoint in the system.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] JWT validation middleware extracts and verifies Supabase tokens, sets `request.state.user_id`
- [ ] `POST /api/v1/auth/signup` — creates user via Supabase Auth, inserts `users` row
- [ ] `POST /api/v1/auth/login` — authenticates via Supabase Auth, returns JWT
- [ ] `POST /api/v1/auth/anonymous` — creates anonymous_session row, returns session_token (72hr TTL)
- [ ] `POST /api/v1/auth/link` — links anonymous session to authenticated user, migrates extractions
- [ ] CORS middleware restricts origins to `lextract.io` (and `localhost:3000` in dev)
- [ ] Rate limiting: 100 req/min for authenticated users, 20 req/min for anonymous
- [ ] `GET /api/v1/user/profile` and `PATCH /api/v1/user/profile` for user CRUD
- [ ] All endpoints return proper HTTP status codes (401, 403, 429)
- [ ] Tests cover: valid JWT, expired JWT, anonymous flow, linking, rate limit exceeded

## Technical Details

### Files to Create/Modify

- Create: `backend/app/api/v1/auth.py` (4 auth endpoints)
- Create: `backend/app/api/v1/user.py` (profile CRUD)
- Create: `backend/app/core/security.py` (JWT validation, rate limiter)
- Create: `backend/app/core/middleware.py` (CORS, rate limiting, auth middleware)
- Modify: `backend/app/main.py` (register middleware, include auth router)
- Modify: `backend/app/core/dependencies.py` (implement get_current_user)
- Test: `backend/tests/test_auth.py`
- Test: `backend/tests/test_rate_limit.py`

### Key Implementation Notes

- Use `python-jose` or `PyJWT` to decode Supabase JWTs (RS256, JWKS from Supabase)
- Anonymous sessions use `X-Session-Token` header, not Bearer JWT
- `get_current_user` dependency must handle both auth methods: JWT for registered users, session token for anonymous
- Account linking (`POST /auth/link`) must: validate both JWT and session token, update `anonymous_sessions.linked_user_id`, migrate all extractions from anonymous session to user
- Rate limiting can use `slowapi` or custom Redis-based limiter
- CORS allowed origins: configurable via env var, default to `https://lextract.io`

### Integration Points

- Every authenticated endpoint in the system uses `get_current_user` from this story
- US-014 (Upload) and US-016 (Credits) depend on this for auth
- US-011 (Frontend Auth) calls these endpoints

## Verification

```bash
cd backend
pytest tests/test_auth.py -v        # All auth tests pass
pytest tests/test_rate_limit.py -v  # Rate limit tests pass
# Manual: curl with valid/invalid JWTs returns correct status codes
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Authentication" section: JWT flow, anonymous sessions
- `docs/USER_FLOWS.md` — Flow 1 (anonymous upload), Flow 2 (account linking)
- `docs/PRD.md` — Section 11.3: Security requirements
