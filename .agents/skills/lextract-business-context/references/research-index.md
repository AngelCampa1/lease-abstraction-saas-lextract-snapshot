# Research Index

6 content research files in `docs/content-research/`. Each entry includes the file description, key findings, and guidance on when to read it.

---

## Content Research Files

### 1. `docs/content-research/prompt-1-articles-and-guides.md`

**Type:** ChatGPT Deep Research prompt (input)
**Content:** Prompt template for generating 5 blog articles and 5 resource guides for Lextract's content marketing.

**Article topics covered:**
1. "What Is Commercial Lease Abstraction? A Complete Guide for CRE Professionals"
2. "5 Red Flags Every Tenant Rep Should Catch in a Commercial Lease"
3. "Manual vs AI Lease Abstraction: Cost, Speed, and Accuracy Compared"
4. "How Property Managers Use Lease Abstracts to Prevent Revenue Leakage"
5. "The Complete Checklist: 126 Fields to Extract from Every Commercial Lease"

**Guide topics covered:**
1. "The CRE Professional's Guide to CAM Reconciliation and Audit Rights"
2. "Understanding Commercial Lease Financial Terms: Base Rent to Percentage Rent"
3. "Lease Abstraction for Portfolio Management: Scaling from 10 to 1,000 Leases"
4. "Commercial Lease Renewal and Termination: A Legal Reference Guide"
5. "Data Security and Compliance in Lease Abstraction: What CRE Firms Need to Know"

**Content silos defined:** `lease-abstraction`, `property-management`, `cam-audit`

**Read when:** Planning content strategy; creating new articles or guides; understanding the SEO keyword targets.

---

### 2. `docs/content-research/prompt-2-glossary-and-states.md`

**Type:** ChatGPT Deep Research prompt (input)
**Content:** Prompt template for generating 25+ CRE glossary terms and 10 state commercial landlord-tenant law profiles.

**Glossary categories:** Financial (8+ terms including Base Rent, NNN Lease, CAM Charges), Legal (7+ terms including Estoppel, SNDA, ROFR), Operational (6+ terms including Lease Abstract, Audit Rights), Parties (2+ terms), Property (2+ terms).

**States covered:** California, Texas, New York, Florida, Illinois, Pennsylvania, Ohio, Georgia, New Jersey, Virginia.

**Data structure:** TypeScript interfaces (`GlossaryTerm`, `StateLandlordTenantData`) ready for frontend consumption.

**Read when:** Building glossary pages; creating state-specific landing pages; implementing legal reference features.

---

### 3. `docs/content-research/prompt-3-competitor-comparisons.md`

**Type:** ChatGPT Deep Research prompt (input)
**Content:** Prompt template for generating 2 competitor comparison data structures.

**Comparisons defined:**
1. **Lextract vs LeaseLens** -- 10 feature comparison axes (fields extracted, speed, price, confidence scoring, red flags, exports, PDF reading quality, batch processing, security, ecosystem integration)
2. **Lextract vs Outsourced Services** -- 10 feature comparison axes (cost, time, fields, consistency, scalability, turnaround, confidentiality, customization, human judgment, workflow integration)

**Data structure:** TypeScript interface (`ComparisonData`) for comparison landing pages.

**Read when:** Building comparison pages; updating competitive positioning; preparing sales materials.

---

### 4. `docs/content-research/CRE Content Strategy for Lextract.io.md`

**Type:** ChatGPT Deep Research output (generated content)
**Content:** Complete output from prompt-1. Contains all 5 blog articles and 5 resource guides in MDX format, ready for `frontend/content/`.

**Key findings and data points within:**
- Manual abstraction requires 4-8 hours per lease with 85-92% accuracy rate
- Automated AI abstraction: 5-15 minutes per lease, 95-98% accuracy
- Cost comparison: $150-$300/lease (manual) vs. $15/lease (AI)
- 25% of commercial leases contain rent escalation clauses
- Revenue leakage from missed 3% escalation on $20K/month lease = $7,200/year
- Holdover rates typically 125-200% of base rent
- CAM reconciliation is the largest single source of revenue leakage for property managers
- Portfolio processing: 200 leases in 4-6 weeks (manual) vs. 1-2 days (AI)

**Read when:** Populating content pages in the frontend; referencing specific CRE statistics; building educational content.

