import { filterRetainedSeoItems, isRetainedSeoSlug } from '@/lib/seo-inventory'
import { getStateBySlug } from '@/data/states'

export interface LocationData {
  city: string
  state: string
  stateAbbr: string
  slug: string
  marketOverview: string
  dominantLeaseTypes: string[]
  avgLeaseTermYears: string
  keyMarketStats: {
    totalCommercialSqFt: string
    avgOfficeRentPsf: string
    vacancyRate: string
    marketTier: 'Tier 1' | 'Tier 2' | 'Tier 3'
  }
  commonLeaseStructures: string
  stateSlug: string
  keyFields: string[]
  localRedFlags: string[]
  faqs: { question: string; answer: string }[]
  metaTitle: string
  metaDescription: string
}

export const LOCATIONS: LocationData[] = [
  // ─── Tier 1 ───────────────────────────────────────────────────────────────
  {
    city: 'New York City',
    state: 'New York',
    stateAbbr: 'NY',
    slug: 'new-york-commercial-lease-abstraction',
    marketOverview:
      'New York City is the most expensive commercial real estate market in the United States, with Midtown Manhattan office rents consistently among the highest globally. The market spans over 500 million square feet of commercial space across five boroughs, dominated by Class A office, retail corridors, and industrial outer-borough submarkets. NYC leases are heavily negotiated with complex CAM structures, free-rent concessions, and substantial tenant improvement packages.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross', 'NNN (Retail)'],
    avgLeaseTermYears: '5–15 years',
    keyMarketStats: {
      totalCommercialSqFt: '500M+ sq ft',
      avgOfficeRentPsf: '$80–$120/sq ft',
      vacancyRate: '20%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Manhattan office leases typically use Full Service Gross with a base year expense stop, meaning tenants pay their pro-rata share of operating expense increases above the base year. Retail leases-especially Fifth Avenue and Times Square-are NNN with very high base rents and percentage rent overlays. Multi-tenant industrial leases in Brooklyn and Queens use Modified Gross or Gross structures. Free-rent concessions of 6–18 months are common in office deals.',
    stateSlug: 'new-york',
    keyFields: [
      'base-rent-annual',
      'cam-exclusions',
      'cam-cap-percentage',
      'base-year',
      'audit-rights',
      'ti-allowance-per-rsf',
      'renewal-notice-days',
    ],
    localRedFlags: ['no-cam-cap', 'missing-audit-rights', 'no-renewal-option'],
    faqs: [
      {
        question: 'What lease type is most common for NYC office space?',
        answer:
          'Full Service Gross (FSG) with a base year expense stop is standard for Manhattan Class A and B office. The tenant pays a flat gross rent in year one; from year two onward they pay their pro-rata share of operating expense increases above the base year amount.',
      },
      {
        question: 'How does Lextract help with New York commercial leases?',
        answer:
          'Lextract extracts all 126 standard fields from NYC leases including base year expense stops, CAM caps, free-rent schedules, and complex renewal option structures-in minutes rather than hours.',
      },
    ],
    metaTitle: 'NYC Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for New York City commercial leases. Extract base year stops, CAM caps, TI allowances, and 126 fields from Manhattan and outer-borough leases.',
  },
  {
    city: 'Los Angeles',
    state: 'California',
    stateAbbr: 'CA',
    slug: 'los-angeles-commercial-lease-abstraction',
    marketOverview:
      'Los Angeles spans over 200 million square feet of commercial space across distinct submarkets including Century City, Westside, DTLA, El Segundo, and the San Fernando Valley. The market is driven by entertainment, technology, and international trade, with one of the busiest industrial corridors in the country adjacent to the Port of Long Beach. California tenant protections add a layer of complexity not found in most US markets.',
    dominantLeaseTypes: ['Modified Gross', 'Full Service Gross', 'NNN (Industrial/Retail)'],
    avgLeaseTermYears: '3–10 years (office), 5–15 years (industrial)',
    keyMarketStats: {
      totalCommercialSqFt: '200M+ sq ft',
      avgOfficeRentPsf: '$45–$70/sq ft',
      vacancyRate: '22%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Westside office leases favor Modified Gross or FSG. Industrial leases along the I-710 corridor are predominantly NNN. Retail on the high-street corridors (Rodeo Drive, Melrose) command NNN with percentage rent. California law requires specific disclosures and provides stronger tenant audit rights than most states, making CAM cap and operating expense provisions especially important to abstract carefully.',
    stateSlug: 'california',
    keyFields: [
      'base-rent-annual',
      'cam-exclusions',
      'cam-cap-percentage',
      'ti-allowance-per-rsf',
      'audit-rights',
      'renewal-notice-days',
      'exclusive-use-rights',
    ],
    localRedFlags: ['no-cam-cap', 'missing-audit-rights', 'missing-cam-exclusions'],
    faqs: [
      {
        question: 'Are there California-specific provisions I need to abstract from LA leases?',
        answer:
          'Yes. California leases often include specific audit rights provisions, earthquake insurance requirements, and ADA compliance obligations that are stronger than federal minimums. Lextract flags these fields during extraction.',
      },
      {
        question: 'How long does it take to abstract an LA commercial lease?',
        answer:
          'Manually, a standard LA office lease takes 4-8 hours to abstract. Lextract processes it in 5-15 minutes, extracting all 126 fields including CA-specific provisions.',
      },
    ],
    metaTitle: 'Los Angeles Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Los Angeles commercial leases. Extract CAM caps, TI allowances, California-specific provisions, and 126 fields in minutes.',
  },
  {
    city: 'Chicago',
    state: 'Illinois',
    stateAbbr: 'IL',
    slug: 'chicago-commercial-lease-abstraction',
    marketOverview:
      'Chicago is the Midwest\'s dominant commercial real estate market, with approximately 130 million square feet of office space in the CBD and suburbs. The city serves as a major logistics hub with significant industrial inventory in the O\'Hare, I-290, and south suburban corridors. The Loop and River North office submarkets feature a mix of trophy Class A buildings and older Class B inventory with varied lease structures.',
    dominantLeaseTypes: ['Modified Gross', 'NNN', 'Full Service Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '130M sq ft',
      avgOfficeRentPsf: '$35–$55/sq ft',
      vacancyRate: '24%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Chicago CBD office leases are typically Modified Gross or FSG. Suburban office parks lean toward NNN or Modified Gross. Industrial properties throughout Cook and DuPage counties are predominantly NNN. Retail along Michigan Avenue and neighborhood corridors uses NNN. The Chicago market has seen significant concession packages in recent years due to elevated vacancy, making TI allowance and free-rent extraction especially important.',
    stateSlug: 'illinois',
    keyFields: [
      'base-rent',
      'cam-charges',
      'cam-cap-percentage',
      'tenant-improvement-allowance',
      'free-rent-period',
      'operating-expenses',
      'renewal-options',
    ],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [
      {
        question: 'What is the typical CAM structure in Chicago office leases?',
        answer:
          'Most Chicago CBD leases use a modified gross structure with a base year expense stop. Tenants pay increases above the base year, with CAM caps of 3–5% per year common in well-negotiated deals. Always verify whether the cap is cumulative or non-cumulative.',
      },
    ],
    metaTitle: 'Chicago Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Chicago commercial leases. Extract CAM structures, TI allowances, base year stops, and 126 fields from Loop and suburban leases.',
  },
  {
    city: 'Houston',
    state: 'Texas',
    stateAbbr: 'TX',
    slug: 'houston-commercial-lease-abstraction',
    marketOverview:
      'Houston is one of the largest commercial real estate markets in the US with approximately 200 million square feet of commercial space. The market is heavily influenced by the oil, gas, and energy sectors, creating boom-and-bust cycles that affect vacancy rates and concession packages. Texas is a landlord-friendly state with no state income tax, attracting significant corporate relocations and speculative industrial development.',
    dominantLeaseTypes: ['NNN', 'Modified Gross', 'Full Service Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '200M sq ft',
      avgOfficeRentPsf: '$25–$45/sq ft',
      vacancyRate: '26%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Houston\'s energy corridor and Galleria submarkets favor Modified Gross and FSG for office. Suburban office parks and industrial properties across the metro are predominantly NNN. Retail centers along major corridors use NNN. High office vacancy since the energy sector contraction has driven generous TI packages and extended free-rent periods-both critical to extract accurately for portfolio analysis.',
    stateSlug: 'texas',
    keyFields: [
      'base-rent',
      'cam-charges',
      'tenant-improvement-allowance',
      'free-rent-period',
      'operating-expenses',
      'renewal-options',
      'termination-options',
    ],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-termination-option'],
    faqs: [
      {
        question: 'Are Houston commercial leases landlord-friendly?',
        answer:
          'Texas is generally landlord-friendly with few statutory tenant protections for commercial leases. This makes it especially important to negotiate and carefully abstract provisions like audit rights, CAM caps, and termination options-protections that aren\'t implied by law.',
      },
    ],
    metaTitle: 'Houston Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Houston commercial leases. Extract CAM structures, TI packages, termination options, and 126 fields from energy corridor and suburban leases.',
  },
  {
    city: 'Dallas',
    state: 'Texas',
    stateAbbr: 'TX',
    slug: 'dallas-commercial-lease-abstraction',
    marketOverview:
      'Dallas–Fort Worth is one of the fastest-growing commercial real estate markets in the United States, with approximately 170 million square feet of office and industrial inventory. The market has seen significant corporate headquarters relocations from higher-cost states, driving demand for large-block Class A office space and big-box industrial. The Frisco, Plano, and Legacy corridor submarkets are especially active.',
    dominantLeaseTypes: ['NNN', 'Modified Gross', 'Full Service Gross'],
    avgLeaseTermYears: '5–15 years',
    keyMarketStats: {
      totalCommercialSqFt: '170M sq ft',
      avgOfficeRentPsf: '$28–$48/sq ft',
      vacancyRate: '25%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'DFW office leases in Uptown Dallas and Legacy West favor FSG or Modified Gross. Suburban office is predominantly NNN. Industrial across North Texas is NNN with institutionally negotiated CAM structures. The market\'s growth has compressed concession packages somewhat, but TI allowances remain significant for large tenants. Texas has no income tax, making total occupancy cost calculations straightforward.',
    stateSlug: 'texas',
    keyFields: [
      'base-rent',
      'cam-charges',
      'cam-cap-percentage',
      'tenant-improvement-allowance',
      'operating-expenses',
      'renewal-options',
      'assignment-rights',
    ],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-assignment-rights'],
    faqs: [
      {
        question: 'What makes Dallas commercial leases unique to abstract?',
        answer:
          'DFW has seen an influx of large corporate HQ relocations, resulting in complex build-to-suit leases with unusual TI structures, rent abatement schedules, and extension options. These multi-hundred-page leases benefit most from AI abstraction.',
      },
    ],
    metaTitle: 'Dallas Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Dallas–Fort Worth commercial leases. Extract CAM caps, TI allowances, corporate HQ provisions, and 126 fields in minutes.',
  },
  {
    city: 'San Francisco',
    state: 'California',
    stateAbbr: 'CA',
    slug: 'san-francisco-commercial-lease-abstraction',
    marketOverview:
      'San Francisco has approximately 85 million square feet of commercial space, historically driven by tech sector demand. The downtown market has faced significant headwinds since 2020 with elevated vacancy in Class A office, creating a tenant\'s market with substantial concession packages. The SoMa, Financial District, and Mission Bay submarkets are most active. California\'s strong tenant protections apply to all SF leases.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '85M sq ft',
      avgOfficeRentPsf: '$55–$65/sq ft',
      vacancyRate: '35%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'SF office leases are predominantly FSG with base year expense stops. Tech company leases often include generous TI packages ($120–$200/sq ft) and multi-year free-rent periods that require careful abstraction. Sublease rights provisions are especially important given the volume of tech tenants attempting to sublease excess space. California audit rights are stronger than the national norm.',
    stateSlug: 'california',
    keyFields: [
      'base-rent',
      'tenant-improvement-allowance',
      'free-rent-period',
      'subletting-rights',
      'base-year-expense-stop',
      'renewal-options',
      'termination-options',
    ],
    localRedFlags: ['no-audit-rights', 'missing-termination-option', 'below-market-rent-on-renewal'],
    faqs: [
      {
        question: 'How do SF tech leases differ from standard commercial leases?',
        answer:
          'Tech leases in SF often include above-market TI allowances, extended free-rent periods, generator rights, HVAC 24/7 provisions, and generous sublease rights. These non-standard terms are critical to extract for portfolio management and asset disposition.',
      },
    ],
    metaTitle: 'San Francisco Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for San Francisco commercial leases. Extract TI packages, sublease rights, CA-specific provisions, and 126 fields from FSG tech leases.',
  },
  {
    city: 'Miami',
    state: 'Florida',
    stateAbbr: 'FL',
    slug: 'miami-commercial-lease-abstraction',
    marketOverview:
      'Miami has emerged as a major international commercial real estate market, with approximately 120 million square feet of commercial inventory spanning Brickell, Wynwood, Miami Beach, and the suburban Doral and Aventura corridors. The market is driven by finance, international trade, luxury retail, and a growing tech and private equity presence. Florida has no state income tax and is landlord-friendly, attracting significant institutional capital.',
    dominantLeaseTypes: ['NNN', 'Modified Gross', 'Full Service Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '120M sq ft',
      avgOfficeRentPsf: '$45–$75/sq ft',
      vacancyRate: '16%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Brickell Class A office leases use FSG or Modified Gross. Suburban office and industrial are NNN. High-street retail on Miracle Mile and Lincoln Road commands NNN with percentage rent overlays. International tenants frequently negotiate assignments and sublease provisions given cross-border business structures, making those fields especially important to abstract carefully.',
    stateSlug: 'florida',
    keyFields: [
      'base-rent',
      'cam-charges',
      'cam-cap-percentage',
      'assignment-rights',
      'subletting-rights',
      'renewal-options',
      'permitted-use',
    ],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-assignment-rights'],
    faqs: [
      {
        question: 'Are Miami commercial leases landlord-friendly?',
        answer:
          'Florida is a landlord-friendly state for commercial leases with limited statutory tenant protections. Tenants must negotiate CAM caps, audit rights, and assignment rights explicitly-none are implied by law. Lextract flags missing protections as red flags.',
      },
    ],
    metaTitle: 'Miami Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Miami commercial leases. Extract CAM caps, assignment rights, international tenant provisions, and 126 fields from Brickell and suburban leases.',
  },
  {
    city: 'Washington',
    state: 'District of Columbia',
    stateAbbr: 'DC',
    slug: 'washington-dc-commercial-lease-abstraction',
    marketOverview:
      'Washington DC has approximately 200 million square feet of commercial space, heavily influenced by federal government activity and government contractors. The market spans DC proper, Northern Virginia (Tysons, Crystal City/National Landing), and suburban Maryland. GSA leases follow federal procurement rules distinct from private market leases, while commercial leases in prime submarkets command significant premiums.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross'],
    avgLeaseTermYears: '7–15 years',
    keyMarketStats: {
      totalCommercialSqFt: '200M sq ft',
      avgOfficeRentPsf: '$50–$85/sq ft',
      vacancyRate: '21%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'DC proper and the Rosslyn-Ballston corridor favor FSG leases for Class A office. Government contractor leases often have security addenda and unusual termination provisions tied to contract renewals. CBD retail uses NNN. The market has seen significant flight-to-quality, with Class B properties offering aggressive concession packages. LEED certification provisions are increasingly common in lease language.',
    stateSlug: 'district-of-columbia',
    keyFields: [
      'base-rent',
      'tenant-improvement-allowance',
      'base-year-expense-stop',
      'termination-options',
      'renewal-options',
      'assignment-rights',
      'operating-expenses',
    ],
    localRedFlags: ['no-audit-rights', 'missing-termination-option', 'below-market-rent-on-renewal'],
    faqs: [
      {
        question: 'How do government contractor leases differ from standard DC commercial leases?',
        answer:
          'Government contractor leases often include security clearance provisions, government termination-for-convenience clauses, and special assignment restrictions linked to federal contract awards. These non-standard termination and assignment provisions are among the most important fields to abstract carefully.',
      },
    ],
    metaTitle: 'Washington DC Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Washington DC commercial leases. Extract government contractor provisions, FSG structures, TI allowances, and 126 fields in minutes.',
  },
  {
    city: 'Boston',
    state: 'Massachusetts',
    stateAbbr: 'MA',
    slug: 'boston-commercial-lease-abstraction',
    marketOverview:
      'Boston has approximately 80 million square feet of commercial space, driven by life sciences, biotech, finance, and higher education. The Cambridge life sciences corridor (Kendall Square area) commands among the highest lab rents in the world. Traditional office markets in the Financial District and Back Bay are Class A FSG. The Seaport District is a high-growth mixed-use submarket with newer Class A buildings.',
    dominantLeaseTypes: ['Full Service Gross', 'NNN (Lab/Life Sciences)', 'Modified Gross'],
    avgLeaseTermYears: '7–12 years',
    keyMarketStats: {
      totalCommercialSqFt: '80M sq ft',
      avgOfficeRentPsf: '$60–$65/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Boston CBD office leases are FSG with base year expense stops. Cambridge life sciences leases are frequently NNN or Modified Gross with above-market TI allowances ($200–$400/sq ft) for lab buildouts. Lab leases include specialized provisions for hazmat, exhaust systems, and generator capacity that standard office abstraction templates miss. Lextract extracts permitted use and TI provisions critical for lab lease analysis.',
    stateSlug: 'massachusetts',
    keyFields: [
      'base-rent',
      'tenant-improvement-allowance',
      'permitted-use',
      'cam-charges',
      'base-year-expense-stop',
      'renewal-options',
      'assignment-rights',
    ],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [
      {
        question: 'What makes Boston life sciences leases complex to abstract?',
        answer:
          'Lab and life sciences leases include specialized buildout provisions, hazmat storage rights, exhaust system requirements, and above-market TI packages. These provisions are buried in technical addenda and require careful extraction to understand total occupancy cost.',
      },
    ],
    metaTitle: 'Boston Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Boston commercial leases. Extract life sciences lab provisions, FSG structures, TI allowances, and 126 fields from Boston and Cambridge leases.',
  },
  {
    city: 'Seattle',
    state: 'Washington',
    stateAbbr: 'WA',
    slug: 'seattle-commercial-lease-abstraction',
    marketOverview:
      'Seattle has approximately 90 million square feet of commercial space, significantly shaped by Amazon, Microsoft, and a robust life sciences sector. The South Lake Union submarket was transformed by Amazon\'s headquarters campus. Bellevue across Lake Washington has grown into a major tech submarket. The market has faced elevated vacancy post-2022 as Amazon and other tech tenants reduced their footprints.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '90M sq ft',
      avgOfficeRentPsf: '$45–$75/sq ft',
      vacancyRate: '24%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Seattle and Bellevue office leases are predominantly FSG or Modified Gross. Tech tenant leases include large TI packages, sublease rights, and termination options. Washington State has no income tax. The elevated vacancy has driven aggressive landlord concessions, making free-rent and TI allowance abstraction critical for understanding true lease economics.',
    stateSlug: 'washington',
    keyFields: [
      'base-rent',
      'tenant-improvement-allowance',
      'free-rent-period',
      'subletting-rights',
      'termination-options',
      'renewal-options',
      'cam-charges',
    ],
    localRedFlags: ['no-audit-rights', 'missing-termination-option', 'below-market-rent-on-renewal'],
    faqs: [
      {
        question: 'How are Seattle tech company leases typically structured?',
        answer:
          'Large tech tenants in Seattle negotiate FSG leases with significant free-rent periods (often 12–24 months), above-market TI ($80–$150/sq ft), and robust sublease rights to manage excess space. These provisions require careful abstraction for sublease marketing and FASB ASC 842 compliance.',
      },
    ],
    metaTitle: 'Seattle Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Seattle commercial leases. Extract tech tenant provisions, TI allowances, sublease rights, and 126 fields from South Lake Union and Bellevue leases.',
  },
  {
    city: 'Atlanta',
    state: 'Georgia',
    stateAbbr: 'GA',
    slug: 'atlanta-commercial-lease-abstraction',
    marketOverview:
      'Atlanta has approximately 150 million square feet of commercial space, driven by logistics, technology, media, and financial services. The metro is one of the largest logistics hubs in the Southeast, with significant industrial inventory along I-75/85 and in the Savannah corridor. Buckhead and Midtown are the premier office submarkets. Georgia is a business-friendly state with no rent control.',
    dominantLeaseTypes: ['NNN', 'Modified Gross', 'Full Service Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '150M sq ft',
      avgOfficeRentPsf: '$28–$45/sq ft',
      vacancyRate: '22%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Buckhead and Midtown office leases are typically Modified Gross or FSG. Industrial across the metro is predominantly NNN. Retail centers use NNN. Atlanta\'s logistics market has seen significant rent growth, and industrial NNN leases require careful CAM and escalation extraction for portfolio management.',
    stateSlug: 'georgia',
    keyFields: [
      'base-rent',
      'cam-charges',
      'cam-cap-percentage',
      'operating-expenses',
      'tenant-improvement-allowance',
      'renewal-options',
      'rent-escalation-rate',
    ],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [
      {
        question: 'What drives Atlanta commercial lease complexity?',
        answer:
          'Atlanta\'s large logistics/industrial sector generates significant NNN lease volume with annual rent escalations. CAM reconciliation is a common pain point-Lextract extracts all escalation schedules, CAM structures, and cap provisions to streamline portfolio review.',
      },
    ],
    metaTitle: 'Atlanta Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Atlanta commercial leases. Extract NNN structures, CAM caps, escalation schedules, and 126 fields from Buckhead and industrial corridor leases.',
  },
  {
    city: 'Phoenix',
    state: 'Arizona',
    stateAbbr: 'AZ',
    slug: 'phoenix-commercial-lease-abstraction',
    marketOverview:
      'Phoenix has approximately 130 million square feet of commercial space and is one of the fastest-growing industrial markets in the US, driven by semiconductor manufacturing, logistics, and data centers. The Deer Valley, Camelback Corridor, and Downtown Phoenix submarkets lead in office. Arizona is a landlord-friendly state with straightforward commercial lease law.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–12 years',
    keyMarketStats: {
      totalCommercialSqFt: '130M sq ft',
      avgOfficeRentPsf: '$28–$42/sq ft',
      vacancyRate: '20%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Phoenix industrial leases are almost universally NNN with annual 3% rent bumps. Office leases are Modified Gross or NNN depending on building class. Data center and semiconductor manufacturing leases include specialized power, cooling, and utility provisions that require careful extraction.',
    stateSlug: 'arizona',
    keyFields: [
      'base-rent',
      'cam-charges',
      'rent-escalation-rate',
      'utility-responsibilities',
      'permitted-use',
      'renewal-options',
      'tenant-improvement-allowance',
    ],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [
      {
        question: 'What is typical for Phoenix industrial NNN leases?',
        answer:
          'Phoenix industrial leases are standard NNN with annual 3% rent bumps, tenant-responsible utilities, and minimal landlord obligations. The key fields to extract are the exact escalation schedule, CAM reconciliation caps, and renewal option rent mechanics.',
      },
    ],
    metaTitle: 'Phoenix Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Phoenix commercial leases. Extract NNN structures, industrial escalation schedules, utility provisions, and 126 fields in minutes.',
  },
  {
    city: 'Denver',
    state: 'Colorado',
    stateAbbr: 'CO',
    slug: 'denver-commercial-lease-abstraction',
    marketOverview:
      'Denver has approximately 90 million square feet of commercial space, driven by energy, technology, and a diverse professional services sector. The CBD and LoDo submarkets feature Class A FSG and Modified Gross office. The energy sector\'s boom-and-bust cycles have historically driven significant sublease activity, making sublease and assignment provisions critical to abstract.',
    dominantLeaseTypes: ['Modified Gross', 'NNN', 'Full Service Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '90M sq ft',
      avgOfficeRentPsf: '$32–$50/sq ft',
      vacancyRate: '23%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Denver CBD office uses Modified Gross or FSG with base year stops. Suburban office parks and industrial are NNN. The energy sector\'s cycles have left a legacy of complex sublease structures and early termination provisions in the office market.',
    stateSlug: 'colorado',
    keyFields: [
      'base-rent',
      'cam-charges',
      'subletting-rights',
      'termination-options',
      'tenant-improvement-allowance',
      'renewal-options',
      'assignment-rights',
    ],
    localRedFlags: ['missing-termination-option', 'missing-assignment-rights', 'no-audit-rights'],
    faqs: [
      {
        question: 'Why are termination options so important in Denver leases?',
        answer:
          'Denver\'s energy sector drives boom-and-bust office demand cycles. Tenants-especially energy companies-often need early termination flexibility. Lextract flags any lease missing a termination option as a red flag for portfolio risk management.',
      },
    ],
    metaTitle: 'Denver Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Denver commercial leases. Extract termination options, sublease rights, CAM structures, and 126 fields from CBD and energy corridor leases.',
  },
  {
    city: 'Minneapolis',
    state: 'Minnesota',
    stateAbbr: 'MN',
    slug: 'minneapolis-commercial-lease-abstraction',
    marketOverview:
      'Minneapolis–Saint Paul has approximately 80 million square feet of commercial space. The metro is home to a large concentration of Fortune 500 companies in retail, finance, healthcare, and food manufacturing. The IDS Center corridor and Nicollet Mall anchor the downtown market. The suburban corridors along 494/394 are significant office and industrial markets.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross', 'NNN'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '80M sq ft',
      avgOfficeRentPsf: '$22–$35/sq ft',
      vacancyRate: '23%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'Minneapolis CBD office leases are predominantly FSG. Suburban office is Modified Gross or NNN. Industrial and distribution is NNN. The skyway system connecting downtown buildings creates unique shared-space CAM provisions in CBD leases.',
    stateSlug: 'minnesota',
    keyFields: [
      'base-rent',
      'cam-charges',
      'cam-cap-percentage',
      'tenant-improvement-allowance',
      'operating-expenses',
      'renewal-options',
      'permitted-use',
    ],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [
      {
        question: 'What is unique about Minneapolis CBD lease structures?',
        answer:
          'Many Minneapolis CBD buildings connect via the enclosed skyway system, which creates shared common area costs across multiple buildings. These cross-building CAM allocations are complex and require careful abstraction to understand true occupancy costs.',
      },
    ],
    metaTitle: 'Minneapolis Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for Minneapolis commercial leases. Extract FSG structures, skyway CAM provisions, TI allowances, and 126 fields in minutes.',
  },
  {
    city: 'San Diego',
    state: 'California',
    stateAbbr: 'CA',
    slug: 'san-diego-commercial-lease-abstraction',
    marketOverview:
      'San Diego has approximately 90 million square feet of commercial space, driven by life sciences, defense contracting, tourism, and technology. The Torrey Pines, Sorrento Valley, and UTC submarkets are global leaders in biotech and pharma research. Defense contractors cluster near military installations in Chula Vista and El Cajon. California tenant protections apply to all San Diego leases.',
    dominantLeaseTypes: ['NNN', 'Modified Gross', 'Full Service Gross'],
    avgLeaseTermYears: '5–12 years',
    keyMarketStats: {
      totalCommercialSqFt: '90M sq ft',
      avgOfficeRentPsf: '$42–$65/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 1',
    },
    commonLeaseStructures:
      'San Diego life sciences leases in Sorrento Valley and Torrey Pines are often NNN or Modified Gross with above-market TI for lab buildouts. Defense contractor leases include security clearance provisions. Office and flex space is Modified Gross. California audit rights are stronger than the national norm and must be specifically extracted.',
    stateSlug: 'california',
    keyFields: [
      'base-rent',
      'tenant-improvement-allowance',
      'permitted-use',
      'cam-charges',
      'cam-cap-percentage',
      'renewal-options',
      'assignment-rights',
    ],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-assignment-rights'],
    faqs: [
      {
        question: 'What makes San Diego life sciences leases complex?',
        answer:
          'Biotech and pharma leases include hazmat storage provisions, specialized HVAC and exhaust systems, above-market TI ($150–$300/sq ft for lab), and strict permitted use restrictions. These require careful abstraction beyond what standard lease templates capture.',
      },
    ],
    metaTitle: 'San Diego Commercial Lease Abstraction',
    metaDescription:
      'AI lease abstraction for San Diego commercial leases. Extract life sciences lab provisions, defense contractor terms, CA-specific fields, and 126 fields in minutes.',
  },

  // ─── Tier 2 ───────────────────────────────────────────────────────────────
  {
    city: 'Austin',
    state: 'Texas',
    stateAbbr: 'TX',
    slug: 'austin-commercial-lease-abstraction',
    marketOverview:
      'Austin has grown into one of the most dynamic commercial real estate markets in the US, driven by tech industry growth, corporate relocations, and a young professional population. The Domain and downtown submarkets are Class A hubs. Industrial demand has surged with the semiconductor and logistics build-out.',
    dominantLeaseTypes: ['NNN', 'Modified Gross', 'Full Service Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '80M sq ft',
      avgOfficeRentPsf: '$42–$65/sq ft',
      vacancyRate: '22%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Austin office leases are predominantly NNN or Modified Gross. The Domain submarket features Class A NNN office. Industrial is NNN. Texas is landlord-friendly, making it critical to negotiate-and extract-CAM caps, audit rights, and termination provisions.',
    stateSlug: 'texas',
    keyFields: ['base-rent', 'cam-charges', 'cam-cap-percentage', 'tenant-improvement-allowance', 'renewal-options', 'termination-options'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-termination-option'],
    faqs: [{ question: 'Is Austin a landlord-friendly market?', answer: 'Texas has no statutory commercial tenant protections, so CAM caps, audit rights, and termination options must be explicitly negotiated. Lextract flags leases missing these provisions.' }],
    metaTitle: 'Austin Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Austin commercial leases. Extract CAM caps, TI allowances, NNN structures, and 126 fields from Austin and Domain leases.',
  },
  {
    city: 'Nashville',
    state: 'Tennessee',
    stateAbbr: 'TN',
    slug: 'nashville-commercial-lease-abstraction',
    marketOverview:
      'Nashville is a fast-growing commercial market driven by healthcare, entertainment, and financial services. The Nashville CBD, Green Hills, and Cool Springs submarkets are active. Tennessee has no state income tax, attracting corporate relocations.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '60M sq ft',
      avgOfficeRentPsf: '$28–$45/sq ft',
      vacancyRate: '19%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Nashville office leases mix NNN and Modified Gross. Healthcare campus leases are often FSG. Industrial is NNN. The healthcare sector drives unique permitted use and build-out provisions.',
    stateSlug: 'tennessee',
    keyFields: ['base-rent', 'cam-charges', 'cam-cap-percentage', 'permitted-use', 'tenant-improvement-allowance', 'renewal-options'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What industries drive Nashville commercial leases?', answer: 'Healthcare is Nashville\'s largest industry, generating hospital system campus leases and medical office building leases with specialized permitted use and TI provisions.' }],
    metaTitle: 'Nashville Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Nashville commercial leases. Extract healthcare provisions, CAM structures, TI allowances, and 126 fields in minutes.',
  },
  {
    city: 'Charlotte',
    state: 'North Carolina',
    stateAbbr: 'NC',
    slug: 'charlotte-commercial-lease-abstraction',
    marketOverview:
      'Charlotte is the second-largest US banking center after New York, with significant commercial real estate driven by Bank of America, Wells Fargo, and Truist. The Uptown, South End, and Ballantyne submarkets are most active. NC is a business-friendly state.',
    dominantLeaseTypes: ['NNN', 'Modified Gross', 'Full Service Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '70M sq ft',
      avgOfficeRentPsf: '$28–$45/sq ft',
      vacancyRate: '20%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Uptown Class A office is FSG or Modified Gross. Suburban office and industrial is NNN. Banking sector campus leases include large TI packages and extended terms.',
    stateSlug: 'north-carolina',
    keyFields: ['base-rent', 'cam-charges', 'tenant-improvement-allowance', 'renewal-options', 'assignment-rights', 'operating-expenses'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-assignment-rights'],
    faqs: [{ question: 'What is typical for Charlotte banking sector leases?', answer: 'Major bank headquarters leases in Charlotte are typically long-term FSG or build-to-suit NNN with large TI packages and complex renewal option structures.' }],
    metaTitle: 'Charlotte Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Charlotte commercial leases. Extract banking sector terms, CAM structures, TI allowances, and 126 fields in minutes.',
  },
  {
    city: 'Orlando',
    state: 'Florida',
    stateAbbr: 'FL',
    slug: 'orlando-commercial-lease-abstraction',
    marketOverview:
      'Orlando is driven by tourism, hospitality, retail, and healthcare. The I-Drive, Lake Nona medical city, and suburban office corridors are key submarkets. Florida\'s landlord-friendly laws and no income tax attract institutional investment.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '80M sq ft',
      avgOfficeRentPsf: '$22–$35/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Orlando retail is predominantly NNN with percentage rent in tourist corridors. Office is Modified Gross. Healthcare campus leases in Lake Nona are specialized. Tourism-related retail leases include gross sales reporting requirements.',
    stateSlug: 'florida',
    keyFields: ['base-rent', 'cam-charges', 'percentage-rent-rate', 'gross-sales-reporting', 'permitted-use', 'renewal-options'],
    localRedFlags: ['missing-cam-cap', 'missing-gross-sales-reporting', 'no-audit-rights'],
    faqs: [{ question: 'What is unique about Orlando tourist corridor leases?', answer: 'Retail leases on International Drive include percentage rent provisions linked to tourist traffic, with gross sales reporting requirements and breakpoints that require careful extraction.' }],
    metaTitle: 'Orlando Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Orlando commercial leases. Extract NNN structures, percentage rent provisions, tourism corridor terms, and 126 fields in minutes.',
  },
  {
    city: 'Tampa',
    state: 'Florida',
    stateAbbr: 'FL',
    slug: 'tampa-commercial-lease-abstraction',
    marketOverview:
      'Tampa Bay is a growing financial services, healthcare, and logistics market. The Westshore district is the premier office submarket. Port Tampa Bay drives significant industrial and logistics demand. Florida\'s no-income-tax environment attracts financial sector relocations.',
    dominantLeaseTypes: ['NNN', 'Modified Gross', 'Full Service Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '70M sq ft',
      avgOfficeRentPsf: '$25–$40/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Westshore office leases are FSG or Modified Gross. Industrial near the port is NNN. Retail in suburban power centers is NNN.',
    stateSlug: 'florida',
    keyFields: ['base-rent', 'cam-charges', 'cam-cap-percentage', 'tenant-improvement-allowance', 'renewal-options', 'operating-expenses'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'How is the Tampa office market structured?', answer: 'Westshore is the dominant submarket with Class A FSG leases. Suburban Class B office uses Modified Gross or NNN. Financial services tenants typically negotiate strong CAM caps and audit rights.' }],
    metaTitle: 'Tampa Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Tampa commercial leases. Extract CAM structures, Westshore FSG provisions, TI allowances, and 126 fields in minutes.',
  },
  {
    city: 'Portland',
    state: 'Oregon',
    stateAbbr: 'OR',
    slug: 'portland-commercial-lease-abstraction',
    marketOverview:
      'Portland has approximately 50 million square feet of commercial space, driven by tech, footwear/apparel (Nike, Adidas), and healthcare. The Pearl District and Lloyd District are key office submarkets. Oregon has progressive tenant-friendly commercial lease laws compared to most states.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross'],
    avgLeaseTermYears: '3–7 years',
    keyMarketStats: {
      totalCommercialSqFt: '50M sq ft',
      avgOfficeRentPsf: '$28–$42/sq ft',
      vacancyRate: '26%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Portland CBD office leases are FSG. Suburban office and industrial use Modified Gross or NNN. The Pearl District retail commands NNN. Elevated vacancy has driven generous concession packages.',
    stateSlug: 'oregon',
    keyFields: ['base-rent', 'cam-charges', 'tenant-improvement-allowance', 'free-rent-period', 'renewal-options', 'subletting-rights'],
    localRedFlags: ['no-audit-rights', 'missing-termination-option', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'How does Portland\'s high vacancy affect lease terms?', answer: 'Portland\'s elevated office vacancy has given tenants leverage to negotiate extended free-rent periods, above-market TI, and favorable sublease rights. Abstracting these concessions accurately is essential for FASB ASC 842 compliance.' }],
    metaTitle: 'Portland Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Portland commercial leases. Extract FSG structures, concession packages, sublease rights, and 126 fields in minutes.',
  },
  {
    city: 'Raleigh',
    state: 'North Carolina',
    stateAbbr: 'NC',
    slug: 'raleigh-commercial-lease-abstraction',
    marketOverview:
      'Raleigh–Durham\'s Research Triangle is one of the fastest-growing life sciences and tech markets in the US. RTP (Research Triangle Park) anchors global pharma and biotech tenants. The market benefits from three major research universities driving innovation.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '45M sq ft',
      avgOfficeRentPsf: '$28–$45/sq ft',
      vacancyRate: '17%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'RTP leases are predominantly NNN or Modified Gross. Life sciences lab leases include above-market TI for specialized buildouts. Office leases near Duke and UNC campuses often include university affiliation provisions.',
    stateSlug: 'north-carolina',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'tenant-improvement-allowance', 'renewal-options', 'assignment-rights'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-assignment-rights'],
    faqs: [{ question: 'What is typical for Research Triangle Park leases?', answer: 'RTP leases are often NNN with specialized lab or flex provisions. Pharma tenants negotiate strong assignment rights for M&A transactions-these are among the most critical fields to abstract.' }],
    metaTitle: 'Raleigh Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Raleigh–Durham commercial leases. Extract Research Triangle Park provisions, lab TI allowances, and 126 fields in minutes.',
  },
  {
    city: 'Kansas City',
    state: 'Missouri',
    stateAbbr: 'MO',
    slug: 'kansas-city-commercial-lease-abstraction',
    marketOverview:
      'Kansas City is a major logistics and distribution hub at the geographic center of the US, with significant industrial real estate. The Power & Light District and Crossroads Arts District anchor the urban office market. Affordable occupancy costs attract corporate relocations.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '65M sq ft',
      avgOfficeRentPsf: '$18–$30/sq ft',
      vacancyRate: '20%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Kansas City industrial leases are NNN with standard annual bumps. Office is Modified Gross. The affordable market means TI packages are relatively modest compared to coastal markets.',
    stateSlug: 'missouri',
    keyFields: ['base-rent', 'cam-charges', 'rent-escalation-rate', 'tenant-improvement-allowance', 'renewal-options', 'permitted-use'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'Why is Kansas City significant for industrial leases?', answer: 'KC sits at the center of the US highway and rail network, making it a strategic distribution hub. Industrial NNN leases here often include rail access provisions, truck court specifications, and clear height requirements.' }],
    metaTitle: 'Kansas City Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Kansas City commercial leases. Extract industrial NNN structures, distribution hub provisions, and 126 fields in minutes.',
  },
  {
    city: 'Salt Lake City',
    state: 'Utah',
    stateAbbr: 'UT',
    slug: 'salt-lake-city-commercial-lease-abstraction',
    marketOverview:
      'Salt Lake City has emerged as a major tech hub-known as the "Silicon Slopes"-with rapidly growing commercial real estate. The Lehi/Draper tech corridor and downtown SLC are most active. Utah is a business-friendly state with strong population and economic growth.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '50M sq ft',
      avgOfficeRentPsf: '$22–$38/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Silicon Slopes tech office leases are NNN or Modified Gross. Industrial in West Valley City is NNN. The market\'s rapid growth means landlords often have leverage, making CAM cap and audit right negotiation especially important.',
    stateSlug: 'utah',
    keyFields: ['base-rent', 'cam-charges', 'cam-cap-percentage', 'tenant-improvement-allowance', 'renewal-options', 'assignment-rights'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-assignment-rights'],
    faqs: [{ question: 'What is the Silicon Slopes commercial lease market like?', answer: 'The Lehi/Draper tech corridor has seen significant rent growth and tight vacancy. Landlords have leverage, making it important for tenants to negotiate and carefully abstract CAM caps, audit rights, and assignment provisions.' }],
    metaTitle: 'Salt Lake City Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Salt Lake City commercial leases. Extract Silicon Slopes tech provisions, CAM structures, and 126 fields in minutes.',
  },
  {
    city: 'San Antonio',
    state: 'Texas',
    stateAbbr: 'TX',
    slug: 'san-antonio-commercial-lease-abstraction',
    marketOverview:
      'San Antonio is driven by military, healthcare (South Texas Medical Center), tourism, and government. The North Central office corridor and medical center are key submarkets. Texas is landlord-friendly.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '65M sq ft',
      avgOfficeRentPsf: '$18–$28/sq ft',
      vacancyRate: '19%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'SA office leases are predominantly NNN or Modified Gross. Medical center leases include specialized healthcare provisions. Military contractor leases have security and termination provisions.',
    stateSlug: 'texas',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'tenant-improvement-allowance', 'renewal-options', 'termination-options'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-termination-option'],
    faqs: [{ question: 'What drives commercial lease complexity in San Antonio?', answer: 'Military contractor leases and healthcare system campus leases dominate. Both categories include specialized provisions-security addenda for defense, ADA and HIPAA context for healthcare-that require careful field extraction.' }],
    metaTitle: 'San Antonio Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for San Antonio commercial leases. Extract military contractor provisions, healthcare terms, and 126 fields in minutes.',
  },
  {
    city: 'Indianapolis',
    state: 'Indiana',
    stateAbbr: 'IN',
    slug: 'indianapolis-commercial-lease-abstraction',
    marketOverview:
      'Indianapolis is a major Midwest logistics hub with over 60 million square feet of commercial space. The market is anchored by distribution, pharma (Eli Lilly HQ), and professional services. Indiana is one of the most landlord-friendly states for commercial leases.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–12 years',
    keyMarketStats: {
      totalCommercialSqFt: '60M sq ft',
      avgOfficeRentPsf: '$18–$28/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Indianapolis industrial leases are NNN with standard 3% annual bumps. Office leases are Modified Gross. The pharmaceutical sector drives specialized lab and manufacturing lease provisions.',
    stateSlug: 'indiana',
    keyFields: ['base-rent', 'cam-charges', 'rent-escalation-rate', 'permitted-use', 'tenant-improvement-allowance', 'renewal-options'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'Is Indianapolis a good market for industrial NNN leases?', answer: 'Yes-Indianapolis has one of the most active industrial NNN markets in the Midwest. Standard provisions include annual 3% bumps, tenant-paid CAM with caps, and renewal options at market rate.' }],
    metaTitle: 'Indianapolis Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Indianapolis commercial leases. Extract industrial NNN structures, pharma provisions, and 126 fields in minutes.',
  },
  {
    city: 'Columbus',
    state: 'Ohio',
    stateAbbr: 'OH',
    slug: 'columbus-commercial-lease-abstraction',
    marketOverview:
      'Columbus is a growing tech and retail hub anchored by Ohio State University, Limited Brands, and a burgeoning tech scene. The Short North, Arena District, and suburban New Albany corridors are active. Intel\'s semiconductor megasite in New Albany is transforming the industrial market.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '60M sq ft',
      avgOfficeRentPsf: '$15–$32/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Columbus office leases are Modified Gross or NNN. Industrial around the Intel campus is NNN with significant rent growth. Retail in Easton Town Center and Short North uses NNN with percentage rent.',
    stateSlug: 'ohio',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'tenant-improvement-allowance', 'renewal-options', 'rent-escalation-rate'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'How is Intel\'s investment affecting Columbus commercial leases?', answer: 'Intel\'s New Albany semiconductor campus is driving significant industrial rent growth in Central Ohio. Industrial NNN leases in this corridor have seen above-average escalation provisions that require careful abstraction.' }],
    metaTitle: 'Columbus Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Columbus commercial leases. Extract industrial NNN provisions, semiconductor corridor terms, and 126 fields in minutes.',
  },
  {
    city: 'Jacksonville',
    state: 'Florida',
    stateAbbr: 'FL',
    slug: 'jacksonville-commercial-lease-abstraction',
    marketOverview:
      'Jacksonville is Florida\'s largest city by area, with significant logistics, finance, and healthcare sectors. The port and JaxPort logistics corridor drive industrial demand. The financial services sector (Bank of America, Deutsche Bank operations) anchors the office market.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '55M sq ft',
      avgOfficeRentPsf: '$15–$32/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Jacksonville industrial leases are NNN. Office is Modified Gross. Port-adjacent logistics leases include truck court and rail access provisions.',
    stateSlug: 'florida',
    keyFields: ['base-rent', 'cam-charges', 'cam-cap-percentage', 'permitted-use', 'renewal-options', 'tenant-improvement-allowance'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What drives Jacksonville\'s commercial lease market?', answer: 'JaxPort is one of the largest container ports on the East Coast, generating significant logistics and industrial NNN lease volume. Financial services back-office leases in the suburbs are typically long-term Modified Gross.' }],
    metaTitle: 'Jacksonville Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Jacksonville commercial leases. Extract logistics provisions, port-area NNN terms, and 126 fields in minutes.',
  },
  {
    city: 'Memphis',
    state: 'Tennessee',
    stateAbbr: 'TN',
    slug: 'memphis-commercial-lease-abstraction',
    marketOverview:
      'Memphis is one of the top logistics and distribution markets in the US, anchored by FedEx World Headquarters and significant air cargo capacity. The market has approximately 65 million square feet of commercial space, predominantly industrial. Office is relatively modest in size.',
    dominantLeaseTypes: ['NNN'],
    avgLeaseTermYears: '5–15 years',
    keyMarketStats: {
      totalCommercialSqFt: '65M sq ft',
      avgOfficeRentPsf: '$16–$25/sq ft',
      vacancyRate: '12%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Memphis industrial leases are almost exclusively NNN with annual 2–3% bumps. FedEx and logistics tenants negotiate large build-to-suit structures with 10–20 year terms. Low vacancy gives landlords strong leverage.',
    stateSlug: 'tennessee',
    keyFields: ['base-rent', 'cam-charges', 'rent-escalation-rate', 'permitted-use', 'renewal-options', 'tenant-improvement-allowance'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What makes Memphis industrial leases unique?', answer: 'Memphis industrial leases are driven by air cargo and FedEx logistics. Build-to-suit leases for distribution facilities often include specialized loading dock, clear height, and refrigeration provisions.' }],
    metaTitle: 'Memphis Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Memphis commercial leases. Extract industrial NNN provisions, logistics build-to-suit terms, and 126 fields in minutes.',
  },
  {
    city: 'Las Vegas',
    state: 'Nevada',
    stateAbbr: 'NV',
    slug: 'las-vegas-commercial-lease-abstraction',
    marketOverview:
      'Las Vegas has approximately 75 million square feet of commercial space dominated by retail, hospitality, and industrial. The Strip retail commands among the highest rents in the US. Nevada has no state income tax and is landlord-friendly. The market has seen significant industrial growth from logistics and e-commerce fulfillment.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–15 years',
    keyMarketStats: {
      totalCommercialSqFt: '75M sq ft',
      avgOfficeRentPsf: '$22–$38/sq ft',
      vacancyRate: '14%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Strip retail leases use NNN with percentage rent. Convention center adjacent retail has unique high-season provisions. Industrial is NNN. Office is Modified Gross. Gaming industry leases often include specialized use provisions.',
    stateSlug: 'nevada',
    keyFields: ['base-rent', 'cam-charges', 'percentage-rent-rate', 'gross-sales-reporting', 'permitted-use', 'renewal-options'],
    localRedFlags: ['missing-gross-sales-reporting', 'missing-cam-cap', 'no-audit-rights'],
    faqs: [{ question: 'How are Las Vegas Strip retail leases structured?', answer: 'Strip retail leases combine high NNN base rents with percentage rent provisions tied to gross sales. Gross sales reporting requirements and breakpoint calculations are among the most critical provisions to extract accurately.' }],
    metaTitle: 'Las Vegas Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Las Vegas commercial leases. Extract Strip retail percentage rent, NNN structures, gaming provisions, and 126 fields in minutes.',
  },
  {
    city: 'Baltimore',
    state: 'Maryland',
    stateAbbr: 'MD',
    slug: 'baltimore-commercial-lease-abstraction',
    marketOverview:
      'Baltimore has approximately 70 million square feet of commercial space, with proximity to Washington DC creating a significant government and defense contractor presence. The biotech and Johns Hopkins medical corridor is a key submarket. The Inner Harbor area has Class A office.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '70M sq ft',
      avgOfficeRentPsf: '$22–$38/sq ft',
      vacancyRate: '20%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Baltimore CBD and Inner Harbor use FSG or Modified Gross. Biotech campus leases near Johns Hopkins include lab-specific provisions. Government contractor leases have security provisions similar to DC.',
    stateSlug: 'maryland',
    keyFields: ['base-rent', 'cam-charges', 'tenant-improvement-allowance', 'permitted-use', 'renewal-options', 'assignment-rights'],
    localRedFlags: ['no-audit-rights', 'missing-cam-cap', 'missing-assignment-rights'],
    faqs: [{ question: 'How does Baltimore\'s proximity to DC affect lease structures?', answer: 'Many Baltimore tenants are government contractors and federal agencies, bringing DC-style FSG leases and security addenda into the market. Termination-for-convenience provisions tied to federal contract renewals are common.' }],
    metaTitle: 'Baltimore Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Baltimore commercial leases. Extract government contractor provisions, biotech lab terms, and 126 fields in minutes.',
  },
  {
    city: 'St. Louis',
    state: 'Missouri',
    stateAbbr: 'MO',
    slug: 'st-louis-commercial-lease-abstraction',
    marketOverview:
      'St. Louis is a diverse Midwest commercial market with strengths in logistics, healthcare (Barnes-Jewish/Washington University), financial services, and manufacturing. Affordable occupancy costs relative to coastal markets drive corporate consolidations into the area.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '60M sq ft',
      avgOfficeRentPsf: '$18–$28/sq ft',
      vacancyRate: '20%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'St. Louis industrial leases are NNN. Office is Modified Gross or FSG in the CBD. Healthcare campus leases are specialized. The market\'s affordability means TI packages are modest.',
    stateSlug: 'missouri',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'tenant-improvement-allowance', 'renewal-options', 'operating-expenses'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What is the St. Louis commercial lease landscape?', answer: 'St. Louis offers one of the most affordable Midwest commercial markets. NNN industrial leases and Modified Gross office leases dominate, with healthcare campus leases representing the most complex provisions to abstract.' }],
    metaTitle: 'St. Louis Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for St. Louis commercial leases. Extract Midwest NNN structures, healthcare provisions, and 126 fields in minutes.',
  },
  {
    city: 'Pittsburgh',
    state: 'Pennsylvania',
    stateAbbr: 'PA',
    slug: 'pittsburgh-commercial-lease-abstraction',
    marketOverview:
      'Pittsburgh has reinvented itself as a tech, robotics, and healthcare hub, anchored by Carnegie Mellon University, University of Pittsburgh, and UPMC health system. The Strip District and Oakland are key innovation corridors. Affordable rents attract tech startups and research institutions.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross'],
    avgLeaseTermYears: '3–8 years',
    keyMarketStats: {
      totalCommercialSqFt: '50M sq ft',
      avgOfficeRentPsf: '$22–$38/sq ft',
      vacancyRate: '22%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Pittsburgh CBD and Oakland office leases are FSG or Modified Gross. Tech and robotics startup leases tend to be shorter term with flexible renewal options. UPMC campus leases are highly specialized.',
    stateSlug: 'pennsylvania',
    keyFields: ['base-rent', 'cam-charges', 'tenant-improvement-allowance', 'renewal-options', 'termination-options', 'assignment-rights'],
    localRedFlags: ['no-audit-rights', 'missing-termination-option', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What drives Pittsburgh commercial lease complexity?', answer: 'CMU and Pitt spin-out tech companies often need early termination flexibility as they scale. UPMC campus healthcare leases have specialized buildout and regulatory provisions. Both require non-standard lease term extraction.' }],
    metaTitle: 'Pittsburgh Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Pittsburgh commercial leases. Extract tech startup provisions, healthcare campus terms, and 126 fields in minutes.',
  },
  {
    city: 'Richmond',
    state: 'Virginia',
    stateAbbr: 'VA',
    slug: 'richmond-commercial-lease-abstraction',
    marketOverview:
      'Richmond is Virginia\'s state capital with a commercial market anchored by government, financial services (Capital One, Markel), and healthcare. The Scott\'s Addition and Downtown submarkets are growing with tech and creative industry tenants.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '40M sq ft',
      avgOfficeRentPsf: '$22–$35/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Richmond office leases are Modified Gross or NNN. Financial services campus leases are long-term. Government facilities use standard public sector structures.',
    stateSlug: 'virginia',
    keyFields: ['base-rent', 'cam-charges', 'tenant-improvement-allowance', 'renewal-options', 'operating-expenses', 'permitted-use'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What is the Richmond commercial lease market like?', answer: 'Richmond\'s market is stable and government/finance-driven. Leases are predominantly NNN or Modified Gross with standard structures. Capital One\'s large campus footprint influences the suburban office market.' }],
    metaTitle: 'Richmond Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Richmond commercial leases. Extract government and finance sector terms, CAM structures, and 126 fields in minutes.',
  },
  {
    city: 'Hartford',
    state: 'Connecticut',
    stateAbbr: 'CT',
    slug: 'hartford-commercial-lease-abstraction',
    marketOverview:
      'Hartford is the insurance capital of the United States, home to Aetna, The Hartford, and Travelers Insurance. The office market is concentrated in the CBD and Blue Hills corridor. Connecticut is a relatively tenant-friendly state with specific commercial lease protections.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '40M sq ft',
      avgOfficeRentPsf: '$18–$30/sq ft',
      vacancyRate: '24%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Hartford CBD office leases are FSG. Insurance company headquarters leases are long-term with complex renewal structures. The market has elevated vacancy, driving significant landlord concessions.',
    stateSlug: 'connecticut',
    keyFields: ['base-rent', 'cam-charges', 'base-year-expense-stop', 'tenant-improvement-allowance', 'renewal-options', 'free-rent-period'],
    localRedFlags: ['no-audit-rights', 'below-market-rent-on-renewal', 'missing-cam-cap'],
    faqs: [{ question: 'Why is Hartford known as the insurance capital?', answer: 'Hartford has the highest concentration of insurance company headquarters in the US. Insurance company leases are typically long-term FSG with complex expense stop provisions and multi-tier renewal options that require careful abstraction.' }],
    metaTitle: 'Hartford Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Hartford commercial leases. Extract insurance sector FSG terms, base year stops, TI allowances, and 126 fields in minutes.',
  },
  {
    city: 'New Orleans',
    state: 'Louisiana',
    stateAbbr: 'LA',
    slug: 'new-orleans-commercial-lease-abstraction',
    marketOverview:
      'New Orleans is a unique commercial market driven by tourism, oil & gas, healthcare, and port logistics. The CBD and French Quarter anchor the office and retail markets. Louisiana has specific commercial lease laws including provisions around hurricane damage and force majeure that are more prominent than in other states.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '3–8 years',
    keyMarketStats: {
      totalCommercialSqFt: '35M sq ft',
      avgOfficeRentPsf: '$18–$30/sq ft',
      vacancyRate: '20%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'NOLA CBD office is Modified Gross. French Quarter retail is NNN. Port and logistics is NNN. Louisiana law requires specific provisions around natural disaster and casualty that appear in most leases.',
    stateSlug: 'louisiana',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'renewal-options', 'termination-options', 'insurance-requirements'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-termination-option'],
    faqs: [{ question: 'What Louisiana-specific provisions appear in New Orleans leases?', answer: 'Louisiana leases routinely include hurricane damage clauses, force majeure provisions, and casualty restoration obligations that are more detailed than in other states. Insurance requirements are also often higher given flood and wind risk.' }],
    metaTitle: 'New Orleans Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for New Orleans commercial leases. Extract Louisiana-specific provisions, hurricane clauses, and 126 fields in minutes.',
  },
  {
    city: 'Oklahoma City',
    state: 'Oklahoma',
    stateAbbr: 'OK',
    slug: 'oklahoma-city-commercial-lease-abstraction',
    marketOverview:
      'Oklahoma City is an energy-driven commercial market with affordable occupancy costs. The Bricktown, Midtown, and Northwest Highway corridors are active. Oklahoma is landlord-friendly with few statutory commercial tenant protections.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '45M sq ft',
      avgOfficeRentPsf: '$16–$26/sq ft',
      vacancyRate: '20%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'OKC office leases are Modified Gross or NNN. Industrial is NNN. Energy sector leases often include early termination provisions tied to commodity price cycles.',
    stateSlug: 'oklahoma',
    keyFields: ['base-rent', 'cam-charges', 'termination-options', 'permitted-use', 'renewal-options', 'tenant-improvement-allowance'],
    localRedFlags: ['missing-termination-option', 'missing-cam-cap', 'no-audit-rights'],
    faqs: [{ question: 'How does the energy sector affect OKC commercial leases?', answer: 'Energy company office leases in OKC often include early termination provisions tied to headcount or commodity prices, given the sector\'s boom-and-bust nature. These termination provisions are among the most important to extract.' }],
    metaTitle: 'Oklahoma City Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Oklahoma City commercial leases. Extract energy sector provisions, termination options, and 126 fields in minutes.',
  },
  {
    city: 'Buffalo',
    state: 'New York',
    stateAbbr: 'NY',
    slug: 'buffalo-commercial-lease-abstraction',
    marketOverview:
      'Buffalo is experiencing a revival driven by healthcare (Kaleida Health, Catholic Health), higher education (UB), and Opportunity Zone development. Canalside and the Medical Campus corridor are key growth areas. Rents are among the most affordable in the Northeast.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '35M sq ft',
      avgOfficeRentPsf: '$14–$24/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Buffalo CBD office is FSG. Healthcare campus leases are specialized. Opportunity Zone projects often have unusual landlord incentive provisions. NY State has stronger tenant protections than most states.',
    stateSlug: 'new-york',
    keyFields: ['base-rent', 'cam-charges', 'tenant-improvement-allowance', 'renewal-options', 'permitted-use', 'operating-expenses'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What is driving Buffalo\'s commercial real estate revival?', answer: 'New York State\'s Buffalo Billion investment and Opportunity Zone development have catalyzed a medical campus and tech sector revival. Leases in OZ areas often include unusual landlord tax credit provisions that affect net effective rent calculations.' }],
    metaTitle: 'Buffalo Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Buffalo commercial leases. Extract Opportunity Zone provisions, healthcare campus terms, and 126 fields in minutes.',
  },
  {
    city: 'Sacramento',
    state: 'California',
    stateAbbr: 'CA',
    slug: 'sacramento-commercial-lease-abstraction',
    marketOverview:
      'Sacramento is California\'s state capital with a commercial market driven by government, healthcare, and agriculture. Affordable rents relative to the Bay Area attract corporate consolidations. California tenant protections apply, making CAM audit rights especially significant.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '3–8 years',
    keyMarketStats: {
      totalCommercialSqFt: '60M sq ft',
      avgOfficeRentPsf: '$24–$38/sq ft',
      vacancyRate: '20%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Sacramento office leases are Modified Gross or NNN. Government facility leases follow state procurement rules. Industrial in the North Natomas corridor is NNN.',
    stateSlug: 'california',
    keyFields: ['base-rent', 'cam-charges', 'cam-cap-percentage', 'tenant-improvement-allowance', 'renewal-options', 'permitted-use'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'How do California laws affect Sacramento commercial leases?', answer: 'California requires stronger CAM audit rights and disclosure obligations than most states. Sacramento leases also frequently include state government standard terms when one party is a state agency.' }],
    metaTitle: 'Sacramento Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Sacramento commercial leases. Extract California-specific provisions, government terms, and 126 fields in minutes.',
  },
  {
    city: 'Albuquerque',
    state: 'New Mexico',
    stateAbbr: 'NM',
    slug: 'albuquerque-commercial-lease-abstraction',
    marketOverview:
      'Albuquerque is driven by government, military (Kirtland AFB, Sandia Labs), higher education (UNM), and healthcare. The Central Corridor and Journal Center office parks are key submarkets. New Mexico is a landlord-friendly state.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '3–8 years',
    keyMarketStats: {
      totalCommercialSqFt: '35M sq ft',
      avgOfficeRentPsf: '$14–$22/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'ABQ office leases are predominantly Modified Gross or NNN. Government and military contractor leases include security provisions. Intel semiconductor operations nearby influence industrial provisions.',
    stateSlug: 'new-mexico',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'renewal-options', 'tenant-improvement-allowance', 'assignment-rights'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-assignment-rights'],
    faqs: [{ question: 'What drives Albuquerque commercial lease demand?', answer: 'Federal government and defense contractors (Sandia Labs, Kirtland AFB) are the dominant tenants. Their leases include security clearance provisions and government termination-for-convenience clauses unique to this market.' }],
    metaTitle: 'Albuquerque Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Albuquerque commercial leases. Extract government contractor provisions, military facility terms, and 126 fields in minutes.',
  },
  {
    city: 'Tucson',
    state: 'Arizona',
    stateAbbr: 'AZ',
    slug: 'tucson-commercial-lease-abstraction',
    marketOverview:
      'Tucson is driven by University of Arizona, Davis-Monthan AFB, Raytheon (defense), and healthcare. The university district and I-10 industrial corridor are key submarkets. Arizona is landlord-friendly.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '3–8 years',
    keyMarketStats: {
      totalCommercialSqFt: '35M sq ft',
      avgOfficeRentPsf: '$16–$24/sq ft',
      vacancyRate: '16%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Tucson office is Modified Gross or NNN. Industrial is NNN. University-adjacent retail has student traffic provisions. Defense contractor leases have specialized security addenda.',
    stateSlug: 'arizona',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'renewal-options', 'tenant-improvement-allowance', 'termination-options'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-termination-option'],
    faqs: [{ question: 'What makes Tucson commercial leases unique?', answer: 'Raytheon and DMAFB defense leases include security provisions not found in standard commercial templates. University of Arizona-driven retail and office leases have seasonal demand provisions tied to academic calendar.' }],
    metaTitle: 'Tucson Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Tucson commercial leases. Extract defense contractor provisions, university district terms, and 126 fields in minutes.',
  },
  {
    city: 'Boise',
    state: 'Idaho',
    stateAbbr: 'ID',
    slug: 'boise-commercial-lease-abstraction',
    marketOverview:
      'Boise is one of the fastest-growing commercial markets in the US, driven by tech, food manufacturing (Lamb Weston, Simplot), and distribution. The Tech Park and downtown corridors are active. Idaho is landlord-friendly with low costs relative to West Coast markets.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '30M sq ft',
      avgOfficeRentPsf: '$22–$35/sq ft',
      vacancyRate: '12%',
      marketTier: 'Tier 2',
    },
    commonLeaseStructures:
      'Boise industrial leases are NNN with above-average rent escalations driven by tight supply. Office is Modified Gross. Tech and food manufacturing leases include specialized utility and power provisions.',
    stateSlug: 'idaho',
    keyFields: ['base-rent', 'cam-charges', 'rent-escalation-rate', 'permitted-use', 'renewal-options', 'utility-responsibilities'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'How fast are Boise commercial rents growing?', answer: 'Boise has seen some of the fastest industrial rent growth in the US due to tight supply and West Coast migration demand. Annual escalation clauses above 3% are increasingly common, making rent escalation provision extraction critical.' }],
    metaTitle: 'Boise Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Boise commercial leases. Extract fast-growth market provisions, industrial NNN structures, and 126 fields in minutes.',
  },

  // ─── Tier 3 ───────────────────────────────────────────────────────────────
  {
    city: 'Omaha',
    state: 'Nebraska',
    stateAbbr: 'NE',
    slug: 'omaha-commercial-lease-abstraction',
    marketOverview:
      'Omaha is a stable Midwest market driven by financial services (Berkshire Hathaway, Union Pacific, Mutual of Omaha), food processing, and logistics. Affordable commercial rents attract back-office operations from coastal firms.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '40M sq ft',
      avgOfficeRentPsf: '$16–$26/sq ft',
      vacancyRate: '16%',
      marketTier: 'Tier 3',
    },
    commonLeaseStructures:
      'Omaha office is Modified Gross or NNN. Industrial is NNN. Financial services back-office leases are long-term with stable structures.',
    stateSlug: 'nebraska',
    keyFields: ['base-rent', 'cam-charges', 'tenant-improvement-allowance', 'renewal-options', 'operating-expenses', 'permitted-use'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What is the Omaha commercial lease market like?', answer: 'Omaha is one of the most stable and affordable commercial markets in the Midwest. Berkshire Hathaway and Union Pacific anchor large campus leases. Most leases are straightforward NNN or Modified Gross.' }],
    metaTitle: 'Omaha Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Omaha commercial leases. Extract financial services provisions, Midwest NNN structures, and 126 fields in minutes.',
  },
  {
    city: 'Louisville',
    state: 'Kentucky',
    stateAbbr: 'KY',
    slug: 'louisville-commercial-lease-abstraction',
    marketOverview:
      'Louisville is a major logistics hub anchored by UPS Worldport (the largest air cargo hub in the world), bourbon/food manufacturing, and healthcare. The I-65 industrial corridor has some of the strongest industrial fundamentals in the region.',
    dominantLeaseTypes: ['NNN'],
    avgLeaseTermYears: '5–15 years',
    keyMarketStats: {
      totalCommercialSqFt: '45M sq ft',
      avgOfficeRentPsf: '$16–$26/sq ft',
      vacancyRate: '14%',
      marketTier: 'Tier 3',
    },
    commonLeaseStructures:
      'Louisville industrial leases are predominantly NNN. UPS build-to-suit leases are among the largest in the country. Office is Modified Gross. Bourbon distillery real estate has specialized use and equipment provisions.',
    stateSlug: 'kentucky',
    keyFields: ['base-rent', 'cam-charges', 'rent-escalation-rate', 'permitted-use', 'renewal-options', 'tenant-improvement-allowance'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What makes Louisville industrial leases unique?', answer: 'UPS Worldport operations generate massive build-to-suit and NNN industrial leases with specialized air cargo provisions. Bourbon distillery leases include unique equipment storage, aging warehouse, and production use provisions.' }],
    metaTitle: 'Louisville Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Louisville commercial leases. Extract UPS logistics provisions, bourbon industry terms, and 126 fields in minutes.',
  },
  {
    city: 'Birmingham',
    state: 'Alabama',
    stateAbbr: 'AL',
    slug: 'birmingham-commercial-lease-abstraction',
    marketOverview:
      'Birmingham is Alabama\'s largest city with a commercial market driven by healthcare (UAB Health System), finance, and manufacturing. Affordable occupancy costs attract regional headquarters. Alabama is a landlord-friendly state.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–10 years',
    keyMarketStats: {
      totalCommercialSqFt: '35M sq ft',
      avgOfficeRentPsf: '$14–$22/sq ft',
      vacancyRate: '18%',
      marketTier: 'Tier 3',
    },
    commonLeaseStructures:
      'Birmingham office is Modified Gross or NNN. UAB healthcare campus leases are specialized. Industrial is NNN.',
    stateSlug: 'alabama',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'tenant-improvement-allowance', 'renewal-options', 'operating-expenses'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What is the Birmingham commercial lease market like?', answer: 'UAB is the dominant economic force, generating large medical campus and research facility leases. Finance sector back-office and Regions Bank operations add traditional office demand.' }],
    metaTitle: 'Birmingham Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Birmingham commercial leases. Extract healthcare campus provisions, Alabama NNN structures, and 126 fields in minutes.',
  },
  {
    city: 'Knoxville',
    state: 'Tennessee',
    stateAbbr: 'TN',
    slug: 'knoxville-commercial-lease-abstraction',
    marketOverview:
      'Knoxville is driven by University of Tennessee, Oak Ridge National Laboratory, manufacturing, and healthcare. The West Knoxville and downtown corridors are most active. Tennessee is business-friendly with no state income tax.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '3–8 years',
    keyMarketStats: {
      totalCommercialSqFt: '25M sq ft',
      avgOfficeRentPsf: '$14–$22/sq ft',
      vacancyRate: '16%',
      marketTier: 'Tier 3',
    },
    commonLeaseStructures:
      'Knoxville office is Modified Gross or NNN. Oak Ridge research facility leases have DOE/government provisions. Manufacturing leases are NNN.',
    stateSlug: 'tennessee',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'renewal-options', 'tenant-improvement-allowance', 'assignment-rights'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-assignment-rights'],
    faqs: [{ question: 'What makes Knoxville commercial leases unique?', answer: 'Oak Ridge National Laboratory and DOE facility leases have federal government provisions. UT-affiliated research and startup leases are shorter-term with flexible provisions for rapid scaling.' }],
    metaTitle: 'Knoxville Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Knoxville commercial leases. Extract government lab provisions, university district terms, and 126 fields in minutes.',
  },
  {
    city: 'Greenville',
    state: 'South Carolina',
    stateAbbr: 'SC',
    slug: 'greenville-commercial-lease-abstraction',
    marketOverview:
      'Greenville–Spartanburg is a major advanced manufacturing hub anchored by BMW\'s US manufacturing plant, Michelin North America HQ, and significant German/European automotive supplier presence. Industrial real estate fundamentals are among the strongest in the Southeast.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '5–15 years',
    keyMarketStats: {
      totalCommercialSqFt: '25M sq ft',
      avgOfficeRentPsf: '$16–$26/sq ft',
      vacancyRate: '12%',
      marketTier: 'Tier 3',
    },
    commonLeaseStructures:
      'Greenville industrial leases are predominantly NNN. BMW and automotive supplier leases include specialized manufacturing and equipment provisions. Office is Modified Gross.',
    stateSlug: 'south-carolina',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'renewal-options', 'tenant-improvement-allowance', 'utility-responsibilities'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What drives Greenville commercial lease demand?', answer: 'BMW\'s Spartanburg plant and its massive supply chain generate industrial NNN leases with specialized manufacturing use provisions. Foreign tenant leases (German, Japanese suppliers) often require careful assignment and subletting rights extraction.' }],
    metaTitle: 'Greenville Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Greenville commercial leases. Extract automotive manufacturing provisions, industrial NNN terms, and 126 fields in minutes.',
  },
  {
    city: 'Spokane',
    state: 'Washington',
    stateAbbr: 'WA',
    slug: 'spokane-commercial-lease-abstraction',
    marketOverview:
      'Spokane is Eastern Washington\'s primary commercial market, driven by healthcare (Providence, MultiCare), higher education (WSU, Gonzaga), and distribution. Significantly more affordable than Seattle, Spokane attracts Pacific Northwest operations seeking lower costs.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '3–8 years',
    keyMarketStats: {
      totalCommercialSqFt: '25M sq ft',
      avgOfficeRentPsf: '$16–$26/sq ft',
      vacancyRate: '16%',
      marketTier: 'Tier 3',
    },
    commonLeaseStructures:
      'Spokane office is Modified Gross or NNN. Healthcare campus leases are specialized. Industrial is NNN. Washington State tenant protections apply.',
    stateSlug: 'washington',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'tenant-improvement-allowance', 'renewal-options', 'operating-expenses'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'How does Spokane compare to Seattle for commercial leases?', answer: 'Spokane offers 40–60% lower commercial rents than Seattle with similar Washington State tenant protections. Healthcare and distribution operations often relocate or expand to Spokane from Seattle for cost savings.' }],
    metaTitle: 'Spokane Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Spokane commercial leases. Extract healthcare provisions, Pacific Northwest NNN terms, and 126 fields in minutes.',
  },
  {
    city: 'Little Rock',
    state: 'Arkansas',
    stateAbbr: 'AR',
    slug: 'little-rock-commercial-lease-abstraction',
    marketOverview:
      'Little Rock is Arkansas\'s state capital with a commercial market driven by government, healthcare, retail, and logistics. Walmart HQ proximity in Bentonville influences Northwest Arkansas more, but Little Rock benefits from state government and healthcare sector stability.',
    dominantLeaseTypes: ['NNN', 'Modified Gross'],
    avgLeaseTermYears: '3–8 years',
    keyMarketStats: {
      totalCommercialSqFt: '20M sq ft',
      avgOfficeRentPsf: '$14–$15/sq ft',
      vacancyRate: '16%',
      marketTier: 'Tier 3',
    },
    commonLeaseStructures:
      'Little Rock office is Modified Gross. Government facilities follow state procurement rules. Industrial and retail are NNN.',
    stateSlug: 'arkansas',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'renewal-options', 'tenant-improvement-allowance', 'operating-expenses'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'below-market-rent-on-renewal'],
    faqs: [{ question: 'What characterizes the Little Rock commercial lease market?', answer: 'Government and healthcare anchor the market. Leases are straightforward Modified Gross or NNN. The state government standard lease template is widely used and has specific provisions around budget appropriation contingencies.' }],
    metaTitle: 'Little Rock Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Little Rock commercial leases. Extract government provisions, Arkansas NNN structures, and 126 fields in minutes.',
  },
  {
    city: 'Madison',
    state: 'Wisconsin',
    stateAbbr: 'WI',
    slug: 'madison-commercial-lease-abstraction',
    marketOverview:
      'Madison is anchored by the University of Wisconsin and state government, with a growing biotech and tech sector. Epic Systems (healthcare IT) is the dominant private employer. The isthmus downtown and University Ave corridor are key submarkets.',
    dominantLeaseTypes: ['Full Service Gross', 'Modified Gross'],
    avgLeaseTermYears: '3–8 years',
    keyMarketStats: {
      totalCommercialSqFt: '25M sq ft',
      avgOfficeRentPsf: '$18–$28/sq ft',
      vacancyRate: '12%',
      marketTier: 'Tier 3',
    },
    commonLeaseStructures:
      'Madison CBD office is FSG. University-adjacent research and biotech leases are specialized. Epic Systems dominates the Verona suburb with a massive campus. State government uses standard procurement leases.',
    stateSlug: 'wisconsin',
    keyFields: ['base-rent', 'cam-charges', 'permitted-use', 'tenant-improvement-allowance', 'renewal-options', 'assignment-rights'],
    localRedFlags: ['missing-cam-cap', 'no-audit-rights', 'missing-assignment-rights'],
    faqs: [{ question: 'What drives Madison commercial real estate?', answer: 'UW-Madison and Epic Systems are the two dominant forces. Epic\'s Verona campus lease is one of the largest single-tenant occupancies in the state. University research spin-out leases require careful permitted use and assignment provision extraction.' }],
    metaTitle: 'Madison Commercial Lease Abstraction',
    metaDescription: 'AI lease abstraction for Madison commercial leases. Extract university provisions, Epic Systems terms, biotech lease fields, and 126 fields in minutes.',
  },
]

const ALL_LOCATIONS = [...LOCATIONS]
export const INDEXABLE_LOCATIONS = filterRetainedSeoItems('locations', ALL_LOCATIONS)

export function getLocationBySlug(slug: string): LocationData | undefined {
  return ALL_LOCATIONS.find((l) => l.slug === slug)
}

export function getAllLocationSlugs(): string[] {
  return ALL_LOCATIONS.map((l) => l.slug)
}

export function getIndexableLocationBySlug(slug: string): LocationData | undefined {
  return INDEXABLE_LOCATIONS.find((l) => l.slug === slug)
}

export function getAllIndexableLocationSlugs(): string[] {
  return INDEXABLE_LOCATIONS.map((l) => l.slug)
}

export function getLocationSeoRedirect(slug: string): string | null {
  if (isRetainedSeoSlug('locations', slug)) return null
  const location = ALL_LOCATIONS.find((entry) => entry.slug === slug)
  if (!location) return null
  // Not every stateSlug has a state page -- Washington DC is a federal
  // district, not one of the 50 states in states.ts. Redirecting there
  // unconditionally sent a 308 into a 404, which is worse for both users and
  // crawlers than landing on the index.
  if (getStateBySlug(location.stateSlug) === undefined) return '/resources/states'
  return `/resources/states/${location.stateSlug}`
}
