# US-003b: RLS Policies & Seed Data

**Phase:** 1 — Foundation | **Depends on:** US-003a | **Blocks:** None (nice-to-have for testing)
**Type:** Infrastructure
**Estimated session size:** Small

## Description

Add Row-Level Security policies to every table created in US-003a and create seed data for local development and testing. RLS is a critical security requirement per CLAUDE.md — no table exists without policies.

## Required Skills

- `superpowers:test-driven-development` — write tests that verify RLS blocks cross-user access

## Acceptance Criteria

- [ ] RLS enabled on ALL 7 tables (no exceptions per CLAUDE.md)
- [ ] Users can only SELECT/UPDATE/DELETE their own rows in `extractions`, `payments`, `credit_transactions`, `extraction_edits`
- [ ] `users` table: users can SELECT/UPDATE only their own row
- [ ] `anonymous_sessions`: accessible by session_token match (via custom claim or RPC)
- [ ] `credit_transactions`: INSERT-only for service role; users can only SELECT their own
- [ ] `payments`: users can only SELECT their own; INSERT restricted to service role (Stripe webhooks)
- [ ] `stripe_webhook_events`: service role only (no user access)
- [ ] Seed data: 2 test users, 3 extractions (uploading, complete/unpaid, complete/paid), sample payments, credit transactions
- [ ] RLS test: User A cannot see User B's extractions

## Technical Details

### Files to Create/Modify

- Create: `backend/supabase/migrations/00002_rls_policies.sql`
- Create: `backend/supabase/seed.sql`
- Test: `backend/tests/test_rls.sql` (or equivalent verification script)

### Key Implementation Notes

**RLS Policy Patterns:**

```sql
-- Enable RLS on every table
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;

-- Users see only their own extractions
CREATE POLICY "Users can view own extractions"
  ON extractions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update only their own extractions (limited fields)
CREATE POLICY "Users can update own extractions"
  ON extractions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypasses RLS for backend operations
-- (Supabase service key automatically bypasses RLS)
```

**Key RLS Rules:**
- `credit_transactions`: No UPDATE policy at all — enforces immutability at the database level
- `stripe_webhook_events`: No user-facing policies — only service role can read/write
- `anonymous_sessions`: Special handling — match on `session_token` via custom RPC or function
- `extractions`: Must handle both `user_id` match (authenticated) and `anonymous_session_id` match (anonymous flow)

**Seed Data (2 users, varied extraction states):**
- User A: 2 extractions (1 complete+paid with full extracted_data, 1 uploading), 5 credits, 2 credit transactions
- User B: 1 extraction (complete+unpaid with teaser data), 0 credits, 1 payment pending
- Sample `extracted_data` JSONB with a few fields from the schema (landlord_legal_name, tenant_legal_name, premises_address, etc.)
- Sample `red_flags` JSONB with 2-3 triggered rules

### Integration Points

- All backend stories rely on RLS being active — queries must go through authenticated Supabase client
- US-004 (Auth) will create the JWT validation that makes `auth.uid()` available for RLS
- Seed data is used by every story's local development and testing

## Verification

```bash
# Apply migrations
supabase db reset  # Runs migrations + seed

# Test RLS: connect as User A, try to see User B's data
# This should return 0 rows:
psql -c "SET request.jwt.claims = '{\"sub\": \"user-a-uuid\"}'; SELECT * FROM extractions WHERE user_id = 'user-b-uuid';"

# Test immutability: this should fail
psql -c "UPDATE credit_transactions SET amount = 100 WHERE id = 'some-id';"
# Expected: ERROR or 0 rows updated (depending on policy approach)
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Security" section: RLS requirements, service key bypass
- `docs/PRD.md` — Section 11.3: Security requirements, RLS mandate
- `CLAUDE.md` — "RLS on every table" convention
