-- =============================================================================
-- Lextract.io — Seed Data (Neon.tech)
-- File: backend/neon/migrations/00003_seed.sql
--
-- Local development seed data. Uses fixed UUIDs so tests can reference them
-- deterministically.
--
-- Adapted from Supabase seed: removed auth.users inserts (Neon Auth manages
-- its own user table). Users are created directly in public.users.
--
-- User A: 2 extractions (1 complete+paid, 1 uploading), 4 credits
-- User B: 1 extraction (complete+unpaid / teaser only), 0 credits, 1 pending payment
-- =============================================================================

-- Fixed UUIDs for deterministic test references
-- User A: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- User B: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

-- =============================================================================
-- 1. public.users (Neon Auth creates auth records separately)
-- =============================================================================

INSERT INTO public.users (id, email, full_name, company, role, credits_balance, stripe_customer_id) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'alice@example.com',
    'Alice Tenant',
    'Acme Corp',
    'tenant_rep',
    4,
    'cus_seed_alice'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bob@example.com',
    'Bob Broker',
    'Broker LLC',
    'broker',
    0,
    'cus_seed_bob'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. payments
-- =============================================================================

INSERT INTO public.payments (id, user_id, stripe_checkout_session_id, stripe_payment_intent_id, payment_type, amount_cents, currency, status) VALUES
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'cs_seed_alice_001',
    'pi_seed_alice_001',
    'single',
    2000,
    'usd',
    'paid'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cs_seed_bob_001',
    NULL,
    'single',
    2000,
    'usd',
    'pending'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. extractions
-- =============================================================================

INSERT INTO public.extractions (
  id, user_id, status, document_filename, document_object_key,
  document_page_count, property_type, extracted_data, confidence_scores,
  red_flags, processing_started_at, processing_completed_at,
  payment_status, payment_id
) VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'complete',
    'office-lease-downtown.pdf',
    'uploads/aaaaaaaa/eeeeeeee/office-lease-downtown.pdf',
    42,
    'office',
    '{
      "landlord_legal_name": "Downtown Properties LLC",
      "tenant_legal_name": "Acme Corp",
      "premises_address": "100 Main St, Suite 500, Chicago, IL 60601",
      "rentable_square_footage": 5000,
      "lease_commencement_date": "2024-01-01",
      "lease_expiration_date": "2029-12-31",
      "base_rent_monthly": 12500,
      "base_rent_annual": 150000,
      "rent_per_sqft_annual": 30.00,
      "security_deposit_amount": 25000,
      "permitted_use": "General office use",
      "landlord_address": "200 LaSalle St, Chicago, IL 60601",
      "tenant_address": "100 Main St, Suite 500, Chicago, IL 60601",
      "lease_term_months": 72,
      "renewal_options": "Two (2) five-year options at fair market rent",
      "cam_charges_included": false,
      "operating_expense_cap_percent": 5.0,
      "personal_guarantee_required": true,
      "personal_guarantee_months": 12,
      "assignment_permitted": false
    }',
    '{
      "landlord_legal_name": "high",
      "tenant_legal_name": "high",
      "premises_address": "high",
      "rentable_square_footage": "high",
      "lease_commencement_date": "high",
      "lease_expiration_date": "high",
      "base_rent_monthly": "high",
      "base_rent_annual": "medium",
      "rent_per_sqft_annual": "medium",
      "security_deposit_amount": "high",
      "permitted_use": "medium",
      "renewal_options": "low",
      "operating_expense_cap_percent": "medium",
      "personal_guarantee_required": "high",
      "personal_guarantee_months": "low",
      "assignment_permitted": "high"
    }',
    '[
      {
        "rule_id": "personal_guarantee_long",
        "severity": "high",
        "field": "personal_guarantee_months",
        "message": "Personal guarantee exceeds 6 months (found: 12 months). Consider negotiating a burn-down provision.",
        "triggered": true
      },
      {
        "rule_id": "no_assignment_rights",
        "severity": "medium",
        "field": "assignment_permitted",
        "message": "Assignment is not permitted without landlord consent. This restricts your ability to sublease or transfer the lease.",
        "triggered": true
      },
      {
        "rule_id": "renewal_option_below_market",
        "severity": "low",
        "field": "renewal_options",
        "message": "Renewal at fair market rent provides no rent certainty. Consider negotiating fixed or capped renewal rates.",
        "triggered": true
      }
    ]',
    now() - INTERVAL '2 hours',
    now() - INTERVAL '1 hour',
    'paid',
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'uploading',
    'retail-lease-draft.pdf',
    'uploads/aaaaaaaa/ffffffff/retail-lease-draft.pdf',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    'unpaid',
    NULL
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'complete',
    'warehouse-lease-q4.pdf',
    'uploads/bbbbbbbb/11111111/warehouse-lease-q4.pdf',
    28,
    'industrial',
    NULL,
    '{
      "landlord_legal_name": "high",
      "tenant_legal_name": "high",
      "premises_address": "high",
      "rentable_square_footage": "high",
      "lease_commencement_date": "medium",
      "base_rent_monthly": "high"
    }',
    '[
      {
        "rule_id": "personal_guarantee_long",
        "severity": "high",
        "field": "personal_guarantee_months",
        "message": "Personal guarantee exceeds 6 months. Consider negotiating a burn-down provision.",
        "triggered": true
      }
    ]',
    now() - INTERVAL '30 minutes',
    now() - INTERVAL '10 minutes',
    'unpaid',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. credit_transactions
-- =============================================================================

INSERT INTO public.credit_transactions (id, user_id, extraction_id, payment_id, amount, balance_after, description) VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    5,
    5,
    'Credit pack purchase (5 credits)'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    NULL,
    -1,
    4,
    'Credit used for extraction: office-lease-downtown.pdf'
  )
ON CONFLICT (id) DO NOTHING;
