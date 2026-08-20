# Lextract.io: Product Requirements Document

> [!IMPORTANT]
> **Status: retired.** Lextract.io no longer serves the product. This document describes it as it
> was specified and built, written in the present tense it was originally authored in. Read every
> claim below (pricing, field counts, feature descriptions) as a historical record, not as a live
> offering.

## 1. Product Overview

### 1.1 Vision
Lextract.io is an AI-powered commercial lease abstraction platform that transforms dense, multi-page
lease documents into structured, actionable data in minutes. It is a standalone product and a
strategic acquisition funnel for CamAudit.io.

### 1.2 Problem Statement
Commercial lease abstraction is one of the most labor-intensive tasks in commercial real estate. A
single lease can run 50-200+ pages of dense legal language. Today:

- **Manual abstraction takes 4-8 hours per lease** with an 8-15% human error rate
- **Professional lease abstraction services charge $90-$250 per document**, with legal firms
  charging $100-$4,000
- **Spreadsheet-based tracking** fails to capture the nuance of complex lease structures (NNN,
  gross-ups, cumulative caps, base year stops)
- **40% of commercial CAM invoices contain errors**: errors that originate from misunderstanding or
  misrecording lease terms
- **Critical date mismanagement** (option deadlines, escalation dates, insurance expirations) causes
  direct revenue loss

Small-to-midsize operators (1-5 properties) are hit hardest. They lack enterprise tools (MRI, Yardi
Voyager) but face the same contractual complexity. Their current workflow is fragmented across PDFs,
email threads, and Excel files.

### 1.3 Solution
Lextract uploads a commercial lease PDF, sends it directly to Google Gemini 3 Flash via OpenRouter
(native PDF multimodal input, no separate OCR step), runs a 3-pass adversarial validation pipeline
against a 126-field schema across 16 categories, produces confidence-scored structured data,
highlights red flags, and exports publication-ready reports, all for $15 per lease.

### 1.4 Target Users

| Persona | Use Case | Pain Point |
|---------|----------|------------|
| **Tenant Representatives** | Abstract leases during portfolio reviews | Manual abstraction backlog, missed renewal deadlines |
| **Corporate Real Estate Teams** | Standardize lease data across portfolios | Inconsistent data entry, no centralized lease database |
| **Commercial Brokers** | Quick lease summaries for deal evaluation | Time spent reading 100+ page leases for key terms |
| **Real Estate Attorneys** | Extract terms for lease review/negotiation | Billable hours spent on data extraction vs. analysis |
| **Property Managers / Landlords** | Digitize lease portfolios, CAM reconciliation prep | Spreadsheet-based tracking, CAM leakage from misread terms |
| **Lenders / Investors** | Due diligence on acquisition targets | Need standardized lease data across multiple properties |

### 1.5 Strategic Position
Lextract is the **top-of-funnel acquisition tool** for the CamAudit ecosystem:

```text
Lease PDF → [Lextract] → Structured Data + Red Flags
                              ↓ (if CAM issues detected)
                         [CamAudit] → Forensic CAM Audit → Demand Letter
```

The $15 price point is deliberately low: it's a wedge to capture commercial real estate
professionals who then discover CAM-specific issues requiring the higher-value CamAudit product
($199-$699/audit).

---

## 2. Market Context

### 2.1 Competitive Landscape

| Competitor | Pricing | Strengths | Weaknesses |
|-----------|---------|-----------|------------|
| **LeaseLens** | Free analysis, $25/export | GPT-4 powered, no subscription | No CAM-specific intelligence, generic output |
| **Prophia** | From $20/doc | Strong CRE portfolio management | Enterprise focus, opaque pricing at scale |
| **Re-Leased (Credia AI)** | Quote-based | Native commercial lease management | Enterprise pricing, minimum property counts |
| **LeaseAbstractAI** | Unknown | Direct competitor name | Appears pre-launch/minimal, no public features |
| **V7 Go** | Unknown | Claims 99% accuracy | Generalized document intelligence, not CRE-specific |
| **Outsourced services** | $90-$250/lease | Human review, high accuracy | Slow (days), expensive, no structured data output |

