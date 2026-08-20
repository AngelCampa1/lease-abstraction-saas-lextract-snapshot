# Industry Sources Reference

Curated reference of statistics relevant to commercial lease abstraction and the Lextract value proposition. Every entry here meets minimum sourcing criteria: named source organization, year or date of publication, and a traceable citation.

**Do not add any statistic that lacks all three.** If a stat has a source org but no year or no publication title, it does not belong here -- use directional language and attribution caveats instead.

---

## Source Quality Tiers

| Tier | Category | Organizations |
|---|---|---|
| **Tier 1** | Official/Government | U.S. Courts, IRS, EIA, Bureau of Labor Statistics |
| **Tier 2** | Industry Standards Bodies | BOMA International, IREM, ICSC, NAIOP |
| **Tier 3** | Major CRE Services/Research | JLL, CBRE, Cushman & Wakefield, Deloitte, KPMG, Marsh, CIAB, Fortune Business Insights |
| **Tier 4** | Specialized Firms/Vendors | Tango Analytics, Springbord, NTrust, PredictAP, Prophia, LeaseLens, HelloData, LeaseRef, Apps Run The World -- named org but no published methodology; use with attribution caveat |

Use tier as a guide for how strongly to assert a claim. Tier 1-2 sources can be cited as fact. Tier 3 should be attributed. Tier 4 should always include an attribution caveat ("according to [org], though no peer-reviewed methodology has been published").

---

## Market Scale & Size

| Statistic | Source | Year | Tier | Notes |
|---|---|---|---|---|
| US CAM market: $90-200B/yr | PredictAP, *State of the CAM Market* | 2026 | 4 | Range reflects variation by property type |
| US CRE annual rental income: $600-700B | PredictAP, *State of the CAM Market* | 2026 | 4 | Corroborates BOMA scale data |
| CAM as % of occupancy costs: 15-35% | BOMA / Springbord | 2025 | 2/4 | BOMA benchmark data + Springbord analysis |
| Property mgmt software market: $24.18B | Fortune Business Insights | 2024 | 3 | Market research report |
| US office market: 8.6B sq ft, $134.9B direct spending | BOMA, *2022 Office Market Study* | 2022 | 2 | Authoritative industry study |
| RE lease management applications market: $9.5B (2024), projected $12.6B by 2029 | Apps Run The World | Jul 2025 | 4 | Use with attribution caveat |
| US net-lease investment: $51.4B (+16% YoY) | CBRE, *US Quarterly Figures* | Feb 2026 | 3 | Commercial investment activity |

---

## Manual Abstraction Cost & Time Benchmarks

| Statistic | Source | Year | Tier | Usage Guidance |
|---|---|---|---|---|
| Manual abstraction: 4-8 hours per commercial lease | RSM US, *Lease Abstraction Planning*; Build.inc, *AI Lease Abstraction* | 2024-2026 | 3 | Citable -- multiple corroborating sources |
| In-house labor cost: $25-30/hr for lease administrators | Kolena, *ROI of AI-Powered Lease Abstraction* | 2026 | 4 | Citable with attribution; implies $75-$240/lease at 3-8 hours |
| Outsourced BPO cost: $150-$400/lease | Build.inc; NTrust; Realogic pricing | 2024-2026 | 3/4 | Multiple sources confirm range; varies by asset class and integration requirements |
| Legal firm abstraction: $100-$4,000/lease | Industry benchmarks | 2024-2026 | 4 | Wide range; depends on firm size and lease complexity |
| Manual accuracy rate: 85-92% | Build.inc, *AI Lease Abstraction*; V7 Labs | 2026 | 3/4 | Citable with attribution; fatigue factor is primary cause |
| Human error rate in manual abstraction: 8-15% | Industry consensus across multiple sources | 2024-2026 | 4 | Inverse of accuracy rate; use directionally |
| Portfolio processing time (outsourced): 4-6 weeks for 200 leases | Build.inc; Realogic portfolio timelines | 2026 | 3/4 | Citable -- consistent across multiple BPO providers |

---

## AI Abstraction Benchmarks

| Statistic | Source | Year | Tier | Usage Guidance |
|---|---|---|---|---|
| AI processing time: 3-15 minutes per lease | Build.inc; V7 Labs; Kolena | 2026 | 3/4 | Multiple corroborating sources; 3 min for standard, up to 15 min for complex |
| AI accuracy rate: 95-98% on standard PDFs | Build.inc; V7 Labs ("99% accuracy claim") | 2026 | 3/4 | Citable with caveat; accuracy varies significantly by document quality |
| Vision-LLM PDF reading accuracy: 95-98% field-level on standard commercial leases | Internal Lextract benchmark vs ground-truth corpus (packages/extract-sdk/tests/fixtures/real-leases/) | 2026 | 1 | Replaces former Textract OCR benchmark; vision LLMs collapse OCR + classification into a single read |
| AI cost reduction vs. manual: 85-95% | Derived from $15/lease vs. $150-$400/lease | 2026 | -- | Mathematical derivation, not a primary source claim |

---

## CAM Error & Overcharge Rates

