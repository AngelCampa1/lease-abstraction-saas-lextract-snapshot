# Product Marketing Context — Lextract.io

This document is the authoritative reference for all AI marketing agents operating on Lextract.io. Read it fully before writing any copy, structuring any SEO strategy, or making any campaign decisions.

---

## 1. Product Overview

**Lextract.io** is an AI-powered commercial lease abstraction tool. A user uploads a commercial lease PDF (up to 200 pages) and receives 126 structured fields extracted in 5–15 minutes, for $15 per lease.

**Core promise:** PDF in, 126 structured fields out, $15/lease, results in minutes.

### Product Ecosystem

Lextract.io is the acquisition and funnel product for **CamAudit.io**, a higher-value forensic CAM audit service ($199–$699/audit). The strategic flow:

1. User finds Lextract.io (SEO, word of mouth, ads)
2. User extracts their lease — red flags surface (e.g., uncapped CAM, missing audit rights)
3. One-click handoff to CamAudit.io for a full forensic audit of their CAM charges

Lextract is designed to be the "gateway drug" — low barrier, immediate value, clear escalation path.

---

## 2. Pricing

| Plan | Price | Per Lease | Savings |
|---|---|---|---|
| Single lease | $15 | $15 | — |
| 5-pack | $65 | $13 | 13% off |
| 10-pack | $120 | $12 | 20% off |

- Credits never expire
- Gross margin: 66–71% (~$13.20–$14.20 profit per extraction)
- No subscription required — pay-as-you-go by default

**Pricing angle:** $15 pricing undercuts even the cheapest human abstraction service ($90 minimum) by 6x while delivering output in minutes, not days.

---

## 3. Target Personas

There are 6 target personas. All messaging should be calibrated to at least one of these.

### Persona 1 — Tenant Representatives
- **Job:** Represent tenants in CRE deals; manage portfolio renewals and lease reviews
- **Pain:** Miss renewal option deadlines; no structured data across a portfolio; manual review is slow
- **Hook:** "Never miss a renewal deadline again. Extract all critical dates in minutes, not hours."

### Persona 2 — Corporate Real Estate Teams
- **Job:** Manage company-owned or leased real estate portfolios
- **Pain:** Inconsistent lease data across properties; no standard format; relies on manual spreadsheets
- **Hook:** "Standardize your entire lease portfolio into 126 structured fields — one format, every property."

### Persona 3 — Commercial Brokers
- **Job:** Facilitate CRE transactions; evaluate deals quickly
- **Pain:** Need fast lease summaries during due diligence without paying for legal review
- **Hook:** "Evaluate any lease in minutes. Know the deal before the meeting."

### Persona 4 — Real Estate Attorneys
- **Job:** Review and negotiate commercial lease terms for clients
- **Pain:** Extraction from raw PDFs is tedious; need to surface key terms fast before adding legal judgment
- **Hook:** "Extract every clause you need to negotiate — before you bill a single hour."

### Persona 5 — Property Managers / Landlords
- **Job:** Manage tenant relationships, CAM reconciliation, lease compliance
- **Pain:** Disconnected lease data makes CAM reconciliation error-prone; digitizing paper leases is manual
- **Hook:** "Prep for CAM reconciliation season in hours, not weeks."

### Persona 6 — Lenders / Investors
- **Job:** Underwrite acquisitions; conduct due diligence on commercial properties
- **Pain:** Reviewing lease stacks during due diligence is time-consuming and expensive
- **Hook:** "Abstract an entire lease stack for due diligence at $15/lease. No delays."

### Sweet Spot Segment
Small-to-midsize CRE operators managing 1–5 properties. They face the same contractual complexity as enterprise users but lack enterprise tools (MRI, Yardi, Prophia). Lextract fills the gap between "spreadsheet chaos" and "six-figure software contract."

---

## 4. Pain Points (quantified where possible)

- Manual lease abstraction takes **4–8 hours per lease** with an **8–15% human error rate**
- Professional legal/paralegal abstraction services cost **$90-$250 per document** (law firms charge up to $4,000)
- **40% of CAM invoices** contain errors that originate from misrecorded lease terms
- Critical date mismanagement (missed options, renewal deadlines) causes **direct, quantifiable revenue loss**
- Manual processes produce no structured output — data lives in unstructured PDFs or handwritten notes
- Enterprise tools (MRI, Yardi) are out of reach for small and mid-size operators

---

## 5. Core Value Proposition

### Primary Headline
"PDF in, 126 structured fields out, $15/lease, results in minutes."

### Supporting Value Points
- **6x cheaper** than cheapest human service ($90 minimum)
- **20x faster** than manual abstraction (5–15 min vs. 4–8 hours)

> **Writing rule:** When generating user-facing marketing copy from this context, refer to the system as "AI" or "AI-powered." Do not name the underlying vendor model in marketing copy. The "Tech Stack" section below is for engineering and positioning awareness only — never paste model names directly into ads, headlines, blog posts, or emails.
- **126 fields** purpose-built for commercial real estate — not a generic document tool
- **Per-field confidence scoring** — every field is labeled High, Medium, or Low confidence
- **20 automated red flag checks** — CAM caps, audit rights, escalation risks, holdover exposure, and more
- **CAM intelligence layer** — the core differentiator; surfaces CAM risks that no competitor catches
- **Export formats:** Word, PDF, Excel — publication-ready reports, not raw JSON
- **CamAudit integration** — one-click escalation to forensic audit when red flags appear

