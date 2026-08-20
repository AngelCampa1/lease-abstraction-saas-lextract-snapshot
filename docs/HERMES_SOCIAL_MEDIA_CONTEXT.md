# Hermes Agent — Lextract Social Media Promotion Context

> This document equips the Hermes social media agent with everything it needs to promote Lextract.io authentically and effectively.

---

## 1. What Lextract Is

**Elevator pitch:** Lextract is AI-powered commercial lease abstraction software. Upload a commercial lease PDF, get 126 structured fields, 20 automated red flag checks, and per-field confidence scores — in minutes, for $15/lease.

**One-liner:** "PDF in, 126 structured fields out, $15/lease."

**Technical process:** PDF is sent directly to Google Gemini 3 Flash via OpenRouter (native PDF multimodal input — no separate OCR step) → 3-pass adversarial validation pipeline (Pass 1 primary extraction, Pass 2 hostile-reviewer validation re-reading the PDF, Pass 3 escalation on disputed critical fields) → confidence scoring rates each field → red flag detection flags risky provisions → user gets exportable results.

> **Marketing copy rule:** When writing user-facing posts, captions, ads, or landing copy, refer to the system as "AI" or "AI-powered" — do not name the underlying model. This prevents stale model names from leaking into evergreen marketing content.

**What it is NOT:** It's not a lease management platform, not a general AI tool, not legal advice. It does one thing — structured extraction from lease PDFs — and does it better and cheaper than anything else.

---

## 2. Target Audience (ICP)

| Persona | Use Case | Pain Point |
|---------|----------|------------|
| **Property Managers** | Extract rent escalations, CAM caps, critical dates | Spreadsheet chaos, missed deadlines, revenue leakage |
| **Tenant Representatives** | Abstract leases before negotiation | Manual abstraction backlog, missed red flags |
| **CRE Attorneys & Paralegals** | Structured lease summaries for review | Billable hours wasted on data entry vs. analysis |
| **Commercial RE Investors** | Due diligence on acquisition targets | Need standardized data across 50+ leases fast |
| **Corporate RE Teams** | ASC 842/IFRS 16 compliance | Inconsistent data, no centralized lease database |
| **Lenders & Credit Analysts** | Loan underwriting verification | Manual rent roll verification is slow |
| **Portfolio Managers** | Track dates, options, escalations at scale | Can't see the forest for the trees |

**Primary ICP:** Small-to-midsize CRE operators (1-5 properties) who lack enterprise tools (Yardi, MRI) but face the same contractual complexity. Their current workflow is fragmented across PDFs, email threads, and Excel files.

---

## 3. Pricing

| Pack | Price | Per Lease | Savings |
|------|-------|-----------|---------|
| Single | $15 | $15 | — |
| 5-Pack | $65 | $13 | 13% off |
| 10-Pack | $120 | $12 | 20% off |

- **No subscription.** Pay-per-use. Credits never expire.
- Enterprise/bulk pricing available for 50+ extractions.

### Price Comparison (use in content)

| Method | Cost/Lease | Time/Lease | Accuracy |
|--------|-----------|-----------|----------|
| **Lextract AI** | **$15** | **5-15 min** | **confidence-scored** |
| Manual (paralegal) | `$90-`$250 | 4-8 hours | manual first-pass accuracy varies |
| Offshore BPO | $50-$100 | 1-5 biz days | 80-90% |
| ChatGPT (DIY) | ~$0 | 30-60 min | Inconsistent |
| Prophia | Enterprise pricing | Minutes | Not published |
| LeaseLens | $25/export | Minutes | Not published |

---

## 4. Key Differentiators (Why Lextract Wins)

1. **126 curated fields** — More structured fields than competitors, mapped to standard ERP schemas for direct import into Yardi, MRI, or Excel
2. **$15/lease, no subscription** — Lowest price for structured AI extraction. Enterprise platforms cost $10K-$100K+/year
3. **Per-field confidence scoring** — Every field gets High/Medium/Low confidence so reviewers only verify the 5-10 fields that need it
4. **20 automated red flag checks** — Flags uncapped CAM, missing audit rights, personal guarantees, excessive management fees, etc.
5. **CAM intelligence layer** — Actively surfaces CAM-related risks that no competitor detects
6. **CamAudit integration** — Sister product for forensic CAM auditing (one-click handoff from "your lease has problems" to "let's audit your landlord")

---

## 5. Key Stats & Proof Points (for social content)