| Statistic | Source | Year | Tier | Usage Guidance |
|---|---|---|---|---|
| 40% of CAM reconciliations contain material errors | Tango Analytics, *CAM Reconciliation Report* | 2023 | 4 | Citable with caveat -- named org, no published methodology |
| 30% of CAM statements contain errors | IREM, *Journal of Property Management* | Undated | 2 | Citable with attribution -- confirmed IREM publication |
| 70% of tenants identify billing discrepancies or lack of transparency | Deloitte, CRE Advisory Group | 2024-2026 | 3 | Citable with attribution; "discrepancy" means perceived, not confirmed material error |
| 28% of tenants discover errors internally | JLL Report | 2023 | 3 | Citable with attribution |
| 15-20% recovery via professional audit | Springbord, *2023 Industry Analysis* | 2023 | 4 | Weakly sourced -- named org, no peer-reviewed methodology |
| CapEx improperly billed as CAM: ~25-35% of audited reconciliations | Industry practitioner estimates | 2024-2026 | 4 | Attribution caveat required; directional only |
| Annual revenue leakage from CAM errors: $5-15B | PredictAP market estimates | 2026 | 4 | Derived from error rate x market size; use with attribution caveat |

---

## CAM Cost Benchmarks by Property Type

| Property Type | CAM Range ($/sq ft/yr) | Source | Year | Tier |
|---|---|---|---|---|
| Office | $8-15/sq ft; $15.76 avg | HelloData/LeaseRef; BOMA *2022 Office Study* | 2022-2026 | 2/4 |
| Retail | $3-10/sq ft | HelloData | 2026 | 4 |
| Industrial | $0.15-3/sq ft | HelloData | 2024-2026 | 4 |
| Medical Office | $15-20+/sq ft | HelloData, LeaseRef, healthcare RE brokerages | 2024-2026 | 4 |

---

## Management Fee Benchmarks

| Property Type | Fee Benchmark | Source | Year | Tier |
|---|---|---|---|---|
| Office | $0.74/sq ft; 3.62% of gross | IREM, *Income/Expense IQ* | 2023 | 2 |
| Industrial | $0.32/sq ft; 3.77% of gross | IREM, *Income/Expense IQ* | 2023 | 2 |
| Retail | 5-15% of operating costs | ICSC leasing practice materials | Ongoing | 2 |
| Admin/overhead fees | 10-15% of allowable CAM | ICSC | Ongoing | 2 |

---

## Competitor Pricing Benchmarks

| Competitor | Pricing Model | Source | Year |
|---|---|---|---|
| LeaseLens | Free viewing, $25/export | Copilotly, MonkeyAiTools product reviews | 2024-2026 |
| Prophia | From $20/doc, enterprise custom | Public marketing materials | 2025 |
| Re-Leased (Credia AI) | Quote-based, minimum property counts | Public marketing materials | 2025 |
| NTrust (outsourced) | Per-lease + integration fees | NTrust public pricing | 2025 |
| Realogic (outsourced) | Per-lease, proprietary rAbstract platform | Realogic public marketing | 2025 |
| Traditional CPA audit | $300+/hr (KPMG $682.02 blended avg) | KPMG public filings | 2024-2026 |

---

## Insurance Premium Trends

Source: **CIAB (Council of Insurance Agents & Brokers), quarterly commercial property line surveys.** Tier 3. Relevant because insurance cost passthrough is a major component of CAM charges in NNN leases.

| Period | Premium Change | Notes |
|---|---|---|
| Q1 2023 | +20.4% | Peak hardening period |
| Q2 2023 | +18.3% | |
| Q3 2023 | +17.1% | Often cited as "2023 avg" |
| Q4 2023 | +11.8% | |
| Q1 2024 | +10.1% | Market beginning to soften |
| Q2 2024 | +8.9% | Often cited as "2024 avg" |
| Q3 2024 | +7.9% | |
| Q4 2024 | +6.0% | |
| Q1 2025 | +2.9% | Significant moderation |

**Why this matters for Lextract:** Insurance costs are a non-controllable expense in most lease structures, exempt from CAM caps. Rapid premium increases in 2023-2024 mean tenants are paying significantly more, making the extraction and verification of insurance-related lease provisions (who bears the insurance, what types are covered) critically important.

---

## Accounting Standards Impact

| Standard | Relevance | Source |
|---|---|---|
| ASC 842 (US GAAP) | Requires capitalizing operating leases on balance sheets; demands unprecedented accuracy of lease data | FASB, Cherry Bekaert analysis (2024-2026) |
| IFRS 16 (International) | Same requirement internationally; both standards drive demand for structured lease data extraction | IASB |

**Why this matters for Lextract:** ASC 842/IFRS 16 compliance requires organizations to have accurate, structured data for every commercial lease in their portfolio. This is a structural demand driver for lease abstraction services and a strong selling point for corporate RE teams and CFOs.

---

## Statistic Usage Caveats

**Before using any industry statistic in copy, code, or analysis, check this section.**

| Statistic | Status | What to Say Instead |
|---|---|---|
| "40% of CAM invoices contain errors" | Tango Analytics (Tier 4); citable with attribution caveat | "Tango Analytics (2023) found material errors in 40% of reconciliations reviewed" |
| "AI achieves 99% accuracy" | V7 Go marketing claim; not independently verified | "AI platforms report 95-98% accuracy on standard documents" |
| "Manual abstraction costs $150-$300/lease" | Multiple sources confirm range | Use freely with attribution to Build.inc or RSM |
| "$5-15B annual CAM leakage" | PredictAP derived estimate | Always attribute: "PredictAP estimates..." |
| "8-15% human error rate" | Industry consensus, no single primary source | Use as directional: "Industry sources report error rates of 8-15%" |
