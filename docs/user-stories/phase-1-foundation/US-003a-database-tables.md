# US-003a: Database Tables & Enums

**Phase:** 1 — Foundation | **Depends on:** None | **Blocks:** US-003b, US-004
**Type:** Infrastructure
**Estimated session size:** Small

## Description

Create the Supabase PostgreSQL migration that defines all 7 tables and 3 enums for the Lextract.io data model. This is the foundational database schema that every backend service reads from and writes to.

## Required Skills

- `superpowers:test-driven-development` — write SQL assertions to validate schema after migration

## Acceptance Criteria

- [ ] Migration file created at `backend/supabase/migrations/` with timestamp prefix
- [ ] 3 enums created: `extraction_status`, `payment_status`, `payment_type`
- [ ] 7 tables created with all columns, types, foreign keys, and defaults per PRD Section 11.2
- [ ] `users` table extends Supabase Auth `auth.users` via foreign key on `id`
- [ ] `credit_transactions` table has CHECK constraint or documented convention enforcing immutability
- [ ] `extractions.extracted_data`, `extractions.confidence_scores`, `extractions.red_flags` are JSONB
- [ ] All timestamp columns default to `now()`
- [ ] Appropriate indexes on frequently queried columns (user_id, status, created_at)
- [ ] Migration applies cleanly to a fresh Supabase instance

## Technical Details

### Files to Create/Modify

- Create: `backend/supabase/migrations/00001_initial_schema.sql`
- Create: `backend/supabase/config.toml` (Supabase project config if needed)
- Test: `backend/tests/test_migration.sql` (or inline assertions)

### Key Implementation Notes

**Enums:**
```sql
CREATE TYPE extraction_status AS ENUM ('uploading', 'extracting', 'scoring', 'complete', 'failed');
-- Note: the original migration included 'ocr_processing'. It was dropped in the Gemini/R2 migration
-- (no separate OCR step now — Gemini accepts the PDF natively as multimodal input).
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'refunded');
CREATE TYPE payment_type AS ENUM ('single', 'credit_pack_5', 'credit_pack_10');
```

**Tables (all columns from ARCHITECTURE.md):**

1. `users` — id (uuid PK, references auth.users), email, full_name, company, role, credits_balance (default 0), stripe_customer_id, created_at, updated_at
2. `anonymous_sessions` — id (uuid PK), session_token (unique), linked_user_id (FK users, nullable), created_at, expires_at (default now() + 72hr)
3. `extractions` — id (uuid PK), user_id (FK users), anonymous_session_id (FK anonymous_sessions, nullable), document_filename, document_s3_key, status (extraction_status, default 'uploading'), extracted_data (JSONB), confidence_scores (JSONB), red_flags (JSONB), payment_status (payment_status, default 'unpaid'), payment_id (FK payments, nullable), property_type, created_at, updated_at
4. `payments` — id (uuid PK), user_id (FK users), extraction_id (FK extractions, nullable), stripe_checkout_session_id, stripe_payment_intent_id, payment_type, amount_cents, status (payment_status), created_at
5. `credit_transactions` — id (uuid PK), user_id (FK users), extraction_id (FK extractions, nullable), payment_id (FK payments, nullable), amount (integer, positive=credit, negative=debit), balance_after (integer, NOT NULL), description, created_at
6. `stripe_webhook_events` — id (text PK, Stripe event ID), event_type, processed_at (default now())
7. `extraction_edits` — id (uuid PK), extraction_id (FK extractions), field_name, original_value (text), edited_value (text), edited_by (FK users), created_at

**Indexes:**
- `extractions(user_id)`, `extractions(status)`, `extractions(anonymous_session_id)`
- `payments(user_id)`, `payments(stripe_checkout_session_id)`
- `credit_transactions(user_id)`, `credit_transactions(extraction_id)`
- `anonymous_sessions(session_token)`

### Integration Points

- US-003b adds RLS policies on top of these tables
- US-002's Pydantic models must match these table definitions exactly
- Every backend service story (US-004 through US-010) queries these tables

## Verification

```bash
# Apply migration to local Supabase
supabase db reset
# Or verify with:
supabase migration up

# Check tables exist
psql -c "\dt" | grep -E "(users|anonymous_sessions|extractions|payments|credit_transactions|stripe_webhook_events|extraction_edits)"
# Should show all 7 tables

# Check enums exist
psql -c "\dT+" | grep -E "(extraction_status|payment_status|payment_type)"
# Should show all 3 enums
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Core Data Model" section: full table definitions
- `docs/PRD.md` — Section 11.2: Data model specification
