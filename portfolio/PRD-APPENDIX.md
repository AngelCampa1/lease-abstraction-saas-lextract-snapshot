# Lextract.io: Product Requirements Document (continued)

> [!IMPORTANT]
> **Status: retired.** Lextract.io no longer serves the product. This document describes it as it
> was specified and built, written in the present tense it was originally authored in. Read every
> claim below as a historical record, not as a live offering.

Continuation of [PRD.md](PRD.md), split out because the combined document ran past the 450-line
band. This half covers the CamAudit growth funnel, the auth and storage schema, the full API
contract, the landing page spec, non-functional requirements, and the verification plan. Sections
keep their original numbers (10 to 15) so the two halves cite consistently.

---

## 10. CamAudit Funnel

### 10.1 Trigger Conditions
The CamAudit CTA appears when ANY of the following are detected:
- `audit_rights == true` (tenant CAN audit: suggest they do)
- Any CAM-related red flag fires (RF-001 through RF-006, RF-013 through RF-015)
- `lease_structure_type` is NNN or Modified Gross
- 3+ CAM-relevant fields have medium/low confidence (suggest professional review)

### 10.2 Partner-First CAMAudit Positioning
CAMAudit is positioned as white-label CAM recovery infrastructure for firms with tenant
relationships. Partners keep the client relationship, package the recovery service under their own
brand, and use CAMAudit for document extraction, audit rules, branded reports, and evidence
assembly.

### 10.3 CTA Placement
- **Results view**: Persistent banner when CAM flags detected: "Your lease has [N] CAM risk factors.
  Run a tenant audit handoff."
- **Export footer**: Red flag summary includes CAMAudit partner context when relevant
- **Post-extraction email**: If CAM flags found, follow-up email points firms with tenant
  relationships to the CAMAudit partner workflow

### 10.4 Data Handoff
- **Method**: URL with encrypted payload OR API call
- **Data**: JSON containing all schema-marked CAM-relevant extracted fields + confidence scores
- **Source marker**: Payload includes `lextract_handoff: true` so CAMAudit can recognize the source
  without discount-led positioning
- **Pre-population**: CamAudit upload flow receives Lextract data, skipping manual lease entry
- **Tracking**: UTM params + extraction_id for attribution

### 10.5 Upsell Messaging (Contextual)

| Red Flag Detected | Upsell Message |
|-------------------|----------------|
| Missing audit rights | "Without audit rights, tenants have less leverage to verify CAM charges or demand records." |
| Management fee >15% | "Management fees over 15% can become a CAM recovery target once actual reconciliations arrive." |
| No CAM cap | "No CAM cap means unlimited expense exposure and a stronger reason to review annual reconciliations." |
| Cumulative cap | "Cumulative caps compound year-over-year and can create reconciliation disputes." |
| Missing CAM exclusions | "Without exclusions, capital expenditures can be passed through and should be checked against statements." |

---

## 11. Auth & Storage

### 11.1 Authentication (Neon Auth)
- **Email/password** signup
- **Google OAuth**
- **Anonymous sessions** (72-hour TTL): allow upload-first, signup-later flow
- **JWT** with 1-hour expiry, refresh token rotation
- Anonymous users can upload and see teaser; must create account to pay and access full results

### 11.2 Database Schema

#### Core Tables

