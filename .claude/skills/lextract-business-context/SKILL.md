---
name: lextract-business-context
description: >-
  Use when writing marketing copy, positioning, email, social, landing pages, or any user-facing content for Lextract.
  Also use when answering product questions, making pricing decisions, or building features that touch the
  user-facing value proposition. Trigger keywords: Lextract, lease abstraction, NNN, commercial lease, CRE,
  126 fields, red flags, confidence scoring, $15/lease, CamAudit upsell.
user_invocable: false
---

# Lextract.io -- Business Context Reference

> **Status: retired.** Lextract is no longer live and lextract.io no longer serves it. This file
> describes the product and business context as it ran. The Tech Stack Summary below reflects
> what was actually in production; see `portfolio/DEPLOYMENT.md` for the authoritative deployment
> record.

Full product and domain knowledge for agents implementing features or answering business questions. See `references/` for detailed rule specs, industry data, legal context, and content research index.

---

## What Lextract Is

**One-sentence pitch:** AI-powered commercial lease abstraction -- PDF in, 126 structured fields out, $15/lease.

**The problem it solves:** Commercial lease abstraction is one of the most labor-intensive tasks in commercial real estate. A single lease can run 50-200+ pages of dense legal language. Today:
- Manual abstraction takes 4-8 hours per lease with an 8-15% human error rate
- Professional lease abstraction services charge $90-$250 per document (legal firms charge $100-$4,000)
- Spreadsheet-based tracking fails to capture the nuance of complex lease structures (NNN, gross-ups, cumulative caps, base year stops)
- 40% of commercial CAM invoices contain errors -- errors that originate from misunderstanding or misrecording lease terms
- Critical date mismanagement (option deadlines, escalation dates, insurance expirations) causes direct revenue loss

Small-to-midsize operators (1-5 properties) are hit hardest. They lack enterprise tools (MRI, Yardi Voyager) but face the same contractual complexity.

**What Lextract replaces:** Manual paralegal review, spreadsheet-based abstraction, outsourced BPO firms ($50-$150/lease), and expensive enterprise lease administration software.

**Defining constraint:** $15 per lease, flat fee. No subscriptions. No hidden costs. The price undercuts even the cheapest human service ($90/doc) by 6x while delivering structured output in minutes.

**Core extraction principle:** Google Gemini 3 Flash via OpenRouter reads the PDF natively as images and extracts the 126-field schema across three independent passes (primary extraction, adversarial validation re-reading the PDF, escalation on disputed critical fields). Confidence scoring and red flag detection are post-extraction rule-based systems. The pipeline is deterministic where it matters (scoring, red flags) and uses AI only for the ambiguous work (PDF reading + extraction).

**Writing rule for marketing copy:** In user-facing marketing pages, articles, FAQs, comparison tables, llms.txt, schema.org descriptions, and processing UI microcopy, **do not name the underlying model**. Say "AI" or "AI-powered" instead of "Gemini 3 Flash" or "Google Gemini". Vendor names belong in internal docs only. The user-facing pitch is "vision AI + multi-pass validation", not "we use Google".

---

## Copy Rules

1. **Always invoke the humanizer skill before publishing any copy.** No em dashes, no marketing fluff, no corporate jargon.
2. **Founder voice.** Angel as builder. Direct, authoritative, not performative.
3. **"Lease abstraction" not "lease analysis."** Abstraction is the industry term. Analysis implies interpretation we do not provide.
4. **CamAudit is a partner product (cross-sell), not a competitor.** Lextract feeds CamAudit. Never position them as alternatives.
5. **"126 fields" is the anchor number.** Use it in headlines, CTAs, and comparisons. It is the concrete differentiator.
6. **"$15/lease" is the price anchor.** Always compare against $90-$250 manual and $150-$400 outsourced. Lextract is 6x cheaper than the cheapest human service.
7. **Never claim legal advice.** Lextract output is informational only. Always include disclaimer context.
8. **Confidence scores are the trust mechanism.** They differentiate Lextract from generic AI tools. Emphasize the triage workflow: AI extracts, human reviews only the low-confidence fields.
9. **Red flags are the value-add.** Generic extraction is a commodity. Flagging what is *wrong* with a lease is the strategic differentiator.
10. **Do not overstate accuracy.** Say "confidence-scored" not "99% accurate." The confidence tiers (High/Medium/Low) communicate reliability honestly.