---

## 6. Extraction Fields (126 total)

The schema covers every material term in a commercial lease, organized into 16 categories:

| # | Category | Fields |
|---|---|---|
| 1 | Parties & Property | 10 |
| 2 | Key Dates & Term | 7 |
| 3 | Rent & Escalations | 13 |
| 4 | CAM & Operating Expenses | 15 |
| 5 | Options | 12 |
| 6 | Tenant Improvements & Construction | 6 |
| 7 | Insurance & Indemnity | 6 |
| 8 | Assignment & Subletting | 6 |
| 9 | Default & Remedies | 6 |
| 10 | Exclusivity & Co-tenancy | 6 |
| 11 | Parking & Common Areas | 5 |
| 12 | Utilities | 6 |
| 13 | Signage & Permitted Use | 5 |
| 14 | Miscellaneous | 10 |
| 15 | ASC 842 / IFRS 16 Compliance | 8 |
| 16 | Casualty, Condemnation & Force Majeure | 5 |

**The CAM & Operating Expenses category (15 fields) is the primary differentiator.** No competitor offers this depth of CAM-specific extraction. It is the direct bridge to CamAudit.io.

---

## 7. Red Flags (20 Automated Checks)

Red flags are surfaced automatically on every extraction. They are a key conversion driver — red flags are what motivate a CamAudit.io handoff.

Key red flags include:
- **RF-001:** Missing audit rights (tenant cannot verify CAM charges)
- **RF-002:** Uncapped CAM — no ceiling on landlord's operating expense pass-throughs
- **RF-003:** Excessive management fees baked into CAM
- **RF-004:** Missing rent escalation caps — exposure to unlimited CPI increases
- **RF-005:** Personal guarantee exposure — principals are on the hook personally
- **RF-006:** Missing holdover protection — no defined holdover rate, landlord can charge market

Red flags are numbered RF-001 through RF-020. Each red flag is displayed with a description and, where applicable, a link to escalate to CamAudit.io for forensic review.

---

## 8. Competitive Landscape

| Competitor | Approx. Price | Key Weakness |
|---|---|---|
| LeaseLens | Free analysis / $25 export | No CAM intelligence; fewer fields |
| Prophia | Quote-based | Enterprise-focused; opaque pricing; no self-serve |
| Re-Leased | Quote-based | Enterprise minimums; not a standalone abstraction tool |
| Trullion | Enterprise | ASC 842 compliance focus; not full abstraction |
| MRI Contract Intelligence | Enterprise | Locked into MRI stack; not accessible to smaller operators |
| Outsourced paralegal/legal | $90-$4,000/lease | Slow (days); expensive; no structured output |
| ChatGPT (DIY) | Free | No schema; no confidence scoring; inconsistent; no red flags |

### Competitive Positioning Summary
Lextract occupies a unique position: **self-serve, AI-native, domain-specific, priced for the mid-market.** Enterprise tools are too expensive and locked in. DIY AI is unreliable and unstructured. Human services are slow and expensive. Lextract is the only tool that combines purpose-built CRE schema, CAM intelligence, automated red flags, and export-ready output at $15.

---

## 9. SEO & Content Footprint (as of March 2026)

Total indexed/built pages: approximately **492**

| Content Type | Pages |
|---|---|
| Glossary terms | 103 |
| Field pages | 100 |
| Location pages (cities) | 51 |
| State pages | 51 |
| Integration pages | 37 |
| Clause pages | 31 |
| Workflow pages | 31 |
| Competitor comparison pages | 25 |
| Red flag pages | 23 |
| Property type pages | 16 |
| Case study pages | 16 |
| Lease type pages | 12 |
| Industry pages | 11 |
| Use case pages | 11 |
| Template pages | 11 |
| Persona pages | 9 |
| FAQ topics | 9 |
| Calculator pages (currently static) | 6 |
| Long-form articles | 58 |
| In-depth guides | 8 |

---

## 10. Top Keyword Opportunities

All from DataForSEO research. Priority targets are low-KD, high-CPC or high-intent.

| Keyword | Vol/mo | KD | CPC | Notes |
|---|---|---|---|---|
| commercial lease calculator | 720 | 10 | $6.21 | High-volume, low-KD |
| commercial rent calculator | 720 | 12 | $6.21 | Paired with above |
| ai lease abstraction | 480 | 1 | $82.40 | Ultra-high CPC, lowest KD — priority |
| what is lease abstraction | 210 | low | $3.15 | Educational, top-of-funnel |
| lease abstraction software | 210 | low | $60.47 | High commercial intent |
| triple net lease calculator | 170 | low | $6.50 | Calculator vertical |
| lease abstract template | 140 | low | $5.74 | Template vertical |
| rent escalation calculator | 110 | low | — | Calculator vertical |
| effective rent calculator | 110 | low | — | Trending +27% YoY |
| percentage rent calculator | 110 | 4 | — | Calculator vertical |
| how to calculate rent per sqft | 110 | 1 | — | Very low KD |
| nnn lease calculator | 110 | low | $1.78 | Calculator vertical |
| pro rata share calculator | 90 | low | — | Calculator vertical |
| cam reconciliation template | 50 | low | $5.68 | High CamAudit crossover intent |

