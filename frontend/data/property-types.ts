// ─── Property Type Interface ──────────────────────────────────────────

export interface PropertyType {
  name: string
  slug: string
  overview: string
  typicalLeaseStructure: string
  avgTermRange: string
  criticalFields: string[]
  commonRedFlags: string[]
  typicalTenants: string
  extractionConsiderations: string
  faqs: Array<{ question: string; answer: string }>
  relatedIndustries: string[]
  metaTitle: string
  metaDescription: string
  relatedPropertyTypes?: string[]
}

// ─── Property Type Data ───────────────────────────────────────────────

export const PROPERTY_TYPES: PropertyType[] = [
  {
    name: 'Office Buildings',
    slug: 'office-buildings',
    overview:
      'Office buildings encompass a broad spectrum of commercial real estate - from Class A downtown towers to suburban campus-style office parks - and represent one of the most complex lease structures in commercial real estate due to the prevalence of base-year expense pass-throughs, tenant improvement allowances, and multi-layered rent structures. Office leases are typically written as modified gross or full-service gross leases, with the landlord responsible for building operating expenses up to a defined base year or expense stop threshold.',
    typicalLeaseStructure:
      'The standard office lease structure is the full-service gross lease or modified gross lease. The tenant pays a stated base rent that includes building operating expenses up to the base year level; any increases above the base year are passed through to the tenant as "expense escalations." Large tenants (10,000+ RSF) often negotiate NNN structures with direct operating expense responsibility. Tenant improvement allowances are the primary landlord concession, typically ranging from $50 to $150 per RSF in primary markets depending on market conditions and lease term length.',
    avgTermRange: '5–10 years',
    criticalFields: [
      'base-rent',
      'rentable-square-footage',
      'usable-square-footage',
      'base-year',
      'expense-stop',
      'tenant-improvement-allowance',
      'rent-escalation-rate',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'parking-spaces',
    ],
    commonRedFlags: [
      'RF-005',
      'RF-013',
      'RF-002',
      'RF-008',
      'RF-011',
    ],
    typicalTenants:
      'Professional services firms (law, accounting, consulting), technology companies, financial services institutions, insurance companies, government agencies, healthcare companies, and corporate headquarters operations. Office tenants typically have established credit histories and multi-year planning horizons, making them generally lower credit risk than retail tenants.',
    extractionConsiderations:
      'Office leases frequently contain complex base-year and expense stop provisions that require careful extraction to avoid misrepresenting the true economic rent. The rentable-to-usable square footage ratio (the "load factor") is essential to extract, as it determines the tenant\'s proportionate share of building common areas and directly affects rent per usable foot calculations. Parking ratios and parking rent are critical in suburban office markets where parking is a competitive differentiator. Multi-floor leases may have floor-by-floor commencement and expiration dates that require granular extraction.',
    faqs: [
      {
        question: 'What is the difference between rentable and usable square footage in an office lease?',
        answer:
          'Usable square footage is the actual space the tenant occupies exclusively, measured from wall to wall. Rentable square footage adds the tenant\'s proportionate share of building common areas (lobbies, corridors, restrooms, mechanical rooms) to the usable area. Most tenants pay rent on rentable square footage, so a building with a 20% "load factor" means a tenant paying for 10,000 RSF actually uses only 8,333 square feet of office space.',
      },
      {
        question: 'How does the base year expense stop work in an office lease?',
        answer:
          'The base year is typically the first full calendar year of the lease. The landlord pays all operating expenses in that year. Starting year two, the tenant pays its proportionate share of any operating expense increases above the base year total. If base year expenses were $15 per RSF and year three expenses are $17 per RSF, the tenant pays an additional $2 per RSF in that year.',
      },
      {
        question: 'What is a standard tenant improvement allowance for office space?',
        answer:
          'TI allowances vary significantly by market, building class, and lease term. In primary markets, Class A office TI allowances typically range from $75 to $150 per RSF for new construction and $50 to $100 per RSF for second-generation space. Secondary markets and Class B buildings offer lower allowances of $30 to $60 per RSF. The allowance is usually tied to the lease term - longer leases command higher TI allowances.',
      },
    ],
    relatedIndustries: ['legal-services', 'accounting-consulting', 'financial-services', 'technology'],
    metaTitle: 'Office Building Lease Abstraction',
    metaDescription:
      'Extract critical data from office building leases: base year, expense stops, TI allowances, rentable vs. usable SF, and renewal options. Office lease abstraction guide.',
  },
  {
    name: 'Retail Strip Centers',
    slug: 'retail-strip-centers',
    overview:
      'Retail strip centers are open-air shopping centers containing multiple retail tenants in a single-story or low-rise configuration, typically anchored by a grocery store, drug store, or national retailer. Leases in strip centers are predominantly triple-net (NNN) structures where tenants pay base rent plus their proportionate share of property taxes, insurance, and common area maintenance expenses. Strip centers are the most common retail property type in suburban markets and represent a significant portion of the commercial lease abstraction workload.',
    typicalLeaseStructure:
      'Triple-net (NNN) leases dominate the strip center market, with tenants responsible for their proportionate share of real estate taxes, property insurance, and CAM expenses in addition to base rent. CAM expenses include parking lot maintenance, landscaping, snow removal, and common area utilities. Most strip center leases include annual CAM reconciliation processes where estimated monthly payments are trued up against actual annual expenses, creating a critical extraction and audit workflow.',
    avgTermRange: '5–10 years',
    criticalFields: [
      'base-rent',
      'cam-charges',
      'cam-cap',
      'real-estate-taxes',
      'property-insurance',
      'rentable-square-footage',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'co-tenancy-requirement',
      'exclusive-use',
      'permitted-use',
    ],
    commonRedFlags: [
      'RF-001',
      'RF-003',
      'RF-006',
      'RF-004',
      'RF-012',
    ],
    typicalTenants:
      'National and regional retailers, franchise food and beverage operators, personal service businesses (salons, dry cleaners, insurance agencies), medical and dental clinics, fitness studios, and specialty food retailers. Anchor tenants are typically grocery chains, drug store operators, or discount retailers. In-line tenants range from national chains to local operators, with creditworthiness varying significantly across the tenant mix.',
    extractionConsiderations:
      'Strip center leases require careful extraction of CAM exclusions - the specific expense categories the landlord has agreed to exclude from the CAM pool - as these directly determine the tenant\'s actual expense exposure. The CAM cap structure (whether it is a cumulative cap, year-over-year cap, or applies to controllable expenses only) significantly affects the tenant\'s upside cost exposure and must be precisely captured. Co-tenancy clauses with named anchors require extraction of both the triggering condition and the specific remedy (reduced rent, termination right, or percentage rent only).',
    faqs: [
      {
        question: 'What expenses are typically included in CAM charges for a strip center?',
        answer:
          'CAM charges typically include parking lot maintenance and resurfacing, landscaping, snow removal, common area lighting and utilities, property management fees, security, and repairs to shared building systems. Tenants should negotiate to exclude capital expenditures, landlord profit margins above a reasonable management fee, and structural repairs from the CAM pool.',
      },
      {
        question: 'What is a typical CAM cap in a strip center lease?',
        answer:
          'Most modern strip center leases include a CAM cap limiting annual increases in controllable expenses (excluding taxes, insurance, and utilities) to 3%–5% per year. Cumulative caps allow unused capacity to roll forward, which is generally less favorable to tenants than non-cumulative caps. The cap structure and baseline year are critical to model accurately.',
      },
      {
        question: 'How does a co-tenancy clause work in a strip center?',
        answer:
          'A co-tenancy clause typically names one or more anchor tenants (e.g., the grocery store, drug store) and provides that if the named anchor closes or reduces occupancy below a specified square footage, the in-line tenant may pay reduced rent or terminate the lease after a cure period. The specific anchor names, size thresholds, cure periods, and remedy amounts must all be extracted precisely.',
      },
    ],
    relatedIndustries: ['food-beverage', 'personal-services', 'healthcare', 'fitness-wellness'],
    metaTitle: 'Retail Strip Center Lease Abstraction',
    metaDescription:
      'Extract NNN lease data from retail strip center leases: CAM charges, caps, co-tenancy clauses, exclusive use rights, and anchor provisions. Strip center lease guide.',
  },
  {
    name: 'Shopping Malls',
    slug: 'shopping-malls',
    overview:
      'Shopping malls are enclosed retail centers anchored by major department stores or national retailers, with in-line tenants occupying smaller spaces accessed by enclosed common areas. Mall leases are among the most complex retail lease structures, typically featuring percentage rent provisions, co-tenancy protections tied to anchor department stores, continuous operation requirements, and strict visual merchandise requirements. The decline of department store anchors has made co-tenancy provisions especially critical in contemporary mall leases.',
    typicalLeaseStructure:
      'Mall leases typically combine a base rent component with a percentage rent structure where the tenant pays a specified percentage of gross sales above a "natural breakpoint" (the level at which percentage rent equals base rent). Common percentage rent rates range from 5% to 8% of gross sales for in-line retail. Marketing fund contributions and merchant association dues are nearly universal additional charges. CAM charges in malls often include enclosed common area HVAC, security, and interior maintenance costs that are more extensive than open-air center CAM.',
    avgTermRange: '5–10 years',
    criticalFields: [
      'base-rent',
      'percentage-rent-rate',
      'percentage-rent-breakpoint',
      'cam-charges',
      'co-tenancy-requirement',
      'continuous-operation',
      'rentable-square-footage',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'permitted-use',
    ],
    commonRedFlags: [
      'RF-001',
      'RF-003',
      'RF-006',
      'RF-012',
      'RF-008',
    ],
    typicalTenants:
      'National specialty retailers, fashion brands, luxury goods retailers, food court operators, entertainment concepts, department store anchors, cinemas, and fitness centers. Mall tenants are predominantly national and regional chains with established brand recognition. The trend toward "experiential retail" has brought fitness, entertainment, and food hall concepts into the mall tenant mix.',
    extractionConsiderations:
      'Mall leases require precise extraction of the percentage rent calculation mechanism - specifically whether the breakpoint is a "natural breakpoint" (base rent divided by the percentage rate) or an "artificial breakpoint" set higher than the natural breakpoint to reduce percentage rent payments. Reporting and auditing obligations for gross sales are extensive and must be extracted in full. Co-tenancy provisions naming specific department store anchors are particularly critical given the ongoing contraction of the department store sector, and must be extracted with full detail on triggering events, cure periods, and tenant remedies.',
    faqs: [
      {
        question: 'What is percentage rent and how is it calculated?',
        answer:
          'Percentage rent is additional rent based on a percentage of the tenant\'s gross sales above a defined breakpoint. If the base rent is $100,000 per year and the percentage rent rate is 6%, the natural breakpoint is $1,666,667 (base rent divided by percentage rate). If sales reach $2 million, the tenant pays an additional $15,000 in percentage rent (6% of the $333,333 excess above the breakpoint).',
      },
      {
        question: 'How do co-tenancy clauses work in mall leases?',
        answer:
          'Mall co-tenancy clauses typically name specific department store anchors (e.g., Macy\'s, Nordstrom) and provide remedies if those anchors vacate. Remedies often include a period of paying percentage rent only (in lieu of base rent), followed by a termination right if the anchor space remains vacant for an extended period. With multiple anchor closures in recent years, these clauses have become highly significant.',
      },
      {
        question: 'Are marketing fund and merchant association contributions required?',
        answer:
          'In most mall leases, tenants are required to contribute to a marketing fund or merchant association that finances shared advertising, events, and promotions for the center. Contributions are typically calculated as a per-square-foot annual charge, often ranging from $1.50 to $4.00 per RSF. These contributions are in addition to CAM charges and must be extracted separately.',
      },
    ],
    relatedIndustries: ['fashion-retail', 'food-beverage', 'entertainment', 'luxury-goods'],
    metaTitle: 'Shopping Mall Lease Abstraction',
    metaDescription:
      'Extract percentage rent, co-tenancy, and anchor provisions from shopping mall leases. Complete guide to mall lease abstraction with key fields and red flags.',
  },
  {
    name: 'Industrial Warehouses',
    slug: 'industrial-warehouses',
    overview:
      'Industrial warehouse properties are typically single-tenant or multi-tenant facilities used for distribution, storage, manufacturing, and logistics operations. Warehouse leases are predominantly triple-net (NNN) structures with relatively straightforward expense pass-through mechanics compared to retail leases. The surge in e-commerce has dramatically increased demand for industrial warehouse space, making lease abstraction of industrial portfolios a high-priority task for institutional investors and corporate real estate teams managing distribution networks.',
    typicalLeaseStructure:
      'Industrial warehouse leases are almost universally triple-net, with the tenant responsible for all operating costs including property taxes, insurance, and maintenance. Single-tenant industrial leases often feature absolute NNN structures where the tenant is responsible for roof, structure, and parking lot replacement - making the landlord essentially a pure capital provider. Multi-tenant industrial buildings use modified gross or modified NNN structures with landlord responsibility for structural components. Lease terms are longer than retail given the significant build-out costs for specialized operations.',
    avgTermRange: '5–15 years',
    criticalFields: [
      'base-rent',
      'rentable-square-footage',
      'clear-height',
      'dock-doors',
      'drive-in-doors',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'real-estate-taxes',
      'property-insurance',
      'permitted-use',
      'assignment-rights',
    ],
    commonRedFlags: [
      'RF-010',
      'RF-009',
      'RF-011',
      'RF-007',
      'RF-008',
    ],
    typicalTenants:
      'E-commerce fulfillment operations, third-party logistics (3PL) providers, manufacturers, distributors, food and beverage cold storage operators, pharmaceutical distributors, building materials suppliers, and automotive parts distributors. Industrial tenants tend to be larger companies with established credit profiles, and single-tenant industrial leases are frequently structured as credit leases valued on the strength of the tenant\'s covenant.',
    extractionConsiderations:
      'Industrial lease abstraction requires attention to physical property specifications that directly affect operational usability: clear height (the usable height inside the warehouse for racking), dock door count and type, drive-in door specifications, column spacing, and yard/trailer storage area provisions. Environmental use provisions are critical - permitted use clauses in industrial leases must be extracted precisely because hazardous materials use, food processing, cold storage, and other specialized uses have significant insurance and regulatory compliance implications. HVAC provisions in industrial leases vary enormously - from heated-only shells to full climate control - affecting operating costs significantly.',
    faqs: [
      {
        question: 'What physical specifications are most important to extract from an industrial lease?',
        answer:
          'Clear height (the usable interior height for storage racking), dock door count and configuration, drive-in door count, column spacing (which determines racking layout), truck court depth, and power specifications (amperage, voltage, and transformer capacity) are the most operationally significant physical specifications. These directly determine the maximum operational capacity of the facility.',
      },
      {
        question: 'What is the difference between a single-tenant and multi-tenant industrial lease?',
        answer:
          'Single-tenant industrial leases typically cover the entire building with the tenant responsible for all expenses including structural components, parking lots, and the roof. Multi-tenant industrial leases allocate common area costs proportionately and reserve structural responsibility to the landlord. Absolute NNN single-tenant leases can have the tenant responsible even for catastrophic structural repairs, making the property specification and condition at lease commencement critically important.',
      },
      {
        question: 'How are restoration obligations typically structured in industrial leases?',
        answer:
          'Industrial tenants who install mezzanines, specialized racking systems, custom electrical, or HVAC modifications may be required to restore the space to base building condition at lease expiration. Restoration obligations can be significant cost items for industrial operations with heavy infrastructure. Restoration provisions should be precisely extracted and reviewed during due diligence to model end-of-lease cost obligations accurately.',
      },
    ],
    relatedIndustries: ['logistics-distribution', 'manufacturing', 'food-beverage', 'pharmaceutical'],
    metaTitle: 'Industrial Warehouse Lease Abstraction',
    metaDescription:
      'Extract critical data from industrial warehouse leases: clear height, dock doors, NNN obligations, permitted use, and renewal options. Industrial lease abstraction guide.',
  },
  {
    name: 'Flex Industrial',
    slug: 'flex-industrial',
    overview:
      'Flex industrial properties combine warehouse/distribution space with office space under the same roof, typically in a ratio ranging from 20%/80% to 50%/50% office-to-warehouse. These properties serve tenants who need both operational space for light manufacturing, storage, or distribution and office space for administrative functions, making them a hybrid product between traditional office and industrial leases. Flex industrial is one of the fastest-growing industrial subtypes due to its adaptability to a wide range of tenant uses.',
    typicalLeaseStructure:
      'Flex industrial leases are commonly structured as modified NNN or gross leases, with the landlord responsible for the structural shell and the tenant responsible for interior maintenance and operating costs within its space. CAM charges for flex industrial cover exterior maintenance, landscaping, and shared parking areas. Rent is typically quoted as a single blended rate per square foot covering both office and warehouse components, though some leases bifurcate the rate.',
    avgTermRange: '3–7 years',
    criticalFields: [
      'base-rent',
      'rentable-square-footage',
      'permitted-use',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'tenant-improvement-allowance',
      'cam-charges',
      'real-estate-taxes',
      'property-insurance',
    ],
    commonRedFlags: [
      'RF-009',
      'RF-010',
      'RF-011',
      'RF-007',
      'RF-008',
    ],
    typicalTenants:
      'Technology hardware companies, light manufacturers, medical device companies, trade contractors, data and telecommunications service providers, creative production companies, and professional services firms requiring on-site storage or fabrication capabilities. The diverse tenant mix of flex industrial properties reflects the breadth of industries that need hybrid operational and administrative space.',
    extractionConsiderations:
      'Flex industrial leases require extraction of the specific office-to-warehouse ratio, as this affects the applicable rent rate, insurance requirements, and permitted use parameters. Landlords of flex properties often restrict modifications to the office component separately from the warehouse, requiring granular extraction of the build-out and restoration provisions. Utility provisions must be extracted carefully, as the HVAC, power, and plumbing configurations of flex properties vary widely by vintage and location.',
    faqs: [
      {
        question: 'What is the typical office-to-warehouse ratio in a flex industrial property?',
        answer:
          'Flex industrial properties commonly range from 10% to 50% office space, with the remainder as open warehouse or light manufacturing area. The ratio affects heating costs (office areas are typically fully climate-controlled while warehouse areas may be heated-only), insurance requirements, and permitted occupancy classifications. The ratio is typically defined in the lease or the floor plan attached as an exhibit.',
      },
      {
        question: 'Can flex industrial space accommodate hazardous materials storage?',
        answer:
          'Many flex industrial leases restrict or prohibit hazardous materials storage due to fire code compliance, environmental liability, and insurance constraints. Permitted use provisions must be extracted precisely to determine what materials and processes are allowed. Tenants with hazardous materials needs should verify local zoning, building code compliance, and fire suppression adequacy before occupying a flex space.',
      },
      {
        question: 'How are tenant improvements typically handled in flex industrial leases?',
        answer:
          'Flex industrial landlords frequently offer modest TI allowances for office improvements (typically $15–$40 per RSF), with the warehouse area delivered as a raw shell. Tenants are typically responsible for all warehouse build-out costs including specialized racking, electrical upgrades, and HVAC enhancements. Restoration obligations may require the tenant to remove improvements and restore to base condition at expiration.',
      },
    ],
    relatedIndustries: ['technology', 'light-manufacturing', 'medical-devices', 'trade-contractors'],
    metaTitle: 'Flex Industrial Lease Abstraction',
    metaDescription:
      'Extract key data from flex industrial leases combining office and warehouse space. Guide to permitted use, TI allowances, CAM charges, and restoration provisions.',
  },
  {
    name: 'Medical Office',
    slug: 'medical-office',
    overview:
      'Medical office properties are purpose-built or converted facilities housing healthcare providers including physician practices, surgical centers, diagnostic imaging, physical therapy, and specialty clinics. Medical office leases are among the most complex in commercial real estate due to significant tenant improvement requirements, specialized utility provisions, regulatory compliance obligations, and the strategic importance of location to healthcare referral networks. The sector has experienced strong institutional investment demand driven by the stability of healthcare tenants and the difficulty of relocating established practices.',
    typicalLeaseStructure:
      'Medical office leases are typically modified gross or triple-net structures, depending on property type and location. Hospital-adjacent medical office buildings (MOBs) often use gross leases with hospital-managed operating expenses, while freestanding medical properties are more commonly NNN. Tenant improvement allowances in medical office are among the highest in commercial real estate, reflecting the cost of plumbing, medical gas systems, lead shielding for imaging, and other specialized infrastructure - typically ranging from $80 to $200 per RSF in established markets.',
    avgTermRange: '5–15 years',
    criticalFields: [
      'base-rent',
      'rentable-square-footage',
      'usable-square-footage',
      'tenant-improvement-allowance',
      'permitted-use',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'assignment-rights',
      'subletting-rights',
      'cam-charges',
      'utilities',
    ],
    commonRedFlags: [
      'RF-011',
      'RF-010',
      'RF-009',
      'RF-007',
      'RF-002',
    ],
    typicalTenants:
      'Physician practices across all specialties, dental practices, physical and occupational therapy clinics, imaging centers, urgent care operators, surgery centers, dialysis providers, and behavioral health practices. Medical tenants are prized for long lease terms, high renewal probability (due to the cost and disruption of relocating a medical practice), and creditworthy payers including large hospital systems and established practice groups.',
    extractionConsiderations:
      'Medical office leases require extraction of specialized provisions not found in standard commercial leases: HIPAA compliance obligations affecting shared common areas, medical waste disposal responsibilities, required utility provisions (emergency power, medical gas), and healthcare-specific permitted use definitions that affect which specialties can operate in the space. Assignment clauses in medical office leases often include restrictions on transfers to competing healthcare systems or require landlord consent for practice acquisitions, making them especially important to extract for healthcare acquirers conducting due diligence.',
    faqs: [
      {
        question: 'Why are tenant improvement allowances so high in medical office leases?',
        answer:
          'Medical office build-outs require specialized infrastructure not needed in standard commercial space: plumbing in every exam room, medical gas systems (oxygen, nitrogen, nitrous oxide), emergency backup power generators, lead-lined walls for X-ray rooms, specialized HVAC for infection control, and ADA-compliant fixtures throughout. These costs routinely reach $150–$250 per RSF for new medical suites, making large TI allowances essential for attracting medical tenants.',
      },
      {
        question: 'How does the Stark Law affect assignment provisions in medical office leases?',
        answer:
          'The federal Stark Law (physician self-referral law) and Anti-Kickback Statute impose strict requirements on financial arrangements between healthcare providers and those who refer patients to them. Medical office lease terms and assignment provisions can implicate these laws if a lease transfer creates a compensation relationship that could influence referral patterns. Healthcare tenants and their landlords should ensure lease assignments comply with the fair market value and commercial reasonableness requirements of Stark safe harbors.',
      },
      {
        question: 'Can a medical office lease be assigned when a practice is acquired?',
        answer:
          'Medical practice acquisitions - whether by a hospital system, private equity group, or another practice - typically constitute an assignment of the lease requiring landlord consent. Healthcare landlords sometimes include specific provisions addressing practice acquisitions, including change-of-control definitions that trigger consent requirements even when the legal entity remains the same. Lease abstraction for medical practices being acquired or acquiring should specifically flag assignment and change-of-control provisions.',
      },
    ],
    relatedIndustries: ['healthcare', 'dental', 'behavioral-health', 'diagnostic-imaging'],
    metaTitle: 'Medical Office Lease Abstraction',
    metaDescription:
      'Extract critical data from medical office leases: TI allowances, specialized utilities, permitted use, assignment rights, and renewal options. Medical MOB lease guide.',
  },
  {
    name: 'Data Centers',
    slug: 'data-centers',
    overview:
      'Data center leases govern facilities housing mission-critical computing infrastructure for hyperscale cloud providers, enterprise IT operations, and colocation tenants. Data center leases are among the most technical in commercial real estate, with critical provisions governing power density, redundancy specifications, cooling infrastructure, carrier access, and uptime guarantees. The sector has experienced explosive growth driven by cloud computing, AI training workloads, and enterprise digital transformation, making data center lease abstraction an increasingly important competency.',
    typicalLeaseStructure:
      'Data center leases are typically structured as triple-net or modified NNN arrangements, with the tenant responsible for power costs - which often dwarf base rent as the dominant operating expense. Lease economics are frequently quoted in terms of critical power (kilowatts of IT load) rather than square footage, and power costs are metered and billed directly or as a pass-through on top of base rent. Colocation leases may be shorter-term (1–3 years) while wholesale data center leases for hyperscale users run 10–20 years.',
    avgTermRange: '5–20 years',
    criticalFields: [
      'base-rent',
      'rentable-square-footage',
      'permitted-use',
      'utilities',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'assignment-rights',
      'subletting-rights',
      'tenant-improvement-allowance',
    ],
    commonRedFlags: [
      'RF-009',
      'RF-011',
      'RF-007',
      'RF-010',
      'RF-002',
    ],
    typicalTenants:
      'Hyperscale cloud providers (AWS, Microsoft Azure, Google Cloud), telecommunications carriers, financial services firms with high-frequency trading or disaster recovery requirements, government agencies with classified computing needs, managed service providers, and enterprise companies with large on-premises IT infrastructure. Data center tenants are predominantly institutional-grade credits with long-term strategic commitments to the infrastructure.',
    extractionConsiderations:
      'Data center lease abstraction requires extraction of highly technical specifications that are not typical in standard commercial leases: power specifications (critical IT load in kW or MW, redundancy level N+1 or 2N), cooling specifications (power usage effectiveness or PUE targets), carrier access and fiber diversity provisions, physical security requirements, and uptime/availability service level agreements. Power termination rights - provisions allowing the landlord or tenant to modify power allocation - and expansion rights for additional power capacity are especially important for growing technology operations.',
    faqs: [
      {
        question: 'How is rent typically structured in a data center lease?',
        answer:
          'Data center rent has two primary components: base rent (per square foot of raised floor space or cage space) and power charges (per kilowatt of committed critical IT load). Power charges are typically metered at the tenant\'s PDU (power distribution unit) and billed based on actual consumption or committed power capacity. In high-density facilities, power costs can represent 60%–70% of total occupancy cost, making the power rate and metering methodology the most economically significant lease terms.',
      },
      {
        question: 'What is a Tier rating and why does it matter for lease abstraction?',
        answer:
          'The Uptime Institute\'s Tier classification system (Tier I through Tier IV) defines data center reliability standards based on redundancy and concurrent maintainability. Tier IV data centers have fully redundant, fault-tolerant systems with 99.995% uptime. Lease provisions specifying the landlord\'s Tier commitment and uptime guarantees are critical to extract, as they define the availability standards the tenant is purchasing and the remedies available if standards are not met.',
      },
      {
        question: 'What are typical uptime and SLA provisions in data center leases?',
        answer:
          'Data center leases typically include service level agreements (SLAs) specifying minimum power uptime (often 99.99% or "four nines"), cooling availability, and network connectivity. Remedies for SLA failures typically include rent credits calculated as a multiple of the downtime period rather than actual damages, with escalating credits for longer outages. Critically, SLA credits rarely compensate for actual business losses from downtime, making the SLA provisions the floor of protection rather than a complete remedy.',
      },
    ],
    relatedIndustries: ['technology', 'telecommunications', 'financial-services', 'cloud-computing'],
    metaTitle: 'Data Center Lease Abstraction',
    metaDescription:
      'Extract power specifications, SLA provisions, uptime guarantees, and critical terms from data center leases. Comprehensive data center lease abstraction guide.',
  },
  {
    name: 'Self-Storage',
    slug: 'self-storage',
    overview:
      'Self-storage leases govern facilities providing individual storage units rented to consumers and businesses for personal property storage. Self-storage represents a unique lease type in commercial real estate - individual unit leases are typically month-to-month consumer agreements, but ground leases, build-to-suit agreements, and portfolio acquisition leases governing entire self-storage facilities require commercial lease abstraction with a focus on operating metrics, revenue per unit, and management agreement terms.',
    typicalLeaseStructure:
      'Individual self-storage unit rentals are simple month-to-month license agreements governed by the state\'s self-storage act rather than commercial lease law. Leases governing entire self-storage facilities - such as ground leases for development sites or master leases for portfolio acquisitions - are long-term NNN or absolute NNN commercial leases where the operator-tenant is responsible for all operating costs and capital expenditures. Operating agreement and franchise terms for branded self-storage operators may be separate documents requiring simultaneous abstraction.',
    avgTermRange: '10–25 years (facility leases)',
    criticalFields: [
      'base-rent',
      'rentable-square-footage',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'purchase-option',
      'permitted-use',
      'assignment-rights',
      'real-estate-taxes',
      'property-insurance',
    ],
    commonRedFlags: [
      'RF-009',
      'RF-011',
      'RF-007',
      'RF-010',
      'RF-008',
    ],
    typicalTenants:
      'National self-storage REIT operators (Public Storage, Extra Space, CubeSmart, Life Storage), regional storage operators, and private entrepreneurial self-storage companies. Self-storage operators typically negotiate facility leases as ground leases or triple-net leases on existing buildings, frequently with purchase options reflecting the operator\'s desire to own stabilized facilities.',
    extractionConsiderations:
      'Self-storage facility leases require extraction of revenue-sharing provisions if the landlord participates in rental income above a base threshold, percentage rent mechanisms tied to gross revenue from unit rentals, and any restrictions on rental rate increases that affect the operator\'s revenue optimization ability. Climate-controlled space provisions, vehicle storage allowances, and outdoor storage areas must be extracted as they significantly affect the facility\'s revenue potential. Lien law provisions giving the operator rights to auction contents of units with delinquent accounts are governed by state law and typically incorporated by reference rather than stated in full.',
    faqs: [
      {
        question: 'How are self-storage facility leases different from individual unit licenses?',
        answer:
          'Individual self-storage unit rentals are typically month-to-month license agreements (not leases in the traditional sense) governed by state self-storage lien acts. Leases governing entire facilities - for development, acquisition, or long-term operation - are commercial leases with standard commercial lease provisions including renewal options, assignment rights, and NNN expense structures. This guide focuses on facility-level commercial leases, not individual unit agreements.',
      },
      {
        question: 'Are purchase options common in self-storage facility leases?',
        answer:
          'Purchase options are relatively common in self-storage ground leases and facility leases because operators frequently develop sites they intend to own long-term. A typical structure involves a 20–30 year ground lease with a purchase option exercisable after a stabilization period, priced at a defined capitalization rate applied to net operating income. This allows the operator to control the site during development without committing full acquisition capital upfront.',
      },
      {
        question: 'What revenue provisions are typically included in self-storage leases?',
        answer:
          'Some self-storage facility leases include percentage rent provisions where the landlord receives a share of gross revenue above a defined threshold in addition to base rent. Others include revenue reporting requirements that give the landlord visibility into facility performance. Ground leases for self-storage development may tie rent to performance metrics or include escalation tied to revenue growth rather than fixed percentages.',
      },
    ],
    relatedIndustries: ['self-storage-operations', 'real-estate-investment'],
    metaTitle: 'Self-Storage Lease Abstraction',
    metaDescription:
      'Extract key terms from self-storage facility leases: ground lease structures, purchase options, revenue provisions, and NNN obligations. Self-storage lease guide.',
  },
  {
    name: 'Restaurant Spaces',
    slug: 'restaurant-spaces',
    overview:
      'Restaurant leases are among the most complex and tenant-unfavorable lease structures in commercial real estate, combining high build-out costs, percentage rent provisions, continuous operation requirements, specialized use restrictions, and extensive landlord approval rights over signage and exterior appearance. Restaurant tenants invest $300,000 to over $1 million in tenant improvements for a full-service restaurant, creating enormous financial exposure if the lease terms are unfavorable or if the business underperforms. Careful lease abstraction is essential for restaurant operators managing multi-unit portfolios.',
    typicalLeaseStructure:
      'Restaurant leases are typically triple-net or modified gross structures, with the tenant responsible for all operating costs and significant infrastructure investment. Percentage rent provisions are common - typically 6%–8% of gross sales above a natural breakpoint - reflecting the landlord\'s desire to participate in the restaurant\'s revenue upside. Co-tenancy clauses, continuous operation requirements, exclusive use protections, and radius restrictions are all common restaurant lease provisions that require careful extraction and analysis.',
    avgTermRange: '10–15 years',
    criticalFields: [
      'base-rent',
      'percentage-rent-rate',
      'percentage-rent-breakpoint',
      'cam-charges',
      'cam-cap',
      'tenant-improvement-allowance',
      'permitted-use',
      'exclusive-use',
      'co-tenancy-requirement',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'personal-guarantee',
    ],
    commonRedFlags: [
      'RF-003',
      'RF-006',
      'RF-001',
      'RF-012',
      'RF-008',
    ],
    typicalTenants:
      'National and regional restaurant chains (quick service, fast casual, casual dining), independent full-service restaurant operators, ghost kitchen operators, food hall concepts, and franchise food and beverage operators. Restaurant tenants range from national chains with institutional credit to independent operators with limited financial history, making creditworthiness assessment and personal guarantee requirements highly variable.',
    extractionConsiderations:
      'Restaurant lease abstraction requires extraction of food preparation and exhaust ventilation provisions - hood exhaust systems are expensive infrastructure elements that are frequently negotiated between landlords and restaurants and must be specifically addressed in the lease. Grease trap responsibility (installation, maintenance, pumping) is a recurring compliance obligation that must be extracted. Gross sales reporting and auditing provisions are extensive in restaurant leases with percentage rent and must be captured precisely. Delivery and parking provisions are increasingly significant for restaurants serving delivery platforms.',
    faqs: [
      {
        question: 'What is a typical TI allowance for a restaurant lease?',
        answer:
          'Restaurant tenant improvement allowances vary significantly based on the restaurant type, property vintage, and landlord motivation. Quick-service restaurants in established centers typically receive $50–$100 per RSF. Full-service restaurants requiring complete kitchen infrastructure, HVAC, plumbing, and electrical upgrades may receive $100–$200 per RSF with the operator expected to invest significantly above the allowance amount. Dark shell (structure only) deliveries shift the entire build-out cost to the tenant.',
      },
      {
        question: 'How is a "natural breakpoint" calculated in a restaurant percentage rent clause?',
        answer:
          'The natural breakpoint is calculated by dividing the annual base rent by the percentage rent rate. A restaurant paying $180,000 per year in base rent with a 6% percentage rent rate has a natural breakpoint of $3,000,000 in gross sales. If annual gross sales reach $3,500,000, the restaurant owes an additional $30,000 in percentage rent (6% of the $500,000 excess). An "artificial breakpoint" is set higher than the natural breakpoint, reducing percentage rent payments.',
      },
      {
        question: 'What happens to a restaurant lease if the franchise agreement terminates?',
        answer:
          'Most franchise restaurant leases require the franchisee to operate the specific franchise concept as the permitted use. If the franchise agreement terminates - whether by expiration, termination for cause, or mutual agreement - the tenant may be unable to operate its permitted use, potentially triggering a lease default. Assignment provisions in franchise restaurant leases often restrict the franchisee\'s ability to transfer the lease to a non-franchisee without landlord consent, creating a legal trap that requires careful advance planning.',
      },
    ],
    relatedIndustries: ['food-beverage', 'quick-service-restaurant', 'casual-dining', 'food-hall'],
    metaTitle: 'Restaurant Space Lease Abstraction',
    metaDescription:
      'Extract percentage rent, exhaust provisions, CAM charges, and exclusive use from restaurant leases. Complete guide to restaurant lease abstraction for multi-unit operators.',
  },
  {
    name: 'Grocery-Anchored Centers',
    slug: 'grocery-anchored-centers',
    overview:
      'Grocery-anchored shopping centers are retail centers where a grocery store serves as the primary traffic driver, typically occupying 40,000–65,000 square feet as the anchor tenant. These centers are among the most resilient retail property types due to the necessity-based nature of grocery shopping, and have attracted significant institutional investment. In-line tenant leases in grocery-anchored centers are particularly dependent on the grocery anchor\'s presence and creditworthiness, making co-tenancy clause extraction critically important.',
    typicalLeaseStructure:
      'Grocery anchor leases are typically long-term NNN structures (15–25 years with multiple 5-year renewal options) with the grocery chain responsible for all operating costs including the anchor store structure and parking field in front of the anchor. In-line tenant leases are standard NNN structures with pro-rata CAM participation based on square footage. The grocery anchor\'s rent is typically significantly below market - reflecting the traffic-generation value the anchor provides - while in-line tenants pay market rates that are partially justified by the anchor-driven traffic.',
    avgTermRange: '5–10 years (in-line); 15–25 years (anchor)',
    criticalFields: [
      'base-rent',
      'cam-charges',
      'cam-cap',
      'co-tenancy-requirement',
      'exclusive-use',
      'permitted-use',
      'real-estate-taxes',
      'property-insurance',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'rentable-square-footage',
    ],
    commonRedFlags: [
      'RF-001',
      'RF-003',
      'RF-006',
      'RF-004',
      'RF-012',
    ],
    typicalTenants:
      'In-line tenants at grocery-anchored centers include personal service businesses (salons, nail salons, dry cleaners), quick-service restaurants, medical and dental clinics, financial services offices, specialty food retailers, and fitness studios. The necessity-based service mix of grocery-anchored in-line tenants reflects the demographics of grocery shoppers and the convenience-oriented nature of the center\'s customer base.',
    extractionConsiderations:
      'Co-tenancy clause extraction in grocery-anchored centers requires precision in identifying the triggering conditions - specifically which grocery chain is named as the anchor, what size threshold triggers the co-tenancy (since a grocery chain selling a portion of its space creates partial vacancies), and whether "going dark" without vacating triggers the clause. Grocery store operating restrictions - which often include radius restrictions on competing grocers and exclusive use provisions covering specific product categories - must be extracted from anchor leases to fully understand the center\'s leasing constraints.',
    faqs: [
      {
        question: 'Why are grocery anchors so important to in-line tenant performance?',
        answer:
          'Grocery stores generate 3–5 weekly customer visits compared to 1–2 visits per month for most specialty retailers. This traffic frequency makes the grocery anchor the primary driver of foot traffic to the entire center, often accounting for 40%–60% of in-line tenant customer count. When a grocery anchor closes, in-line retailers typically experience 20%–40% sales declines within months, making the co-tenancy protections in their leases critically important.',
      },
      {
        question: 'What happens when a grocery store sells its location to a competing chain?',
        answer:
          'When a grocery chain sells or subleases its anchor space to a competing grocer, the co-tenancy provisions in in-line tenant leases may or may not be triggered, depending on how the clause is drafted. Clauses naming a specific chain (e.g., "Kroger") will not be triggered by replacement with a comparable grocery operator, while clauses requiring the anchor to be a "first-quality grocery store" may survive the transition. Precise extraction of the co-tenancy trigger language is essential to evaluate this risk.',
      },
      {
        question: 'Are CAM expenses in grocery-anchored centers higher than other retail formats?',
        answer:
          'Grocery-anchored center CAM expenses tend to be moderate compared to enclosed malls because the open-air format eliminates enclosed common area HVAC costs. However, grocery-anchored centers with large parking fields have significant parking lot maintenance and resurfacing costs. Management fees and insurance costs vary by center quality and landlord structure. Typical all-in NNN expenses in grocery-anchored centers range from $6 to $12 per RSF annually depending on market and property age.',
      },
    ],
    relatedIndustries: ['grocery-retail', 'personal-services', 'quick-service-restaurant', 'healthcare'],
    metaTitle: 'Grocery-Anchored Center Lease Abstraction',
    metaDescription:
      'Extract co-tenancy provisions, CAM charges, and anchor clauses from grocery-anchored shopping center leases. Essential guide to grocery center lease abstraction.',
  },
  {
    name: 'Mixed-Use',
    slug: 'mixed-use',
    overview:
      'Mixed-use properties combine two or more different property types - such as retail on the ground floor with residential or office above - within a single development or building. Mixed-use lease abstraction is particularly complex because different lease types within the same project may be subject to different legal frameworks, expense allocation methodologies, and operating standards. The proliferation of mixed-use development in urban infill and transit-oriented projects has made mixed-use lease abstraction an increasingly common requirement for institutional investors and developers.',
    typicalLeaseStructure:
      'Mixed-use leases vary dramatically by component. Ground-floor retail leases in mixed-use projects are typically NNN or modified gross leases similar to strip center structures. Office components use full-service gross or modified gross structures. Residential components are governed by residential lease law and are not typically included in commercial lease abstraction. The interaction between component operating expense allocations - specifically how shared building systems like HVAC, elevators, and parking structures are allocated across components - is the most complex aspect of mixed-use lease abstraction.',
    avgTermRange: '5–10 years (retail/office components)',
    criticalFields: [
      'base-rent',
      'cam-charges',
      'cam-cap',
      'permitted-use',
      'rentable-square-footage',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'parking-spaces',
      'signage-rights',
      'tenant-improvement-allowance',
    ],
    commonRedFlags: [
      'RF-001',
      'RF-003',
      'RF-006',
      'RF-007',
      'RF-008',
    ],
    typicalTenants:
      'Ground-floor retail tenants in mixed-use projects include upscale food and beverage operators, fitness studios, professional services offices, financial services branches, and experiential retail concepts that benefit from the pedestrian activity generated by the residential component above. Office tenants in mixed-use developments are often attracted by transit access and live-work-play amenities. Mixed-use projects are especially common in urban markets with strong walkability scores.',
    extractionConsiderations:
      'Mixed-use lease abstraction requires careful extraction of operating expense allocation methodologies - specifically how expenses for shared building systems (parking garages, building lobbies, elevators serving multiple uses, rooftop terraces) are allocated among retail, office, and residential components. Signage rights in mixed-use buildings are typically more constrained than in standalone retail properties, as building aesthetics and residential tenant rights affect permissible signage locations and sizes. Loading dock and delivery access provisions are especially important in mixed-use buildings where ground-floor retail must coordinate with residential occupants.',
    faqs: [
      {
        question: 'How are operating expenses allocated in a mixed-use building?',
        answer:
          'Operating expenses in mixed-use buildings are typically allocated through a combination of direct attribution (expenses specific to one component are allocated solely to that component) and proportionate allocation (shared expenses like the building lobby, elevators, and infrastructure are allocated based on square footage ratios or negotiated allocations). The specific allocation methodology must be extracted precisely from the lease and any applicable development agreement or reciprocal easement agreement governing the project.',
      },
      {
        question: 'Are retail tenants in mixed-use buildings subject to the same lease terms as strip center tenants?',
        answer:
          'Ground-floor retail tenants in mixed-use buildings operate under many of the same NNN or modified gross lease provisions as strip center tenants, but with important differences. Mixed-use retail leases often impose stricter operating hour requirements (to maintain ground-floor activation for residential tenants above), more restrictive signage requirements (to protect the project\'s aesthetic standards), and more complex CAM provisions reflecting the multi-use nature of the building\'s operating expenses.',
      },
      {
        question: 'What parking rights are typical for retail tenants in mixed-use buildings?',
        answer:
          'Parking rights in mixed-use buildings are among the most commonly contested provisions, as retail, office, and residential components compete for shared parking resources. Retail leases should specify validated parking for customers, a minimum number of reserved spaces for employees, access hours, and pricing terms. Mixed-use buildings with underground garages often have complex parking easement agreements that govern the allocation of spaces among components and must be reviewed alongside the lease.',
      },
    ],
    relatedIndustries: ['food-beverage', 'fitness-wellness', 'financial-services', 'luxury-retail'],
    metaTitle: 'Mixed-Use Property Lease Abstraction',
    metaDescription:
      'Extract key terms from mixed-use property leases: expense allocation, signage rights, parking provisions, and CAM structures. Mixed-use lease abstraction guide.',
  },
  {
    name: 'Bank Branches',
    slug: 'bank-branches',
    overview:
      'Bank branch leases govern retail banking locations including full-service branches, ATM-only spaces, and drive-through banking facilities. Bank branches are among the most stable retail tenants - with investment-grade credits, long lease terms, and reliable rent payment histories - making them attractive to institutional investors. However, the accelerating trend toward digital banking has resulted in significant bank branch consolidation, making termination rights, assignment provisions, and permitted use restrictions especially important lease provisions to extract.',
    typicalLeaseStructure:
      'Bank branch leases are predominantly triple-net structures with terms of 10–15 years and multiple renewal options. Investment-grade bank credits can typically negotiate favorable lease economics including modest NNN expense exposure, long renewal option periods, and competitive base rents. Branches with drive-through facilities require specific provisions governing vehicular access, drive-through lane maintenance, and canopy maintenance responsibilities. ATM easements and 24-hour access provisions are common ancillary requirements.',
    avgTermRange: '10–15 years',
    criticalFields: [
      'base-rent',
      'rentable-square-footage',
      'permitted-use',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'real-estate-taxes',
      'property-insurance',
      'assignment-rights',
      'subletting-rights',
      'signage-rights',
    ],
    commonRedFlags: [
      'RF-011',
      'RF-009',
      'RF-007',
      'RF-008',
      'RF-010',
    ],
    typicalTenants:
      'National money center banks (JPMorgan Chase, Bank of America, Wells Fargo, Citibank), regional banks, credit unions, and community banks. Bank tenants are uniformly institutional-grade credits or quasi-institutional in the case of well-capitalized regional banks, making creditworthiness assessment straightforward but assignment restrictions especially important given ongoing bank merger and acquisition activity.',
    extractionConsiderations:
      'Bank branch lease abstraction requires particular attention to "banking use" permitted use definitions and whether they allow subletting or assignment to non-banking financial service operators (credit unions, insurance offices, financial advisory firms). The trend toward bank branch downsizing and conversion to "micro-branches" means that contraction provisions and assignment-to-different-use rights may be embedded in long-term leases executed when the branch format was larger. Drive-through access easements, ATM installation rights, and 24-hour access provisions are essential provisions not found in standard retail leases.',
    faqs: [
      {
        question: 'How does bank merger activity affect lease assignment provisions?',
        answer:
          'Bank mergers and acquisitions frequently trigger lease assignment provisions because a change of control of the tenant entity constitutes an assignment requiring landlord consent in most leases. Bank branch leases often include specific carve-outs permitting assignment to successors by merger or acquisition without landlord consent, provided the successor assumes all lease obligations. Abstracting these carve-outs precisely is essential for banks engaged in acquisition activity or for investors acquiring bank branch portfolios.',
      },
      {
        question: 'What happens to a bank branch lease if the bank closes that location?',
        answer:
          'If a bank closes a branch without a lease termination right, it remains obligated to pay rent for the full remaining lease term. Banks typically seek to sublease closed branches - often to non-competing financial services uses like credit unions, insurance agents, or wealth management offices - or negotiate lease buyouts with landlords. The permitted use definition determines which alternative tenants can occupy the space, making narrow "banking only" permitted use clauses financially costly upon branch closure.',
      },
      {
        question: 'Are bank branch leases valued differently than other retail leases?',
        answer:
          'Yes. Bank branch leases with investment-grade bank credits are frequently valued as "credit leases" where the primary value driver is the credit quality of the tenant rather than the real estate itself. Credit lease cap rates for investment-grade bank branches are typically significantly lower (higher valuations) than comparable retail properties with non-investment-grade tenants. Remaining lease term, renewal option structure, and rent escalation provisions are the primary valuation inputs alongside tenant credit rating.',
      },
    ],
    relatedIndustries: ['banking', 'financial-services', 'credit-unions'],
    metaTitle: 'Bank Branch Lease Abstraction',
    metaDescription:
      'Extract critical terms from bank branch leases: permitted use, assignment rights, drive-through provisions, and renewal options. Bank branch NNN lease abstraction guide.',
  },
  {
    name: 'Automotive Dealership',
    slug: 'automotive-dealership',
    overview:
      'Automotive dealership leases govern large-format retail facilities combining vehicle showrooms, service departments, parts storage, and outdoor vehicle display areas. Dealership leases are distinctive due to the substantial real estate footprint, significant environmental liability exposure from service operations, and the complex interplay between franchise agreements governing the brand and lease provisions governing the facility. The consolidation of the automotive dealership industry has made dealership lease abstraction increasingly important for private equity buyers and public dealer groups managing large portfolios.',
    typicalLeaseStructure:
      'Automotive dealership leases are typically long-term NNN or absolute NNN structures (10–20 years), reflecting the substantial facility investments required to meet manufacturer image and operational standards. Rent is often structured with a base component for the building and a separate component for the outdoor vehicle display area. Environmental provisions are far more extensive than in standard commercial leases due to the fuel storage, oil and fluid waste, and vehicle maintenance operations conducted on the premises.',
    avgTermRange: '10–20 years',
    criticalFields: [
      'base-rent',
      'rentable-square-footage',
      'permitted-use',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'assignment-rights',
      'subletting-rights',
      'real-estate-taxes',
      'property-insurance',
      'tenant-improvement-allowance',
    ],
    commonRedFlags: [
      'RF-010',
      'RF-009',
      'RF-011',
      'RF-007',
      'RF-008',
    ],
    typicalTenants:
      'Large public automotive dealer groups (AutoNation, Penske Automotive, Lithia Motors, Group 1 Automotive), regional dealer groups, and single-point independent dealers. Franchise agreements with vehicle manufacturers govern which brand(s) can be sold at each facility, and changes in franchise status - including manufacturer-initiated franchise terminations - directly affect the permitted use of the leased premises.',
    extractionConsiderations:
      'Dealership lease abstraction requires extraction of environmental provisions with exceptional care: underground storage tank obligations, above-ground storage tank provisions, hazardous materials use and storage requirements, environmental indemnification clauses, and baseline environmental assessment obligations. Manufacturer image program provisions - which may require facility upgrades on a defined schedule to meet current brand standards - are unusual provisions not found in standard commercial leases and must be extracted. Outdoor display area provisions, including lot coverage, lighting specifications, and vehicle count limitations, affect the dealership\'s inventory management capacity.',
    faqs: [
      {
        question: 'How do manufacturer franchise agreements interact with dealership leases?',
        answer:
          'Vehicle manufacturer franchise agreements and facility leases are interconnected documents. Manufacturers typically require that dealership facilities meet minimum size, layout, and image standards defined in their dealer agreements. If a dealer\'s franchise is terminated, the permitted use of the facility under the lease may lapse, rendering the lease economically useless. Conversely, dealer groups acquiring existing dealerships must verify that the facility lease permits assignment and that the facility meets the manufacturer\'s current image requirements for the acquired brand.',
      },
      {
        question: 'What environmental risks are unique to automotive dealership leases?',
        answer:
          'Automotive dealership operations involve significant environmental exposures: underground fuel storage tanks, above-ground oil and fluid waste storage, parts washing operations using solvents, and vehicle body work using paints and thinners. Dealership leases typically include baseline environmental assessments at commencement and detailed environmental indemnification provisions. Tenants can inherit historic contamination responsibility if the environmental provisions are not carefully negotiated, making environmental due diligence essential during lease review.',
      },
      {
        question: 'Can a dealer sell its dealership without assigning the lease?',
        answer:
          'Selling a car dealership almost always involves transferring the facility lease to the buyer, which constitutes an assignment. Most dealership leases require landlord consent for assignment, though they typically cannot unreasonably withhold consent for transfers to creditworthy purchasers who assume all obligations. The manufacturer must separately approve the new dealer, and both the manufacturer approval process and the landlord consent process must be coordinated during the dealership acquisition timeline.',
      },
    ],
    relatedIndustries: ['automotive-retail', 'automotive-service', 'dealer-groups'],
    metaTitle: 'Automotive Dealership Lease Abstraction',
    metaDescription:
      'Extract environmental provisions, franchise conditions, and critical terms from automotive dealership leases. Dealership NNN lease abstraction guide for dealer groups.',
  },
  {
    name: 'Gas Station & Convenience',
    slug: 'gas-station-convenience',
    overview:
      'Gas station and convenience store leases govern facilities combining fuel sales (gasoline and diesel), a convenience store, and often additional uses such as car washes, quick-service restaurants, and EV charging stations. These leases are among the most environmentally complex in commercial real estate due to extensive underground fuel storage infrastructure, and are frequently structured as ground leases where the operator-tenant controls the entire site including the fuel distribution equipment.',
    typicalLeaseStructure:
      'Gas station leases are typically structured as long-term ground leases (15–25 years with renewal options) or as absolute NNN leases on existing facilities. The tenant-operator is responsible for all site operating costs including fuel equipment maintenance, environmental compliance, and underground storage tank management. Major oil company-branded stations may operate under a branded dealer agreement that is tied to the facility lease and must be reviewed simultaneously. Rent may have a fixed base component plus a per-gallon fuel volume component in branded supply agreements.',
    avgTermRange: '10–25 years',
    criticalFields: [
      'base-rent',
      'permitted-use',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'purchase-option',
      'assignment-rights',
      'real-estate-taxes',
      'property-insurance',
      'rentable-square-footage',
    ],
    commonRedFlags: [
      'RF-010',
      'RF-009',
      'RF-011',
      'RF-007',
      'RF-008',
    ],
    typicalTenants:
      'Major oil company-branded dealer operators (Chevron, Shell, BP, ExxonMobil), independent fuel distributors, convenience store chains (Circle K, Wawa, Sheetz, Casey\'s General Stores), and EV charging infrastructure operators. The transition to electric vehicles is reshaping the industry, with many gas station operators installing EV charging stations alongside traditional fuel dispensers, requiring new lease provisions addressing EV infrastructure installation rights.',
    extractionConsiderations:
      'Gas station lease abstraction is dominated by environmental provisions: underground storage tank (UST) ownership and maintenance responsibility, leak detection system requirements, environmental site assessment obligations, UST registration and regulatory compliance, and contamination indemnification provisions. The identity of the UST owner at lease commencement and the mechanism for transferring environmental liability upon lease expiration or assignment are critical provisions. EV charging station installation rights and revenue-sharing provisions are increasingly important provisions in contemporary gas station leases.',
    faqs: [
      {
        question: 'Who is responsible for underground storage tank cleanup if contamination is discovered?',
        answer:
          'UST contamination responsibility is typically addressed by specific indemnification provisions in the lease specifying which party is responsible for pre-existing contamination (discovered during baseline assessment) versus contamination occurring during the tenant\'s operational period. State UST programs typically impose strict liability on current tank owners regardless of who caused the contamination, making the lease indemnification provisions critical for allocating the ultimate cost between the parties.',
      },
      {
        question: 'How does a branded oil company supply agreement interact with the facility lease?',
        answer:
          'Oil company-branded station leases typically require the tenant to purchase fuel exclusively from the brand sponsor under a supply agreement running concurrently with the facility lease. These supply agreements contain price, volume, branding, and equipment requirements that supplement and sometimes conflict with the facility lease. Both documents must be abstracted together to fully understand the operator\'s obligations. Termination of the supply agreement may trigger a permitted use violation under the lease if the brand requirement is embedded in the lease itself.',
      },
      {
        question: 'Can gas station operators add EV charging stations without modifying the lease?',
        answer:
          'Adding EV charging stations typically requires review of the permitted use clause and any exclusivity provisions in the facility lease or ground lease. Many older gas station leases define the permitted use as "petroleum products distribution and convenience store operations," which may not expressly permit EV charging. Additionally, EV charging infrastructure may require electrical upgrades, permitting, and utility easements that interact with the lease\'s alteration and improvement provisions.',
      },
    ],
    relatedIndustries: ['fuel-retail', 'convenience-retail', 'ev-infrastructure', 'automotive-service'],
    metaTitle: 'Gas Station & Convenience Store Lease Abstraction',
    metaDescription:
      'Extract environmental provisions, UST obligations, and critical terms from gas station and convenience store leases. Fuel retail ground lease abstraction guide.',
  },
  {
    name: 'Multifamily Commercial',
    slug: 'multifamily-commercial',
    overview:
      'Multifamily commercial leases cover the commercial and amenity components of residential apartment communities, including ground-floor retail spaces, leasing offices, fitness centers, business centers, and parking structures that serve both residents and commercial tenants within a multifamily development. As apartment communities increasingly incorporate ground-floor retail and mixed-use components to activate streetscapes and generate ancillary revenue, lease abstraction for the commercial components of multifamily projects has grown in importance.',
    typicalLeaseStructure:
      'Commercial components of multifamily properties are typically leased under standard commercial lease structures (NNN or modified gross for retail; gross for amenity spaces operated by the building owner). Ground-floor retail in multifamily buildings is commonly leased on NNN terms with operating expenses that reflect the commercial component\'s proportionate share of the building\'s shared systems. Amenity spaces (fitness centers, clubhouses, business centers) managed by the property owner are typically not leased to third parties and do not require lease abstraction.',
    avgTermRange: '3–7 years (retail components)',
    criticalFields: [
      'base-rent',
      'rentable-square-footage',
      'permitted-use',
      'lease-commencement-date',
      'lease-expiration-date',
      'renewal-options',
      'cam-charges',
      'real-estate-taxes',
      'property-insurance',
      'parking-spaces',
      'signage-rights',
    ],
    commonRedFlags: [
      'RF-001',
      'RF-003',
      'RF-006',
      'RF-007',
      'RF-008',
    ],
    typicalTenants:
      'Ground-floor retail tenants in multifamily buildings commonly include coffee shops, fitness studios, dry cleaners, convenience stores, salons and spas, co-working spaces, medical offices, and neighborhood service businesses. Tenant selection in multifamily retail is often driven by complementarity with the residential component - amenities that serve residents are preferred over destination retail that imports external traffic.',
    extractionConsiderations:
      'Commercial lease abstraction for multifamily commercial spaces requires understanding the operating expense allocation methodology - specifically how expenses for shared building systems (elevator maintenance, lobby utilities, building security) are allocated between the residential and commercial components. Signage provisions in residential buildings are typically more restrictive than in dedicated commercial properties, reflecting aesthetic standards important to the residential brand. Noise and hours-of-operation provisions may be more restrictive than in standalone retail, reflecting the need to minimize disruption to residential occupants.',
    faqs: [
      {
        question: 'How are operating expenses allocated between residential and commercial tenants in a multifamily building?',
        answer:
          'Operating expense allocation in mixed residential-commercial buildings is typically governed by a condominium declaration, operating agreement, or detailed cost-sharing provision within the commercial lease. Expenses directly attributable to the commercial component (commercial lobby utilities, commercial HVAC, commercial signage) are typically borne entirely by commercial tenants. Shared expenses are allocated proportionately, often by square footage ratio with a loading factor adjustment for the more intensive use of shared systems by commercial operations.',
      },
      {
        question: 'What restrictions on hours of operation are typical for commercial tenants in residential buildings?',
        answer:
          'Commercial tenants in multifamily buildings often face restrictions on delivery hours (typically no deliveries before 8 AM or after 8 PM), maximum occupancy levels during evening hours, noise limitations that affect music, ventilation equipment, and mechanical systems, and restrictions on uses generating heavy foot traffic (such as bars or nightclubs) that would disrupt residential quality of life. These provisions must be extracted as they may significantly affect the commercial operator\'s business model.',
      },
      {
        question: 'Can commercial tenants in multifamily buildings use shared amenities?',
        answer:
          'Commercial tenant access to shared residential amenities (fitness centers, rooftop terraces, parking garages) is typically restricted by the terms of the commercial lease and the building\'s operating rules. Some leases grant commercial tenants a specified number of parking spaces in the residential garage with separate access control. Rooftop and amenity access for commercial tenant employees is usually limited or prohibited to preserve the residential character of those spaces for apartment residents.',
      },
    ],
    relatedIndustries: ['personal-services', 'food-beverage', 'fitness-wellness', 'co-working'],
    metaTitle: 'Multifamily Commercial Lease Abstraction',
    metaDescription:
      'Extract key terms from commercial components of multifamily properties: ground-floor retail leases, CAM allocations, signage rights, and operating restrictions.',
  },
]