- 126 structured fields per extraction (14 categories)
- 20 automated red flag checks
- confidence-scored field-level accuracy on standard commercial leases
- 5-15 minute processing time (vs. 4-8 hours manual)
- $15/lease vs. `$90-`$250 for a paralegal
- 66-71% gross margin (don't share publicly — internal context only)
- Handles leases up to 200 pages
- Supports NNN, gross, modified gross, ground leases, and more
- Output formats: JSON, Excel, Word, PDF report
- Zero data retention after extraction — PDFs not stored or used for training
- 40% of commercial CAM invoices contain errors (industry stat — good for pain point content)
- Manual abstraction has 8-15% human error rate (industry stat)

---

## 6. Red Flags Lextract Detects (content goldmine)

Each is a hook for social content ("Is your lease hiding THIS?"):

1. **Excessive Management Fee** — fees above 15% or no cap at all
2. **Missing Audit Rights** — tenant can't verify landlord's CAM charges
3. **No CAM Cap** — unlimited annual CAM increases
4. **Missing Insurance Requirements** — no proof-of-insurance provisions
5. **No Exclusivity Protection** — competing tenants in same building
6. **Personal Guarantee Exposure** — individual liability beyond the entity
7. **Relocation Rights** — landlord can move tenant without consent
8. **Continuous Operation Requirement** — must stay open even if unprofitable
9. **One-sided Termination** — landlord can terminate; tenant cannot
10. **Below-market Renewal Options** — renewal terms unfavorable to tenant

---

## 7. Brand Identity

- **Brand color:** Teal (#0D9488) — "Bold Enterprise Color" direction
- **Dark teal (headings):** #134E4A
- **Accent background:** #F0FDFA
- **Display font:** Bricolage Grotesque
- **Body font:** Inter
- **Mono font:** Geist Mono
- **Design spec:** `portfolio/DESIGN.md`

### Voice & Tone Guidelines

- **Expert but accessible** — We know CRE deeply but don't gatekeep with jargon
- **Direct and confident** — State facts, show numbers, skip hedging
- **Practitioner-first** — We speak to people who DO the work (PMs, paralegals, tenant reps), not executives reading reports
- **Problem-aware** — Lead with the pain, then the solution
- **No hype** — We don't say "revolutionary" or "game-changing." The numbers speak: $15 vs. $200, 15 minutes vs. 4 hours

---

## 8. Competitor Positioning

| Competitor | Our Angle |
|------------|-----------|
| **LeaseLens** | GPT-4 powered, no CAM intelligence, generic output, $25/export |
| **Prophia** | Strong but enterprise-only, opaque pricing |
| **Re-Leased (Credia AI)** | Enterprise pricing, minimum property counts |
| **ChatGPT (DIY)** | No structured output, no schema, no confidence scores, no red flags |
| **Outsourced services** | $90-$250/lease, takes days, no structured data output |
| **Excel (manual)** | 4-8 hours/lease, 8-15% error rate, no red flags |
| **Leverton / Kira Systems** | Enterprise M&A-focused, way too expensive for SMBs |

**Key competitive frame:** "Lextract is purpose-built for the lease abstraction step only — not a full lease management platform. This focus enables higher extraction accuracy at a fraction of the cost."

---

## 9. Content Themes for Social Posts

### Pain Point Hooks
- "How many hours did your team spend abstracting leases this month?"
- "40% of CAM invoices contain errors. Are you catching them?"
- "Your paralegal costs $200/lease. AI costs $15."
- "That 90-page NNN lease has 126 data points your spreadsheet is missing"
- "Missed a renewal deadline? That's a $50K/year mistake"
- "Still copying lease terms into Excel by hand?"

### Educational Content Angles
- What is lease abstraction (and why it matters)
- NNN vs. gross lease explained
- 5 red flags in every commercial lease
- CAM charges: what's included and what's not
- ASC 842 compliance — what your auditor needs from your leases
- Critical dates that cost tenants money when missed
- How to read a CAM reconciliation statement
- What estoppel certificates are and why they matter
- Tenant improvement allowances: how to negotiate and track

### Product Demo Angles
- "Watch us abstract a 90-page NNN lease in 12 minutes"
- Before/after: Excel spreadsheet vs. Lextract output
- Red flag detection in action
- Confidence scoring explained
- "Here's what $15 gets you" (show the full 126-field output)

### Authority/Thought Leadership
- AI accuracy benchmarks (our published data)
- Cost analysis: in-house vs. outsourced vs. AI
- The future of lease administration
- Why ChatGPT isn't enough for lease review
- Data security in lease abstraction

---

## 10. Strategic Context

- **Sister product:** CamAudit.io — forensic CAM reconciliation auditing. Lextract is the top-of-funnel acquisition tool for CamAudit
- **Funnel:** Lease PDF → Lextract (abstraction) → Red flags detected → CamAudit (forensic audit) → Demand letter
- **CRM:** Apollo.io for lead capture, enrichment, and sequencing
- **Founder:** Angel Campa
- **Domain:** lextract.io
- **Support email:** angel.campa@lextract.io

---

## 11. Content Page Inventory

Every URL below is a real page on lextract.io that can be linked to or promoted in social posts.

### Money Pages (High-Intent)
| URL | Description |
|-----|-------------|
| `/` | Homepage |
| `/pricing` | Pricing page — $15/lease, packs, comparison |
| `/lease-abstraction-software` | Primary SEO landing page |
| `/lease-extraction-software` | Alternate SEO landing page |
| `/ai-lease-abstraction` | AI-specific landing page |
| `/lease-abstraction-services` | Services comparison page |
| `/automated-lease-abstraction` | Automation-focused landing page |
| `/sample-report` | Free sample extraction output |

### Articles (66 total — blog content)

#### Lease Abstraction Core
- `/resources/articles/what-is-commercial-lease-abstraction` — Definition, process & examples
- `/resources/articles/ai-lease-abstraction-guide` — How AI abstraction works, accuracy & cost
- `/resources/articles/how-to-abstract-commercial-lease` — Step-by-step guide
- `/resources/articles/lease-abstraction-automation` — AI replaces manual extraction
- `/resources/articles/lease-abstraction-companies` — Top providers compared (2026)
- `/resources/articles/manual-vs-ai-lease-abstraction` — Cost, speed, accuracy compared
- `/resources/articles/best-ai-lease-abstraction-tools-2026` — 7 tools ranked
- `/resources/articles/free-ai-lease-abstraction-tools-what-they-miss` — What free tools miss
- `/resources/articles/lease-abstraction-services-vs-ai-software` — When to use each
- `/resources/articles/how-much-does-lease-abstraction-cost` — Cost breakdown (2026)
- `/resources/articles/hidden-cost-manual-lease-abstraction` — Hidden costs analysis
- `/resources/articles/ai-lease-abstraction-accuracy-benchmarks` — Accuracy benchmarks
- `/resources/articles/lextract-benchmark-report-2026` — Performance data
- `/resources/articles/chatgpt-not-enough-lease-review` — Why ChatGPT falls short

#### Lease Types & Education
- `/resources/articles/triple-net-lease-guide` — NNN lease guide with calculator
- `/resources/articles/nnn-vs-gross-lease` — NNN vs gross comparison
- `/resources/articles/nnn-lease-checklist` — 12 things to review
- `/resources/articles/how-to-abstract-retail-lease` — Retail lease abstraction
- `/resources/articles/what-is-lease-extraction` — Technical process explained

#### CAM & Operating Expenses
- `/resources/articles/cam-reconciliation-guide` — Annual CAM process
- `/resources/articles/cam-charges-tenant-guide` — What CAM charges include
- `/resources/articles/cam-audit-checklist` — 14 items to review
- `/resources/articles/how-to-audit-landlord-cam-statement` — Step-by-step audit
- `/resources/articles/how-to-dispute-cam-charges` — Dispute process
- `/resources/articles/cam-reconciliation-spreadsheet-template-2026` — Free template
- `/resources/articles/tenant-rep-cam-caps-exclusions` — Negotiating CAM caps

#### Due Diligence & Acquisitions
- `/resources/articles/lease-abstraction-due-diligence` — Lender's/buyer's guide
- `/resources/articles/lease-extraction-due-diligence` — Processing lease stacks
- `/resources/articles/lease-abstraction-portfolio-acquisition` — Portfolio process guide
- `/resources/articles/portfolio-acquisition-48-hour-lease-review` — 48-hour playbook
- `/resources/articles/verify-rent-roll-due-diligence` — Rent roll verification

#### Financial & Compliance
- `/resources/articles/asc-842-lease-data-requirements` — Auditor requirements
- `/resources/articles/asc-842-transition-checklist` — Finance team checklist
- `/resources/articles/lease-abstraction-asc-842-compliance` — What auditors need
- `/resources/articles/ifrs-16-vs-asc-842` — Key differences
- `/resources/articles/dscr-calculator-commercial-real-estate` — DSCR calculator
- `/resources/articles/nnn-lease-calculator-occupancy-cost` — Occupancy cost calc
- `/resources/articles/rent-escalation-calculator-guide` — Escalation calculator

#### Workflows & Tools
- `/resources/articles/lease-pdf-to-excel-guide` — PDF to Excel
- `/resources/articles/best-way-convert-lease-pdf-excel` — Best conversion method
- `/resources/articles/how-to-extract-data-from-lease-pdf` — 3 methods compared
- `/resources/articles/commercial-lease-data-entry-checklist` — 126-field checklist
- `/resources/articles/126-fields-commercial-lease-checklist` — Complete field checklist
- `/resources/articles/lease-extraction-template` — 126-field template
- `/resources/articles/lease-abstract-example` — Sample abstract
- `/resources/articles/track-commercial-lease-critical-dates-excel` — Critical dates in Excel
- `/resources/articles/commercial-lease-tracking-airtable` — Airtable setup guide
- `/resources/articles/import-lease-data-yardi-voyager` — Yardi import guide
- `/resources/articles/commercial-lease-data-migration-spreadsheet-to-pms` — Spreadsheet to PMS migration

#### Specialized Topics
- `/resources/articles/ai-lease-review` — AI lease review capabilities
- `/resources/articles/commercial-lease-review` — What to check before signing
- `/resources/articles/commercial-lease-amendment-abstraction` — Amendment abstraction
- `/resources/articles/loi-vs-lease-abstraction` — LOI vs lease discrepancies
- `/resources/articles/critical-dates-tracking-guide` — Critical dates guide
- `/resources/articles/commercial-lease-audit-guide` — Full audit guide
- `/resources/articles/sublease-analysis-checklist` — Sublease review
- `/resources/articles/estoppel-certificate-guide` — Estoppel certificates explained
- `/resources/articles/snda-agreements-explained` — SNDA guide
- `/resources/articles/tenant-improvement-allowance-guide` — TI negotiation & tracking
- `/resources/articles/leverage-points-lease-negotiation` — Negotiation leverage points
- `/resources/articles/lease-administration-best-practices` — Admin best practices
- `/resources/articles/red-flags-tenant-reps-commercial-lease` — 5 red flags for tenant reps
- `/resources/articles/property-managers-lease-abstracts-revenue-leakage` — Preventing revenue leakage
- `/resources/articles/property-managers-organize-lease-data` — Organizing lease data
- `/resources/articles/juniper-square-lease-data-fund-reporting` — Fund reporting data needs
- `/resources/articles/lease-abstraction-cre-attorneys` — For outside counsel

### Guides (9 deep-dive references)
- `/resources/guides/ai-lease-extraction-guide` — Complete AI extraction guide
- `/resources/guides/asc-842-ifrs-16-lease-data-guide` — ASC 842/IFRS 16 data requirements
- `/resources/guides/commercial-lease-negotiation-data-guide` — Data-driven negotiation
- `/resources/guides/lease-administration-workflow-guide` — Admin workflow for PMs
- `/resources/guides/data-security-compliance-lease-abstraction` — Data security & compliance
- `/resources/guides/commercial-lease-renewal-termination-guide` — Renewal & termination reference
- `/resources/guides/lease-abstraction-portfolio-management` — Scaling 10 to 1,000 leases
- `/resources/guides/commercial-lease-financial-terms-guide` — Financial terms explained
- `/resources/guides/cam-reconciliation-audit-rights-guide` — CAM audit rights guide

### Competitor Comparison Pages (30 total)
- `/resources/comparisons/leaselens` — Lextract vs. LeaseLens
- `/resources/comparisons/prophia` — Lextract vs. Prophia
- `/resources/comparisons/leverton` — Lextract vs. Leverton
- `/resources/comparisons/kira-systems` — Lextract vs. Kira Systems
- `/resources/comparisons/chatgpt-lease-review` — Lextract vs. ChatGPT
- `/resources/comparisons/excel-manual-abstraction` — Lextract vs. manual Excel
- `/resources/comparisons/trullion` — Lextract vs. Trullion
- `/resources/comparisons/outsourced-services` — Lextract vs. outsourced services
- `/resources/comparisons/manual-abstraction` — Lextract vs. manual abstraction
- `/resources/comparisons/credia-ai` — Lextract vs. Credia AI (Re-Leased)
- `/resources/comparisons/v7-go` — Lextract vs. V7 Go
- `/resources/comparisons/lease-abstract-ai` — Lextract vs. LeaseAbstractAI
- `/resources/comparisons/contract-ai-tools` — Lextract vs. contract AI tools
- `/resources/comparisons/hiring-paralegal` — Lextract vs. hiring a paralegal
- `/resources/comparisons/offshore-bpo` — Lextract vs. offshore BPO
- `/resources/comparisons/re-leased` — Lextract vs. Re-Leased
- `/resources/comparisons/leaseaccelerator` — Lextract vs. LeaseAccelerator
- `/resources/comparisons/occupier` — Lextract vs. Occupier
- `/resources/comparisons/kolena` — Lextract vs. Kolena
- `/resources/comparisons/leasecake` — Lextract vs. LeaseCake
- `/resources/comparisons/rebolease` — Lextract vs. ReboLease
- `/resources/comparisons/accruent` — Lextract vs. Accruent
- `/resources/comparisons/ileasepro` — Lextract vs. iLeasePro
- `/resources/comparisons/leasewizard` — Lextract vs. LeaseWizard
- `/resources/comparisons/leasebox` — Lextract vs. LeaseBox
- `/resources/comparisons/orbital` — Lextract vs. Orbital
- `/resources/comparisons/claude-lease-review` — Lextract vs. Claude for lease review
- `/resources/comparisons/gemini-lease-review` — Lextract vs. Gemini for lease review
- `/resources/comparisons/microsoft-copilot-lease-review` — Lextract vs. Microsoft Copilot
- `/resources/comparisons/perplexity-lease-review` — Lextract vs. Perplexity

### Programmatic SEO Verticals
| Vertical | URL Pattern | Count | Description |
|----------|-------------|-------|-------------|
| Glossary | `/glossary/[term]` | 104 | CRE lease terms defined |
| Fields | `/fields/[field]` | 99 | Each extraction field explained |
| Red Flags | `/red-flags/[flag]` | 20 | Risk patterns with negotiation guidance |
| Clauses | `/clauses/[clause]` | 30 | Lease clause types explained |
| Industries | `/industries/[industry]` | 10 | Lease abstraction by industry |
| Lease Types | `/lease-types/[type]` | 11 | NNN, gross, ground, etc. |
| Property Types | `/property-types/[type]` | 15 | Office, retail, industrial, etc. |
| Locations | `/locations/[city]` | 50 | CRE market context by US city |
| States | `/resources/states/[state]` | 50 | Commercial lease law by US state |
| Use Cases | `/use-cases/[case]` | 10 | Scenario-specific abstraction |
| Workflows | `/workflows/[workflow]` | 30 | Data workflow guides |
| Integrations | `/integrations/[platform]` | 36 | Export guides (Yardi, MRI, Excel, etc.) |
| Templates | `/templates/[template]` | 10 | Checklists and templates |
| Case Studies | `/case-studies/[study]` | 15 | Real extraction case studies |
| For (Audience) | `/for/[role]` | 8 | Role-specific guides |
| Calculators | `/calculators/[calc]` | 9 | CRE calculators |

### Other Pages
- `/about` — About page
- `/faq` — FAQ page
- `/privacy` — Privacy policy
- `/terms` — Terms of service

---

## 12. Hashtag & Keyword Bank

### Primary Hashtags
`#CommercialRealEstate` `#CRE` `#LeaseAbstraction` `#LeaseManagement` `#PropertyManagement` `#CREtech` `#PropTech` `#RealEstateTech` `#CommercialLease` `#NNNLease`

### Secondary Hashtags
`#CAMCharges` `#DueDiligence` `#LeaseAdministration` `#TenantRep` `#ASC842` `#RealEstateInvesting` `#CREInvestors` `#PropertyManagers` `#LeaseReview` `#AIinRealEstate`

### Target Keywords (for content alignment)
- lease abstraction / lease abstraction software / AI lease abstraction
- lease extraction / commercial lease extraction
- commercial lease review / lease abstract
- CAM reconciliation / CAM audit / CAM charges
- NNN lease / triple net lease
- lease PDF to Excel / lease data extraction
- ASC 842 lease data / IFRS 16 lease compliance
- commercial lease due diligence
- rent escalation / critical dates tracking

---

## 13. Social Platform Strategy Notes

### LinkedIn (primary channel)
- Target: CRE professionals, PMs, tenant reps, attorneys, investors
- Content: Educational posts, pain point hooks, case study snippets, comparison data
- Tone: Professional, data-driven, practitioner-focused

### X/Twitter
- Target: CRE tech enthusiasts, startup community, AI/proptech followers
- Content: Quick stats, before/after comparisons, thread breakdowns
- Tone: Direct, punchy, numbers-forward

### Reddit
- Subreddits: r/CommercialRealEstate, r/PropertyManagement, r/realestateinvesting, r/Landlord
- Approach: Value-first comments answering CRE questions, link to articles when genuinely helpful
- NEVER self-promote overtly — be a helpful expert who happens to have built a tool

### TikTok/Reels
- Target: Younger CRE professionals, paralegals, new PMs
- Content: Quick explainers, red flag alerts, "did you know" hooks, before/after demos
- Tone: Casual, educational, slightly alarming ("Your lease is hiding THIS")

---

*Last updated: 2026-04-08*
