// ─── Calculator Types ───────────────────────────────────────────────────────

export interface CalculatorStep {
  label: string
  value: string
  note?: string
}

export interface CalculatorExample {
  inputs: Record<string, string>
  result: string
  breakdown: CalculatorStep[]
}

export interface CalculatorFaq {
  question: string
  answer: string
}

export interface CalculatorField {
  name: string
  label: string
  type: 'number' | 'percent' | 'currency' | 'years' | 'sqft'
  placeholder: string
  defaultValue?: number
  suffix?: string
  helpText?: string
  min?: number
  max?: number
  step?: number
}

export interface CalculatorResult {
  result: string
  breakdown: CalculatorStep[]
}

export interface CalculatorEntry {
  slug: string
  title: string
  headline: string
  description: string
  formula: string
  formulaNote: string
  example: CalculatorExample
  relatedLinks: { label: string; href: string }[]
  faqs: CalculatorFaq[]
  metaTitle: string
  metaDescription: string
  fields?: CalculatorField[]
  compute?: (inputs: Record<string, number>) => CalculatorResult
}

// ─── Calculator Data ────────────────────────────────────────────────────────

export const CALCULATORS: CalculatorEntry[] = [
  {
    slug: 'nnn-lease-cost-calculator',
    title: 'Triple Net Lease Calculator',
    headline: 'Triple Net Lease Calculator: Calculate NNN Total Cost',
    description:
      'A NNN (triple net) lease requires the tenant to pay base rent plus three operating expense categories: property taxes, building insurance, and maintenance/CAM. This calculator shows how to add all components to find your total occupancy cost.',
    formula: 'Total Annual Cost = Base Rent + Property Taxes + Insurance + CAM/Maintenance',
    formulaNote:
      'All figures are annual. Divide by 12 for monthly cost. Per-square-foot figures should be multiplied by your leased square footage.',
    example: {
      inputs: {
        'Leased Square Footage': '5,000 sq ft',
        'Base Rent': '$18.00/sq ft/year',
        'Property Tax Pass-Through': '$3.20/sq ft/year',
        'Insurance Pass-Through': '$0.85/sq ft/year',
        'CAM/Maintenance': '$2.40/sq ft/year',
      },
      result: '$122,250/year ($10,187.50/month)',
      breakdown: [
        { label: 'Base Rent', value: '$65,000/year', note: '5,000 × $18.00' },
        { label: 'Property Taxes', value: '$16,000/year', note: '5,000 × $3.20' },
        { label: 'Insurance', value: '$4,250/year', note: '5,000 × $0.85' },
        { label: 'CAM/Maintenance', value: '$12,000/year', note: '5,000 × $2.40' },
        { label: 'Total Annual Cost', value: '$122,250/year', note: 'Full occupancy cost' },
        { label: 'Monthly Cost', value: '$10,187.50/month', note: '÷ 12' },
        { label: 'Effective Rate', value: '$24.45/sq ft/year', note: 'Total ÷ sq ft' },
      ],
    },
    relatedLinks: [
      { label: 'NNN Lease Abstraction Guide', href: '/lease-types/nnn-lease' },
      { label: 'CAM Charges Explained', href: '/glossary/cam-charges' },
      { label: 'What a Lease Abstract Includes', href: '/faq/what-fields-are-in-a-lease-abstract' },
    ],
    faqs: [
      {
        question: 'What does NNN mean in a lease?',
        answer:
          'NNN stands for triple net. In a NNN lease, the tenant pays base rent plus three categories of operating expenses: property taxes, building insurance, and maintenance or common area maintenance (CAM) charges. The landlord\'s net income from the lease is the base rent, after the tenant covers these three expense categories.',
      },
      {
        question: 'Are NNN charges negotiable?',
        answer:
          'CAM charges are often negotiable. Tenants frequently negotiate a CAM cap (annual increase cap, typically 3–5%), exclusions from CAM (management fees, capital expenditures, leasing commissions), and audit rights to verify landlord expense calculations. Property taxes and insurance pass-throughs are based on actual costs and are less negotiable but are subject to the same audit rights.',
      },
      {
        question: 'How do I estimate NNN costs before signing a lease?',
        answer:
          'Request the landlord\'s most recent operating expense reconciliation statement, which shows actual prior-year costs broken down by category. Use those figures as the baseline for estimating current-year costs. Budget a 3–5% annual increase for CAM charges in subsequent years unless a cap is negotiated.',
      },
      {
        question: 'What is a triple net lease?',
        answer:
          'A triple net (NNN) lease requires the tenant to pay base rent plus three additional operating expense categories: property taxes, building insurance, and maintenance/CAM charges. The landlord\'s net income is the base rent after the tenant covers these three expense categories. NNN leases are common in retail, industrial, and single-tenant commercial properties.',
      },
      {
        question: 'How do I calculate NNN lease costs?',
        answer:
          'To calculate total NNN lease costs: (1) multiply your leased square footage by the base rent per square foot per year; (2) multiply your leased square footage by each NNN component (property taxes, insurance, CAM) per square foot per year; (3) sum all four components for total annual cost; (4) divide by 12 for monthly cost. Example: 5,000 sq ft at $18 base rent + $3.20 taxes + $0.85 insurance + $2.40 CAM = $122,250/year or $10,188/month.',
      },
    ],
    metaTitle: 'Triple Net Lease Calculator - NNN Cost Formula, Examples & Results',
    metaDescription:
      'Calculate the true annual cost of a NNN (triple net) lease. Add base rent plus property taxes, insurance, and CAM/maintenance charges. Free triple net lease calculator with formula and worked examples.',
    fields: [
      {
        name: 'sqft',
        label: 'Leased Square Footage',
        type: 'sqft',
        placeholder: '5000',
        defaultValue: 5000,
        suffix: 'sq ft',
        min: 1,
        step: 100,
      },
      {
        name: 'baseRent',
        label: 'Base Rent',
        type: 'currency',
        placeholder: '18.00',
        defaultValue: 18,
        suffix: '/ sq ft / year',
        helpText: 'Annual base rent per square foot',
        min: 0,
        step: 0.25,
      },
      {
        name: 'taxes',
        label: 'Property Tax Pass-Through',
        type: 'currency',
        placeholder: '3.20',
        defaultValue: 3.2,
        suffix: '/ sq ft / year',
        min: 0,
        step: 0.1,
      },
      {
        name: 'insurance',
        label: 'Insurance Pass-Through',
        type: 'currency',
        placeholder: '0.85',
        defaultValue: 0.85,
        suffix: '/ sq ft / year',
        min: 0,
        step: 0.05,
      },
      {
        name: 'cam',
        label: 'CAM / Maintenance',
        type: 'currency',
        placeholder: '2.40',
        defaultValue: 2.4,
        suffix: '/ sq ft / year',
        min: 0,
        step: 0.1,
      },
    ],
    compute: (inputs) => {
      const { sqft, baseRent, taxes, insurance, cam } = inputs
      if (!sqft || sqft <= 0) {
        return { result: 'Enter values above to calculate', breakdown: [] }
      }
      const annualBase = sqft * (baseRent ?? 0)
      const annualTaxes = sqft * (taxes ?? 0)
      const annualInsurance = sqft * (insurance ?? 0)
      const annualCam = sqft * (cam ?? 0)
      const totalAnnual = annualBase + annualTaxes + annualInsurance + annualCam
      const monthly = totalAnnual / 12
      const effectiveRate = sqft > 0 ? totalAnnual / sqft : 0

      const fmt = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      const fmtDec = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

      return {
        result: `${fmt(totalAnnual)}/year (${fmtDec(monthly)}/month)`,
        breakdown: [
          { label: 'Base Rent', value: `${fmt(annualBase)}/year`, note: `${sqft.toLocaleString()} × ${fmtDec(baseRent ?? 0)}` },
          { label: 'Property Taxes', value: `${fmt(annualTaxes)}/year`, note: `${sqft.toLocaleString()} × ${fmtDec(taxes ?? 0)}` },
          { label: 'Insurance', value: `${fmt(annualInsurance)}/year`, note: `${sqft.toLocaleString()} × ${fmtDec(insurance ?? 0)}` },
          { label: 'CAM / Maintenance', value: `${fmt(annualCam)}/year`, note: `${sqft.toLocaleString()} × ${fmtDec(cam ?? 0)}` },
          { label: 'Total Annual Cost', value: `${fmt(totalAnnual)}/year`, note: 'Full occupancy cost' },
          { label: 'Monthly Cost', value: `${fmtDec(monthly)}/month`, note: '÷ 12' },
          { label: 'Effective Rate', value: `${fmtDec(effectiveRate)}/sq ft/year`, note: 'Total ÷ sq ft' },
        ],
      }
    },
  },
  {
    slug: 'cam-reconciliation-calculator',
    title: 'CAM Reconciliation Calculator',
    headline: 'CAM Reconciliation Calculator: Estimate Your True-Up Amount',
    description:
      'At the end of each lease year, landlords reconcile estimated CAM payments against actual expenses. If actual expenses exceed estimates, tenants pay a "true-up." If estimates exceeded actuals, tenants receive a credit. This calculator walks through the reconciliation math. After calculating, tenants can verify against their actual reconciliation with <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CAMAudit.io</a>. Property managers can automate the process with <a href="https://www.capveri.com" target="_blank" rel="noopener noreferrer">CapVeri.com</a>.',
    formula: 'CAM True-Up = (Actual CAM Expenses × Tenant Pro-Rata Share) − Monthly CAM Paid',
    formulaNote:
      'A positive result means you owe additional payment. A negative result means you are owed a credit. Gross-up provisions may adjust actual expenses upward if occupancy was below the contractual threshold (often 90–95%).',
    example: {
      inputs: {
        'Total Building CAM Expenses (Actual)': '$240,000/year',
        'Total Rentable Building Area': '50,000 sq ft',
        'Tenant Leased Area': '5,000 sq ft',
        'Tenant Pro-Rata Share': '10.00% (5,000 ÷ 50,000)',
        'Monthly CAM Estimate Paid': '$1,900/month ($22,800/year)',
        'Building Occupancy During Year': '85%',
      },
      result: 'Tenant owes $1,200 (base case); $4,024 if lease has 95% gross-up provision',
      breakdown: [
        { label: "Tenant's Share of Actual CAM", value: '$24,000/year', note: '$240,000 × 10.00%' },
        { label: 'CAM Estimated Already Paid', value: '$22,800/year', note: '$1,900 × 12' },
        { label: 'Base True-Up (no gross-up)', value: '$1,200 owed', note: '$24,000 − $22,800' },
        {
          label: 'Grossed-Up CAM (95% threshold)',
          value: '$268,235/year',
          note: '$240,000 ÷ 85% × 95%',
        },
        { label: "Tenant's Share (Grossed-Up)", value: '$26,824/year', note: '$268,235 × 10.00%' },
        { label: 'True-Up with Gross-Up', value: '$4,024 owed', note: '$26,824 − $22,800' },
      ],
    },
    relatedLinks: [
      { label: 'What Is CAM Reconciliation?', href: '/faq/what-is-cam-reconciliation' },
      { label: 'CAM Cap Red Flag', href: '/red-flags/no-cam-cap' },
      { label: 'CAM Audit Rights', href: '/fields/audit-rights' },
    ],
    faqs: [
      {
        question: 'What is a CAM reconciliation?',
        answer:
          'CAM reconciliation is the annual process by which landlords compare actual common area maintenance (CAM) expenses against the estimated payments tenants made throughout the year. If actual expenses exceeded estimates, the tenant pays a true-up. If estimates exceeded actuals, the tenant receives a credit or carryforward.',
      },
      {
        question: 'What is a gross-up provision in a lease?',
        answer:
          'A gross-up provision allows the landlord to adjust CAM expenses as if the building were at full occupancy (typically 90–95%) when calculating tenant expense shares. This prevents tenants from benefiting from low-occupancy years when variable expenses like utilities and cleaning are artificially low.',
      },
      {
        question: 'How do I know if my CAM reconciliation is accurate?',
        answer:
          'Tenants with audit rights can request the landlord\'s supporting expense documentation within the window specified in the lease (typically 30–90 days after receiving the reconciliation). Common errors include inclusion of excluded expense categories, incorrect pro-rata share calculations, and capital expenditure misclassification as operating expenses.',
      },
    ],
    metaTitle: 'CAM Reconciliation Calculator - Excel Template + Formula',
    metaDescription:
      'Calculate commercial lease CAM reconciliation online. Compare estimated vs. actual CAM charges, compute pro-rata share overpayments, and identify reconciliation gaps. Free CAM reconciliation calculator.',
    fields: [
      {
        name: 'actualCam',
        label: 'Total Building CAM (Actual)',
        type: 'currency',
        placeholder: '240000',
        defaultValue: 240000,
        suffix: '/ year',
        helpText: 'Total actual building CAM expenses for the year',
        min: 0,
        step: 1000,
      },
      {
        name: 'buildingArea',
        label: 'Total Rentable Area',
        type: 'sqft',
        placeholder: '50000',
        defaultValue: 50000,
        suffix: 'sq ft',
        min: 1,
        step: 100,
      },
      {
        name: 'tenantArea',
        label: 'Tenant Leased Area',
        type: 'sqft',
        placeholder: '5000',
        defaultValue: 5000,
        suffix: 'sq ft',
        min: 1,
        step: 100,
      },
      {
        name: 'monthlyEstimate',
        label: 'Monthly CAM Estimate Paid',
        type: 'currency',
        placeholder: '1900',
        defaultValue: 1900,
        suffix: '/ month',
        helpText: 'Amount you paid each month during the year',
        min: 0,
        step: 50,
      },
      {
        name: 'occupancyPct',
        label: 'Actual Building Occupancy',
        type: 'percent',
        placeholder: '85',
        defaultValue: 85,
        suffix: '%',
        helpText: 'Average occupancy during the year (affects gross-up)',
        min: 1,
        max: 100,
        step: 1,
      },
      {
        name: 'grossUpThreshold',
        label: 'Gross-Up Threshold',
        type: 'percent',
        placeholder: '95',
        defaultValue: 95,
        suffix: '%',
        helpText: 'The occupancy % in your lease for gross-up. Use 0 if no gross-up.',
        min: 0,
        max: 100,
        step: 1,
      },
    ],
    compute: (inputs) => {
      const { actualCam, buildingArea, tenantArea, monthlyEstimate, occupancyPct, grossUpThreshold } = inputs
      if (!actualCam || actualCam <= 0 || !buildingArea || buildingArea <= 0 || !tenantArea || tenantArea <= 0) {
        return { result: 'Enter values above to calculate', breakdown: [] }
      }
      const fmt = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

      const proRataShare = tenantArea / buildingArea
      const tenantShareActual = actualCam * proRataShare
      const annualEstimatePaid = (monthlyEstimate ?? 0) * 12
      const baseTrueUp = tenantShareActual - annualEstimatePaid

      const occ = occupancyPct ?? 0
      const gut = grossUpThreshold ?? 0
      const grossUpApplies = gut > 0 && occ < gut && occ > 0
      const grossedUpCam = grossUpApplies ? (actualCam / (occ / 100)) * (gut / 100) : actualCam
      const grossedUpTenantShare = grossedUpCam * proRataShare
      const grossedUpTrueUp = grossedUpTenantShare - annualEstimatePaid

      const baseLabel = baseTrueUp >= 0 ? `You owe ${fmt(baseTrueUp)}` : `You are owed a credit of ${fmt(Math.abs(baseTrueUp))}`
      const resultStr = grossUpApplies && grossedUpTrueUp !== baseTrueUp
        ? `${baseLabel} (${fmt(grossedUpTrueUp)} with gross-up)`
        : baseLabel

      const breakdown: { label: string; value: string; note?: string }[] = [
        {
          label: 'Tenant Pro-Rata Share',
          value: `${(proRataShare * 100).toFixed(2)}%`,
          note: `${tenantArea.toLocaleString()} ÷ ${buildingArea.toLocaleString()}`,
        },
        {
          label: "Tenant Share of Actual CAM",
          value: fmt(tenantShareActual),
          note: `${fmt(actualCam)} × ${(proRataShare * 100).toFixed(2)}%`,
        },
        {
          label: 'Annual Estimates Paid',
          value: fmt(annualEstimatePaid),
          note: `$${(monthlyEstimate ?? 0).toLocaleString()}/mo × 12`,
        },
        {
          label: 'Base True-Up',
          value: baseTrueUp >= 0 ? fmt(baseTrueUp) : `−${fmt(Math.abs(baseTrueUp))}`,
          note: 'positive = you owe',
        },
      ]

      if (grossUpApplies) {
        breakdown.push(
          {
            label: `Grossed-Up CAM (${gut}% threshold)`,
            value: fmt(grossedUpCam),
            note: `${fmt(actualCam)} ÷ ${occ}% × ${gut}%`,
          },
          {
            label: 'Tenant Share (Grossed-Up)',
            value: fmt(grossedUpTenantShare),
            note: `${fmt(grossedUpCam)} × ${(proRataShare * 100).toFixed(2)}%`,
          },
          {
            label: 'True-Up with Gross-Up',
            value: grossedUpTrueUp >= 0 ? fmt(grossedUpTrueUp) : `−${fmt(Math.abs(grossedUpTrueUp))}`,
            note: 'positive = you owe',
          },
        )
      }

      return { result: resultStr, breakdown }
    },
  },
  {
    slug: 'rent-escalation-calculator',
    title: 'Rent Escalation Calculator',
    headline: 'Calculate Rent Escalation: Fixed % vs CPI',
    description:
      'Commercial leases typically include annual rent escalations. The two most common methods are fixed percentage increases (e.g., 3% per year) and CPI-linked increases (tied to the Consumer Price Index). This calculator compares both methods over a 5-year lease term.',
    formula: 'Fixed %: Year N Rent = Base Rent × (1 + Rate)^(N−1) | CPI: Year N Rent = Base Rent × (CPI_N / CPI_Base)',
    formulaNote:
      'CPI escalations are unpredictable - the table below uses an assumed CPI rate for illustration. Many leases cap CPI escalations at 4–5% annually to limit tenant exposure.',
    example: {
      inputs: {
        'Base Annual Rent': '$65,000 ($18.00/sq ft on 5,000 sq ft)',
        'Fixed Escalation Rate': '3% per year',
        'Assumed CPI Rate': '4% per year',
        'Lease Term': '5 years',
      },
      result: 'Fixed 3%: $101,313 in Year 5 | CPI 4%: $109,474 in Year 5',
      breakdown: [
        { label: 'Year 1', value: '$65,000', note: 'Base rent' },
        {
          label: 'Year 2',
          value: '$92,700 (fixed) / $93,600 (CPI)',
          note: '+3% / +4%',
        },
        {
          label: 'Year 3',
          value: '$95,481 (fixed) / $97,344 (CPI)',
          note: 'Compounding effect begins',
        },
        {
          label: 'Year 4',
          value: '$98,345 (fixed) / $101,238 (CPI)',
          note: 'CPI divergence growing',
        },
        {
          label: 'Year 5',
          value: '$101,313 (fixed) / $105,287 (CPI)',
          note: '12.6% vs 17.0% total increase',
        },
        {
          label: '5-Year Total Rent',
          value: '$477,839 (fixed) / $487,469 (CPI)',
          note: '$9,630 difference over term',
        },
      ],
    },
    relatedLinks: [
      { label: 'Rent Escalation Field', href: '/fields/fixed-escalation-rate' },
      { label: 'Escalation Clause Explained', href: '/clauses/escalation-clause' },
      { label: 'Best AI Lease Abstraction Tools 2026', href: '/resources/articles/best-ai-lease-abstraction-tools-2026' },
    ],
    faqs: [
      {
        question: 'Is a fixed escalation or CPI escalation better for tenants?',
        answer:
          'Fixed escalations provide certainty - tenants know exactly what rent will be in Year 5. CPI escalations are variable: they protect tenants when inflation is low but can result in higher rent than a fixed rate when inflation is high. Many tenants prefer fixed escalations or CPI with a cap (e.g., CPI not to exceed 3% annually).',
      },
      {
        question: 'What is a typical rent escalation rate for commercial leases?',
        answer:
          'The most common fixed escalation rate in US commercial leases is 3% per year, though rates from 2–4% are standard depending on market conditions and lease structure. NNN leases frequently use flat 3% annual bumps. Gross leases sometimes use CPI with a cap.',
      },
    ],
    metaTitle: 'Rent Escalation Calculator: Fixed % vs CPI Comparison',
    metaDescription:
      'Compare fixed percentage vs CPI rent escalations over a 5-year lease term. Side-by-side calculation table showing total rent difference.',
    fields: [
      {
        name: 'baseRent',
        label: 'Base Annual Rent',
        type: 'currency',
        placeholder: '90000',
        defaultValue: 90000,
        suffix: '/ year',
        min: 0,
        step: 1000,
      },
      {
        name: 'escalationRate',
        label: 'Annual Escalation Rate',
        type: 'percent',
        placeholder: '3',
        defaultValue: 3,
        suffix: '%',
        helpText: 'Fixed percentage increase per year',
        min: 0,
        max: 20,
        step: 0.25,
      },
      {
        name: 'termYears',
        label: 'Lease Term',
        type: 'years',
        placeholder: '5',
        defaultValue: 5,
        suffix: 'years',
        min: 1,
        max: 20,
        step: 1,
      },
    ],
    compute: (inputs) => {
      const { baseRent, escalationRate, termYears } = inputs
      if (!baseRent || baseRent <= 0 || !termYears || termYears <= 0) {
        return { result: 'Enter values above to calculate', breakdown: [] }
      }
      const fmt = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

      const rate = escalationRate ?? 0
      const years = Math.min(Math.round(termYears), 20)
      let totalRent = 0
      const breakdown: { label: string; value: string; note?: string }[] = []

      for (let year = 1; year <= years; year++) {
        const yearRent = baseRent * Math.pow(1 + rate / 100, year - 1)
        totalRent += yearRent
        breakdown.push({
          label: `Year ${year}`,
          value: `${fmt(yearRent)}/year`,
          note: year === 1 ? 'Base rent' : `+${rate.toFixed(1)}%/year compounding`,
        })
      }

      const finalYearRent = baseRent * Math.pow(1 + rate / 100, years - 1)
      const cumulativeIncreasePct = baseRent > 0 ? ((finalYearRent / baseRent - 1) * 100) : 0

      breakdown.push(
        { label: 'Total Rent Over Term', value: fmt(totalRent), note: `${years} years` },
        { label: 'Cumulative Increase', value: `${cumulativeIncreasePct.toFixed(1)}%`, note: `Year 1 to Year ${years}` },
      )

      return {
        result: `Year ${years} Rent: ${fmt(finalYearRent)}/year (${cumulativeIncreasePct.toFixed(1)}% increase)`,
        breakdown,
      }
    },
  },
  {
    slug: 'lease-abstraction-roi-calculator',
    title: 'Lease Abstraction ROI Calculator',
    headline: 'Calculate the ROI of AI Lease Abstraction',
    description:
      'AI lease abstraction costs $15 per lease and takes 5-15 minutes. Manual abstraction cost depends on staff rate, reviewer seniority, lease complexity, and QA depth, and typically takes 4-8 hours. This calculator shows the time and cost savings of switching from manual to AI-powered abstraction.',
    formula: 'Savings = (Manual Cost per Lease − AI Cost per Lease) × Number of Leases',
    formulaNote:
      'Does not include the cost of reviewer time for AI output validation (typically 15–30 minutes at your internal labor rate). Even with validation, AI abstraction is cheaper than manual at any volume above 1 lease per year.',
    example: {
      inputs: {
        'Number of Leases': '50 leases/year',
        'Manual Abstraction Cost': '$200/lease (paralegal labor)',
        'AI Abstraction Cost': '$15/lease (Lextract)',
        'Reviewer Time (AI validation)': '20 min/lease at $75/hour = $25/lease',
        'Manual Abstraction Time': '4 hours/lease',
      },
      result: '$8,000 annual savings; 200 hours of paralegal time recovered',
      breakdown: [
        { label: 'Annual Manual Cost', value: '$10,000/year', note: '50 x $200' },
        { label: 'Annual AI Cost (tool)', value: '$750/year', note: '50 x $15' },
        { label: 'Annual Review Cost', value: '$1,250/year', note: '50 x $25' },
        { label: 'Annual AI Total Cost', value: '$2,000/year', note: 'Tool + review labor' },
        { label: 'Annual Cost Savings', value: '$8,000/year', note: '$10,000 - $2,000' },
        { label: 'Annual Time Savings', value: '200 hours', note: '50 x 4 hours (no review)' },
        { label: 'AI Processing Time', value: '2.5 hours total', note: '50 x 3 min' },
        { label: 'Payback Period', value: 'Immediate', note: 'First lease saves $160' },
      ],
    },
    relatedLinks: [
      { label: 'Lease Abstraction Services vs AI Software', href: '/resources/articles/lease-abstraction-services-vs-ai-software' },
      { label: 'AI Lease Abstraction Accuracy', href: '/resources/articles/ai-lease-abstraction-accuracy-benchmarks' },
      { label: 'Upload Your First Lease', href: '/upload' },
    ],
    faqs: [
      {
        question: 'How much does professional lease abstraction cost?',
        answer:
          'Manual lease abstraction by US-based paralegals costs $150–$300 per lease. Offshore managed services cost $30–$75 per lease with 1–3 day turnaround. AI-powered abstraction (Lextract) costs $15 per lease with a 5–15 minute turnaround, though you should budget 15–30 minutes of internal reviewer time to validate confidence-flagged fields.',
      },
      {
        question: 'How do I calculate the ROI of lease abstraction software?',
        answer:
          'ROI = (Annual Manual Cost − Annual AI Cost − Annual Review Labor) / Annual AI Cost. At 50 leases per year: ($10,000 - $750 - $1,250) / $2,000 = 400% ROI. The savings increase at scale - at 200 leases/year, the cost savings exceed $32,000.',
      },
    ],
    metaTitle: 'Lease Abstraction ROI Calculator: Cost & Time Savings',
    metaDescription:
      'Calculate your ROI from switching to AI lease abstraction. Compare manual paralegal cost vs AI tool cost with worked example for 50-lease portfolios.',
    fields: [
      {
        name: 'leaseCount',
        label: 'Number of Leases Per Year',
        type: 'number',
        placeholder: '50',
        defaultValue: 50,
        suffix: 'leases',
        min: 1,
        max: 5000,
        step: 1,
      },
      {
        name: 'manualCost',
        label: 'Manual Abstraction Cost',
        type: 'currency',
        placeholder: '200',
        defaultValue: 200,
        suffix: '/ lease',
        helpText: 'Paralegal or service cost per lease',
        min: 0,
        step: 10,
      },
      {
        name: 'aiCost',
        label: 'AI Abstraction Cost',
        type: 'currency',
        placeholder: '15',
        defaultValue: 15,
        suffix: '/ lease',
        helpText: 'Lextract costs $15/lease',
        min: 0,
        step: 1,
      },
      {
        name: 'reviewTime',
        label: 'Review Time (AI output)',
        type: 'number',
        placeholder: '20',
        defaultValue: 20,
        suffix: 'min / lease',
        helpText: 'Time to review AI-generated output',
        min: 0,
        max: 240,
        step: 5,
      },
      {
        name: 'reviewerRate',
        label: 'Reviewer Hourly Rate',
        type: 'currency',
        placeholder: '75',
        defaultValue: 75,
        suffix: '/ hour',
        min: 0,
        step: 5,
      },
    ],
    compute: (inputs) => {
      const { leaseCount, manualCost, aiCost, reviewTime, reviewerRate } = inputs
      if (!leaseCount || leaseCount <= 0) {
        return { result: 'Enter values above to calculate', breakdown: [] }
      }
      const fmt = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

      const reviewCostPerLease = ((reviewTime ?? 0) / 60) * (reviewerRate ?? 0)
      const totalManualCost = leaseCount * (manualCost ?? 0)
      const totalAiCost = leaseCount * (aiCost ?? 0)
      const totalReviewCost = leaseCount * reviewCostPerLease
      const totalAiWithReview = totalAiCost + totalReviewCost
      const annualSavings = totalManualCost - totalAiWithReview
      const roiPct = totalAiWithReview > 0 ? (annualSavings / totalAiWithReview) * 100 : 0
      const timeSaved = leaseCount * 4

      return {
        result: `Save ${fmt(annualSavings)}/year - ${roiPct.toFixed(0)}% ROI`,
        breakdown: [
          { label: 'Annual Manual Cost', value: fmt(totalManualCost), note: `${leaseCount} × ${fmt(manualCost ?? 0)}` },
          { label: 'Annual AI Tool Cost', value: fmt(totalAiCost), note: `${leaseCount} × ${fmt(aiCost ?? 0)}` },
          {
            label: 'Annual Review Labor',
            value: fmt(totalReviewCost),
            note: `${leaseCount} × ${((reviewTime ?? 0) / 60).toFixed(2)}h × ${fmt(reviewerRate ?? 0)}/hr`,
          },
          { label: 'Total AI Cost (tool + review)', value: fmt(totalAiWithReview), note: 'Tool + review labor' },
          { label: 'Annual Savings', value: fmt(annualSavings), note: `${fmt(totalManualCost)} − ${fmt(totalAiWithReview)}` },
          { label: 'ROI', value: `${roiPct.toFixed(0)}%`, note: 'Return on AI tool investment' },
          { label: 'Annual Time Saved', value: `${timeSaved.toLocaleString()} hours`, note: 'Estimated at 4 hrs/lease manual' },
        ],
      }
    },
  },
  {
    slug: 'pro-rata-share-calculator',
    title: 'Pro-Rata Share Calculator',
    headline: 'Calculate Tenant Pro-Rata Share for CAM and Expenses',
    description:
      'Pro-rata share determines what percentage of shared building expenses a tenant is responsible for. It is calculated by dividing the tenant\'s leased square footage by the total rentable area of the building. Most NNN and gross leases use pro-rata share to allocate operating expenses. Verify your landlord\'s pro-rata share calculation with <a href="https://www.camaudit.io" target="_blank" rel="noopener noreferrer">CAMAudit.io</a>.',
    formula: 'Pro-Rata Share = Tenant Leased Area ÷ Total Rentable Building Area',
    formulaNote:
      'Some leases use "occupied area" or "leasable area" instead of "rentable area." Confirm which denominator your lease uses - it significantly affects the calculation, especially in buildings with vacant space.',
    example: {
      inputs: {
        'Tenant Leased Area': '4,500 sq ft',
        'Total Rentable Building Area': '65,000 sq ft',
        'Anchor Tenant Exclusion': '20,000 sq ft (excluded from CAM pool)',
        'Denominator Per Lease': '45,000 sq ft (excluding anchor)',
      },
      result: '10.00% pro-rata share (using denominator excluding anchor)',
      breakdown: [
        {
          label: 'Standard Pro-Rata (full building)',
          value: '6.92%',
          note: '4,500 ÷ 65,000',
        },
        {
          label: 'Adjusted Pro-Rata (excluding anchor)',
          value: '10.00%',
          note: '4,500 ÷ 45,000',
        },
        {
          label: 'Annual CAM at $4.00/sq ft total',
          value: '$18,000 (standard) / $26,000 (adjusted)',
          note: 'Difference = $8,000/year',
        },
        {
          label: 'Impact Over 5-Year Term',
          value: '$40,000 difference',
          note: 'Negotiate denominator carefully',
        },
      ],
    },
    relatedLinks: [
      { label: 'Pro-Rata Share Field', href: '/fields/pro-rata-share' },
      { label: 'CAM Charges Explained', href: '/glossary/cam-charges' },
      { label: 'NNN Lease Type Guide', href: '/lease-types/nnn-lease' },
    ],
    faqs: [
      {
        question: 'What is pro-rata share in a commercial lease?',
        answer:
          'Pro-rata share is the percentage of shared building expenses (such as CAM, property taxes, and insurance) that a tenant is responsible for. It is calculated as the tenant\'s leased area divided by the total rentable area of the building. A tenant leasing 5,000 sq ft in a 50,000 sq ft building has a 10% pro-rata share.',
      },
      {
        question: 'What denominator should be used for pro-rata share?',
        answer:
          'Leases specify whether pro-rata share is calculated against total rentable area, occupied area, leasable area, or a modified denominator that excludes anchor tenants. The denominator choice significantly affects the calculation. Tenants should negotiate to use total rentable area (not occupied area) so their share does not increase during high-vacancy periods.',
      },
    ],
    metaTitle: 'Pro-Rata Share Calculator: Formula and CAM Allocation Example',
    metaDescription:
      'Calculate tenant pro-rata share for CAM and operating expense allocation. Formula: tenant area ÷ building rentable area. Includes denominator impact example.',
    fields: [
      {
        name: 'tenantArea',
        label: 'Tenant Leased Area',
        type: 'sqft',
        placeholder: '4500',
        defaultValue: 4500,
        suffix: 'sq ft',
        min: 1,
        step: 100,
      },
      {
        name: 'buildingArea',
        label: 'Total Rentable Building Area',
        type: 'sqft',
        placeholder: '65000',
        defaultValue: 65000,
        suffix: 'sq ft',
        helpText: 'Total rentable area of the building per lease',
        min: 1,
        step: 100,
      },
      {
        name: 'annualCamTotal',
        label: 'Annual Building CAM Expenses',
        type: 'currency',
        placeholder: '200000',
        defaultValue: 200000,
        suffix: '/ year',
        helpText: 'Total building CAM for the year',
        min: 0,
        step: 1000,
      },
    ],
    compute: (inputs) => {
      const { tenantArea, buildingArea, annualCamTotal } = inputs
      if (!tenantArea || tenantArea <= 0 || !buildingArea || buildingArea <= 0) {
        return { result: 'Enter values above to calculate', breakdown: [] }
      }
      const fmt = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      const fmtDec = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

      const proRata = tenantArea / buildingArea
      const proRataPct = proRata * 100
      const cam = annualCamTotal ?? 0
      const tenantAnnualCam = cam * proRata
      const tenantMonthlyCam = tenantAnnualCam / 12

      return {
        result: `${proRataPct.toFixed(4)}% pro-rata share - ${fmt(tenantAnnualCam)}/year CAM responsibility`,
        breakdown: [
          {
            label: 'Pro-Rata Share',
            value: `${proRataPct.toFixed(4)}%`,
            note: `${tenantArea.toLocaleString()} ÷ ${buildingArea.toLocaleString()}`,
          },
          {
            label: 'Annual CAM Responsibility',
            value: fmt(tenantAnnualCam),
            note: `${fmt(cam)} × ${proRataPct.toFixed(4)}%`,
          },
          {
            label: 'Monthly CAM Payment',
            value: fmtDec(tenantMonthlyCam),
            note: '÷ 12',
          },
          {
            label: 'Your Share of Every $1 of CAM',
            value: `$${proRata.toFixed(4)}`,
            note: 'Per dollar of building expense',
          },
        ],
      }
    },
  },
  {
    slug: 'effective-rent-calculator',
    title: 'Effective Rent Calculator',
    headline: 'Calculate Effective Net Rent After Concessions',
    description:
      'Effective rent adjusts the face rent (stated monthly rent) to account for landlord concessions - free rent periods and tenant improvement (TI) allowances. Comparing effective rent across different lease proposals gives a true apples-to-apples comparison.',
    formula: 'Effective Annual Rent = (Total Rent over Term − TI Allowance − Free Rent Value) ÷ Lease Term in Years',
    formulaNote:
      'TI allowance reduces the landlord\'s effective income. Free rent periods reduce the total rent collected. Both should be factored into effective rent when comparing competing lease proposals.',
    example: {
      inputs: {
        'Face Monthly Rent': '$8,500/month ($102,000/year)',
        'Lease Term': '5 years',
        'Free Rent Period': '3 months',
        'TI Allowance': '$75,000',
      },
      result: 'Effective Annual Rent = $73,500 ($14.70/sq ft on 5,000 sq ft)',
      breakdown: [
        {
          label: 'Total Face Rent (5 years)',
          value: '$510,000',
          note: '$102,000 × 5',
        },
        {
          label: 'Less: Free Rent Value',
          value: '−$25,500',
          note: '$8,500 × 3 months',
        },
        {
          label: 'Less: TI Allowance',
          value: '−$75,000',
          note: 'Landlord concession',
        },
        {
          label: 'Net Rent over Term',
          value: '$409,500',
          note: 'Landlord\'s actual income',
        },
        {
          label: 'Effective Annual Rent',
          value: '$81,900/year',
          note: '$409,500 ÷ 5',
        },
        {
          label: 'Effective Rate per sq ft',
          value: '$16.38/sq ft/year',
          note: 'vs $15.40 face rate',
        },
        {
          label: 'Discount from Face Rate',
          value: '−19.7%',
          note: 'Effective concession value',
        },
      ],
    },
    relatedLinks: [
      { label: 'Tenant Improvement Allowance Field', href: '/fields/ti-allowance-per-rsf' },
      { label: 'Rent Abatement Glossary Term', href: '/glossary/rent-abatement' },
      { label: 'Best AI Lease Abstraction Tools 2026', href: '/resources/articles/best-ai-lease-abstraction-tools-2026' },
    ],
    faqs: [
      {
        question: 'What is effective rent in a commercial lease?',
        answer:
          'Effective rent is the true economic cost of a lease after accounting for landlord concessions such as free rent periods and tenant improvement allowances. A lease with a $10,000/month face rent and 6 months free rent on a 3-year term has an effective monthly rent of $8,333, reflecting the actual cost per month of occupancy over the full term.',
      },
      {
        question: 'How do I compare two lease proposals using effective rent?',
        answer:
          'Convert both proposals to effective annual rent per square foot: (Total rent − free rent value − TI allowance) ÷ lease term ÷ leased square footage. A proposal with a higher face rent but more concessions may have lower effective rent than a proposal with a lower face rent and fewer concessions. Always compare effective rent, not face rent.',
      },
    ],
    metaTitle: 'Effective Rent Calculator: Net Rent After TI Allowance & Free Rent',
    metaDescription:
      'Calculate effective net rent after free rent and TI allowance concessions. Formula and worked 5-year example for commercial lease comparison.',
    fields: [
      {
        name: 'monthlyRent',
        label: 'Face Monthly Rent',
        type: 'currency',
        placeholder: '8500',
        defaultValue: 8500,
        suffix: '/ month',
        helpText: 'Stated monthly rent before any concessions',
        min: 0,
        step: 100,
      },
      {
        name: 'termYears',
        label: 'Lease Term',
        type: 'years',
        placeholder: '5',
        defaultValue: 5,
        suffix: 'years',
        min: 1,
        max: 30,
        step: 1,
      },
      {
        name: 'freeRentMonths',
        label: 'Free Rent Period',
        type: 'number',
        placeholder: '3',
        defaultValue: 3,
        suffix: 'months',
        helpText: 'Number of months with no rent due',
        min: 0,
        step: 1,
      },
      {
        name: 'tiAllowance',
        label: 'TI Allowance',
        type: 'currency',
        placeholder: '75000',
        defaultValue: 75000,
        suffix: 'total',
        helpText: 'Tenant improvement allowance from landlord',
        min: 0,
        step: 1000,
      },
    ],
    compute: (inputs) => {
      const { monthlyRent, termYears, freeRentMonths, tiAllowance } = inputs
      if (!monthlyRent || monthlyRent <= 0 || !termYears || termYears <= 0) {
        return { result: 'Enter values above to calculate', breakdown: [] }
      }
      const totalMonths = termYears * 12
      const totalFaceRent = monthlyRent * totalMonths
      const freeRentValue = monthlyRent * (freeRentMonths ?? 0)
      const ti = tiAllowance ?? 0
      const netRentOverTerm = totalFaceRent - freeRentValue - ti
      const effectiveAnnual = netRentOverTerm / termYears
      const effectiveMonthly = effectiveAnnual / 12

      const fmt = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      const fmtDec = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const faceAnnual = monthlyRent * 12
      const discountPct = faceAnnual > 0 ? ((faceAnnual - effectiveAnnual) / faceAnnual) * 100 : 0

      return {
        result: `${fmt(effectiveAnnual)}/year effective rent (${fmtDec(effectiveMonthly)}/month)`,
        breakdown: [
          { label: `Total Face Rent (${termYears} years)`, value: fmt(totalFaceRent), note: `${fmt(monthlyRent)} × ${totalMonths} months` },
          { label: 'Less: Free Rent Value', value: `−${fmt(freeRentValue)}`, note: `${fmt(monthlyRent)} × ${freeRentMonths ?? 0} months` },
          { label: 'Less: TI Allowance', value: `−${fmt(ti)}`, note: 'Landlord concession' },
          { label: 'Net Rent over Term', value: fmt(netRentOverTerm), note: "Landlord's actual income" },
          { label: 'Effective Annual Rent', value: `${fmt(effectiveAnnual)}/year`, note: `÷ ${termYears} years` },
          { label: 'Effective Monthly Rent', value: `${fmtDec(effectiveMonthly)}/month`, note: '÷ 12' },
          { label: 'Discount from Face Rate', value: `−${discountPct.toFixed(1)}%`, note: 'Effective concession value' },
        ],
      }
    },
  },
  {
    slug: 'commercial-lease-cost-calculator',
    title: 'Commercial Lease Cost Calculator',
    headline: 'Calculate Your Total Commercial Lease Cost',
    description:
      'A comprehensive calculator for total commercial lease occupancy cost. Enter your base rent, lease type charges, and square footage to see your true annual and monthly cost.',
    formula: 'Total Annual Cost = (Base Rent + Operating Expenses + CAM) × Square Footage',
    formulaNote:
      'For gross leases, operating expenses are included in base rent - set NNN charges to zero. For NNN/modified gross leases, add each pass-through separately.',
    example: {
      inputs: {
        'Leased Square Footage': '3,500 sq ft',
        'Base Rent': '$24.00/sq ft/year',
        'NNN / Operating Expense Pass-Throughs': '$8.50/sq ft/year',
        'Monthly Parking / Other Charges': '$0',
      },
      result: '$113,750/year ($9,479/month)',
      breakdown: [
        { label: 'Base Rent', value: '$84,000/year', note: '3,500 × $24.00/sq ft' },
        { label: 'NNN / Operating Expenses', value: '$29,750/year', note: '3,500 × $8.50/sq ft' },
        { label: 'Parking / Other', value: '$0/year', note: '$0/mo × 12' },
        { label: 'Total Annual Cost', value: '$113,750/year', note: 'Full occupancy cost' },
        { label: 'Monthly Payment', value: '$9,479/month', note: '÷ 12' },
        { label: 'All-In Rate', value: '$32.50/sq ft/year', note: 'Total ÷ sq ft' },
      ],
    },
    relatedLinks: [
      { label: 'NNN Lease Cost Calculator', href: '/calculators/nnn-lease-cost-calculator' },
      { label: 'CAM Charges Explained', href: '/glossary/cam-charges' },
      { label: 'Commercial Lease Types', href: '/lease-types' },
    ],
    faqs: [
      {
        question: 'What is the average commercial rent per square foot?',
        answer:
          'It varies significantly by market, building class, and lease type. Class A office in major markets runs $35–$80+/sq ft/year all-in. Retail strip center space typically runs $18–$35/sq ft base rent with $6–$12/sq ft NNN charges. Industrial/warehouse space ranges from $8–$15/sq ft all-in depending on the market.',
      },
      {
        question: 'What is the difference between NNN and gross lease costs?',
        answer:
          'In a NNN lease, your rent is split: you pay base rent plus separate operating expense pass-throughs (taxes, insurance, CAM). In a gross lease, all operating expenses are bundled into a single rent figure. NNN leases tend to have lower base rents but total occupancy cost is often similar. Use this calculator with NNN set to zero for gross lease comparisons.',
      },
    ],
    metaTitle: 'Commercial Lease Cost Calculator: True Annual Occupancy Cost',
    metaDescription:
      'Calculate total commercial lease cost. Enter base rent, NNN charges, and square footage to find your true annual and monthly occupancy cost.',
    fields: [
      {
        name: 'sqft',
        label: 'Leased Square Footage',
        type: 'sqft',
        placeholder: '3500',
        defaultValue: 3500,
        suffix: 'sq ft',
        min: 1,
        step: 100,
      },
      {
        name: 'baseRentPsf',
        label: 'Base Rent',
        type: 'currency',
        placeholder: '24',
        defaultValue: 24,
        suffix: '/ sq ft / year',
        min: 0,
        step: 0.25,
      },
      {
        name: 'nnnChargesPsf',
        label: 'NNN / Operating Expense Pass-Throughs',
        type: 'currency',
        placeholder: '8',
        defaultValue: 8,
        suffix: '/ sq ft / year',
        helpText: 'Property taxes + insurance + CAM. Enter 0 for gross leases.',
        min: 0,
        step: 0.25,
      },
      {
        name: 'monthlyParking',
        label: 'Monthly Parking / Other Charges',
        type: 'currency',
        placeholder: '0',
        defaultValue: 0,
        suffix: '/ month',
        helpText: 'Optional: parking, storage, antenna fees, etc.',
        min: 0,
        step: 50,
      },
    ],
    compute: (inputs) => {
      const { sqft, baseRentPsf, nnnChargesPsf, monthlyParking } = inputs
      if (!sqft || sqft <= 0) {
        return { result: 'Enter values above to calculate', breakdown: [] }
      }
      const fmt = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      const fmtDec = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

      const annualBase = sqft * (baseRentPsf ?? 0)
      const annualNNN = sqft * (nnnChargesPsf ?? 0)
      const annualParking = (monthlyParking ?? 0) * 12
      const totalAnnual = annualBase + annualNNN + annualParking
      const monthly = totalAnnual / 12
      const effectiveRate = sqft > 0 ? totalAnnual / sqft : 0

      return {
        result: `${fmt(totalAnnual)}/year (${fmtDec(monthly)}/month)`,
        breakdown: [
          { label: 'Base Rent', value: fmt(annualBase), note: `${sqft.toLocaleString()} × ${fmtDec(baseRentPsf ?? 0)}/sq ft` },
          { label: 'NNN / Operating Expenses', value: fmt(annualNNN), note: `${sqft.toLocaleString()} × ${fmtDec(nnnChargesPsf ?? 0)}/sq ft` },
          { label: 'Parking / Other', value: fmt(annualParking), note: `${fmt(monthlyParking ?? 0)}/mo × 12` },
          { label: 'Total Annual Cost', value: fmt(totalAnnual), note: 'Full occupancy cost' },
          { label: 'Monthly Payment', value: fmtDec(monthly), note: '÷ 12' },
          { label: 'All-In Rate', value: `${fmtDec(effectiveRate)}/sq ft/year`, note: 'Total ÷ sq ft' },
        ],
      }
    },
  },
  {
    slug: 'percentage-rent-calculator',
    title: 'Percentage Rent Calculator',
    headline: 'Calculate Percentage Rent for Retail Leases',
    description:
      'Percentage rent clauses require retail tenants to pay additional rent once their sales exceed a "natural breakpoint." This calculator shows whether you owe percentage rent and how much.',
    formula: 'Percentage Rent = (Gross Sales − Natural Breakpoint) × Overage Rate',
    formulaNote:
      'The natural breakpoint is typically calculated as base rent ÷ percentage rent rate. If your lease specifies an artificial breakpoint, use that figure instead.',
    example: {
      inputs: {
        'Gross Annual Sales': '$1,500,000/year',
        'Annual Base Rent': '$60,000/year',
        'Percentage Rent Rate': '5%',
        'Artificial Breakpoint': '$0 (use natural breakpoint)',
      },
      result: '$15,000/year percentage rent - $75,000/year total rent',
      breakdown: [
        { label: 'Gross Annual Sales', value: '$1,500,000' },
        { label: 'Breakpoint (Natural)', value: '$1,200,000', note: '$60,000 ÷ 5%' },
        { label: 'Breakpoint Used', value: '$1,200,000' },
        { label: 'Sales Above Breakpoint', value: '$300,000', note: '$1,500,000 − $1,200,000' },
        { label: 'Percentage Rent', value: '$15,000', note: '$300,000 × 5%' },
        { label: 'Base Rent', value: '$60,000' },
        { label: 'Total Annual Rent', value: '$75,000', note: 'Base + percentage' },
        { label: 'Effective Rent Rate', value: '5.00% of gross sales' },
      ],
    },
    relatedLinks: [
      { label: 'Percentage Lease Guide', href: '/lease-types/percentage-lease' },
      { label: 'Retail Lease Abstraction', href: '/industries/retail-lease-abstraction' },
      { label: 'NNN Lease Type Guide', href: '/lease-types/nnn-lease' },
    ],
    faqs: [
      {
        question: 'What is a natural breakpoint in percentage rent?',
        answer:
          'The natural breakpoint is the sales volume at which a tenant\'s percentage rent would exactly equal their base rent. It\'s calculated as base rent ÷ percentage rate. For example, with $60,000/year base rent and a 5% percentage rate, the natural breakpoint is $1,200,000 in annual sales. Below this, no percentage rent is owed.',
      },
      {
        question: 'What is a typical percentage rent rate for retail?',
        answer:
          'Percentage rent rates typically range from 5–8% of gross sales, depending on the retail category. Restaurants commonly see 5–6%, while specialty retail may see 6–8%. High-volume categories like grocery or electronics often negotiate lower rates (3–5%). The rate is always applied only to sales above the breakpoint.',
      },
    ],
    metaTitle: 'Percentage Rent Calculator: Natural Breakpoint & Overage Formula',
    metaDescription:
      'Calculate percentage rent for retail leases. Formula: (gross sales − natural breakpoint) × overage rate. Includes natural vs artificial breakpoint comparison.',
    fields: [
      {
        name: 'grossSales',
        label: 'Gross Annual Sales',
        type: 'currency',
        placeholder: '1200000',
        defaultValue: 1200000,
        suffix: '/ year',
        min: 0,
        step: 10000,
      },
      {
        name: 'annualBaseRent',
        label: 'Annual Base Rent',
        type: 'currency',
        placeholder: '60000',
        defaultValue: 60000,
        suffix: '/ year',
        min: 0,
        step: 1000,
      },
      {
        name: 'percentageRate',
        label: 'Percentage Rent Rate',
        type: 'percent',
        placeholder: '5',
        defaultValue: 5,
        suffix: '%',
        helpText: 'Typically 5–8% for retail. Found in the percentage rent clause.',
        min: 0.1,
        max: 25,
        step: 0.5,
      },
      {
        name: 'artificialBreakpoint',
        label: 'Artificial Breakpoint (optional)',
        type: 'currency',
        placeholder: '0',
        defaultValue: 0,
        suffix: '/ year',
        helpText: 'Leave 0 to use the natural breakpoint (base rent ÷ rate)',
        min: 0,
        step: 10000,
      },
    ],
    compute: (inputs) => {
      const { grossSales, annualBaseRent, percentageRate, artificialBreakpoint } = inputs
      if (!grossSales || grossSales <= 0 || !annualBaseRent || annualBaseRent <= 0) {
        return { result: 'Enter values above to calculate', breakdown: [] }
      }
      const fmt = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

      const rate = percentageRate ?? 0
      const naturalBreakpoint = rate > 0 ? annualBaseRent / (rate / 100) : 0
      const artBp = artificialBreakpoint ?? 0
      const breakpoint = artBp > 0 ? artBp : naturalBreakpoint
      const overage = Math.max(0, grossSales - breakpoint)
      const percentageRent = overage * (rate / 100)
      const totalRent = annualBaseRent + percentageRent
      const effectiveRate = grossSales > 0 ? (totalRent / grossSales) * 100 : 0

      const resultStr = overage <= 0
        ? `No percentage rent owed - sales below breakpoint by ${fmt(breakpoint - grossSales)}`
        : `${fmt(percentageRent)}/year percentage rent - ${fmt(totalRent)}/year total rent`

      const breakdown: { label: string; value: string; note?: string }[] = [
        { label: 'Gross Annual Sales', value: fmt(grossSales) },
        { label: 'Breakpoint (Natural)', value: fmt(naturalBreakpoint), note: `${fmt(annualBaseRent)} ÷ ${rate}%` },
      ]

      if (artBp > 0) {
        breakdown.push({ label: 'Breakpoint (Artificial)', value: fmt(artBp), note: 'Per lease terms' })
      }

      breakdown.push(
        { label: 'Breakpoint Used', value: fmt(breakpoint) },
        {
          label: 'Sales Above Breakpoint',
          value: fmt(overage),
          note: overage <= 0 ? 'No overage' : `${fmt(grossSales)} − ${fmt(breakpoint)}`,
        },
        { label: 'Percentage Rent', value: fmt(percentageRent), note: `${fmt(overage)} × ${rate}%` },
        { label: 'Base Rent', value: fmt(annualBaseRent) },
        { label: 'Total Annual Rent', value: fmt(totalRent), note: 'Base + percentage' },
        { label: 'Effective Rent Rate', value: `${effectiveRate.toFixed(2)}% of gross sales` },
      )

      return { result: resultStr, breakdown }
    },
  },
  {
    slug: 'rent-per-sqft-calculator',
    title: 'Rent Per Square Foot Calculator',
    headline: 'Calculate Commercial Rent Per Square Foot',
    description:
      'Convert between total rent and per-square-foot rates for commercial leases. Whether you have a total annual rent figure or a per-square-foot rate, this calculator converts between both and shows your monthly cost.',
    formula: 'Rent Per Sq Ft = Total Annual Rent ÷ Leasable Square Footage',
    formulaNote:
      'Commercial rents are almost always quoted as annual figures per square foot, then multiplied by the tenant\'s square footage. Confirm whether quoted rates are annual or monthly - annual is standard.',
    example: {
      inputs: {
        'Leased Square Footage': '2,500 sq ft',
        'Total Annual Rent (optional)': '$0 (not entered)',
        'Rent Per Sq Ft / Year (optional)': '$22.00/sq ft/year',
      },
      result: '$22.00/sq ft/year - $55,000/year ($4,583/month)',
      breakdown: [
        { label: 'Annual Rent Per Sq Ft', value: '$22.00/sq ft/year' },
        { label: 'Total Annual Rent', value: '$55,000', note: '2,500 sq ft × $22.00' },
        { label: 'Monthly Rent', value: '$4,583', note: '÷ 12' },
        { label: 'Daily Rent', value: '$150.68/day', note: '÷ 365' },
        { label: '5-Year Total', value: '$275,000', note: 'Assuming flat rent, no escalations' },
      ],
    },
    relatedLinks: [
      { label: 'Commercial Lease Cost Calculator', href: '/calculators/commercial-lease-cost-calculator' },
      { label: 'NNN Lease Cost Calculator', href: '/calculators/nnn-lease-cost-calculator' },
      { label: 'Effective Rent Calculator', href: '/calculators/effective-rent-calculator' },
    ],
    faqs: [
      {
        question: 'Are commercial rents quoted per year or per month?',
        answer:
          'Commercial rents in the US are almost universally quoted as annual figures per square foot - for example, "$24.00/sq ft/year." To find your monthly rent, multiply your square footage by the annual rate and divide by 12. Some landlords quote monthly rates (divide annual rate by 12, so "$2.00/sq ft/month" = "$24.00/sq ft/year"). Always confirm which convention is being used.',
      },
      {
        question: 'What is a good rent per square foot for commercial space?',
        answer:
          'It depends heavily on the market, building class, and lease type. Class A urban office space typically runs $40–$80+/sq ft/year. Suburban office runs $15–$40/sq ft. Retail strip centers run $18–$35/sq ft base rent. Flex/industrial space runs $8–$18/sq ft. These are base rent figures - NNN pass-throughs typically add $6–$15/sq ft on top.',
      },
    ],
    metaTitle: 'Rent Per Square Foot Calculator: Convert Annual, Monthly, Total',
    metaDescription:
      'Calculate commercial rent per square foot. Convert between total annual rent and per-sq-ft rates. Shows monthly, daily, and 5-year totals instantly.',
    fields: [
      {
        name: 'sqft',
        label: 'Leased Square Footage',
        type: 'sqft',
        placeholder: '2500',
        defaultValue: 2500,
        suffix: 'sq ft',
        min: 1,
        step: 100,
      },
      {
        name: 'annualRentTotal',
        label: 'Total Annual Rent (optional)',
        type: 'currency',
        placeholder: '0',
        defaultValue: 0,
        suffix: '/ year',
        helpText: 'Enter either this OR the per-sq-ft rate below',
        min: 0,
        step: 1000,
      },
      {
        name: 'rentPsf',
        label: 'Rent Per Sq Ft / Year (optional)',
        type: 'currency',
        placeholder: '22',
        defaultValue: 22,
        suffix: '/ sq ft / year',
        helpText: 'Annual rent rate per square foot',
        min: 0,
        step: 0.25,
      },
    ],
    compute: (inputs) => {
      const { sqft, annualRentTotal, rentPsf } = inputs
      if (!sqft || sqft <= 0) {
        return { result: 'Enter values above to calculate', breakdown: [] }
      }
      const fmtDec = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const fmt = (n: number) =>
        n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

      let derivedPsf: number
      let derivedTotal: number

      if ((annualRentTotal ?? 0) > 0) {
        derivedTotal = annualRentTotal ?? 0
        derivedPsf = derivedTotal / sqft
      } else if ((rentPsf ?? 0) > 0) {
        derivedPsf = rentPsf ?? 0
        derivedTotal = derivedPsf * sqft
      } else {
        return { result: 'Enter values above to calculate', breakdown: [] }
      }

      const monthly = derivedTotal / 12
      const daily = derivedTotal / 365

      return {
        result: `${fmtDec(derivedPsf)}/sq ft/year - ${fmt(derivedTotal)}/year (${fmtDec(monthly)}/month)`,
        breakdown: [
          { label: 'Annual Rent Per Sq Ft', value: `${fmtDec(derivedPsf)}/sq ft/year` },
          { label: 'Total Annual Rent', value: fmt(derivedTotal), note: `${sqft.toLocaleString()} sq ft × ${fmtDec(derivedPsf)}` },
          { label: 'Monthly Rent', value: fmtDec(monthly), note: '÷ 12' },
          { label: 'Daily Rent', value: `$${daily.toFixed(2)}/day`, note: '÷ 365' },
          { label: '5-Year Total', value: fmt(derivedTotal * 5), note: 'Assuming flat rent, no escalations' },
        ],
      }
    },
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

export function getCalculatorBySlug(slug: string): CalculatorEntry | undefined {
  return CALCULATORS.find((c) => c.slug === slug)
}

export function getAllCalculatorSlugs(): string[] {
  return CALCULATORS.map((c) => c.slug)
}
