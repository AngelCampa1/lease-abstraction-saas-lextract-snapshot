# Lextract.io: User Flows

> Step-by-step sequences for all user journeys. Architecture reference: `portfolio/ARCHITECTURE.md`
> · Product context: `portfolio/PRD.md`

---

## Flow 1: Upload & Extract (Anonymous)

1. User navigates to `lextract.io/upload`
2. Frontend calls `POST /api/v1/auth/anonymous` → receives `session_token` (72hr TTL), stored in
   localStorage
3. User drags a PDF (max 50MB) onto upload zone
4. Frontend calls `POST /api/v1/extractions/upload` with multipart file + `X-Session-Token` header
5. Backend:
   - Validates file type (PDF) and size
   - Uploads to Cloudflare R2: `lextract-documents/anon/{session_id}/{extraction_id}/original.pdf`
   - Creates `extractions` row: `status=uploading`, `payment_status=unpaid`
   - Starts the Cloudflare `EXTRACTION_WORKFLOW` for extraction, confidence scoring, red flags,
     completion, and notification dispatch
   - Returns `{ extraction_id }`
6. Frontend redirects to `/processing/{extraction_id}`
7. Frontend polls `GET /api/v1/extractions/{id}` every 3 seconds; shows status messages:
   - `uploading` → "Uploading document..."
   - `extracting` → "Extracting lease terms..." (covers all 3 Gemini passes)
   - `scoring` → "Scoring confidence..."
   - `complete` → redirect to `/results/{id}`
   - `failed` → show error, offer retry
8. On `complete`, frontend redirects to `/results/{id}`: teaser view renders

---

## Flow 2: Payment & Unlock

1. User is on `/results/{id}`: teaser view shows 5 visible fields, all others blurred
2. User clicks "Unlock full results for $15" or "Buy 5 credits for $65"
3. If anonymous: redirect to `/signup?return=/results/{id}`; must create account before paying
4. Frontend calls `POST /api/v1/payments/checkout` with
   `{ extraction_id, product: "single" | "credit_pack_5" | "credit_pack_10" }`
5. Backend creates Stripe Checkout Session, returns `{ url }`
6. Frontend redirects to Stripe-hosted checkout
7. User completes payment on Stripe
8. Stripe sends `checkout.session.completed` to `POST /api/v1/webhooks/stripe`
9. Backend webhook handler:
   - Checks `stripe_webhook_events` for this event ID (idempotency)
   - Inserts event into `stripe_webhook_events`
   - For **single** (`product=single`): sets `extractions.payment_status=paid`, inserts
     `credit_transactions` row `(amount=-1)`
   - For **credit pack**: inserts `payments` row, inserts `credit_transactions` row
     `(amount=+5 or +10)`, updates `users.credits_balance`
10. Stripe redirects user to `/results/{id}?payment=success`
11. Frontend calls `GET /api/v1/extractions/{id}`, now returns full `extracted_data` + `red_flags`
12. Full results view renders: 16-category accordion, red flag panel, export buttons

---

## Flow 3: Edit & Export

1. User is on full results view (`/results/{id}`, `payment_status=paid`)
2. User clicks an extracted field value to edit inline
3. Input field appears with current AI-extracted value
4. On save (blur or Enter): `PATCH /api/v1/extractions/{id}/fields` with `{ field_name, value }`
5. Backend:
   - Inserts row into `extraction_edits` (preserves `original_value` + `edited_value`)
   - Updates `extractions.extracted_data` with new value
   - Re-runs all 20 red flag rules against updated data
   - Returns updated `red_flags`
6. Red flag panel in UI updates instantly
7. User selects export format (Word / PDF / Excel) and template (Commercial / Office / Industrial /
   Retail)
8. Frontend calls `GET /api/v1/extractions/{id}/export/{format}?template={template}`
9. Backend:
   - Starts the Cloudflare `EXPORT_WORKFLOW`
   - Returns `202 Accepted` with `{ job_id }`
10. Frontend polls job status until `complete`
11. Backend returns pre-signed Cloudflare R2 URL (1hr expiry)
12. Browser downloads file

Export report structure (all formats):
1. Cover page: property address, parties, extraction date
2. Executive summary: key terms, red flag count
3. Category-by-category field tables with values and confidence tiers
4. Red flag summary with explanations
5. Appendix: processing time, model version, confidence distribution

---

## Flow 4: CamAudit Handoff

**Trigger conditions** (any one fires the CTA):
- `audit_rights == true` in extracted data
- Any of RF-001 to RF-006 or RF-013 to RF-015 fires
- `lease_structure_type` is NNN or Modified Gross
- 3+ CAM-relevant fields have Medium or Low confidence

1. CamAudit banner appears in paid results view: "Your lease has [N] CAM risk factors. Run a tenant
   audit handoff."
2. User clicks banner
3. Frontend calls `GET /api/v1/extractions/{id}/camaudit-payload`
4. Backend compiles the schema-marked CAM-relevant fields + confidence scores into JSON, includes
   `lextract_handoff: true`, encrypts payload
5. Frontend redirects to:
   `https://www.camaudit.io/scan?payload={encrypted}&extraction_id={id}&utm_source=lextract&utm_campaign=extraction_{id}`
6. CamAudit reads payload and pre-populates the audit flow so the user skips manual lease entry

**Contextual upsell messages by flag:**
- RF-001 (management fee): "Management fees over 15% cost tenants thousands."
- RF-002 (no audit rights): "Without audit rights, you can't verify CAM charges."
- RF-003 (no CAM cap): "Uncapped CAM means unlimited annual increases."
- RF-004 (cumulative cap): "Cumulative caps compound year-over-year."
- RF-006 (no exclusions): "Without exclusions, capital expenditures can be passed through."

---

## Flow 5: Credit Pack Purchase & Usage

**Purchase:**
1. User clicks "Buy 10 credits for $120" from any CTA in the app
2. If anonymous: redirect to `/signup` first
3. Frontend calls `POST /api/v1/payments/checkout` with `{ product: "credit_pack_10" }`
4. Stripe checkout → `checkout.session.completed` webhook
5. Backend: inserts `payments` row (`amount_cents=12000`, `type=credit_pack_10`), inserts
   `credit_transactions` row (`amount=+10`), updates `users.credits_balance`
6. Stripe redirects to `/dashboard?purchase=success`
7. Dashboard header shows updated credit balance

**Usage (applying a credit):**
1. User on `/results/{id}` teaser view, has available credits
2. CTA shows: "Unlock with 1 credit (you have [N])"
3. User clicks: frontend calls `POST /api/v1/payments/use-credit` with `{ extraction_id }`
4. Backend:
   - Checks `users.credits_balance >= 1`
   - Sets `extractions.payment_status=paid`
   - Inserts `credit_transactions` row (`amount=-1`, `balance_after=prev-1`)
   - Updates `users.credits_balance`
5. Full results unlock immediately, no Stripe redirect