---

## Target Users

| Persona | Use Case | Pain Point | Conversion Driver |
|---|---|---|---|
| **Tenant Representatives** | Abstract leases during portfolio reviews, 5-50 leases/month | Manual abstraction backlog, missed renewal deadlines | Speed: minutes not days; batch pricing for deal flow volume |
| **Corporate Real Estate Teams** | Standardize lease data across portfolios | Inconsistent data entry, no centralized lease database | Portfolio-wide consistency; structured exports for ERP ingestion |
| **Commercial Brokers** | Quick lease summaries for deal evaluation | Time spent reading 100+ page leases for key terms | $15 per lease vs. hours of billable time reading |
| **Real Estate Attorneys** | Extract terms for lease review/negotiation | Billable hours spent on data extraction vs. analysis | Frees attorneys for high-value interpretation work |
| **Property Managers / Landlords** | Digitize lease portfolios, CAM reconciliation prep | Spreadsheet-based tracking, CAM leakage from misread terms | Structured data prevents revenue leakage; CAM fields feed CamAudit |
| **Lenders / Investors** | Due diligence on acquisition targets | Need standardized lease data across multiple properties | Batch processing for portfolio-level due diligence in days not weeks |

**Key insight on tenant reps:** They think in deal flow velocity. Lead with speed (5–15 minutes vs. 4–8 hours) and batch pricing ($12/lease at 10-pack volume).

**Key insight on property managers:** Revenue leakage from missed escalations and CAM errors is the pain point. A 3% missed escalation on a $20K/month lease is $7,200/year per tenant.

**Key insight on lenders/investors:** Portfolio acquisitions involve 200+ leases under time pressure. Outsourced firms take 4-6 weeks. Lextract processes the same portfolio in hours.

---

## Competitive Position

### Direct Competitors

| Competitor | Pricing | Gap Lextract Exploits |
|---|---|---|
| **LeaseLens** | Free viewing, $25/export | No confidence scoring, no red flag detection, one lease at a time, no batch processing, no CAM intelligence |
| **Prophia** | From $20/doc, enterprise focus | Opaque pricing at scale, enterprise sales cycle, no CamAudit integration |
| **Re-Leased (Credia AI)** | Quote-based | Enterprise minimum property counts, not accessible to small/mid operators |
| **LeaseAbstractAI** | Unknown | Appears pre-launch/minimal, no public feature set |
| **V7 Go** | Unknown | Generalized document intelligence, not CRE-specific, no commercial lease schema |

### Traditional Competitors

| Type | Pricing | Turnaround | Key Weakness |
|---|---|---|---|
| Manual in-house abstraction | $75-$240/lease (labor cost) | 4-8 hours/lease | Cognitive fatigue, 8-15% error rate, no scalability |
| Outsourced BPO (NTrust, Realogic, CBRE, JLL) | $150-$400/lease | 2-6 weeks for portfolios | Expensive, slow, data governance risk |
| CPA/Legal firms | $300+/hr | 4-8 weeks | Prohibitively expensive for routine abstraction |

### Lextract's Strategic Position

Only AI-powered lease abstraction platform that combines:
1. **126-field curated schema** -- purpose-built for commercial CRE, not generic document extraction
2. **Per-field confidence scoring** -- enables triage workflow (human reviews only low-confidence fields)
3. **Red flag detection** -- 20 rules that actively flag risky clauses, not just extract data
4. **CAM intelligence layer** -- 18 CAM-specific fields + CamAudit integration for audit handoff
5. **Transparent flat pricing** -- $15/lease, no enterprise sales calls, no subscriptions
6. **Batch processing** -- 5-pack and 10-pack credit packs for portfolio work

**Acknowledged limitations:** US commercial leases only at launch. Fixed 126-field schema (no custom fields). No human review layer built in. New product without track record.

---

## Pricing & Unit Economics

### Credit Pack Structure

| Product | Price | Per Lease | Discount |
|---|---|---|---|
| Single extraction | $15 | $15/lease | -- |
| 5-credit pack | $65 | $13/lease | 13% |
| 10-credit pack | $120 | $12/lease | 20% |