// ─── Related Property Types ─────────────────────────────────────────

const PROPERTY_TYPE_RELATIONS: Record<string, string[]> = {
  'office-buildings': ['medical-office', 'mixed-use', 'flex-industrial'],
  'retail-strip-centers': ['shopping-malls', 'grocery-anchored-centers', 'restaurant-spaces'],
  'shopping-malls': ['retail-strip-centers', 'grocery-anchored-centers', 'mixed-use'],
  'industrial-warehouses': ['flex-industrial', 'self-storage', 'data-centers'],
  'flex-industrial': ['industrial-warehouses', 'office-buildings', 'self-storage'],
  'medical-office': ['office-buildings', 'mixed-use'],
  'data-centers': ['industrial-warehouses', 'flex-industrial'],
  'self-storage': ['industrial-warehouses', 'flex-industrial'],
  'restaurant-spaces': ['retail-strip-centers', 'grocery-anchored-centers', 'mixed-use'],
  'grocery-anchored-centers': ['retail-strip-centers', 'shopping-malls', 'restaurant-spaces'],
  'mixed-use': ['office-buildings', 'retail-strip-centers', 'restaurant-spaces'],
  'bank-branches': ['retail-strip-centers', 'office-buildings'],
  'automotive-dealership': ['gas-station-convenience', 'industrial-warehouses'],
  'gas-station-convenience': ['automotive-dealership', 'retail-strip-centers'],
  'multifamily-commercial': ['mixed-use', 'office-buildings'],
}

for (const pt of PROPERTY_TYPES) {
  const related = PROPERTY_TYPE_RELATIONS[pt.slug]
  if (related) pt.relatedPropertyTypes = related
}

// ─── Lookup Functions ────────────────────────────────────────────────

export function getPropertyTypeBySlug(slug: string): PropertyType | undefined {
  return PROPERTY_TYPES.find((pt) => pt.slug === slug)
}

export function getAllPropertyTypeSlugs(): string[] {
  return PROPERTY_TYPES.map((pt) => pt.slug)
}

export const PROPERTY_TYPES_COUNT: number = PROPERTY_TYPES.length

// ─── Publication date ───────────────────────────────────────────────
export const PROPERTY_TYPES_PUBLISHED_AT = '2026-03-18'