### 2.2 Lextract Differentiation

1. **CAM Intelligence Layer**: Not just abstraction; actively flags CAM-related risks (missing
   audit rights, uncapped management fees, no gross-up provision) that no competitor surfaces
2. **CamAudit Integration** - Partner-first path from CAM-sensitive lease data to white-label CAM
   recovery infrastructure
3. **Price Point** - $15/lease undercuts services ($90-$250) while matching pure-AI tools ($20-$25),
   but with superior domain-specific output
4. **126-Field Schema**: Purpose-built for commercial CRE with 19 CAM-relevant fields, not a
   generic document extraction tool
5. **Property Type Templates**: Export formats tailored to Commercial, Office, Industrial, and
   Retail lease structures

### 2.3 Unit Economics

| Cost Component | Per Extraction | Notes |
|----------------|---------------|-------|
| Gemini 3 Flash via OpenRouter (3-pass extraction) | ~$0.10-$0.20 | Native PDF input; Pass 1 always runs, Pass 2 always runs, Pass 3 conditional |
| Cloudflare R2 (PDF storage) | ~$0.001 | Zero egress fees; ~$0.015/GB-month storage |
| Stripe Fee (2.9% + $0.30) | ~$0.74 | On $15 charge |
| Neon / Cloudflare infra | ~$0.10 | Database, storage, Worker, Workflow, and Queue operations |
| **Total COGS** | **~$1.08-$1.18** | |
| **Gross Margin** | **$13.82-$13.92 (92-93%)** | |

For credit packs:
- 5-pack at $65 ($13/ea): margin ~$11.82-$11.92 per extraction (91-92%)
- 10-pack at $120 ($12/ea): margin ~$10.82-$10.92 per extraction (90-91%)

---

## 3. Tech Stack

Mirrors CamAudit v2 architecture. Fully independent deployment.

### 3.1 Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js (App Router) | 16.x | Framework |
| React | 19.x | UI library |
| TypeScript | Strict | Type safety |
| Tailwind CSS | 4.x | Styling |
| Shadcn/UI + Radix UI | Latest | Component library |
| TanStack Query | 5.x | Server state management |
| React Hook Form + Zod | Latest | Forms + validation |
| react-dropzone | Latest | File upload |
| react-pdf + pdfjs-dist | Latest | PDF viewing |
| Sonner | Latest | Toast notifications |
| next-themes | Latest | Dark mode |
| PostHog | Latest | Product analytics |

### 3.2 Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Cloudflare Workers | Latest | API runtime at `api.lextract.io` |
| TypeScript | Strict | API implementation and validation |
| Hono + Zod | Latest | Routing, request validation, typed responses |
| Cloudflare Workflows | Latest | Extraction and export orchestration |
| Cloudflare Queues | Latest | Async email and user-data cleanup |
| Cloudflare R2 binding | Latest | Uploaded PDFs and generated reports |
| OpenRouter via `fetch` | Latest | Gemini 3 Flash via OpenRouter |
| Stripe API | Latest | Payment processing |
| Resend API | Latest | Transactional email |
| Sentry | Latest | Error tracking |
| extract-core (internal) | 0.1.0 | Worker-native extraction pipeline |