- Flat-fee only. No subscriptions. No percentage-based pricing.
- Each credit unlocks one full extraction (all 126 fields + confidence scores + red flags + exports).
- Credits consumed at unlock time (after Stripe payment clears).
- Credits never expire.

### Unit Economics

| Cost Component | Per Extraction | Notes |
|---|---|---|
| Gemini 3 Flash via OpenRouter (3 passes) | ~$0.10-$0.20 | Native PDF multimodal: ~25K input + ~5K output tokens per pass × 3 |
| Stripe Fee (2.9% + $0.30) | ~$0.74 | On $15 charge |
| Cloudflare R2 storage | ~$0.00 | Zero egress; storage cost negligible at lease size |
| Infra (DB ops, Celery, Sentry) | ~$0.10 | DB operations + observability |
| **Total COGS** | **~$0.79-$0.89** | |
| **Gross Margin** | **~$13.96-$14.06 (93-94%)** | At $15/lease |

For credit packs:
- 5-pack at $65 ($13/ea): margin ~$11.96-$12.06 per extraction (92-93%)
- 10-pack at $120 ($12/ea): margin ~$10.96-$11.06 per extraction (91-92%)

### ROI Framing (for marketing copy)

For a 200-lease portfolio acquisition:
- Traditional outsourced firm: $150-$400/lease x 200 = $30,000-$80,000, 4-6 weeks turnaround
- Lextract: $12/lease x 200 = $2,400 (10-packs), processed in hours
- Savings: $27,600-$77,600 (88-97% cost reduction)

---

## Product Architecture

### Processing Pipeline

```
[User uploads PDF]
       |
[Cloudflare R2 Upload] -- Store original document (S3-compatible, zero egress)
       |
[run_gemini_extraction_task] -- Download PDF; run 3-pass MultiPassOrchestrator
       |  Pass 1: Gemini 3 Flash primary extraction (native PDF multimodal input)
       |  Pass 2: Gemini 3 Flash adversarial validation (re-reads the PDF)
       |  Pass 3: Gemini 3 Flash escalation on disputed critical fields (conditional)
       |
[score_confidence_task] -- Per-field confidence from LLM self-report + cross-pass agreement
       |
[run_red_flags_task] -- Rule-based checks against extracted data (RF-001 through RF-020)
       |
[mark_extraction_complete] -- Final status transition; result ready
       |
[Notify User] -- Processing complete, results ready
```

**SDK split:** Gemini PDF extraction (3-pass orchestrator), confidence scoring, and red flag detection live in `packages/extract-sdk/`. The SDK is schema-agnostic via `FieldRegistry` -- Lextract uses a 126-field registry, CamAudit-v2 uses a 33-field registry. Same extraction code, different schemas. The backend's Celery tasks are thin wrappers that call SDK functions and persist results.

### Processing Time Targets

| Lease Length | Pass 1 | Pass 2 | Pass 3 (if triggered) | Total |
|---|---|---|---|---|
| 10-30 pages | ~10s | ~8s | ~10s | ~20-30s |
| 30-80 pages | ~20s | ~15s | ~15s | ~40-50s |
| 80-200 pages | ~35s | ~30s | ~25s | ~70-90s |

### Confidence Scoring

| Tier | Score Range | UI Indicator | Meaning |
|---|---|---|---|
| **High** | 0.85-1.00 | Green | Clear text match, unambiguous extraction |
| **Medium** | 0.60-0.84 | Yellow | Probable match, may need human review |
| **Low** | 0.00-0.59 | Red | Uncertain extraction, manual verification recommended |

Confidence is determined by:
- Gemini's self-reported per-field certainty (returned inline in the extraction JSON)
- Cross-pass agreement: when Pass 2 confirms Pass 1 the score is reinforced; when Pass 2 patches a field the new confidence applies; Pass 3 overrides win
- Whether the field was found via primary term or alias match
- Cross-field validation (e.g., pro_rata_share should equal tenant RSF / building RSF)

---

## 99-Field Schema Overview

126 fields across 16 categories. Each field has: `field_name`, `display_label`, `description`, `aliases`, `data_type`, `required` (44 fields), `cam_relevant` (18 fields).

