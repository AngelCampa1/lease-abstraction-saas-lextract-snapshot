// --- FAQ Types -------------------------------------------------------

export interface FaqEntry {
  slug: string
  question: string
  shortAnswer: string
  fullAnswer: string
  relatedQuestions: string[]
  relatedLinks: { label: string; href: string }[]
  metaTitle: string
  metaDescription: string
  schema: { question: string; answer: string }[]
}

// --- FAQ Data --------------------------------------------------------

export const FAQS: FaqEntry[] = [
  {
    slug: 'what-is-lease-abstraction',
    question: 'What Is Lease Abstraction?',
    shortAnswer:
      'Lease abstraction is the process of extracting key data points from a commercial real estate lease document into a structured, searchable summary. A lease abstract captures the critical financial, legal, and operational terms - including rent amounts, escalation schedules, critical dates, renewal options, and CAM provisions - in a standardized format that property managers, investors, and attorneys can use without reading the full document.',
    fullAnswer: `Lease abstraction is the process of reading a commercial real estate lease document and extracting the key data points into a structured, searchable summary called a lease abstract.

A commercial lease is typically 30 to 200 pages long, written in dense legal language, with financial obligations buried in exhibits, addenda, and cross-referenced definitions. The lease abstract distills that complexity into the data points that actually drive decisions: rent amounts, escalation schedules, lease term and expiration, renewal and termination options, security deposit, tenant improvement allowance, CAM charges, audit rights, and more.

## What a Lease Abstract Includes

A comprehensive commercial lease abstract covers:

- **Party information**: Landlord entity, tenant entity, guarantor (if any)
- **Financial terms**: Base rent, rent escalation type and rate, free rent period, security deposit
- **Dates**: Lease commencement, rent commencement, expiration, key notice deadlines
- **Options**: Renewal options, termination options, expansion options, purchase options
- **CAM provisions**: CAM cap, base year, gross-up clause, audit rights, excluded expenses
- **Operational clauses**: Permitted use, assignment and subletting rights, co-tenancy protections
- **Red flags**: Uncapped charges, missing audit rights, personal guarantees, one-sided termination

Lextract extracts 126 structured fields from commercial lease PDFs, covering all major data categories above.

## Why Lease Abstraction Matters

Lease abstracts serve multiple purposes:

**Due diligence**: Investors acquiring a property with existing tenants need to review all leases quickly. Abstracting 20 leases manually takes weeks; AI abstraction processes all 20 in under 2 hours.

**Portfolio management**: Property managers tracking renewal deadlines, rent escalation dates, and CAM reconciliation obligations across dozens of leases need a structured database, not 50 PDF files.

**Accounting compliance**: ASC 842 and IFRS 16 require lessees to record right-of-use assets and lease liabilities on the balance sheet. That requires extracting specific lease data (commencement date, term, payment amounts, renewal option analysis) from every lease.

**Lease administration**: Tracking holdover provisions, notice requirements, and critical dates prevents missed renewals and legal disputes.

## Manual vs. AI Lease Abstraction

Manual abstraction by a trained paralegal takes 4 to 8 hours per lease and costs $90 to $250 per lease domestically. AI-powered abstraction (using tools like Lextract) processes each lease in 5-15 minutes at $15 per lease with confidence-scored field extraction on standard commercial lease formats.`,
    relatedQuestions: [
      'how-long-does-lease-abstraction-take',
      'what-fields-are-in-a-lease-abstract',
      'how-much-does-lease-abstraction-cost',
      'is-ai-lease-abstraction-accurate',
    ],
    relatedLinks: [
      { label: 'How Lextract Extracts Commercial Leases', href: '/resources/articles/how-to-abstract-commercial-lease' },
      { label: 'Browse 126 Extracted Fields', href: '/fields' },
      { label: '20 Commercial Lease Red Flags', href: '/red-flags' },
    ],
    metaTitle: 'What Is Lease Abstraction? Definition, Process & Fields',
    metaDescription:
      'Lease abstraction extracts key data from commercial real estate leases into a structured summary. Learn what it includes, why it matters, and how AI makes it faster.',
    schema: [
      {
        question: 'What is lease abstraction?',
        answer:
          'Lease abstraction is the process of extracting key financial, legal, and operational data points from a commercial real estate lease into a structured summary. A lease abstract includes rent amounts, escalation schedules, critical dates, renewal options, CAM provisions, and other terms - allowing property managers, investors, and attorneys to access lease data without reading the full document.',
      },
      {
        question: 'What fields does a lease abstract contain?',
        answer:
          'A comprehensive commercial lease abstract contains party information (landlord, tenant, guarantor), financial terms (base rent, escalation, security deposit), critical dates (commencement, expiration, option deadlines), options (renewal, termination, expansion), CAM provisions (cap, base year, gross-up, audit rights), and operational clauses (permitted use, assignment rights, co-tenancy). Lextract extracts 126 structured fields per lease.',
      },
      {
        question: 'How long does manual lease abstraction take?',
        answer:
          'Manual lease abstraction by a trained paralegal takes 4 to 8 hours per lease. AI-powered abstraction using tools like Lextract processes each lease in 5-15 minutes with confidence-scored field extraction on standard commercial lease formats.',
      },
    ],
  },
  {
    slug: 'how-long-does-lease-abstraction-take',
    question: 'How Long Does Lease Abstraction Take?',
    shortAnswer:
      'Manual lease abstraction takes 4 to 8 hours per lease for a trained paralegal or abstractor. AI-powered tools like Lextract process each commercial lease in 5-15 minutes. For a 50-lease portfolio, manual abstraction requires 200 to 400 hours of labor, while AI processes all 50 leases in under 15 hours.',
    fullAnswer: `Lease abstraction time varies significantly depending on the method and document complexity.

## Manual Abstraction Timeline

A trained US-based paralegal or lease abstraction specialist takes 4 to 8 hours per lease:

- **Document review (1.5-2.5 hours)**: Reading the full lease, identifying all relevant provisions, cross-referencing exhibits and addenda
- **Data entry (1-2 hours)**: Populating the abstract template with extracted values
- **Quality review (30-60 minutes)**: Senior reviewer checks accuracy on high-stakes fields

For offshore abstraction services, turnaround is typically 1 to 3 business days per lease, with total labor running 2 to 4 hours per document at lower hourly rates.

## AI Abstraction Timeline

Purpose-built AI lease abstraction tools process each lease in 5 to 15 minutes:

- **AI extraction**: AI reads the PDF and extracts 126 structured fields as part of the 5-15 minute processing workflow
- **Confidence scoring**: Per-field confidence calculation (a few seconds)
- **Output generation**: Excel, Word, PDF export (a few seconds)

Lextract processes standard commercial leases in typically 5-15 minutes depending on document length and complexity.

## Portfolio Scale Comparison

| Portfolio Size | Manual Abstraction | AI Abstraction (Lextract) |
|---------------|-------------------|--------------------------|
| 10 leases | 40-80 hours | Under 30 minutes |
| 50 leases | 200-400 hours | Under 1 hour |
| 100 leases | 400-800 hours | 1-2 hours |
| 500 leases | 2,000-4,000 hours | 5-10 hours |

## What Affects Abstraction Time

**Document complexity**: A simple 15-page NNN lease with no amendments abstracts faster than a 120-page full service gross lease with 8 amendments and 15 exhibits.

**Scan quality**: Cleanly scanned PDFs process faster and more accurately than low-resolution scans or documents with complex formatting.

**Number of amendments**: Each amendment must be reconciled against the base lease to determine which provisions govern. Multiple amendments significantly increase manual review time; AI tools that handle amendment hierarchies process these faster than those that require each document separately.

**Field requirements**: Extracting 30 fields takes less time than extracting 126. Purpose-built tools extract the full field set in a single pass.`,
    relatedQuestions: [
      'what-is-lease-abstraction',
      'how-much-does-lease-abstraction-cost',
      'is-ai-lease-abstraction-accurate',
    ],
    relatedLinks: [
      { label: 'Manual vs. AI Lease Abstraction', href: '/resources/articles/manual-vs-ai-lease-abstraction' },
      { label: 'AI Lease Abstraction Accuracy Benchmarks', href: '/resources/articles/ai-lease-abstraction-accuracy-benchmarks' },
    ],
    metaTitle: 'How Long Does Lease Abstraction Take? Manual vs. AI Timelines',
    metaDescription:
      'Manual lease abstraction takes 4-8 hours per lease. AI tools like Lextract process leases in 5-15 minutes. See portfolio-scale timelines and what affects abstraction speed.',
    schema: [
      {
        question: 'How long does lease abstraction take?',
        answer:
          'Manual lease abstraction by a trained paralegal takes 4 to 8 hours per lease. AI-powered tools like Lextract process each commercial lease in 5-15 minutes. For a 50-lease portfolio, manual abstraction requires 200 to 400 hours of labor while AI processes all 50 leases in under 15 hours.',
      },
      {
        question: 'How long does AI lease abstraction take?',
        answer:
          'AI lease abstraction tools like Lextract process a standard commercial lease in typically 5-15 minutes depending on document length and complexity, including PDF reading, field extraction, confidence scoring, and export generation.',
      },
    ],
  },
  {
    slug: 'what-fields-are-in-a-lease-abstract',
    question: 'What Fields Are in a Lease Abstract?',
    shortAnswer:
      'A commercial lease abstract typically contains 50 to 150+ structured fields covering party information (landlord, tenant, guarantors), financial terms (base rent, escalation, security deposit), critical dates (commencement, expiration, option deadlines), options (renewal, termination, expansion), CAM provisions (cap, base year, gross-up, audit rights), and legal/operational clauses. Lextract extracts 126 fields organized across 16 categories.',
    fullAnswer: `A comprehensive commercial lease abstract contains structured fields across multiple categories. The exact fields depend on the abstraction tool or template used, but a standard commercial CRE abstract covers the following:

## Party Information

- Landlord legal name and entity type
- Tenant legal name and entity type
- Guarantor name and guarantee type (personal, corporate, good guy)
- Property address and legal description
- Building name, size, and year built

## Lease Term & Dates

- Lease commencement date
- Rent commencement date (may differ for free rent periods)
- Lease expiration date
- Option exercise notice deadlines
- Rent escalation effective dates
- CAM reconciliation deadline

## Financial Terms

- Base rent (annual and monthly)
- Rent escalation type (fixed %, CPI, step)
- Rent escalation rate and frequency
- Free rent period duration and dates
- Security deposit amount and form (cash, letter of credit)
- Tenant improvement allowance amount and disbursement terms
- Operating expense stop or base year amount
- CAM charge estimate
- Percentage rent rate and breakpoint (retail leases)

## Options & Rights

- Renewal option terms (number of options, term length, rent basis)
- Early termination option and conditions
- Expansion option terms
- Right of first refusal on adjacent space
- Right of first offer on building sale
- Purchase option terms

## CAM & Operating Expenses

- CAM cap type and percentage
- CAM base year
- Gross-up provision (typically 95%)
- Excluded expenses from CAM
- Controllable vs. uncontrollable expense classification
- Tenant audit rights and notice period

## Use & Operations

- Permitted use clause
- Exclusive use restriction (and scope)
- Hours of operation requirement (retail)
- Assignment and subletting rights and consent requirements
- Co-tenancy requirement

## Landlord & Tenant Obligations

- Landlord maintenance obligations
- Tenant maintenance obligations
- Capital expenditure responsibility
- HVAC maintenance obligation
- Insurance requirements

## Termination & Default

- Early termination fee formula
- Holdover rent rate
- Default cure period (monetary and non-monetary)
- Self-help remedy rights

## Lextract's 126-Field Coverage

Lextract extracts 126 structured fields organized across these categories, with per-field confidence scores. The full field list is available at /fields.`,
    relatedQuestions: [
      'what-is-lease-abstraction',
      'what-is-cam-reconciliation',
      'is-ai-lease-abstraction-accurate',
    ],
    relatedLinks: [
      { label: 'Browse All 126 Extraction Fields', href: '/fields' },
      { label: '126-Field Lease Abstraction Checklist', href: '/resources/articles/126-fields-commercial-lease-checklist' },
      { label: 'Commercial Lease Glossary', href: '/glossary' },
    ],
    metaTitle: 'What Fields Are in a Lease Abstract? 126 Fields Explained',
    metaDescription:
      'A commercial lease abstract contains 50-150+ fields covering rent, dates, options, CAM provisions, and legal clauses. See the complete list of 126 fields Lextract extracts.',
    schema: [
      {
        question: 'What fields are in a lease abstract?',
        answer:
          'A commercial lease abstract contains fields covering party information (landlord, tenant, guarantor), financial terms (base rent, escalation, security deposit), critical dates (commencement, expiration, option deadlines), renewal and termination options, CAM provisions (cap, base year, gross-up, audit rights), and legal clauses (assignment, subletting, permitted use). Lextract extracts 126 structured fields per lease.',
      },
      {
        question: 'How many fields does a lease abstract have?',
        answer:
          'A standard commercial lease abstract contains 50 to 150 fields depending on the template. Purpose-built AI tools like Lextract extract 126 structured fields covering all major financial, legal, and operational data points in a commercial real estate lease.',
      },
    ],
  },
  {
    slug: 'what-is-nnn-lease-abstraction',
    question: 'What Is NNN Lease Abstraction?',
    shortAnswer:
      'NNN (triple net) lease abstraction is the process of extracting structured data from a triple net lease - a lease type where the tenant pays base rent plus property taxes, building insurance, and maintenance costs. Because NNN leases transfer significant operating expense risk to tenants, abstraction focuses on the base rent, NNN expense estimates, CAM components, expense caps, gross-up provisions, and audit rights that determine the tenant\'s total occupancy cost.',
    fullAnswer: `NNN lease abstraction refers to extracting structured data from a triple net lease - one of the most common commercial lease structures for retail, industrial, and single-tenant properties.

## What Makes NNN Lease Abstraction Different

In a standard gross lease, the tenant pays a flat rent and the landlord covers operating expenses. In a triple net (NNN) lease, the tenant pays:

1. **Base rent**: The fixed rental rate per square foot
2. **Property taxes**: The tenant's pro-rata share of real estate taxes
3. **Building insurance**: The tenant's share of property insurance premiums
4. **Maintenance**: Repair and maintenance costs (scope varies)

Because the tenant bears significant additional cost exposure beyond base rent, NNN lease abstraction focuses heavily on the provisions that define and limit that exposure.

## Key Fields in NNN Lease Abstraction

**Base rent**: Annual and monthly amounts, stated per square foot and in total

**NNN expense estimate**: The landlord's estimated annual cost for taxes, insurance, and maintenance, expressed as a per-square-foot rate (e.g., "$4.50 NNN")

**Expense caps**: Many NNN leases cap controllable operating expense increases at 3% to 5% per year. The cap percentage, scope (controllable vs. all expenses), and base year are critical fields.

**CAM components**: What is included in the "maintenance" net - landscaping, parking lot, roof, HVAC, structural elements. The scope determines tenant exposure.

**Gross-up provision**: If the property is not fully occupied, landlords often gross up variable expenses to a 95% occupancy level. This increases tenant expense responsibility; the presence and mechanics of the gross-up are key fields.

**Tenant audit rights**: The right to audit the landlord's NNN expense reconciliation. Tenants without audit rights cannot verify expense allocations.

**Expense exclusions**: Capital improvements, management fees above standard rates, leasing commissions, and other items may be excluded from NNN expenses. These exclusions directly reduce tenant cost.

## Common NNN Red Flags

Lextract automatically checks NNN leases for:

- Uncapped NNN expenses (tenant bears 100% of cost increases with no annual cap)
- Missing tenant audit rights (cannot verify landlord's expense calculations)
- Gross-up provision that over-allocates costs to tenants
- Excessive management fee percentage included in NNN expenses
- Capital expenditure responsibility shifted to tenant

## NNN vs. Modified Gross vs. Gross Lease

| Expense Responsibility | NNN Lease | Modified Gross | Full Service Gross |
|-----------------------|-----------|----------------|-------------------|
| Base rent | Tenant | Tenant | Tenant |
| Property taxes | Tenant | Negotiated | Landlord |
| Building insurance | Tenant | Negotiated | Landlord |
| Maintenance/CAM | Tenant | Negotiated | Landlord |
| Utilities | Tenant | Negotiated | Often landlord |

Lextract extracts lease type as a structured field and adjusts red flag detection based on the lease structure.`,
    relatedQuestions: [
      'what-is-lease-abstraction',
      'what-is-cam-reconciliation',
      'what-fields-are-in-a-lease-abstract',
    ],
    relatedLinks: [
      { label: 'NNN vs. Gross Lease Explained', href: '/resources/articles/nnn-vs-gross-lease' },
      { label: 'NNN Lease Type Overview', href: '/lease-types/triple-net-nnn-lease' },
      { label: 'CAM Charges Tenant Guide', href: '/resources/articles/cam-charges-tenant-guide' },
    ],
    metaTitle: 'What Is NNN Lease Abstraction? Triple Net Lease Data Extraction',
    metaDescription:
      'NNN lease abstraction extracts base rent, expense estimates, CAM caps, gross-up provisions, and audit rights from triple net leases. See what fields matter and common red flags.',
    schema: [
      {
        question: 'What is NNN lease abstraction?',
        answer:
          'NNN lease abstraction is the process of extracting structured data from a triple net lease, where tenants pay base rent plus property taxes, insurance, and maintenance. Key fields include base rent, NNN expense estimates, expense caps, CAM components, gross-up provisions, and tenant audit rights. These fields determine the tenant\'s total occupancy cost and risk exposure.',
      },
      {
        question: 'What does NNN mean in a commercial lease?',
        answer:
          'NNN stands for triple net. In a triple net (NNN) lease, the tenant pays base rent plus three additional costs: property taxes, building insurance, and maintenance. The base rental rate in an NNN lease is lower than a gross lease because the tenant bears these operating expenses directly.',
      },
    ],
  },
  {
    slug: 'is-ai-lease-abstraction-accurate',
    question: 'Is AI Lease Abstraction Accurate?',
    shortAnswer:
      'Purpose-built AI lease abstraction tools return confidence-scored field extraction on standard commercial lease formats (typed NNN, gross, and modified gross leases). Manual first-pass accuracy varies by reviewer, document complexity, and QA process. Confidence scoring - available in tools like Lextract - identifies which specific fields need human verification, reducing review time from hours to minutes.',
    fullAnswer: `AI lease abstraction accuracy depends on the tool, document type, and fields being extracted. The honest benchmark for purpose-built tools like Lextract:

## Accuracy Benchmarks by Document Type

| Document Type | AI Accuracy | Notes |
|---------------|-------------|-------|
| Typed NNN lease (standard) | confidence-scored | Clean scans, consistent language |
| Full service gross lease | confidence-scored | More complex operating expense language |
| Modified gross lease | confidence-scored | Variable structure |
| Ground lease | lower confidence | Complex cross-references |
| Lease with multiple amendments | lower confidence | Requires amendment reconciliation |
| Poor quality scan | lower confidence | Low scan resolution limits accuracy |

Manual first-pass accuracy varies by reviewer, document complexity, and QA process. AI extraction on standard commercial leases is useful because it pairs extracted values with confidence scores that focus human review on uncertain fields.

## What Field-Level Accuracy Means

In a 126-field extraction, some fields can still require manual verification even when the overall result is high confidence. Not all errors are equal. An error in base rent amount has greater consequence than an error in building year built.

Confidence scoring addresses this: Lextract provides a 0-100 confidence score on every extracted field. Reviewers can immediately identify which fields are uncertain and verify only those, rather than re-reading the full document. A typical 126-field extraction has a focused set of low-confidence fields reviewable in 10 to 20 minutes.

## Where AI Is Most Accurate

- **Numeric fields** (rent amounts, percentages, dollar figures): high confidence on clearly stated values
- **Date fields** (commencement, expiration, option deadlines): Consistently high accuracy on typed leases
- **Party names** (landlord, tenant, guarantor entities): High accuracy on standard formatting
- **Binary clause presence** (personal guarantee yes/no, audit rights yes/no): typically high confidence on clearly drafted clauses

## Where AI Is Less Accurate

- **Ambiguous defined terms**: Operating expense inclusions/exclusions requiring full-document context
- **Amendment hierarchies**: Superseded vs. current provisions in multi-amendment leases
- **Complex percentage rent calculations**: Variable breakpoints with sales definition carve-outs
- **Handwritten annotations**: AI handles printed text reliably; handwriting accuracy is low confidence

## The Right Workflow

AI extraction as first pass with targeted human review is designed to be much faster than full manual abstraction while preserving human review for consequential fields:

1. AI processes lease in 5-15 minutes (vs. 4-8 hours manually)
2. Confidence scores identify 8-15 fields needing review
3. Human verifies flagged fields in 15-25 minutes
4. Total time: Under 30 minutes per lease vs. 4-8 hours manually

This workflow is not "trust AI blindly" - it is "use confidence scoring to separate clearly extracted fields from the fields that warrant verification."`,
    relatedQuestions: [
      'what-is-lease-abstraction',
      'how-long-does-lease-abstraction-take',
      'how-much-does-lease-abstraction-cost',
    ],
    relatedLinks: [
      { label: 'AI Lease Abstraction Accuracy Benchmarks', href: '/resources/articles/ai-lease-abstraction-accuracy-benchmarks' },
      { label: 'Manual vs. AI Lease Abstraction', href: '/resources/articles/manual-vs-ai-lease-abstraction' },
    ],
    metaTitle: 'Is AI Lease Abstraction Accurate? Benchmarks & Confidence Scoring',
    metaDescription:
      'AI lease abstraction returns confidence-scored field extraction on standard commercial leases. Learn how confidence scoring focuses review time.',
    schema: [
      {
        question: 'Is AI lease abstraction accurate?',
        answer:
          'Purpose-built AI lease abstraction tools return confidence-scored field extraction on standard commercial leases (typed NNN, gross, modified gross). Manual first-pass accuracy varies by reviewer, document complexity, and QA process. Per-field confidence scores identify which fields need human verification, reducing review time from hours to minutes.',
      },
      {
        question: 'How accurate is AI lease abstraction compared to manual?',
        answer:
          'AI lease abstraction returns confidence-scored extraction on standard formats, while manual first-pass quality varies by reviewer and QA process. Manual review remains important for highly complex documents, handwritten annotations, and non-standard lease formats.',
      },
    ],
  },
  {
    slug: 'how-much-does-lease-abstraction-cost',
    question: 'How Much Does Lease Abstraction Cost?',
    shortAnswer:
      'Lease abstraction costs vary by method: AI tools like Lextract charge $15 per lease ($12 in 10-packs); domestic paralegal services cost $90 to $250 per lease; offshore services run $30 to $75 per lease. For a 100-lease portfolio, that is $1,200 (AI) vs. $3,000-$7,500 (offshore) vs. $9,000-$25,000 (domestic manual).',
    fullAnswer: `Lease abstraction costs depend on the method and volume. Here is a complete breakdown:

## Pricing by Method

### AI Software (Self-Serve)

| Tool | Price per Lease | Notes |
|------|----------------|-------|
| Lextract | $15 (single) / $13 (5-pack) / $12 (10-pack) | 126 fields, confidence scores, red flags included |
| LeaseLens | Free to view / $25 to export | 200+ fields, no confidence scoring |

No subscription. No minimum volume. Credits never expire.

### Managed Services

| Service Type | Price per Lease | Turnaround |
|-------------|----------------|-----------|
| Offshore abstraction | $30-$75 | 1-5 business days |
| Domestic paralegal firm | $90-$250 | 24-72 hours |
| Premium CRE firms (Realogic, etc.) | $200-$400 | 24-72 hours |

Managed services often have minimum order quantities (10-20 leases) and require setup agreements for custom templates.

### Platform Subscriptions (Abstraction as a Feature)

Enterprise platforms (Accruent, iLeasePro, Trullion, Leasecake) include lease abstraction as part of a broader platform. Pricing is subscription-based and tied to the full platform, not per-lease abstraction:

- iLeasePro: ~$150-$500+/month (varies by lease count and features)
- Leasecake: ~$10-$15/location/month
- Enterprise platforms (MRI, Yardi, Accruent): $15,000-$500,000+/year

These are the wrong price comparison for abstraction-only needs.

## Cost by Portfolio Size

| Leases | AI (Lextract) | Offshore Service | Domestic Paralegal |
|--------|---------------|-----------------|-------------------|
| 10 leases | $120 (10-pack) | $300-$750 | $900-$2,500 |
| 50 leases | $850 | $1,500-$3,750 | $4,500-$12,500 |
| 100 leases | $1,700 | $3,000-$7,500 | $9,000-$25,000 |
| 500 leases | $8,500 | $15,000-$37,500 | $45,000-$125,000 |

## Hidden Costs in Manual Abstraction

Manual abstraction costs include labor but also:

- **Quality review labor**: Senior reviewer checks completed abstracts (10-20% additional time)
- **Error correction**: Inaccurate abstracts require re-abstraction (5-15% of documents)
- **Template management**: Maintaining a standard abstraction template and training staff
- **Turnaround delay cost**: Waiting 3-5 days per document delays deal timelines

AI tools eliminate these hidden costs.

## When Higher Cost Is Justified

Managed services cost more for legitimate reasons:
- Custom output templates matching your internal systems
- Human judgment on highly complex or non-standard leases
- Zero internal review capacity (the service delivers verified output)
- Professional accountability requirements (legal, audit contexts)

For the majority of commercial lease workflows, AI abstraction at $15 per lease with per-field confidence scores delivers faster results at a fraction of the cost.`,
    relatedQuestions: [
      'what-is-lease-abstraction',
      'how-long-does-lease-abstraction-take',
      'is-ai-lease-abstraction-accurate',
    ],
    relatedLinks: [
      { label: 'How Much Does Lease Abstraction Cost?', href: '/resources/articles/how-much-does-lease-abstraction-cost' },
      { label: 'Lease Abstraction Services vs. AI Software', href: '/resources/articles/lease-abstraction-services-vs-ai-software' },
      { label: 'Lextract Pricing', href: '/pricing' },
    ],
    metaTitle: 'How Much Does Lease Abstraction Cost? 2026 Pricing Guide',
    metaDescription:
      'Lease abstraction costs $15/lease for AI tools vs. $90-$250 for domestic paralegals. Compare pricing by method, portfolio size, and total cost for 100-lease projects.',
    schema: [
      {
        question: 'How much does lease abstraction cost?',
        answer:
          'Lease abstraction costs vary by method: AI tools like Lextract charge $15 per lease ($12 in 10-packs), while offshore services, domestic paralegal firms, and managed-service providers quote based on scope, turnaround, reviewer seniority, and QA requirements. For a 100-lease portfolio, Lextract 10-pack pricing totals $1,200 in extraction fees.',
      },
      {
        question: 'Is there free lease abstraction software?',
        answer:
          'Kolena offers a free AI lease abstraction tool that returns a text summary of key lease terms. It does not provide structured, exportable fields, confidence scoring, or red flag detection. For structured data extraction, Lextract charges $15 per lease with no subscription required.',
      },
    ],
  },
  {
    slug: 'what-is-cam-reconciliation',
    question: 'What Is CAM Reconciliation?',
    shortAnswer:
      'CAM reconciliation is the annual process by which commercial landlords calculate actual Common Area Maintenance (CAM) expenses and compare them to the estimated CAM payments tenants made throughout the year. If actual expenses exceeded estimates, tenants pay the difference. If actual expenses were lower, tenants receive a credit or refund. Tenants with audit rights can verify the landlord\'s expense calculations.',
    fullAnswer: `CAM reconciliation is the annual process in commercial real estate where a landlord calculates actual Common Area Maintenance expenses for the prior year and reconciles them against the estimated monthly payments tenants made throughout the year.

## How CAM Reconciliation Works

Commercial leases typically require tenants to pay monthly CAM estimates based on the landlord's projected annual operating expenses. At the end of each year (or within 90-180 days of year-end), the landlord issues a reconciliation statement showing:

1. **Total actual operating expenses** for the property during the year
2. **Tenant's pro-rata share** based on their percentage of leasable space
3. **Total CAM payments** the tenant made during the year (monthly estimates - 12)
4. **Reconciliation amount**: The difference between actual pro-rata share and estimated payments paid

If actual costs exceeded estimates: tenant owes a **reconciliation payment**
If actual costs were below estimates: tenant receives a **credit or refund**

## What CAM Charges Include

CAM charges typically include:
- Janitorial services for common areas
- Landscaping and exterior maintenance
- Parking lot maintenance and lighting
- Property management fees
- Utilities for common areas (lobbies, hallways, stairwells)
- Security services
- Snow removal and grounds maintenance

What is excluded varies significantly by lease. Common exclusions include: capital expenditures above a stated threshold, depreciation, debt service, management fees above 5%, leasing commissions, and costs for vacant spaces.

## Why CAM Reconciliation Matters for Tenants

CAM reconciliation errors cost tenants money. Common landlord-side errors or overcharges include:

- Including capital expenditures in operating expenses
- Double-counting management fees
- Allocating costs to tenants that the lease excludes
- Using an incorrect pro-rata share calculation
- Including costs for vacant or non-applicable spaces

Tenants with **audit rights** can request and review the landlord's supporting documentation to verify the reconciliation calculation.

## Key Lease Provisions Affecting CAM Reconciliation

**CAM cap**: Limits how much controllable operating expenses can increase annually (typically 3-5%). Caps protect tenants from large year-over-year CAM increases.

**Base year**: Establishes the baseline expense level. Tenants pay their pro-rata share of increases above the base year amount.

**Gross-up provision**: Requires the landlord to calculate expenses as if the property were 95% occupied, even if actual occupancy is lower. This prevents landlords from under-collecting from existing tenants when the building has vacancies.

**Audit rights**: The tenant's contractual right to audit the landlord's CAM expense records. Most audit rights include a notice period (60-90 days after receipt of reconciliation statement) and may limit audit frequency.

Lextract extracts CAM cap, base year, gross-up provision, excluded expenses, and audit rights as structured fields, and automatically flags leases with missing audit rights or uncapped CAM charges as red flags.

Tenants concerned about overcharges in their reconciliation can get a forensic review at <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CAMAudit.io</a>. Property managers looking to automate the reconciliation process can use <a href="https://www.capveri.com" target="_blank" rel="noopener noreferrer">CapVeri.com</a>.`,
    relatedQuestions: [
      'what-is-lease-abstraction',
      'what-is-nnn-lease-abstraction',
      'what-fields-are-in-a-lease-abstract',
    ],
    relatedLinks: [
      { label: 'CAM Charges Tenant Guide', href: '/resources/articles/cam-charges-tenant-guide' },
      { label: 'CAM Audit Checklist', href: '/resources/articles/cam-audit-checklist' },
      { label: 'CAM Reconciliation Guide', href: '/resources/guides/cam-reconciliation-audit-rights-guide' },
    ],
    metaTitle: 'What Is CAM Reconciliation? Commercial Lease CAM Explained',
    metaDescription:
      'CAM reconciliation compares estimated CAM payments against actual expenses annually. Learn how it works, what it includes, and how audit rights and CAM caps protect tenants.',
    schema: [
      {
        question: 'What is CAM reconciliation?',
        answer:
          'CAM reconciliation is the annual process where a landlord calculates actual Common Area Maintenance expenses and reconciles them against the estimated monthly payments tenants made during the year. If actual costs exceeded estimates, tenants pay the difference. Tenants with audit rights can verify the landlord\'s expense calculations.',
      },
      {
        question: 'What is a CAM charge in a commercial lease?',
        answer:
          'CAM (Common Area Maintenance) charges are the tenant\'s pro-rata share of operating expenses for common areas and building maintenance. They typically include janitorial services, landscaping, parking maintenance, property management fees, and utilities for common areas. CAM charges are paid monthly as estimates, then reconciled annually against actual costs.',
      },
    ],
  },
  {
    slug: 'lease-abstraction-vs-lease-review',
    question: 'What Is the Difference Between Lease Abstraction and Lease Review?',
    shortAnswer:
      'Lease abstraction extracts structured data from a commercial lease - rent, dates, options, CAM provisions - into a standardized format for use in property management systems and financial models. Lease review is a legal or professional assessment of the lease terms, typically performed by an attorney who interprets the provisions and advises on obligations, risks, and negotiation strategies. Abstraction is data extraction; review is legal interpretation.',
    fullAnswer: `Lease abstraction and lease review are related but distinct processes. Understanding the difference determines which one you need - and when you need both.

## Lease Abstraction: Data Extraction

Lease abstraction is the process of reading a commercial lease and extracting key data points into a structured format. The output is a set of fields - rent amounts, dates, options, CAM provisions, red flags - organized for use in systems and workflows:

- Loading into a property management system (Yardi, MRI, AppFolio)
- Building a rent roll or financial model in Excel
- Tracking critical dates across a portfolio
- Verifying lease economics during due diligence
- Generating an ASC 842 lease accounting schedule

Abstraction is fundamentally a data task. The goal is accuracy and completeness: did the abstractor correctly identify and extract the right values from the right clauses?

AI tools like Lextract automate abstraction. They process the document in minutes, extract 126 structured fields with per-field confidence scores, and flag risky provisions across 20 automated checks.

## Lease Review: Legal Interpretation

Lease review is a legal service performed by an attorney or experienced CRE professional who reads the lease and advises on:

- **What the lease actually requires**: Interpreting ambiguous language, understanding how defined terms interact, identifying obligations that may not be obvious from a surface read
- **Risk assessment**: Evaluating the legal and financial exposure of specific provisions - is the personal guarantee scope unusually broad? Is the demolition clause enforceable?
- **Negotiation strategy**: Recommending changes to unfavorable terms before execution
- **Red flag analysis**: Identifying provisions that are below-market, one-sided, or create unusual risk

Lease review requires legal judgment, not just data extraction. An AI tool can flag that a personal guarantee exists; only an attorney can advise whether its scope is typical for the market and jurisdiction.

## When You Need Abstraction vs. Review

| Situation | Abstraction | Review |
|-----------|-------------|--------|
| Loading lease data into a PMS | Required | Not needed |
| Building a rent roll for investors | Required | Not needed |
| Pre-execution lease negotiation | Not the primary tool | Required |
| Due diligence on an acquisition | Required | Typically required |
| ASC 842 accounting | Required | Not always needed |
| Tracking portfolio critical dates | Required | Not needed |
| Dispute resolution | Supporting data | Required |

## How They Work Together

For sophisticated CRE workflows, abstraction and review are complementary:

1. **Abstraction first**: Extract all structured data from the lease, surface red flags
2. **Red flag triage**: Attorney focuses legal review on the specific provisions flagged as risky
3. **Interpretation**: Attorney advises on the meaning and negotiability of flagged terms
4. **Data entry**: Abstracted fields populate the PMS or database

This workflow is more efficient than starting with a full legal review of every clause. Red flag detection (Lextract identifies 20 patterns) focuses attorney time on the provisions that actually matter.

## Can AI Replace Legal Lease Review?

No. AI lease abstraction automates data extraction and flags known risk patterns. It does not interpret ambiguous language, advise on negotiation strategy, assess jurisdiction-specific legal implications, or provide legal advice. AI abstraction reduces the data extraction burden so attorneys and CRE professionals can focus on interpretation and advice.`,
    relatedQuestions: [
      'what-is-lease-abstraction',
      'is-ai-lease-abstraction-accurate',
      'what-fields-are-in-a-lease-abstract',
    ],
    relatedLinks: [
      { label: 'Lease Abstraction for CRE Attorneys', href: '/resources/articles/lease-abstraction-cre-attorneys' },
      { label: '20 Commercial Lease Red Flags', href: '/red-flags' },
      { label: 'Browse All 126 Extraction Fields', href: '/fields' },
    ],
    metaTitle: 'Lease Abstraction vs. Lease Review: What Is the Difference?',
    metaDescription:
      'Lease abstraction extracts structured data from a lease. Lease review is a legal assessment of obligations and risks. Learn when you need each and how they work together.',
    schema: [
      {
        question: 'What is the difference between lease abstraction and lease review?',
        answer:
          'Lease abstraction extracts structured data from a commercial lease (rent, dates, options, CAM provisions) into a standardized format for use in property management systems. Lease review is a legal assessment performed by an attorney who interprets the provisions, evaluates risk, and advises on obligations and negotiation strategy. Abstraction is data extraction; review is legal interpretation.',
      },
      {
        question: 'Do I need a lease review or lease abstraction?',
        answer:
          'You need lease abstraction when you need structured data from a lease for property management, due diligence, financial modeling, or ASC 842 accounting. You need lease review when you need legal interpretation of lease provisions, risk assessment, or negotiation strategy before signing. Most commercial transactions benefit from both: abstraction for data and review for legal advice.',
      },
    ],
  },
]

// --- Helpers --------------------------------------------------------

export function getFaqBySlug(slug: string): FaqEntry | undefined {
  return FAQS.find((f) => f.slug === slug)
}

export function getAllFaqSlugs(): string[] {
  return FAQS.map((f) => f.slug)
}