### Calculator Strategy
The 6 existing calculator pages are currently **static content only** — they render formulas but have no interactive functionality. Upgrading these to interactive calculators is a high-priority content project. Combined, calculator keywords represent ~2,000+ monthly organic searches at low competition. No major CRE competitor offers real interactive calculators.

**Lead capture on calculators:** Apollo.io, labeled `lextract-lead-magnet`.

---

## 11. Messaging Frameworks

### Taglines / Headlines (tested variants)
- "PDF in, 126 structured fields out. $15/lease."
- "Abstract any commercial lease in minutes, not hours."
- "Know what's in your lease — before it costs you."
- "Your CAM charges may be wrong. Find out for $15."
- "Stop guessing. Start extracting."

### CamAudit Bridge Messaging
When red flags are present in an extraction result, the call-to-action should escalate urgency:
- "Your lease has [N] red flags. Don't let your landlord win — get a forensic CAM audit."
- "Uncapped CAM detected. This could cost you thousands. Start a CamAudit review."

### Objection Handling
| Objection | Response |
|---|---|
| "I can just use ChatGPT" | ChatGPT has no CRE schema, no confidence scoring, no red flags, and no structured export. Lextract is purpose-built for commercial leases. |
| "We have a lawyer for this" | Lextract doesn't replace legal judgment — it saves billable hours. Extract the terms first, then apply legal analysis to what matters. |
| "We use MRI/Yardi" | Lextract integrates with your existing stack via Excel export. Use it for leases not yet in your system or for quick one-off reviews. |
| "$15 per lease — is it worth it?" | At $15 vs. $65–$250 for human services, Lextract is 4.5–12x cheaper. Every field is confidence-scored so you can see exactly where to verify. |

---

## 12. Lead Capture & Martech Stack

| Tool | Role |
|---|---|
| Apollo.io | CRM and outbound — leads labeled `lextract-lead-magnet` for calculator/tool usage |
| PostHog | Product analytics and funnel tracking |
| Resend | Transactional email (confirmations, extraction results) |
| Stripe | Payments (single lease, 5-pack, 10-pack) |

---

## 13. Tech Stack (marketing awareness only)

Understanding the stack is useful for positioning claims and feature accuracy.

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 / React 19 / TypeScript / Tailwind CSS 4 / Shadcn UI — hosted on Vercel |
| Backend | FastAPI / Python 3.12 — hosted on Railway |
| Database | Neon (PostgreSQL 15) + Supabase Auth |
| AI extraction | Google Gemini 3 Flash via OpenRouter (native PDF multimodal input, 3-pass adversarial validation) |
| File storage | Cloudflare R2 (S3-compatible, zero egress fees) |
| Background jobs | Celery + Redis (4-task chain: `run_gemini_extraction_task → score_confidence_task → run_red_flags_task → mark_extraction_complete`) |
| Payments | Stripe |
| Analytics | PostHog |
| Email | Resend |
| Error tracking | Sentry |

**Key claim support:** Extractions run on a vision-capable AI that reads PDFs end-to-end — scanned/image PDFs and text-layer PDFs are handled identically. Any lease format is supported. *(In user-facing copy, just say "AI" — never name the vendor model.)*

---

## 14. Brand Voice & Tone

- **Direct.** State the value immediately. No preamble.
- **Credible.** Use numbers wherever possible (126 fields, 5–15 minutes, $15, 40% error rate, 8–15% human error rate).
- **Practical.** Speak to real-world workflows, not abstract benefits.
- **Not hypey.** Avoid superlatives ("the best," "revolutionary"). Let the specifics do the work.
- **Slightly urgent.** CAM errors cost money right now. Missed options are permanent losses. Create urgency from real stakes, not manufactured scarcity.

---

## 15. Key Facts for Copy Accuracy

Always use these exact figures — do not approximate or round differently:

- Fields extracted: **126**
- Red flag checks: **20**
- Price per lease: **$15**
- 5-pack price: **$65** ($13/ea, 13% off)
- 10-pack price: **$120** ($12/ea, 20% off)
- Extraction time: **5–15 minutes** (depends on document length; shown as "results in minutes" in marketing copy)
- Max PDF size: **200 pages**
- Human abstraction time: **4–8 hours per lease**
- Human error rate: **8–15%**
- CAM invoice error rate: **40% contain errors from misrecorded lease terms**
- Cheapest human service: **$65/document**
- CamAudit price range: **$199–$699/audit**
- Gross margin: **66–71%** (~$13.20–$14.20 profit per extraction)
- Total SEO pages: **~492** (as of March 2026)
- Articles: **58 long-form**
- Guides: **8 in-depth**
- Glossary terms: **103**