| # | Category | Fields | Required | CAM-Relevant |
|---|---|---|---|---|
| 1 | Parties & Property | 10 | 6 | 2 |
| 2 | Key Dates & Term | 7 | 5 | 0 |
| 3 | Rent & Escalations | 8 | 3 | 0 |
| 4 | CAM & Operating Expenses | 15 | 4 | 15 |
| 5 | Options | 7 | 2 | 0 |
| 6 | Tenant Improvements & Construction | 6 | 2 | 1 |
| 7 | Insurance & Indemnity | 6 | 6 | 0 |
| 8 | Assignment & Subletting | 6 | 4 | 0 |
| 9 | Default & Remedies | 6 | 5 | 0 |
| 10 | Exclusivity & Co-tenancy | 6 | 0 | 0 |
| 11 | Parking & Common Areas | 5 | 0 | 0 |
| 12 | Utilities | 6 | 2 | 0 |
| 13 | Signage & Permitted Use | 5 | 1 | 0 |
| 14 | Miscellaneous | 6 | 4 | 0 |
| | **Total** | **99** | **44** | **18** |

Full schema: `docs/lextract_field_schema.json`

**Why 126 fields, not 200+:** Competitors like LeaseLens extract 200+ fields but this introduces noise and hallucination risk. Lextract constrains to 99 curated fields that map to the most common ERP requirements (Yardi, MRI), optimizes compute efficiency, and reduces the hallucination surface area. The 18 CAM-relevant fields specifically feed the CamAudit upsell funnel.

---

## Red Flag Rules

20 rules (RF-001 through RF-020) run post-extraction. Each checks extracted field values against commercial lease best practices. Rules are implemented in `packages/extract-sdk/src/extract_sdk/red_flags.py`.

| Rule ID | Rule Name | Condition | Severity |
|---|---|---|---|
| RF-001 | Excessive Management Fee | `management_fee_cap > 15%` OR missing | High |
| RF-002 | Missing Audit Rights | `audit_rights == false` OR not found | High |
| RF-003 | No CAM Cap | `cam_cap_percentage` is null/missing | High |
| RF-004 | Cumulative CAM Cap | `cam_cap_type == "cumulative"` | Medium |
| RF-005 | No Gross-Up Provision | `gross_up_percentage` is null AND NNN lease | Medium |
| RF-006 | Missing CAM Exclusions | `cam_exclusions` is empty array | High |
| RF-007 | Short Cure Period | `monetary_cure_period < 10` days | Medium |
| RF-008 | Aggressive Holdover Rate | `holdover_rate > 200%` | Medium |
| RF-009 | No Termination Option | `has_termination_option == false` AND `lease_term_months > 60` | Low |
| RF-010 | Missing Restoration Clarity | `restoration_requirement == true` AND `tenant_work_description` is null | Low |
| RF-011 | No Renewal Option | `has_renewal_option == false` | Low |
| RF-012 | Recapture Right Present | `recapture_right == true` | Medium |
| RF-013 | No Base Year Gross-Up | `base_year_gross_up == false` AND `base_year` is not null | Medium |
| RF-014 | No Reconciliation Frequency | `reconciliation_frequency` is null AND NNN lease | Medium |
| RF-015 | Short Audit Window | `cam_audit_deadline_days < 60` | Medium |

**Severity levels:**
- **High:** Direct financial risk or missing critical tenant protection. Requires immediate attention.
- **Medium:** Unfavorable clause that may cause financial exposure over time. Should be reviewed.
- **Low:** Missing convenience feature or suboptimal term. Good to know, not urgent.

For detailed rule specs, conditions, fields involved, and CamAudit trigger status, see `references/red-flag-rules.md`.

---

## CamAudit Upsell Funnel

This is a key revenue driver. Lextract is the top-of-funnel acquisition tool for the CamAudit ecosystem.

### Trigger Conditions

The CamAudit CTA appears when ANY of the following are detected:
- `audit_rights == true` (tenant CAN audit -- suggest they do)
- Any CAM-related red flag fires (RF-001 through RF-006, RF-013 through RF-020)
- `lease_structure_type` is NNN or Modified Gross
- 3+ CAM-relevant fields have medium/low confidence (suggest professional review)

