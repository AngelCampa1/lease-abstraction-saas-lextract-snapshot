# US-020: Backend Dashboard & Profile Endpoints

**Phase:** 3 — Integration | **Depends on:** US-004 | **Blocks:** US-027
**Type:** Backend
**Estimated session size:** Small

## Description

Build the dashboard and profile API endpoints that power the user's main landing page after login. Returns extraction counts, credit balance, recent activity, and user profile CRUD.

## Required Skills

- `superpowers:test-driven-development`

## Acceptance Criteria

- [ ] `GET /api/v1/user/dashboard` returns: extraction_count, credit_balance, recent_extractions (last 5), quick_stats (completed, processing, failed counts)
- [ ] `GET /api/v1/user/profile` returns user profile (full_name, email, company, role)
- [ ] `PATCH /api/v1/user/profile` updates user profile fields (full_name, company, role)
- [ ] Dashboard aggregation queries are efficient (indexed columns)
- [ ] Recent extractions include: id, filename, status, property_type, created_at
- [ ] Returns 401 for unauthenticated requests
- [ ] Tests cover: dashboard data, profile read, profile update, empty state (new user)

## Technical Details

### Files to Create/Modify

- Modify: `backend/app/api/v1/user.py` (add dashboard endpoint, expand profile)
- Create: `backend/app/models/dashboard.py` (DashboardResponse Pydantic model)
- Test: `backend/tests/test_dashboard.py`
- Test: `backend/tests/test_profile.py`

### Key Implementation Notes

- Dashboard query: `SELECT count(*), status FROM extractions WHERE user_id = :uid GROUP BY status`
- Credit balance: read from `users.credits_balance` (kept in sync by credit service)
- Recent extractions: `SELECT ... FROM extractions WHERE user_id = :uid ORDER BY created_at DESC LIMIT 5`
- Profile update: only allow updating `full_name`, `company`, `role` — not email or credits_balance
- Use Pydantic response models for type safety

### Integration Points

- US-004 (Auth) provides `get_current_user` dependency
- US-027 (Frontend Dashboard) calls these endpoints
- Data populated by all other backend stories (extractions, payments, credits)

## Verification

```bash
cd backend
pytest tests/test_dashboard.py -v  # Dashboard tests pass
pytest tests/test_profile.py -v    # Profile tests pass
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "User API" section: dashboard, profile endpoints
- `docs/PRD.md` — Section 9: Dashboard requirements