---

### 5. `docs/content-research/Lextract Competitor Comparison Data Generation.md`

**Type:** ChatGPT Deep Research output (generated content)
**Content:** Comprehensive competitive analysis report with structured comparison data for Lextract vs LeaseLens and Lextract vs Outsourced Services.

**Key findings:**
- **LeaseLens:** Free viewing, $25/export; 200+ fields; GPT-4 powered; no confidence scoring; no red flag detection; single lease processing only; no batch; no ecosystem integration.
- **Outsourced Services:** $150-$400/lease; 4-6 weeks for portfolios; infinite customization; human judgment for ambiguous clauses; data governance risk; cannot scale quickly.
- **Lextract advantages:** $15/lease ($12 at 10-pack volume); batch processing; 126 curated fields; confidence scoring; red flag detection; CamAudit integration; JSON exports for API ingestion.
- **Lextract acknowledged weaknesses:** New product without track record; fixed 126-field schema; no human review layer; requires clean PDF input.
- For 200-lease portfolio: outsourced = $50,000 + 4-6 weeks; Lextract = $3,400 + hours.

**Read when:** Building comparison landing pages; writing competitive positioning content; preparing for sales objections.

---

### 6. `docs/content-research/CRE Glossary and State Law Data.md`

**Type:** ChatGPT Deep Research output (generated content)
**Content:** Comprehensive data architecture document containing 29+ CRE glossary terms with detailed definitions and 10 state commercial landlord-tenant law profiles.

**Glossary highlights:**
- 29 terms across Financial, Legal, Operational, Parties, and Property categories
- Each term includes: plain-English definition, extended definition with examples, related terms, category classification
- Covers all major lease concepts: NNN, Gross, Modified Gross, CAM, percentage rent, CPI escalation, TI allowance, SNDA, estoppel, ROFR/ROFO, holdover, force majeure, exclusive use, continuous operation, and more

**State law highlights:**
- 10 states profiled: CA, TX, NY, FL, IL, PA, OH, GA, NJ, VA
- Per state: overview, key statutes (with citations), key facts, notice periods, audit rights summary, 4-6 FAQs, SEO meta descriptions
- SOL ranges from 4 years (CA, TX, PA) to 10 years (IL)
- Most states have no specific commercial CAM audit rights statute -- audit rights are contractual
- California SB 1103 (2025) is the notable exception with expanded small business protections
- Pennsylvania allows confession of judgment clauses -- a significant tenant risk unique to PA
- Illinois has the longest SOL at 10 years for written contracts

**Read when:** Building glossary or state landing pages; implementing legal references in extraction output; understanding state-specific lease requirements.

---

## When to Read Each File

| Task | Read These |
|---|---|
| Writing marketing copy or blog posts | `CRE Content Strategy for Lextract.io.md` |
| Building comparison landing pages | `Lextract Competitor Comparison Data Generation.md`, `prompt-3-competitor-comparisons.md` |
| Creating glossary pages | `CRE Glossary and State Law Data.md`, `prompt-2-glossary-and-states.md` |
| Building state-specific pages | `CRE Glossary and State Law Data.md` |
| Planning content strategy | `prompt-1-articles-and-guides.md` |
| Competitive analysis | `Lextract Competitor Comparison Data Generation.md` |
| Citing CRE statistics | `CRE Content Strategy for Lextract.io.md`, `Lextract Competitor Comparison Data Generation.md` |
| Understanding legal context per state | `CRE Glossary and State Law Data.md` |
| Implementing SEO features | All prompt files for keyword targets; output files for content |

---

## Relationship to CamAudit Research Corpus

CamAudit-v2 has a separate, much larger research corpus (17 dossiers in `docs/research/` within the CamAudit-v2 repo). Lextract's content research is independent but complementary:

- **CamAudit research:** Deep-dive on CAM overcharge mechanics, detection rules, dispute letter standards, 50-state legal references, case law databases
- **Lextract research:** Focused on lease abstraction market, competitor comparisons, educational content for CRE professionals, glossary/state data for SEO

When building features that bridge both products (CamAudit upsell funnel, CAM-related red flags), reference both research corpuses. The CamAudit research is particularly valuable for understanding the forensic audit workflow that Lextract feeds into.