### Lextract Referral Discount

Users who reach CamAudit through the Lextract handoff receive **20% off** their CamAudit audit. The discount is encoded in the handoff payload and validated on the CamAudit side.

### CTA Placement

- **Results view:** Persistent banner when CAM flags detected: "Your lease has [N] CAM risk factors. Get a forensic audit with CamAudit -- 20% off for Lextract users."
- **Export footer:** Red flag summary includes CamAudit link with discount mention
- **Post-extraction email:** If CAM flags found, follow-up email with CamAudit pitch + 20% discount code

### Data Handoff

- JSON containing all 18 CAM-relevant extracted fields + confidence scores + discount code
- Encrypted payload or API call
- Pre-populates CamAudit upload flow, skipping manual lease entry
- UTM params + extraction_id for attribution

### Upsell Messaging (Contextual)

| Red Flag Detected | Upsell Message |
|---|---|
| Missing audit rights (RF-002) | "Without audit rights, you cannot verify CAM charges. CamAudit can help you negotiate." |
| Management fee >15% (RF-001) | "Management fees over 15% cost tenants thousands. CamAudit identifies exactly how much." |
| No CAM cap (RF-003) | "Uncapped CAM means unlimited annual increases. See what you are actually paying with CamAudit." |
| Cumulative cap (RF-004) | "Cumulative caps compound year-over-year, heavily favoring the landlord. CamAudit calculates the real impact." |
| Missing CAM exclusions (RF-006) | "Without exclusions, capital expenditures can be passed through. CamAudit flags every improper charge." |

---

## Auth & Conversion Flow

### Three Auth States

| State | Description | Database |
|---|---|---|
| Anonymous | Temp session token, 72h TTL | `anonymous_sessions` table |
| User | Email/password or Google OAuth via Supabase Auth | `users` table |
| Admin | Internal team | `users` table with admin flag |

### Upload-First Flow (The Funnel)

```
Landing page -> Upload PDF (no account required, anonymous session)
-> Processing animation (real-time status: uploading, OCR, extracting, scoring, complete)
-> Teaser view: 3-5 visible fields (Landlord, Tenant, Address), rest blurred
   Total field count, category count, confidence distribution visible
   Red flag COUNT visible, details blurred
-> "Unlock full extraction for $15" / "Buy 5 credits for $65" CTA
-> Auth gate (create account or login)
-> Stripe Checkout -> full results instantly visible
-> All 126 fields + confidence scores + red flags + export options
```

**Key UX principle:** The teaser view creates FOMO. Showing the field count and red flag count without details activates curiosity and loss aversion. "You have 4 red flags in your lease" is more compelling than any sales pitch.

### Anonymous Session Mechanics

- 72-hour TTL from creation
- Stored as httpOnly cookie on client
- On signup/login: session migrated -- all uploaded docs and extractions moved to the new user record
- Anonymous users can upload and see teaser; must create account to pay and access full results

---

## Key Business Decisions

These are constraints that affect implementation. Do not work around them.

| Decision | Rationale | Implication |
|---|---|---|
| Flat-fee only (no subscriptions initially) | Simpler UX, lower barrier to entry, matches transactional nature of abstraction work | Never implement recurring billing or subscription tiers |
| US commercial leases only | Legal reference data and schema are US-specific; international structures differ significantly | No international lease types, no foreign currency, no non-US legal references |
| Credit-pack model | Incentivizes volume purchasing, increases ARPU, matches portfolio-based workflows | Credits never expire; balance displayed in dashboard header |
| CamAudit is strategic partner, not competitor | Lextract is the acquisition funnel for CamAudit ecosystem | Never position as alternative; always cross-sell |
| 126 fields, not 200+ | Reduces hallucination, maps to ERP schemas, optimizes compute cost | Do not add fields without schema review; each field has extraction + scoring + red flag implications |
| Teaser-first, pay-later | Upload-first flow maximizes top-of-funnel; payment gates the details, not the processing | Always run full pipeline for anonymous users; gate only the full results view |
| No legal advice | Lextract output is informational; users verify against original documents | Include disclaimers in UI, exports, and emails |

---

## Tech Stack Summary

