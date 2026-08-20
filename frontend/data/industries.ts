// ─── Industry Types ─────────────────────────────────────────────────

import {
  filterRetainedSeoItems,
  getExplicitSeoRedirect,
  isRetainedSeoSlug,
} from '@/lib/seo-inventory'

export interface IndustryData {
  name: string
  slug: string
  shortName: string
  overview: string
  dominantLeaseTypes: string[]
  avgLeaseTermYears: string
  criticalFields: string[]
  commonRedFlags: string[]
  industrySpecificConsiderations: string[]
  sampleExtractionNote: string
  relatedIndustries: string[]
  faqs: { question: string; answer: string }[]
  metaTitle: string
  metaDescription: string
}

// ─── Industry Data ──────────────────────────────────────────────────

export const INDUSTRIES: IndustryData[] = [
  {
    name: 'Retail Lease Abstraction',
    slug: 'retail-lease-abstraction',
    shortName: 'Retail',
    overview:
      'Retail leases are among the most complex commercial lease structures, frequently incorporating percentage rent provisions, co-tenancy protections, and exclusive use rights that directly tie financial performance to lease terms. NNN leases dominate strip centers, power centers, and freestanding pads, while inline mall tenants often negotiate modified gross structures. The interplay between CAM caps, percentage rent breakpoints, and exclusivity clauses makes retail lease abstraction a high-stakes exercise where missed provisions translate directly to lost revenue or competitive exposure.',
    dominantLeaseTypes: ['NNN', 'Modified Gross', 'Percentage Lease'],
    avgLeaseTermYears: '5–25 years (5–15 for inline; 10–25 for anchor/freestanding)',
    criticalFields: [
      'cam-charges',
      'cam-cap-percentage',
      'exclusive-use-clause',
      'cotenancy-clause',
      'percentage-rent-rate',
      'percentage-rent-breakpoint',
      'gross-sales-reporting',
      'permitted-use',
      'renewal-options',
    ],
    commonRedFlags: [
      'missing-cam-cap',
      'no-audit-rights',
      'gross-sales-underreporting-risk',
      'missing-gross-sales-reporting',
      'missing-termination-option',
      'missing-assignment-rights',
    ],
    industrySpecificConsiderations: [
      'Co-tenancy clauses allow rent reduction or lease termination if anchor tenants vacate - the triggering threshold and remedy must be clearly defined and abstracted.',
      'Exclusive use provisions prohibit the landlord from leasing nearby space to competitors; vague permitted-use language can inadvertently limit or expand these protections.',
      'Percentage rent breakpoints (natural or artificial) determine when gross sales trigger additional rent obligations; incorrect abstraction of the breakpoint amount leads to systematic billing errors.',
      'Kick-out clauses give tenants the right to terminate if sales targets are not met - these are time-sensitive options that must be tracked against actual sales reporting deadlines.',
      'Dark store provisions in big-box leases address obligations when a tenant vacates the space but continues paying rent; these have significant CAM and co-tenancy ripple effects on other tenants.',
    ],
    sampleExtractionNote:
      'Lextract extracts percentage rent rates, natural and artificial breakpoints, exclusive use scope, co-tenancy trigger thresholds, CAM cap type and percentage, and gross sales reporting frequency from retail leases in a single pass.',
    relatedIndustries: [
      'restaurant-lease-abstraction',
      'mixed-use-lease-abstraction',
      'industrial-lease-abstraction',
    ],
    faqs: [
      {
        question: 'What makes retail lease abstraction different from office or industrial?',
        answer:
          'Retail leases introduce percentage rent provisions, co-tenancy clauses, exclusive use rights, and gross sales reporting obligations that are rarely found in office or industrial leases. These provisions require extracting both financial terms and operational triggers - for example, the specific sales threshold that activates percentage rent, or the co-tenancy anchor names whose departure gives the tenant a remedy.',
      },
      {
        question: 'How does Lextract handle percentage rent breakpoints?',
        answer:
          'Lextract extracts both natural breakpoints (base rent divided by percentage rate) and artificial breakpoints (landlord-set thresholds) along with the applicable percentage rate. The extraction also identifies whether the breakpoint is calculated annually, quarterly, or on another basis, which affects how percentage rent obligations accrue.',
      },
      {
        question: 'Can Lextract identify missing co-tenancy protections?',
        answer:
          'Yes. Lextract flags leases where co-tenancy provisions are absent when the lease type and context suggest they should be present. If a co-tenancy clause exists, Lextract extracts the trigger condition (e.g., anchor tenant name and square footage threshold), the remedy period, and the available remedies such as rent reduction or termination.',
      },
      {
        question: 'Does Lextract extract CAM caps for retail NNN leases?',
        answer:
          'Yes. Lextract extracts the CAM cap percentage, cap type (cumulative or annual), base year for the cap calculation, and any excluded expense categories that fall outside the cap. Missing CAM caps on NNN retail leases are flagged automatically as a high-severity red flag.',
      },
    ],
    metaTitle: 'Retail Lease Abstraction Guide',
    metaDescription:
      'Abstract retail leases with AI. Extract CAM caps, co-tenancy clauses, percentage rent breakpoints, and exclusive use provisions from NNN and percentage leases.',
  },
  {
    name: 'Office Lease Abstraction',
    slug: 'office-lease-abstraction',
    shortName: 'Office',
    overview:
      'Office leases typically operate under full service gross, modified gross, or gross structures where the landlord bundles operating expenses into base rent or recovers them through expense stops and escalation provisions. Base year stops - which establish the landlord\'s maximum expense contribution - are often the most financially consequential clause in an office lease, as they shift all expense growth above the base year amount to the tenant. Tenant improvement allowances, after-hours HVAC charges, and parking ratios are also heavily negotiated and must be precisely abstracted to avoid downstream billing disputes.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross', 'Gross'],
    avgLeaseTermYears: '3–10 years',
    criticalFields: [
      'base-year-expense-stop',
      'tenant-improvement-allowance',
      'operating-expense-escalation',
      'parking-spaces-count',
      'after-hours-hvac',
      'holdover-provisions',
      'renewal-options',
      'termination-options',
    ],
    commonRedFlags: [
      'no-audit-rights',
      'missing-cam-cap',
      'missing-termination-option',
      'below-market-rent-on-renewal',
      'missing-assignment-rights',
    ],
    industrySpecificConsiderations: [
      'Base year expense stops determine the landlord\'s share of operating costs; a base year with artificially low expenses (e.g., a partially occupied building) can dramatically inflate tenant expense escalations in subsequent years.',
      'Tenant improvement allowances in office leases often represent $30–$100+ per square foot in value; the disbursement conditions, completion deadline, and unused allowance treatment must be carefully extracted.',
      'After-hours HVAC charges can add thousands of dollars monthly for tenants who operate outside standard building hours; the hourly rate, minimum charge, and advance notice requirement are all financially significant.',
      'Holdover provisions in office leases frequently require 150–200% of base rent during holdover periods, making accurate tracking of expiration dates and renewal notice deadlines critical.',
      'Parking ratios (spaces per 1,000 RSF) directly affect tenant operations, especially for professional services firms; reserved vs. unreserved allocations and monthly parking rates should both be abstracted.',
    ],
    sampleExtractionNote:
      'Lextract extracts base year expense stop amounts, TI allowance total and per-RSF values, after-hours HVAC rates, parking space counts and ratios, holdover rates, and operating expense escalation caps from office leases.',
    relatedIndustries: [
      'flex-rd-lease-abstraction',
      'mixed-use-lease-abstraction',
      'healthcare-lease-abstraction',
    ],
    faqs: [
      {
        question: 'What is a base year expense stop and why does it matter?',
        answer:
          'A base year expense stop establishes the maximum amount the landlord will pay toward operating expenses per square foot in a given year, typically the first year of the lease. In subsequent years, the tenant pays any increase above that base year amount. If the base year was a low-occupancy year, tenants can face significant expense increases even when actual building costs rise modestly.',
      },
      {
        question: 'How does Lextract handle tenant improvement allowance extraction?',
        answer:
          'Lextract extracts the total TI allowance amount, the per-RSF allowance, any conditions on disbursement (such as completion milestones or lien waiver requirements), the deadline by which the allowance must be used, and the treatment of any unused allowance - including whether it converts to free rent or is forfeited.',
      },
      {
        question: 'Can Lextract identify problematic holdover provisions in office leases?',
        answer:
          'Yes. Lextract extracts the holdover rate as a percentage of base rent and flags situations where the holdover rate exceeds 150% - a threshold commonly cited as punitive in office leases. The extraction also identifies whether holdover converts to a month-to-month tenancy or triggers automatic lease extension.',
      },
    ],
    metaTitle: 'Office Lease Abstraction Guide',
    metaDescription:
      'Abstract office leases with AI. Extract base year expense stops, TI allowances, after-hours HVAC rates, parking ratios, and holdover provisions from gross and modified gross leases.',
  },
  {
    name: 'Industrial & Warehouse Lease Abstraction',
    slug: 'industrial-lease-abstraction',
    shortName: 'Industrial',
    overview:
      'Industrial and warehouse leases cover distribution centers, manufacturing facilities, flex warehouses, and cold storage properties where physical building specifications - clear height, dock doors, power capacity, and truck court depth - are as important as the financial terms. Industrial leases frequently use NNN, industrial gross, or modified gross structures, with CAM charges covering maintenance of the building shell, roof, and parking areas. As e-commerce has driven demand for large-format distribution space, lease terms have lengthened and renewal options have become increasingly valuable assets that must be carefully documented.',
    dominantLeaseTypes: ['Industrial Gross', 'NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–15 years',
    criticalFields: [
      'permitted-use',
      'base-rent',
      'cam-charges',
      'renewal-options',
      'assignment-rights',
      'subletting-rights',
      'tenant-improvement-allowance',
      'utility-responsibilities',
    ],
    commonRedFlags: [
      'missing-cam-cap',
      'no-audit-rights',
      'missing-termination-option',
      'missing-assignment-rights',
    ],
    industrySpecificConsiderations: [
      'Clear height specifications (typically 24–40+ feet for modern distribution) are critical to tenant operations and must be verified against the lease\'s premises description and exhibits.',
      'Power capacity (amperage and voltage) determines whether a tenant can operate heavy manufacturing or data-intensive operations; leases should specify the service available and who bears the cost of upgrading electrical infrastructure.',
      'Truck court depth and dock door counts are operationally critical for distribution tenants; lease exhibits and site plans should be reviewed alongside the abstract to confirm these specifications.',
      'Permitted use clauses in industrial leases are often written narrowly, restricting operations to specific SIC codes or product categories - restrictions that can conflict with future business line expansions.',
      'HVAC responsibility in industrial buildings varies significantly; office areas are often landlord-maintained while warehouse areas are tenant responsibility, and the split must be clearly documented.',
    ],
    sampleExtractionNote:
      'Lextract extracts permitted use scope, base rent with escalation schedule, CAM charges and caps, renewal option terms and notice deadlines, assignment and subletting consent standards, and utility responsibility allocations from industrial leases.',
    relatedIndustries: [
      'flex-rd-lease-abstraction',
      'data-center-lease-abstraction',
      'retail-lease-abstraction',
    ],
    faqs: [
      {
        question: 'What lease structure is most common for industrial and warehouse space?',
        answer:
          'Industrial gross and NNN structures are most prevalent. In an industrial gross lease, the landlord covers structural maintenance, roof, and parking lot while the tenant pays base rent plus utilities and interior maintenance. NNN structures pass all operating expenses to the tenant. Modified gross structures, where specific expense categories are negotiated individually, are also common for multi-tenant industrial parks.',
      },
      {
        question: 'How does Lextract handle industrial lease CAM charges?',
        answer:
          'Lextract extracts the CAM charge structure, including which expenses are included (roof, parking lot, landscaping, etc.), the pro rata share calculation method, any caps on controllable expenses, and the reconciliation frequency. For NNN industrial leases, Lextract also extracts property tax and insurance pass-through provisions separately.',
      },
      {
        question: 'Are assignment rights important for industrial tenants?',
        answer:
          'Critically so. Industrial tenants - particularly logistics and distribution companies - frequently need to assign leases in connection with corporate acquisitions, fleet restructurings, or supply chain reorganizations. Leases with landlord-friendly consent standards ("sole discretion" vs. "not unreasonably withheld") can block otherwise routine business transactions. Lextract extracts the specific consent standard and any permitted transfer exemptions.',
      },
    ],
    metaTitle: 'Industrial Lease Abstraction Guide',
    metaDescription:
      'Abstract industrial and warehouse leases with AI. Extract permitted use, CAM charges, renewal options, assignment rights, and utility responsibilities from NNN and industrial gross leases.',
  },
  {
    name: 'Healthcare Lease Abstraction',
    slug: 'healthcare-lease-abstraction',
    shortName: 'Healthcare',
    overview:
      'Healthcare leases involve uniquely high buildout costs, stringent regulatory requirements, and operational continuity concerns that create substantial exposure in poorly negotiated lease terms. Medical office buildings, outpatient surgery centers, imaging facilities, and specialty clinics require expensive tenant improvements - often $100–$300+ per square foot - that make renewal options and assignment rights existentially important. Healthcare operators also face stricter use restrictions, hazardous material disposal obligations, and licensing requirements that interact directly with lease provisions in ways that general commercial tenants do not encounter.',
    dominantLeaseTypes: ['Modified Gross', 'NNN', 'Full Service Gross'],
    avgLeaseTermYears: '7–15 years',
    criticalFields: [
      'permitted-use',
      'tenant-improvement-allowance',
      'renewal-options',
      'assignment-rights',
      'termination-options',
      'insurance-requirements',
      'utility-responsibilities',
      'operating-hours',
    ],
    commonRedFlags: [
      'missing-termination-option',
      'missing-assignment-rights',
      'no-audit-rights',
      'missing-cam-cap',
    ],
    industrySpecificConsiderations: [
      'Certificate of occupancy and healthcare licensing requirements can create significant delays before rent commencement; rent abatement provisions tied to regulatory approval timelines must be clearly negotiated and documented.',
      'Medical waste and biohazard disposal provisions must specify tenant vs. landlord responsibilities to avoid lease violations and environmental liability exposure.',
      'ADA compliance obligations in healthcare settings exceed standard commercial requirements; leases should clearly allocate responsibility for accessibility upgrades between landlord (base building) and tenant (premises improvements).',
      'TI allowances for healthcare buildouts frequently represent the largest financial concession in the lease; disbursement conditions, draw schedules, and construction lien provisions must all be abstracted carefully.',
      'Assignment and subletting rights are critical for healthcare practices facing acquisition by hospital systems or private equity; a landlord\'s ability to block an assignment on change-of-control grounds can impede otherwise standard healthcare M&A transactions.',
    ],
    sampleExtractionNote:
      'Lextract extracts permitted use scope with healthcare-specific restrictions, TI allowance amount and disbursement conditions, renewal option terms, assignment consent standards, insurance requirements including professional liability minimums, and utility responsibility allocations from healthcare leases.',
    relatedIndustries: [
      'office-lease-abstraction',
      'mixed-use-lease-abstraction',
      'flex-rd-lease-abstraction',
    ],
    faqs: [
      {
        question: 'Why are renewal options especially critical for healthcare tenants?',
        answer:
          'Healthcare tenants invest $100–$300+ per square foot in specialized buildouts - procedure rooms, imaging suites, lab infrastructure - that cannot be economically relocated. Without renewal options, a healthcare tenant faces either forced relocation (with enormous buildout costs at a new location) or lease renewal on whatever terms the landlord dictates. Long-term renewal options at predetermined rents are therefore among the most valuable provisions in a healthcare lease.',
      },
      {
        question: 'How does Lextract handle permitted use clauses in healthcare leases?',
        answer:
          'Lextract extracts the full scope of the permitted use provision and flags narrow definitions that could restrict future service line expansions. For example, a use clause limited to "general medical practice" might prohibit a practice from adding imaging services or a pharmacy. Lextract also flags use clauses that contain specific regulatory references (e.g., Medicare/Medicaid participation requirements) that create compliance obligations beyond standard commercial lease terms.',
      },
      {
        question: 'Are hazardous material provisions common in healthcare leases?',
        answer:
          'Yes. Healthcare leases routinely address the handling, storage, and disposal of biohazardous materials, pharmaceutical waste, and imaging contrast agents. These provisions specify whether the tenant is solely responsible, whether specialized disposal systems must be installed at tenant expense, and what the landlord\'s remediation rights are in the event of contamination. Lextract extracts hazardous materials provisions as part of the permitted use and tenant obligations sections.',
      },
    ],
    metaTitle: 'Healthcare Lease Abstraction Guide',
    metaDescription:
      'Abstract healthcare and medical office leases with AI. Extract permitted use, TI allowances, renewal options, assignment rights, and insurance requirements from MOB and clinic leases.',
  },
  {
    name: 'Restaurant & Food Service Lease Abstraction',
    slug: 'restaurant-lease-abstraction',
    shortName: 'Restaurant',
    overview:
      'Restaurant and food service leases combine the complexity of retail percentage rent structures with unique physical infrastructure requirements - grease traps, exhaust systems, and commercial kitchen ventilation - that create substantial landlord-tenant disputes if not clearly addressed in the lease. Food and beverage operators in high-traffic locations often pay percentage rent on top of base NNN rents, making accurate extraction of breakpoints and reporting obligations essential to financial planning. The capital intensity of restaurant buildouts (frequently $200–$500+ per square foot) makes renewal options and assignment rights especially consequential for operators seeking to protect their location investments.',
    dominantLeaseTypes: ['NNN', 'Percentage Lease', 'Modified Gross'],
    avgLeaseTermYears: '10–20 years',
    criticalFields: [
      'permitted-use',
      'cam-charges',
      'percentage-rent-rate',
      'percentage-rent-breakpoint',
      'renewal-options',
      'utility-responsibilities',
      'tenant-improvement-allowance',
      'assignment-rights',
    ],
    commonRedFlags: [
      'missing-cam-cap',
      'no-audit-rights',
      'gross-sales-underreporting-risk',
      'missing-gross-sales-reporting',
      'missing-termination-option',
      'missing-assignment-rights',
    ],
    industrySpecificConsiderations: [
      'Grease trap installation, maintenance, and repair responsibility must be clearly allocated; landlords often require tenants to install approved systems at tenant expense and maintain them throughout the term.',
      'Exhaust and ventilation system requirements for commercial kitchens - particularly makeup air systems and hood fire suppression - can cost $50,000–$150,000 or more, making the landlord vs. tenant cost allocation a significant lease negotiation point.',
      'Liquor license provisions affect assignability and subletting; some leases require landlord consent to any change in the entity holding a liquor license, which can complicate restaurant sales and corporate restructurings.',
      'Drive-thru rights and parking minimums are critical for QSR and fast casual operators; these rights are often documented in exhibits or reciprocal easement agreements that must be reviewed alongside the lease.',
      'Food court co-tenancy provisions in enclosed mall leases are especially sensitive; the departure of a food court anchor or the closure of an adjacent restaurant can trigger rent adjustments under carefully drafted co-tenancy clauses.',
    ],
    sampleExtractionNote:
      'Lextract extracts percentage rent rates and breakpoints, CAM cap structures, utility responsibility allocations, TI allowance amounts and conditions, renewal option terms, and assignment consent standards from restaurant and food service leases.',
    relatedIndustries: [
      'retail-lease-abstraction',
      'mixed-use-lease-abstraction',
      'hospitality-lease-abstraction',
    ],
    faqs: [
      {
        question: 'How does percentage rent work in restaurant leases?',
        answer:
          'Restaurant leases frequently include percentage rent provisions requiring tenants to pay additional rent equal to a percentage of gross sales above a specified breakpoint. For example, a tenant might pay 6% of gross sales above $1,000,000 annually. Lextract extracts the percentage rate, the breakpoint type (natural or artificial), the gross sales definition (including exclusions like sales taxes and employee meals), and the reporting frequency.',
      },
      {
        question: 'What utility provisions are most important to abstract in restaurant leases?',
        answer:
          'Restaurant operations are utility-intensive; gas, water, and electrical consumption can be multiples of office or retail tenants in comparable spaces. Lextract extracts which utilities are submetered vs. allocated by pro rata share, who pays connection fees and infrastructure upgrade costs, and whether the lease includes any utility cost caps or protections against disproportionate allocations.',
      },
      {
        question: 'Are TI allowances common in restaurant leases?',
        answer:
          'Yes, particularly for inline restaurant spaces in retail centers and food halls. Landlords often contribute TI allowances of $50–$150 per square foot to attract high-quality food and beverage tenants. Lextract extracts the allowance amount, the application deadline, disbursement conditions, and whether unused allowance is forfeited or converts to rent credits.',
      },
    ],
    metaTitle: 'Restaurant Lease Abstraction Guide',
    metaDescription:
      'Abstract restaurant and food service leases with AI. Extract percentage rent breakpoints, CAM caps, utility responsibilities, TI allowances, and renewal options from NNN and percentage leases.',
  },
  {
    name: 'Mixed-Use Lease Abstraction',
    slug: 'mixed-use-lease-abstraction',
    shortName: 'Mixed-Use',
    overview:
      'Mixed-use developments combine retail, office, residential, and sometimes hotel or entertainment components under a single ownership structure, creating complex CAM pool arrangements where multiple asset classes share operating expenses under potentially conflicting allocation methodologies. Commercial tenants in mixed-use projects need to carefully scrutinize how CAM is defined, what expenses are included, how the pool is divided among components, and whether residential units participate in or are excluded from the commercial CAM calculation. Operating hour conflicts, noise provisions, and signage restrictions also require careful abstraction given the competing needs of different occupancy types within the same development.',
    dominantLeaseTypes: ['Modified Gross', 'NNN', 'Full Service Gross'],
    avgLeaseTermYears: '5–15 years',
    criticalFields: [
      'cam-charges',
      'cam-cap-percentage',
      'operating-hours',
      'permitted-use',
      'noise-restrictions',
      'renewal-options',
      'tenant-improvement-allowance',
      'utility-responsibilities',
    ],
    commonRedFlags: [
      'missing-cam-cap',
      'no-audit-rights',
      'missing-termination-option',
      'missing-assignment-rights',
    ],
    industrySpecificConsiderations: [
      'CAM pool segregation between retail, office, and residential components must be clearly defined; tenants should verify that residential units either participate proportionately or are excluded entirely, not selectively included only for favorable expense categories.',
      'Operating hour restrictions in mixed-use developments reflect the residential component\'s need for quiet enjoyment - retail and food service tenants must confirm that their permitted operating hours align with the restrictions in the lease and any REA.',
      'Noise and nuisance provisions in mixed-use projects are stricter than in pure commercial centers; restaurant tenants and entertainment operators particularly need to confirm that their operations comply with the noise standards specified in the lease.',
      'Signage restrictions in mixed-use developments often prioritize residential aesthetics over commercial visibility, limiting tenant signage to ground-level or lobby locations - a potential problem for tenants who rely on street visibility.',
      'Ground-level retail tenants should confirm that upper-floor residential density assumptions have not changed since lease execution, as changes in residential population density directly affect parking, utility allocation, and common area usage patterns.',
    ],
    sampleExtractionNote:
      'Lextract extracts CAM pool definitions, expense allocation methodologies, operating hour restrictions, noise and nuisance provisions, signage rights, and utility responsibilities from mixed-use commercial leases.',
    relatedIndustries: [
      'retail-lease-abstraction',
      'office-lease-abstraction',
      'restaurant-lease-abstraction',
    ],
    faqs: [
      {
        question: 'How does CAM work differently in mixed-use developments?',
        answer:
          'In mixed-use projects, the CAM pool may include expenses from retail, office, and residential components, with each component paying a pro rata share of the total. The key issue is how the gross leasable area denominator is calculated - whether residential square footage is included in the denominator (which reduces each commercial tenant\'s share) and whether residential tenants contribute to the pool at all. Lextract extracts the CAM pool definition, the denominator definition, and any component-specific exclusions or adjustments.',
      },
      {
        question: 'What operating hour issues arise in mixed-use leases?',
        answer:
          'Commercial tenants in mixed-use projects may face restrictions on operating hours due to residential noise ordinances, loading dock access limitations during evening hours, and HVAC systems designed for standard commercial hours. Lextract extracts the permitted operating hours, any seasonal or holiday variations, and the cost structure for after-hours operations.',
      },
      {
        question: 'Are noise restrictions enforceable against existing tenants in mixed-use developments?',
        answer:
          'Yes, if the lease includes noise restrictions, they are binding on the tenant regardless of when the residential component opened. This is a common issue for restaurant and entertainment tenants who sign leases before the residential portion is occupied and later face noise complaints. Lextract extracts any noise and nuisance provisions, including decibel limits, restricted hours, and the landlord\'s enforcement rights.',
      },
    ],
    metaTitle: 'Mixed-Use Lease Abstraction Guide',
    metaDescription:
      'Abstract mixed-use commercial leases with AI. Extract CAM pool allocations, operating hours, noise restrictions, and utility responsibilities from retail, office, and mixed-use leases.',
  },
  {
    name: 'Flex & R&D Lease Abstraction',
    slug: 'flex-rd-lease-abstraction',
    shortName: 'Flex/R&D',
    overview:
      'Flex and R&D leases cover properties that combine open warehouse or laboratory space with office areas, serving life sciences companies, technology hardware manufacturers, and light industrial tenants who require specialized infrastructure. These leases are notable for their high TI buildout costs (particularly for lab and clean room construction), significant utility demands (redundant power, specialized HVAC for temperature and humidity control), and the need for change-of-use flexibility as tenant business models evolve. The diversity of uses in flex parks - ranging from medical device testing to software development to light assembly - makes permitted use language a critical abstraction focus.',
    dominantLeaseTypes: ['Industrial Gross', 'Modified Gross', 'NNN'],
    avgLeaseTermYears: '5–12 years',
    criticalFields: [
      'permitted-use',
      'tenant-improvement-allowance',
      'utility-responsibilities',
      'assignment-rights',
      'renewal-options',
      'subletting-rights',
      'cam-charges',
    ],
    commonRedFlags: [
      'missing-cam-cap',
      'no-audit-rights',
      'missing-termination-option',
      'missing-assignment-rights',
    ],
    industrySpecificConsiderations: [
      'Lab and clean room buildouts often cost $150–$400+ per square foot, making renewal options and termination penalties among the most financially significant provisions in an R&D lease.',
      'Power redundancy requirements (UPS systems, generator feeds, dual utility feeds) must be specified in the lease and exhibits; ambiguity about who provides and maintains redundant power infrastructure creates significant operational risk.',
      'Hazardous materials storage provisions in R&D leases must specifically address the tenant\'s planned chemical inventory, waste streams, and disposal methods - general hazmat clauses designed for light industrial use are often inadequate for laboratory operations.',
      'Change-of-use flexibility is critical for early-stage companies whose business model may pivot; permitted use clauses written specifically for a current product line can become operational constraints as companies grow and diversify.',
      'Fiber and data infrastructure provisions should specify the tenant\'s rights to install conduit, connect to building communications risers, and access redundant fiber feeds - increasingly critical for R&D tenants operating high-bandwidth data systems.',
    ],
    sampleExtractionNote:
      'Lextract extracts permitted use scope with hazmat provisions, TI allowance amounts and buildout conditions, utility responsibility allocations including power redundancy obligations, assignment and subletting consent standards, and renewal option terms from flex and R&D leases.',
    relatedIndustries: [
      'industrial-lease-abstraction',
      'data-center-lease-abstraction',
      'office-lease-abstraction',
    ],
    faqs: [
      {
        question: 'What makes flex/R&D leases harder to abstract than standard industrial leases?',
        answer:
          'Flex and R&D leases combine industrial, office, and laboratory elements in ways that make standard category-based abstraction insufficient. The utility provisions alone can span multiple sections addressing standard power, lab-grade power, HVAC zoning for clean rooms, compressed gas lines, and DI water systems. Lextract is designed to extract these multi-element provisions into structured fields rather than treating them as single undifferentiated clauses.',
      },
      {
        question: 'How important are TI allowances for R&D tenants?',
        answer:
          'Extremely important. R&D buildouts are among the most expensive in commercial real estate, often costing more per square foot than Class A office space. TI allowances of $100–$200 per square foot are common for life sciences tenants, and the disbursement conditions, completion deadline, and unused allowance treatment all have direct financial impact. Lextract extracts the full TI allowance package including any "warm shell" or "cold shell" delivery condition that affects the effective allowance value.',
      },
      {
        question: 'Can Lextract identify problematic permitted use clauses for tech companies?',
        answer:
          'Yes. Lextract flags permitted use clauses that are narrowly drafted around a specific product or technology, which can create compliance issues as companies expand their operations. Common problems include use clauses that reference specific product names, product categories that may not encompass future services, or restrictions that reference regulatory classifications that may be superseded.',
      },
    ],
    metaTitle: 'Flex & R&D Lease Abstraction Guide',
    metaDescription:
      'Abstract flex and R&D leases with AI. Extract permitted use, TI allowances, utility responsibilities, and assignment rights from life sciences and technology facility leases.',
  },
  {
    name: 'Data Center Lease Abstraction',
    slug: 'data-center-lease-abstraction',
    shortName: 'Data Center',
    overview:
      'Data center leases - covering wholesale colocation facilities, powered shell leases, and build-to-suit data centers - involve power density specifications, cooling infrastructure, and uptime service level provisions that have no parallel in other commercial real estate asset classes. Critical facilities operators routinely commit to 10–20 year lease terms with substantial capital investment in server infrastructure, making renewal options, assignment rights, and force majeure provisions especially consequential. The intersection of real estate and technology infrastructure creates a lease abstraction challenge that requires careful attention to both standard commercial provisions and specialized technical specifications.',
    dominantLeaseTypes: ['NNN', 'Modified Gross', 'Colocation Agreement'],
    avgLeaseTermYears: '10–20 years',
    criticalFields: [
      'utility-responsibilities',
      'permitted-use',
      'tenant-improvement-allowance',
      'renewal-options',
      'assignment-rights',
      'termination-options',
      'base-rent',
      'cam-charges',
    ],
    commonRedFlags: [
      'no-audit-rights',
      'missing-termination-option',
      'missing-assignment-rights',
      'missing-cam-cap',
    ],
    industrySpecificConsiderations: [
      'Power density specifications (watts per square foot) determine the maximum IT load the tenant can operate; leases must clearly specify available power, the transformation infrastructure, and cost obligations for upgrades beyond the base specification.',
      'Redundant utility feeds (N+1 or 2N power and cooling) are the operating standard for Tier III and Tier IV data centers; the lease must clearly specify which redundancy level the landlord commits to deliver and maintain.',
      'Cooling capacity and efficiency specifications (PUE targets, chilled water delivery temperatures) affect the tenant\'s operational costs and must be documented with clear landlord performance obligations.',
      'Fiber diversity requirements - specifically the mandate for separate physical entry points for fiber from different carriers - must be documented in the lease or a separate access agreement to ensure connectivity redundancy.',
      'Security requirements including access control systems, CCTV coverage, and man-trap vestibule specifications may be divided between landlord base building obligations and tenant fitout responsibilities in ways that must be clearly documented.',
    ],
    sampleExtractionNote:
      'Lextract extracts utility responsibility allocations including power density and cooling capacity commitments, permitted use scope with technical infrastructure specifications, TI allowance amounts, renewal option terms, and assignment consent standards from data center leases.',
    relatedIndustries: [
      'flex-rd-lease-abstraction',
      'industrial-lease-abstraction',
      'office-lease-abstraction',
    ],
    faqs: [
      {
        question: 'How does power provisioning affect data center lease abstraction?',
        answer:
          'Power is the most critical infrastructure element in a data center lease. Lextract extracts available power in kilowatts or megawatts, the power density specification in watts per square foot, whether the landlord or tenant is responsible for transformer and switchgear costs, the utility rate structure, and any provisions addressing upgrades when tenant power demand grows.',
      },
      {
        question: 'What uptime provisions should data center tenants look for?',
        answer:
          'Data center leases increasingly include uptime SLA provisions specifying minimum availability percentages for power and cooling, measured on an annual basis. Lextract extracts these SLA provisions, the measurement methodology, any exclusions (scheduled maintenance, force majeure), and the financial remedy structure if the landlord fails to meet the committed uptime level.',
      },
      {
        question: 'Are assignment rights especially important for data center tenants?',
        answer:
          'Yes. Data center infrastructure is frequently assigned in connection with corporate mergers, data center portfolio acquisitions, and technology asset divestitures. A landlord consent standard requiring landlord approval "in its sole discretion" can block routine infrastructure transactions or create significant leverage for landlords during M&A negotiations. Lextract extracts the consent standard and any permitted transfer exemptions for affiliates and successors by merger.',
      },
    ],
    metaTitle: 'Data Center Lease Abstraction Guide',
    metaDescription:
      'Abstract data center leases with AI. Extract power provisions, utility responsibilities, uptime SLAs, renewal options, and assignment rights from colocation and wholesale data center leases.',
  },
  {
    name: 'Self-Storage Lease Abstraction',
    slug: 'self-storage-lease-abstraction',
    shortName: 'Self-Storage',
    overview:
      'Self-storage real estate encompasses two distinct lease structures that require separate abstraction approaches: long-term ground leases or net leases used by operators who control an entire facility, and the short-term month-to-month unit rental agreements used for individual storage units. For self-storage operators acquiring or refinancing facilities, the ground lease terms - particularly renewal option structures, rent escalation provisions, and restrictions on facility improvements - directly affect property value and financing terms. The relatively simple CAM structure and minimal tenant improvement requirements are offset by the unique insurance and liability provisions characteristic of storage facility operations.',
    dominantLeaseTypes: ['Month-to-Month (unit)', 'NNN (ground/facility)', 'Ground Lease'],
    avgLeaseTermYears: '15–30 years (ground lease); month-to-month (unit rental)',
    criticalFields: [
      'base-rent',
      'renewal-options',
      'insurance-requirements',
      'termination-options',
      'permitted-use',
      'cam-charges',
      'assignment-rights',
    ],
    commonRedFlags: [
      'no-audit-rights',
      'missing-termination-option',
      'missing-assignment-rights',
      'below-market-rent-on-renewal',
    ],
    industrySpecificConsiderations: [
      'Ground lease structures for self-storage operators require careful review of improvement and expansion rights; operators who invest in climate-controlled upgrades, security enhancements, or additional unit construction must confirm these rights are clearly protected.',
      'Renewal option structures in long-term ground leases often include rent reset mechanisms (e.g., fair market value resets every 10 years) that can dramatically increase occupancy costs at renewal; the valuation methodology and dispute resolution process should be abstracted carefully.',
      'Insurance requirements for self-storage facilities must address both the operator\'s liability exposure and the landlord\'s property insurance obligations; the split between building insurance (landlord) and contents liability (operator/tenant) must be clearly documented.',
      'Lien rights and personal property disposition provisions in self-storage ground leases address what happens to stored tenant property when unit renters default; state law governing lien sales and disposition procedures interacts with lease provisions.',
      'Expansion rights and rights of first refusal on adjacent parcels are especially valuable to self-storage operators who can increase revenue by adding climate-controlled or specialty storage units; these rights must be precisely documented to be enforceable.',
    ],
    sampleExtractionNote:
      'Lextract extracts base rent with escalation schedule, renewal option terms and rent reset mechanisms, insurance requirement allocations, termination option provisions, and permitted use scope including expansion and improvement rights from self-storage ground and facility leases.',
    relatedIndustries: [
      'industrial-lease-abstraction',
      'retail-lease-abstraction',
      'hospitality-lease-abstraction',
    ],
    faqs: [
      {
        question: 'What is a ground lease and how does it differ from a standard commercial lease?',
        answer:
          'In a ground lease, the tenant leases only the land (not the building) and constructs and owns the improvements during the lease term. At lease expiration, the improvements typically revert to the landlord. Self-storage operators frequently use ground leases to control facilities they have built on land they do not own. Ground leases require careful abstraction of improvement rights, financing rights (for lenders requiring a leasehold mortgage), and reversion provisions at expiration.',
      },
      {
        question: 'How are renewal options structured in self-storage ground leases?',
        answer:
          'Self-storage ground leases typically include multiple 5–10 year renewal options following an initial term of 15–30 years. Renewal rent is often set at fair market value with a floor of the expiring rent, or at fixed escalations from the prior term rent. Lextract extracts the number of renewal options, the option period length, the rent determination methodology, and the notice period required to exercise each option.',
      },
      {
        question: 'What insurance provisions are specific to self-storage facilities?',
        answer:
          'Self-storage facility leases often address operator liability for stored property (which varies significantly by state), the operator\'s general liability minimums, property insurance covering the facility structure, and whether the operator must maintain umbrella coverage above specified thresholds. Lextract extracts coverage types, minimum coverage amounts, required endorsements, and who must be named as additional insured.',
      },
    ],
    metaTitle: 'Self-Storage Lease Abstraction Guide',
    metaDescription:
      'Abstract self-storage ground leases and facility leases with AI. Extract base rent, renewal options, insurance requirements, and termination provisions from NNN and ground lease structures.',
  },
  {
    name: 'Hospitality & Hotel Lease Abstraction',
    slug: 'hospitality-lease-abstraction',
    shortName: 'Hospitality',
    overview:
      'Hospitality leases - covering hotel operating leases, ground leases under hotel properties, and restaurant or retail component leases within hotel buildings - involve extended lease terms, complex brand and franchise agreement interactions, and performance-based termination triggers that require specialized abstraction. Ground leases for branded hotels can extend 40–99 years, making renewal option structures and rent escalation formulas among the most consequential financial provisions in commercial real estate. Hotel operators must also navigate the interplay between their ground lease obligations to the landowner, their franchise agreement obligations to the brand, and their management agreement obligations to any third-party hotel manager.',
    dominantLeaseTypes: ['Ground Lease', 'NNN', 'Long-term Gross'],
    avgLeaseTermYears: '20–40 years (ground); 10–20 years (operating)',
    criticalFields: [
      'permitted-use',
      'renewal-options',
      'termination-options',
      'assignment-rights',
      'base-rent',
      'insurance-requirements',
      'tenant-improvement-allowance',
    ],
    commonRedFlags: [
      'missing-termination-option',
      'missing-assignment-rights',
      'no-audit-rights',
      'below-market-rent-on-renewal',
    ],
    industrySpecificConsiderations: [
      'Brand and franchise agreement interaction with ground lease terms requires careful review; some ground leases include provisions restricting flag changes or requiring landlord consent to franchise agreement modifications, which can constrain operator flexibility.',
      'Performance termination clauses - giving the landlord the right to terminate if the hotel fails to maintain specified RevPAR indices or occupancy levels - must be precisely documented including the measurement period, threshold metrics, and cure rights.',
      'Parking minimum requirements in hotel leases directly affect the franchise agreement\'s brand standards; leases that do not provide adequate parking to support the hotel\'s required room count can create brand standard violations with significant consequences.',
      'F&B (food and beverage) provisions in hotel leases may restrict or require specific restaurant, bar, and banquet operations; hotel operators need to confirm that their intended F&B program complies with lease use restrictions.',
      'Financing provisions are especially critical in ground leases under hotel properties; lenders typically require a non-disturbance agreement, a right to cure landlord defaults, and sufficient notice and cure rights to protect their leasehold mortgage security interest.',
    ],
    sampleExtractionNote:
      'Lextract extracts permitted use scope with brand and franchise provisions, renewal option structures and rent reset mechanisms, performance termination clause metrics and cure rights, assignment and subletting consent standards, and insurance requirement allocations from hospitality and hotel leases.',
    relatedIndustries: [
      'restaurant-lease-abstraction',
      'retail-lease-abstraction',
      'mixed-use-lease-abstraction',
    ],
    faqs: [
      {
        question: 'Why are hospitality ground leases among the most complex to abstract?',
        answer:
          'Hotel ground leases combine the long-term investment horizon of a 40–99 year term with the operational complexity of a branded, managed hospitality asset. The lease must be read in conjunction with the franchise agreement (which imposes brand standards) and the management agreement (which governs day-to-day operations). Provisions in each document interact in ways that can create conflicting obligations, requiring the lease abstract to identify not just what the lease says but also where it creates friction with related agreements.',
      },
      {
        question: 'What are performance termination clauses in hotel leases?',
        answer:
          'Performance termination clauses give the landlord (or occasionally the tenant) the right to terminate the lease if the hotel fails to achieve specified performance metrics over a defined period - typically RevPAR penetration index, occupancy rate, or gross operating profit thresholds. Lextract extracts the performance metric, the measurement methodology, the evaluation period, the cure period available after a performance failure, and the available remedies including lease termination.',
      },
      {
        question: 'How does Lextract handle rent escalation in long-term hotel ground leases?',
        answer:
          'Hotel ground lease rent structures often combine a fixed base rent with periodic CPI adjustments, fair market value resets at specified intervals (e.g., every 10 years), or percentage rent tied to hotel revenue. Lextract extracts the base rent amount, the escalation mechanism (CPI cap, fixed step, or FMV reset), the reset frequency, the valuation methodology for FMV resets, and any rent floor or cap provisions.',
      },
    ],
    metaTitle: 'Hospitality Lease Abstraction Guide',
    metaDescription:
      'Abstract hotel and hospitality leases with AI. Extract ground lease terms, performance termination clauses, renewal options, and assignment rights from hotel ground and operating leases.',
  },
]