### 3.3 Infrastructure
| Component | Service | Notes |
|-----------|---------|-------|
| Frontend hosting | Cloudflare Workers / OpenNext | `lextract.io` and `www.lextract.io` |
| Backend hosting | Cloudflare Worker | `api.lextract.io` |
| Background orchestration | Cloudflare Workflows | Extraction and export jobs |
| Async queueing | Cloudflare Queues | Email and cleanup jobs |
| Database + Auth | Neon | PostgreSQL 15 + Neon Auth |
| Database pooling | Cloudflare Hyperdrive | Worker connection pooling to Neon |
| File Storage | Cloudflare R2 | Uploaded PDFs + generated reports |
| AI Extraction | Google Gemini 3 Flash via OpenRouter | Native PDF multimodal input → structured lease data (no separate OCR step) |
| Payments | Stripe | Checkout sessions, credit packs |
| CI/CD | GitHub Actions | Lint, test, deploy pipeline |
| Shared Libraries | `packages/extract-core` | Worker-native extraction pipeline |

### 3.4 Domain Architecture
- **lextract.io**: Marketing and application
- **api.lextract.io**: Backend API

---

## 4. Extraction Schema

### 4.1 Overview
126 fields across 16 categories. Each field has:
- `field_name`: Machine identifier
- `display_label`: Human-readable label
- `description`: What the field captures
- `aliases`: Alternative terms found in leases
- `data_type`: One of: `string`, `number`, `currency`, `percentage`, `date`, `boolean`, `array`
- `required`: Whether extraction is mandatory (44 fields)
- `cam_relevant`: Whether the field feeds CamAudit funnel logic (19 fields)

### 4.2 Categories

| # | Category | Fields | Required | CAM-Relevant |
|---|----------|--------|----------|--------------|
| 1 | Parties & Property | 10 | 6 | 2 |
| 2 | Key Dates & Term | 7 | 5 | 0 |
| 3 | Rent & Escalations | 13 | 3 | 1 |
| 4 | CAM & Operating Expenses | 15 | 4 | 15 |
| 5 | Options | 12 | 2 | 0 |
| 6 | Tenant Improvements & Construction | 6 | 2 | 1 |
| 7 | Insurance & Indemnity | 6 | 6 | 0 |
| 8 | Assignment & Subletting | 6 | 4 | 0 |
| 9 | Default & Remedies | 6 | 5 | 0 |
| 10 | Casualty, Condemnation & Force Majeure | 5 | 0 | 0 |
| 11 | Exclusivity & Co-tenancy | 6 | 0 | 0 |
| 12 | Parking & Common Areas | 5 | 0 | 0 |
| 13 | Utilities | 6 | 2 | 0 |
| 14 | Signage & Permitted Use | 5 | 1 | 0 |
| 15 | ASC 842 / IFRS 16 Compliance | 8 | 0 | 0 |
| 16 | Miscellaneous | 10 | 4 | 0 |
| | **Total** | **126** | **44** | **19** |

Schema source: `docs/lextract_field_schema.json`.