Production was Cloudflare-native end to end. `portfolio/DEPLOYMENT.md` is the authority; if this section and that file ever disagree, that file wins.

**Frontend** (`frontend/`): Next.js 16 / React 19 / TypeScript strict / Tailwind 4 / Shadcn UI / TanStack Query / React Hook Form + Zod / Motion (Framer Motion v11+). Deployed to the Cloudflare Worker `lextract` via OpenNext (`lextract.io`).

**API** (`workers/api/`): This was the production backend. TypeScript on Cloudflare Workers, deployed as `lextract-api` on `api.lextract.io`. Bindings: R2 (`DOCUMENTS_BUCKET`), Hyperdrive → Neon, Queues (`lextract-email`, `lextract-cleanup`), Workflows (`ExtractionWorkflow`, `ExportWorkflow`).

**Extract core** (`packages/extract-core/`): Extraction domain logic in TypeScript with zero Worker bindings, consumed directly by `workers/api`. Contains: Gemini 3 Flash PDF-native extraction via OpenRouter, 3-pass adversarial orchestrator (primary, validation, escalation), confidence scoring, red flag detection (20 rules).

**Services:**
- Neon Postgres (via Hyperdrive) + Neon Auth
- Cloudflare R2: PDF storage + export files (zero egress)
- OpenRouter → Google Gemini 3 Flash: native PDF multimodal extraction (3 independent passes)
- Stripe: Checkout sessions, credit packs, webhooks
- Resend: Transactional email (extraction complete, CamAudit upsell)
- Sentry: Error tracking
- PostHog: Product analytics + funnel tracking

**Superseded, present in the repo but not deployed:** `backend/` (v1 FastAPI / Python / Celery + Redis, formerly on Railway) and `packages/extract-sdk/` (v1 of extract-core, in Python; still consumed by CamAudit-v2). There is no Railway service, Redis broker, or Celery worker in production. `supabase/` is vestigial from before the move to Neon.

---

## Success Metrics

| Category | Metric | Target |
|---|---|---|
| Conversion | Teaser-to-paid conversion rate | >25% |
| Quality | Extraction accuracy (fields correctly extracted) | >95% on clean PDFs |
| Quality | Red flag precision (false positive rate) | <5% |
| Performance | Upload to results time | <3 min for 50-page lease |
| Performance | Export generation time | <10 seconds |
| Revenue | CamAudit upsell rate (from red flag triggers) | >10% of extractions with CAM flags |
| Growth | Average credits per customer | >3 (indicates portfolio use, not one-off) |
| Retention | Return usage within 90 days | >30% |

**Conversion clarification:** 25% is the model assumption. The teaser view quality (how compelling the blurred preview is) is the primary conversion lever. Showing the red flag count without details creates urgency.

**Quality clarification:** "Extraction accuracy" means the percentage of fields where the extracted value matches a human reviewer's judgment. Confidence scoring is the mechanism that communicates uncertainty -- the goal is not 100% accuracy but honest reporting of what the AI is unsure about.

---

## Research Corpus

6 content research files in `docs/content-research/`. Read when implementing features that touch the corresponding domain.

| File | Content | When to Read |
|---|---|---|
| `prompt-1-articles-and-guides.md` | ChatGPT Deep Research prompt for blog articles and resource guides | Writing marketing content; planning SEO strategy |
| `prompt-2-glossary-and-states.md` | ChatGPT Deep Research prompt for glossary terms and state law pages | Building glossary or state-specific landing pages |
| `prompt-3-competitor-comparisons.md` | ChatGPT Deep Research prompt for competitor comparison data | Building comparison landing pages |
| `CRE Content Strategy for Lextract.io.md` | Full output: 5 blog articles + 5 resource guides (MDX format) | Populating content pages; referencing CRE statistics |
| `Lextract Competitor Comparison Data Generation.md` | Full output: Lextract vs LeaseLens, Lextract vs Outsourced Services comparison data | Building comparison pages; competitive positioning |
| `CRE Glossary and State Law Data.md` | Full output: 29+ glossary terms + 10 state commercial landlord-tenant law profiles | Building glossary pages, state pages, legal references |

For detailed research index with key findings per file, see `references/research-index.md`.