```sql
-- Users (managed by Neon Auth, extended)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  company TEXT,
  role TEXT, -- tenant_rep, broker, attorney, landlord, investor, other
  credits_balance INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Anonymous sessions for upload-first flow
CREATE TABLE public.anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  linked_user_id UUID REFERENCES public.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Extractions
CREATE TABLE public.extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  anonymous_session_id UUID REFERENCES public.anonymous_sessions(id),
  status extraction_status NOT NULL DEFAULT 'uploading',
  document_filename TEXT NOT NULL,
  document_object_key TEXT NOT NULL,
  document_page_count INTEGER,
  property_type TEXT, -- commercial, office, industrial, retail
  extracted_data JSONB, -- full 126-field extraction results
  confidence_scores JSONB, -- per-field confidence tiers
  red_flags JSONB, -- triggered rules with details
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  payment_status payment_status DEFAULT 'unpaid',
  payment_id UUID REFERENCES public.payments(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_type payment_type NOT NULL, -- single, credit_pack_5, credit_pack_10
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit ledger
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  extraction_id UUID REFERENCES public.extractions(id),
  payment_id UUID REFERENCES public.payments(id),
  amount INTEGER NOT NULL, -- positive = purchase, negative = usage
  balance_after INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stripe webhook events (idempotency)
CREATE TABLE public.stripe_webhook_events (
  id TEXT PRIMARY KEY, -- Stripe event ID
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- User edits to extracted fields
CREATE TABLE public.extraction_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID REFERENCES public.extractions(id) NOT NULL,
  field_name TEXT NOT NULL,
  original_value JSONB,
  edited_value JSONB,
  edited_by UUID REFERENCES public.users(id),
  edited_at TIMESTAMPTZ DEFAULT now()
);
```

#### Enums

```sql
CREATE TYPE extraction_status AS ENUM (
  'uploading',
  'extracting',
  'scoring',
  'complete',
  'failed'
);

CREATE TYPE payment_status AS ENUM (
  'unpaid',
  'paid',
  'refunded'
);

CREATE TYPE payment_type AS ENUM (
  'single',
  'credit_pack_5',
  'credit_pack_10'
);
```

#### RLS Policies
- Users can only read/update their own extractions
- Users can only read their own payments and credit transactions
- Anonymous sessions can read extractions linked to their session token
- Stripe webhook events are backend-only (no client access)

### 11.3 File Storage
- **Upload**: PDF → Cloudflare R2 bucket
  (`lextract-documents/{user_id}/{extraction_id}/original.pdf`)
- **Reports**: Generated exports → R2 (`lextract-documents/{user_id}/{extraction_id}/exports/`)
- **Retention**: Original documents retained for 90 days, exports retained indefinitely
- **Access**: Pre-signed R2 URLs with 1-hour expiry for downloads
- **Egress**: R2 has zero egress fees, materially reducing storage costs vs. higher-egress storage
  providers

---

## 12. API Endpoints

### 12.1 Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/auth/signup` | Email/password registration |
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/anonymous` | Create anonymous session |
| POST | `/api/v1/auth/link` | Link anonymous session to registered account |

### 12.2 Extractions

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/extractions/upload` | Upload PDF, start extraction pipeline |
| GET | `/api/v1/extractions` | List user's extractions (paginated) |
| GET | `/api/v1/extractions/{id}` | Get extraction details + status |
| GET | `/api/v1/extractions/{id}/teaser` | Get teaser data (pre-payment) |
| PATCH | `/api/v1/extractions/{id}/fields` | Update extracted field values |
| GET | `/api/v1/extractions/{id}/export/{format}` | Download Word/PDF/Excel |
| DELETE | `/api/v1/extractions/{id}` | Delete extraction + documents |

### 12.3 Payments

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/v1/payments/checkout` | Create Stripe checkout session (single or credit pack) |
| GET | `/api/v1/payments/credits` | Get current credit balance |
| GET | `/api/v1/payments/history` | Payment history |
| POST | `/api/v1/payments/use-credit` | Apply credit to unlock extraction |
| POST | `/api/v1/webhooks/stripe` | Stripe webhook handler |

### 12.4 User

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/user/profile` | Get user profile |
| PATCH | `/api/v1/user/profile` | Update profile |
| GET | `/api/v1/user/dashboard` | Dashboard stats (extractions count, credits, etc.) |