> [!NOTE]
> This table previously summed to 99 fields across 14 rows: missing the `Casualty, Condemnation
> & Force Majeure` and `ASC 842 / IFRS 16 Compliance` categories entirely, and undercounting
> `Rent & Escalations` (8 vs. the actual 13) and `Options` (7 vs. the actual 12), among other rows,
> while §4.1 above and every other reference to this schema in the repository (the root README,
> `scripts/repo-metrics.py`, `portfolio/METRICS.md`) stated the correct 126/16/44/19 headline.
> Recomputed directly from `docs/lextract_field_schema.json` (126 entries, one `category` value
> and `required`/`cam_relevant` boolean per entry) and corrected here rather than left standing
> next to a contradicting total. See [`portfolio/METRICS.md`](METRICS.md#extraction-schema) for
> the reproduction command.

### 4.3 Confidence Scoring
Each extracted field receives a confidence tier:

| Tier | Score Range | UI Indicator | Meaning |
|------|------------|--------------|---------|
| **High** | 0.85-1.00 | Green | Clear text match, unambiguous extraction |
| **Medium** | 0.60-0.84 | Yellow | Probable match, may need human review |
| **Low** | 0.00-0.59 | Red | Uncertain extraction, manual verification recommended |

Confidence is determined by:
- Gemini's self-reported certainty in the extraction (Pass 1 primary signal)
- Whether Pass 2 adversarial validation upheld the value (boost) or corrected it (downgrade)
- Whether Pass 3 escalation was required for critical fields (downgrade)
- Whether the field was found via primary term or alias match
- Cross-field validation (e.g., pro_rata_share should equal tenant RSF / building RSF)

---

## 5. Core Pipeline

### 5.1 Processing Flow

```text
[User uploads PDF]
       ↓
[R2 Upload]: Store original document in Cloudflare R2
       ↓
[Pass 1: Gemini 3 Flash via OpenRouter]: Native PDF multimodal input → 126-field structured JSON
       ↓
[Pass 2: Adversarial Validation]: Re-read the PDF as a hostile reviewer, emit corrections patch
       ↓
[Pass 3: Escalation (conditional)]: Only when Pass 2 corrected critical fields or critical confidence < 0.80
       ↓
[Confidence Scoring]: Per-field confidence based on Gemini self-reported certainty + Pass 2/3 outcomes
       ↓
[Red Flag Detection]: Rule-based checks against extracted data
       ↓
[Store Results]: Save to Neon Postgres (extractions table)
       ↓
[Notify User]: Processing complete, results ready
```

> **Core split:** Steps 2-6 (Gemini extraction passes, confidence, and red flags) use the
> Worker-native extraction core. R2 upload, Workflow orchestration, and Neon persistence stay in the
> API Worker adapter layer.

### 5.2 Gemini 3 Flash Extraction Configuration
- API: OpenRouter (`openai`-compatible client) calling `google/gemini-3-flash-preview`
- Input: Native PDF multimodal: the entire PDF is sent as a single attachment, no separate OCR step
- Context window: 1M tokens (handles any commercial lease, including 200+ page documents)
- 3-pass orchestration:
  - **Pass 1 (always runs):** Primary extraction. Gemini reads the PDF directly and emits the full
    126-field JSON with self-reported confidence per field.
  - **Pass 2 (always runs):** Adversarial validation. The model re-reads the PDF with the Pass 1
    JSON, a forensic checklist, and an explicit hostile-reviewer prompt. Emits a sparse corrections
    patch.
  - **Pass 3 (conditional):** Escalation. Runs only when Pass 2 corrected a critical field
    (`base_rent_annual`, `pro_rata_share`, `lease_term_months`) or a critical field has confidence <
    0.80. Resolves disputes between Pass 1 and Pass 2 with category-specific domain knowledge.
- Fallback chain per pass: each pass has a primary model and two fallbacks (see
  `docs/MODEL_CONFIGURATION.md`)
- Audit trail: every pass writes a row to the `extraction_passes` table (model used, input/output
  tokens, cost, duration, raw response)

### 5.3 Extraction Prompt Strategy
- **System prompt**: Define the extraction role, the complete 126-field schema (auto-generated from
  `FieldRegistry`), and JSON output format requirements
- **User prompt**: Native PDF attachment + extraction instructions specific to each pass (extract /
  validate / escalate)
- **Output format**: Structured JSON matching the 126-field schema
- **Confidence**: Gemini reports extraction confidence per field alongside the value; Pass 2/3
  outcomes adjust the confidence
- **Model**: Google Gemini 3 Flash via OpenRouter (1M context, native multimodal PDF input)

### 5.4 Processing Time Targets
| Lease Length | Pass 1 | Pass 2 | Pass 3 (when triggered) | Total |
|-------------|--------|--------|------------------------|-------|
| 10-30 pages | ~10s | ~10s | ~5s | ~20-30s |
| 30-80 pages | ~20s | ~20s | ~10s | ~45-60s |
| 80-200 pages | ~40s | ~40s | ~15s | ~90-120s |

---

## 6. Red Flag Detection

### 6.1 Rule Engine
Rule-based detection runs post-extraction. Each rule checks extracted field values against
commercial lease best practices and flags potential issues.

### 6.2 Red Flag Rules

| Rule ID | Rule Name | Condition | Severity | Description |
|---------|----------|-----------|----------|-------------|
| RF-001 | Excessive Management Fee | `management_fee_cap > 15%` OR missing | High | Management fees above 15% are exploitative; missing cap means unlimited fees |
| RF-002 | Missing Audit Rights | `audit_rights == false` OR not found | High | Tenant cannot verify landlord's CAM charges; major liability |
| RF-003 | No CAM Cap | `cam_cap_percentage` is null/missing | High | No ceiling on annual CAM increases; unlimited exposure |
| RF-004 | Cumulative CAM Cap | `cam_cap_type == "cumulative"` | Medium | Cumulative/compounding caps heavily favor landlord over non-cumulative |
| RF-005 | No Gross-Up Provision | `gross_up_percentage` is null AND `lease_structure_type` contains "NNN" | Medium | In partially occupied buildings, tenant overpays for variable expenses |
| RF-006 | Missing CAM Exclusions | `cam_exclusions` is empty array | High | No capital expenditure carve-outs; landlord can pass through anything |
| RF-007 | Short Cure Period | `monetary_cure_period < 10` days | Medium | Insufficient time to remedy payment defaults |
| RF-008 | Aggressive Holdover Rate | `holdover_rate > 200%` | Medium | Punitive holdover penalties |
| RF-009 | No Termination Option | `has_termination_option == false` AND `lease_term_months > 60` | Low | Long-term lease with no early exit; high commitment risk |
| RF-010 | Missing Restoration Clarity | `restoration_requirement == true` AND `tenant_work_description` is null | Low | Restoration required but scope of tenant's work undefined |
| RF-011 | No Renewal Option | `has_renewal_option == false` | Low | No guaranteed right to extend occupancy |
| RF-012 | Recapture Right Present | `recapture_right == true` | Medium | Landlord can terminate lease upon assignment/subletting request |
| RF-013 | No Base Year Gross-Up | `base_year_gross_up == false` AND `base_year` is not null | Medium | Base year not normalized to full occupancy; inflated future charges |
| RF-014 | No Reconciliation Frequency | `reconciliation_frequency` is null AND `lease_structure_type` contains "NNN" | Medium | No defined CAM reconciliation schedule |
| RF-015 | Short Audit Window | `cam_audit_deadline_days < 60` | Medium | Insufficient time to dispute CAM reconciliation |
| RF-016 | Missing Force Majeure Clause | `force_majeure_clause == false` OR missing | Medium | No protection against unforeseeable events such as pandemics or natural disasters |
| RF-017 | Auto-Renewal Without Notice Terms | `auto_renewal == true` AND `auto_renewal_terms` is null | Medium | Lease auto-renews but required notice window is unspecified; risk of unintended renewal |
| RF-018 | No Casualty Termination Right | `casualty_termination_right` is null/empty | Medium | No right to terminate if premises substantially damaged or destroyed |
| RF-019 | Relocation Right Present | `relocation_right == true` | Medium | Landlord can relocate tenant; potential operational disruption |
| RF-020 | No Purchase Option Disclosure | `has_purchase_option` is null | Low | Purchase option undisclosed; ASC 842 right-of-use asset may be misstated |

### 6.3 CamAudit-Triggered Rules
Rules RF-001 through RF-006 and RF-013 through RF-015 directly indicate CAM audit relevance. When
any of these fire, the CamAudit funnel CTA is activated.

---

## 7. UI/UX Flows

### 7.1 Upload Page
- Drag-and-drop zone (react-dropzone) accepting PDF files
- File size limit: 50MB
- Supported format: PDF only (v1)
- Upload progress indicator
- Immediate redirect to processing status page

### 7.2 Processing Status
- Real-time status updates via polling or SSE:
  - "Uploading document..."
  - "Extracting lease terms..." (covers all 3 Gemini passes)
  - "Scoring confidence..."
  - "Complete!"
- Estimated time remaining
- Cancel option

### 7.3 Teaser View (Pre-Payment)
Before payment, the user sees:
- **Visible**: 3-5 sample extracted fields with values (e.g., Landlord Name, Tenant Name, Premises
  Address)
- **Blurred**: All remaining fields, red flags count, and category summaries
- **Visible**: Total field count, category count, confidence distribution summary
- **CTA**: "Unlock full extraction for $15" / "Buy 5 credits for $65"

### 7.4 Results View (Post-Payment)
- **Category tabs/accordion**: 16 categories, each expandable
- **Per-field display**:
  - Display label
  - Extracted value (editable inline)
  - Confidence badge (green/yellow/red)
  - Source text highlight (link to PDF page)
- **Red flag panel**: Sidebar or top banner showing all triggered rules with severity icons
- **Summary header**: Property address, parties, key dates, lease term at a glance

### 7.5 PDF Side-by-Side Viewer
- Split-screen: extracted data on left, original PDF on right
- Click a field → PDF scrolls to and highlights the source text
- Enables quick human verification of AI extraction

### 7.6 Edit Mode
- All extracted fields are editable post-extraction
- Edit history tracked (original AI value vs. user override)
- Re-run red flag detection after edits

---

## 8. Export System

### 8.1 Export Formats

| Format | Library | Description |
|--------|---------|-------------|
| **Word (.docx)** | python-docx | Formatted lease abstract with cover page, TOC, categorized sections |
| **PDF (.pdf)** | WeasyPrint | Print-ready version of the Word report |
| **Excel (.xlsx)** | openpyxl | Tabular format with one sheet per category, summary dashboard sheet |

### 8.2 Preset Templates
Templates adjust field emphasis, section ordering, and terminology based on property type:

| Template | Emphasis | Additional Sections |
|----------|----------|-------------------|
| **Commercial (General)** | All 16 categories equally weighted | Standard layout |
| **Office** | Rent & escalations, base year stops, TI allowance | Parking ratio prominence, clear height omitted |
| **Industrial** | Utilities (clear height, dock doors, power), parking | Trailer parking, drive-in doors featured |
| **Retail** | Exclusivity, co-tenancy, percentage rent, signage | Sales breakpoint, radius restriction prominence |

### 8.3 Report Structure
All exports follow this structure:
1. Cover page (property address, parties, extraction date)
2. Executive summary (key terms, red flags count)
3. Category-by-category field tables with values and confidence
4. Red flag summary with explanations
5. Appendix: extraction metadata (processing time, model version, confidence distribution)

---

## 9. Payments & Pricing

### 9.1 Pricing Model

| Product | Price | Per Unit | Discount |
|---------|-------|----------|----------|
| Single extraction | $15 | $15/lease | - |
| 5-credit pack | $65 | $13/lease | 13% |
| 10-credit pack | $120 | $12/lease | 20% |

### 9.2 Payment Flow

```text
[Upload + Extract (free)] → [Teaser View (blurred)]
         ↓
[Pay $15 or use credit] → [Full Results Unlocked]
         ↓
[Export (included in payment)]
```

### 9.3 Stripe Integration
- **Checkout Sessions**: For single extractions and credit pack purchases
- **Payment Intent**: One-time payments (no subscriptions)
- **Webhook handling**: `checkout.session.completed` → unlock extraction results
- **Credit ledger**: Neon Postgres table tracking credit balance per user
- **Idempotency**: `stripe_webhook_events` table prevents double-processing

### 9.4 Credit System
- Credits stored in `user_credits` table with purchase history
- Credits never expire
- Credits are non-refundable but transferable (future consideration)
- Balance displayed in user dashboard header

---

Continued in [PRD-APPENDIX.md](PRD-APPENDIX.md): the CamAudit funnel, auth and storage schema, the
full API contract, the landing page spec, non-functional requirements, and the verification plan.
Split from this document because the combined file ran past the 450-line band.