const ALL_INDUSTRIES = [...INDUSTRIES]
export const INDEXABLE_INDUSTRIES = filterRetainedSeoItems('industries', ALL_INDUSTRIES)

// ─── Helper Functions ──────────────────────────────────────────────

/**
 * Find an industry by its URL slug.
 */
export function getIndustryBySlug(slug: string): IndustryData | undefined {
  return ALL_INDUSTRIES.find((i) => i.slug === slug)
}

/**
 * Get all industry slugs for static generation.
 */
export function getAllIndustrySlugs(): string[] {
  return ALL_INDUSTRIES.map((i) => i.slug)
}

export function getIndexableIndustryBySlug(slug: string): IndustryData | undefined {
  return INDEXABLE_INDUSTRIES.find((i) => i.slug === slug)
}

export function getAllIndexableIndustrySlugs(): string[] {
  return INDEXABLE_INDUSTRIES.map((i) => i.slug)
}

/**
 * Find an industry by its short name or display name (case-insensitive).
 * Used to resolve plain-text industry references into linkable slugs.
 */
export function getIndustryByShortName(name: string): IndustryData | undefined {
  const normalized = name.toLowerCase().trim()
  if (normalized.length === 0) return undefined
  return ALL_INDUSTRIES.find(
    (i) =>
      i.shortName.toLowerCase() === normalized ||
      i.name.toLowerCase().includes(normalized)
  )
}

export function getIndustrySeoRedirect(slug: string): string | null {
  if (isRetainedSeoSlug('industries', slug)) return null
  if (!ALL_INDUSTRIES.some((industry) => industry.slug === slug)) return null
  return getExplicitSeoRedirect('industries', slug) ?? '/industries'
}