### 12.5 CamAudit Handoff

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/extractions/{id}/camaudit-payload` | Generate encrypted CamAudit handoff JSON |

---

## 13. Landing Page

### 13.1 Structure

1. **Hero Section**
   - Headline: "Extract Every Clause from Any Commercial Lease in Minutes"
   - Subhead: "AI-powered lease abstraction. 126 fields. 16 categories. $15 per lease."
   - CTA: "Upload Your First Lease" / "See Sample Output"
   - Trust indicators: field count, processing time, accuracy rate

2. **How It Works**
   - Step 1: Upload your lease PDF
   - Step 2: AI extracts 126 fields across 16 categories
   - Step 3: Review results, edit if needed, export your report

3. **Sample Output**
   - Interactive demo showing a pre-extracted lease with all categories
   - Blurred sections with "Upload yours to see your results"

4. **Red Flag Detection**
   - Highlight the unique CAM intelligence layer
   - Show example red flags with explanations

5. **Pricing**
   - Simple 3-column: $15 single | $65 for 5 | $120 for 10
   - "Compare: Manual abstraction costs $90-$250 per lease"

6. **Competitor Comparison**
   - Lextract vs. manual abstraction vs. LeaseAbstractAI vs. outsourced services
   - Focus on: speed, cost, CAM intelligence, export quality

7. **CamAudit Cross-Sell**
   - "Found CAM issues in your lease? Route them into a partner-owned CAMAudit recovery workflow"
   - Brief explanation of the CAMAudit white-label partner program

8. **Footer**
   - Standard links, legal disclaimers
   - "Lextract does not provide legal, tax, or accounting advice"

### 13.2 SEO Targets
- "AI lease abstraction"
- "commercial lease abstraction software"
- "lease abstract tool"
- "automated lease abstraction"
- "CAM clause extraction"

---

## 14. Non-Functional Requirements

### 14.1 Performance
- Upload to teaser results: < 3 minutes for a 50-page lease
- API response time: < 200ms for data reads, < 500ms for writes
- Export generation: < 10 seconds

### 14.2 Security
- All data encrypted in transit (TLS 1.3) and at rest (AES-256)
- Row-Level Security on all Neon Postgres tables
- Rate limiting: 100 req/min authenticated, 20 req/min anonymous
- Cloudflare R2 bucket: private, pre-signed URLs only
- No lease content logged or stored beyond retention period
- CORS restricted to lextract.io

### 14.3 Scalability
- Cloudflare Workers scale API traffic globally
- Cloudflare Workflows scale extraction and export orchestration
- Cloudflare Queues absorb email and cleanup spikes
- R2 + Neon handle storage and database scaling

### 14.4 Reliability
- Circuit breakers (`pybreaker`) wrap every OpenRouter pass
- Per-pass fallback model chain (primary → fallback 1 → fallback 2)
- Retry with exponential backoff for transient failures (rate limits, 5xx)
- Dead letter queues for failed async queue messages
- Sentry error tracking on all services

### 14.5 Monitoring
- PostHog: funnel analytics (upload → teaser → pay → export)
- Sentry: error rates, latency tracking
- Custom metrics: extraction success rate, average confidence, red flag frequency

### 14.6 Legal Disclaimers
- Lextract output is informational only: not legal, tax, or accounting advice
- Users must verify extracted data against original lease documents
- No guarantee of extraction accuracy; confidence scores indicate reliability

---

## 15. Verification Plan

### 15.1 End-to-End Testing
1. Upload a sample commercial lease PDF
2. Verify Pass 1 (Gemini 3 Flash via OpenRouter) returns valid JSON with all 126 fields
3. Verify Pass 2 (adversarial validation) emits a corrections patch and is applied correctly
4. Verify Pass 3 (escalation) runs when triggered and resolves disputes on critical fields
5. Verify confidence scores are assigned to each field and reflect Pass 2/3 outcomes
6. Verify red flag rules fire correctly for known test leases
7. Verify teaser view shows limited data pre-payment
8. Complete Stripe checkout flow (test mode)
9. Verify full results unlock post-payment
10. Generate Word, PDF, and Excel exports: verify content accuracy
11. Test CamAudit handoff payload generation

### 15.2 Key Test Scenarios
- Lease with all 126 fields present (happy path)
- Lease with poor scan quality (Gemini self-reports low confidence on degraded sections)
- Lease with missing CAM provisions (red flags should fire)
- Lease with cumulative cap (RF-004 should trigger)
- Credit pack purchase + multi-extraction usage
- Anonymous upload → registration → payment flow
- Export each template type (Commercial, Office, Industrial, Retail)
