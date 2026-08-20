export interface StateKeyStatute {
  name: string
  description: string
  url?: string
}

export interface StateKeyFact {
  label: string
  value: string
}

export interface StateNoticePeriod {
  type: string
  period: string
  details: string
}

export interface StateAuditRights {
  summary: string
  details: string
}

export interface StateFaq {
  question: string
  answer: string
}

export interface StateLandlordTenantData {
  state: string
  stateCode: string
  slug: string
  overview: string
  keyStatutes: StateKeyStatute[]
  keyFacts: StateKeyFact[]
  noticePeriods: StateNoticePeriod[]
  auditRights: StateAuditRights
  faqs: StateFaq[]
  metaDescription: string
  relatedFields?: string[]
  relatedRedFlags?: string[]
}

export const stateData: StateLandlordTenantData[] = [
  {
    state: 'California',
    stateCode: 'CA',
    slug: 'california',
    overview:
      'California is among the most tenant-protective commercial leasing jurisdictions in the country. The landmark SB 1103, effective January 2025, introduced the "Qualified Commercial Tenant" framework under Civil Code Section 1950.9, extending residential-style transparency and notice protections to small businesses with fewer than 5 employees (or 10 for restaurants) and nonprofits with fewer than 20 employees.\n\nFor general commercial tenancies not covered by the SB 1103 qualifications, California remains relatively balanced but leans tenant-friendly regarding eviction proceedings. Landlords must strictly follow the state\'s formal Unlawful Detainer process. Commercial self-help evictions and lockouts are expressly illegal and expose landlords to punitive damages and business interruption lawsuits. The complex interplay of local municipal ordinances in major hubs like San Francisco and Los Angeles requires practitioners to look beyond the state Civil Code when structuring or abstracting commercial agreements.',
    keyStatutes: [
      {
        name: 'California Civil Code Section 1950.9 (SB 1103)',
        description:
          'Introduced "Qualified Commercial Tenant" protections, including mandatory notice periods, lease translation requirements, and statutory audit rights for small businesses and nonprofits.',
        url: 'https://leginfo.legislature.ca.gov',
      },
      {
        name: 'California Civil Code Section 1950.7',
        description:
          'Governs commercial security deposits, including permissible deductions and return timelines. No statutory cap exists for commercial deposits.',
        url: 'https://leginfo.legislature.ca.gov',
      },
      {
        name: 'California Civil Code Section 1632',
        description:
          'Requires lease translation into the language in which negotiations were conducted (Spanish, Chinese, Tagalog, Vietnamese, or Korean) for qualified tenants.',
        url: 'https://leginfo.legislature.ca.gov',
      },
    ],
    keyFacts: [
      {
        label: 'Regulatory Stance',
        value: 'Tenant-Protective',
      },
      {
        label: 'Self-Help Evictions',
        value: 'Strictly illegal for all commercial properties',
      },
      {
        label: 'Commercial Rent Tax',
        value: 'Local overlays only (no statewide tax)',
      },
      {
        label: 'Statutory Audit Rights',
        value: 'Yes, for Qualified Commercial Tenants under SB 1103',
      },
      {
        label: 'Security Deposit Cap',
        value: 'No statutory limit for commercial leases',
      },
    ],
    noticePeriods: [
      {
        type: 'Lease Termination (Qualified Tenant, under 1 year)',
        period: '30 days',
        details:
          'A 30-day notice is required for terminating a qualified commercial tenant occupying the space for less than one year.',
      },
      {
        type: 'Lease Termination (Qualified Tenant, over 1 year)',
        period: '60 days',
        details:
          'A mandatory extended notice period for qualified tenants occupying the space for over one year, regardless of contract terms.',
      },
      {
        type: 'Rent Increase over 10% (Qualified Tenant)',
        period: '90 days',
        details:
          'Requires 90 days of formal notice for any month-to-month rent increases exceeding 10% of the previous year\'s rent.',
      },
    ],
    auditRights: {
      summary:
        'Statutory rights introduced for Qualified Tenants; otherwise strictly governed by negotiated lease terms.',
      details:
        'Historically, commercial CAM audit rights in California were strictly contractual. Under Civil Code Section 1950.9 (SB 1103), landlords are now required to proactively notify Qualified Commercial Tenants of their right to inspect OPEX documentation prior to lease execution. These tenants possess an automatic, non-waivable statutory right to audit upon 30 days of prior written notice, and landlord noncompliance serves as a powerful affirmative defense to any eviction action. For larger, non-qualified corporate tenants, common law and explicit lease terms still dictate audit boundaries.',
    },
    faqs: [
      {
        question: 'What is a Qualified Commercial Tenant under SB 1103?',
        answer:
          'A Qualified Commercial Tenant is a small business with fewer than 5 employees (or 10 for restaurants), or a nonprofit with fewer than 20 employees. These tenants receive enhanced protections including extended notice periods and mandatory OPEX audit rights.',
      },
      {
        question: 'Can a commercial landlord legally lock out a tenant in California?',
        answer:
          'No. California strictly outlaws all forms of self-help evictions for commercial properties. A landlord must go through the formal, judicial Unlawful Detainer court process.',
      },
      {
        question: 'What happens if a landlord fails to translate a commercial lease?',
        answer:
          'Under Civil Code Section 1632, if the lease was negotiated orally in Spanish, Chinese, Tagalog, Vietnamese, or Korean, failure to provide a fully translated lease gives the qualified tenant the absolute right to rescind the lease entirely without penalty.',
      },
      {
        question: 'Is there a statutory limit on commercial security deposits in CA?',
        answer:
          'No. Unlike residential leases which are capped, California Civil Code Section 1950.7 does not place any statutory cap on the amount a landlord can demand for a commercial security deposit.',
      },
    ],
    metaDescription:
      'Explore California commercial landlord-tenant laws, including new SB 1103 protections for qualified tenants, mandatory notice periods, and commercial eviction rules.',
  },
  {
    state: 'Texas',
    stateCode: 'TX',
    slug: 'texas',
    overview:
      'Texas maintains one of the most landlord-friendly commercial leasing environments in the United States. Commercial real estate operates on the foundational presumption that business entities are sophisticated actors capable of negotiating their own risk and liabilities. Statutory intervention is intentionally minimal, mostly contained within Chapter 93 of the Texas Property Code, which applies exclusively to commercial tenancies.\n\nTexas is highly unique in permitting commercial landlords to use self-help eviction methods. Specifically, commercial landlords possess the statutory right to change the locks of a commercial tenant who is delinquent in paying rent, bypassing the courts entirely (subject to specific notice posting requirements). This regulatory climate results in minimal consumer-style protections for commercial tenants, making the abstraction and negotiation of exact lease terms paramount for tenant survival in the state.',
    keyStatutes: [
      {
        name: 'Texas Property Code Chapter 93',
        description:
          'The primary statute governing commercial tenancies, covering landlord obligations, tenant remedies, and the highly unique statutory right to commercial lockouts for delinquent tenants.',
        url: 'https://statutes.capitol.texas.gov',
      },
      {
        name: 'Texas Property Code Section 91.001',
        description:
          'Establishes default notice periods for terminating tenancies in scenarios where the commercial lease is silent.',
        url: 'https://statutes.capitol.texas.gov',
      },
    ],
    keyFacts: [
      {
        label: 'Regulatory Stance',
        value: 'Landlord-Friendly',
      },
      {
        label: 'Self-Help Evictions',
        value: 'Legal if tenant is delinquent in rent (with notice requirements)',
      },
      {
        label: 'Commercial Rent Tax',
        value: 'No state or local commercial rent tax',
      },
      {
        label: 'Statutory Audit Rights',
        value: 'None. Governed entirely by the lease contract.',
      },
      {
        label: 'Duty to Mitigate',
        value: 'Non-waivable. Landlords must make good faith effort to re-let.',
      },
    ],
    noticePeriods: [
      {
        type: 'Rent Default (Eviction)',
        period: '3 days',
        details:
          'Unless the commercial lease explicitly alters the timeline, a landlord must serve a 3-day written Notice to Vacate before filing a forcible detainer suit in justice court.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '1 month',
        details:
          'Requires one month\'s notice, terminating on the later of the specified day or one month after notice is formally given.',
      },
      {
        type: 'Year-to-Year Lease Termination',
        period: '6 months',
        details:
          'For a year-to-year commercial tenancy in Texas, common law and court precedent require approximately 6 months\' notice to terminate at the end of the lease year, unless the lease specifies otherwise.',
      },
    ],
    auditRights: {
      summary:
        'Governed entirely by the negotiated lease terms; there are no statutory commercial audit rights.',
      details:
        'Texas law respects the sanctity of the commercial contract. If a commercial tenant wishes to audit CAM charges, property taxes, or operating expenses, the right, procedural methodology, look-back period, and financial remedies must be explicitly codified within the lease agreement. While Texas common law may support limited discovery rights during active litigation, there is no statutory mandate compelling landlords to open their accounting books to tenants.',
    },
    faqs: [
      {
        question: 'Can a Texas landlord legally change the locks on a commercial tenant?',
        answer:
          'Yes. Under Texas Property Code Chapter 93, a commercial landlord may change the locks on a tenant who is delinquent in paying rent. The landlord must post a notice on the front door with an emergency contact to retrieve a new key during normal business hours.',
      },
      {
        question: 'What is the security deposit deadline in Texas?',
        answer:
          'Commercial landlords must return the security deposit, or provide a detailed, itemized list of deductions, within 60 days after the tenant surrenders possession and provides a forwarding address.',
      },
      {
        question: 'Is the duty to mitigate damages waivable in a Texas lease?',
        answer:
          'No. Texas law firmly requires landlords to make an objective, good faith effort to find a replacement tenant if a commercial tenant abandons the lease early. This specific duty cannot be waived in the lease contract.',
      },
      {
        question: 'What notice is required for a commercial eviction lawsuit in TX?',
        answer:
          'Unless the commercial lease explicitly alters the timeline, a landlord must serve a 3-day written Notice to Vacate before filing a forcible detainer suit in justice court.',
      },
    ],
    metaDescription:
      'Understand Texas commercial lease laws, Property Code Chapter 93, commercial lockouts, statutory eviction notices, and landlord-tenant rules.',
  },
  {
    state: 'New York',
    stateCode: 'NY',
    slug: 'new-york',
    overview:
      'New York presents a complex, bifurcated commercial leasing environment marked by the tension between broader state common laws and the highly specialized regulatory matrix of New York City. State-level commercial real estate law relies heavily on strict contractual interpretation, viewing commercial tenants as highly sophisticated actors capable of protecting their own interests. However, New York commercial tenants benefit from stringent anti-harassment protections and strict judicial procedures for evictions, heavily disfavoring any form of landlord self-help.\n\nIn New York City, the abstraction landscape is complicated by powerful municipal overlays, most notably the NYC Commercial Rent Tax (CRT), which actively taxes tenants based on their annualized base rent metrics. The NYC Non-Residential Tenant Harassment Law offers specific statutory protections against landlords using aggressive operational tactics to force out commercial tenants. Eviction proceedings, known legally as summary nonpayment or holdover proceedings, require absolute adherence to statutory notice demands before a court filing will be accepted.',
    keyStatutes: [
      {
        name: 'NYC Commercial Rent Tax (CRT)',
        description:
          'Imposes a tax on commercial tenants in Manhattan south of 96th Street with annual rent exceeding a threshold (approximately $250,000), adding a significant cost layer to lease administration.',
        url: 'https://nycadmincode.readthedocs.io',
      },
      {
        name: 'NY Real Property Actions and Proceedings Law (RPAPL)',
        description:
          'Dictates the strict procedural requirements for commercial evictions, including the mandatory 14-day rent demand.',
      },
      {
        name: 'NYC Non-Residential Tenant Harassment Law',
        description:
          'Protects commercial businesses from intentional interference with proper and customary building use designed to force vacatur.',
      },
    ],
    keyFacts: [
      {
        label: 'Regulatory Stance',
        value: 'Moderate / Complex (heavy NYC overlay)',
      },
      {
        label: 'Self-Help Evictions',
        value: 'Heavily restricted. Landlords must use judicial summary proceedings.',
      },
      {
        label: 'Commercial Rent Tax',
        value: 'Yes (NYC specific, Manhattan south of 96th Street)',
      },
      {
        label: 'Security Deposits',
        value: 'No statutory limit, but funds must not be commingled with landlord personal assets.',
      },
      {
        label: 'Warranty of Habitability',
        value: 'Does not apply to commercial leases.',
      },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '14 days',
        details:
          'A strict 14-day written rent demand is required before a commercial landlord can file a nonpayment proceeding.',
      },
      {
        type: 'Month-to-Month Termination (under 1 year)',
        period: '30 days',
        details:
          'A 30-day notice to vacate is required for tenants occupying the space for less than 1 year.',
      },
      {
        type: 'Month-to-Month Termination (1-2 years)',
        period: '60 days',
        details:
          'A 60-day notice to vacate is statutorily required for tenants occupying the space for between 1 and 2 years.',
      },
      {
        type: 'Month-to-Month Termination (over 2 years)',
        period: '90 days',
        details:
          'A 90-day notice to vacate is required if the tenant has occupied the space for more than 2 full years.',
      },
    ],
    auditRights: {
      summary:
        'Strictly contract-driven; there is no state statutory right to audit commercial CAM.',
      details:
        'New York does not possess any statutory mechanism granting commercial tenants the right to audit landlord operating expenses or CAM charges. The entire scope of audit rights, look-back periods, and the allocation of CPA audit costs must be heavily negotiated prior to execution. Under New York common law, if a lease is silent on audit rights, a tenant must generally allege a formal breach of contract in court to utilize the discovery process to review landlord financial records.',
    },
    faqs: [
      {
        question: 'What is the NYC Commercial Rent Tax?',
        answer:
          'The Commercial Rent Tax (CRT) applies to commercial tenants in Manhattan south of 96th Street with annual rent exceeding approximately $250,000. It is a tax paid by the tenant, not the landlord, and adds roughly 3.9% to lease costs after credits.',
      },
      {
        question: 'How much notice is required for a commercial eviction in NY?',
        answer:
          'For nonpayment of rent, landlords must serve a strict 14-day written rent demand. For month-to-month lease terminations, the notice period scales from 30 to 90 days depending on the length of occupancy.',
      },
      {
        question: 'Can a landlord cut off utilities to evict a tenant in NYC?',
        answer:
          'No. The NYC Non-Residential Tenant Harassment Law makes it explicitly illegal to intentionally interrupt essential services (such as electricity, water, or heat) in an attempt to force a commercial tenant to vacate the premises.',
      },
      {
        question: 'Is commercial rent control legal in New York?',
        answer:
          'No. While residential rent stabilization is a massive component of NY law, there is currently no legal framework for commercial rent control in New York state.',
      },
    ],
    metaDescription:
      'Navigate New York commercial lease laws, the NYC Commercial Rent Tax (CRT), statutory 14-day rent demands, and strict commercial tenant harassment protections.',
  },
  {
    state: 'Florida',
    stateCode: 'FL',
    slug: 'florida',
    overview:
      'Florida maintains a highly landlord-friendly and fast-paced commercial real estate ecosystem. Commercial tenancies are strictly governed by Part I of Chapter 83 of the Florida Statutes, which provides a straightforward, efficient framework for landlords managing tenant defaults. Unlike states that blend residential and commercial protections or rely heavily on municipal overlays, Florida law explicitly separates the two property types, offering virtually zero consumer-style protections to commercial lessees.\n\nThe state emphasizes the primacy of the negotiated lease agreement above all else. Where the lease is silent, statutory defaults apply, which include rapid 3-day notice periods for eviction filings. Florida is also unique in imposing a state sales tax directly on commercial rent payments (though the rate has been subject to recent incremental legislative reductions), creating an additional layer of financial abstraction, liability, and compliance for both property managers and tenants.',
    keyStatutes: [
      {
        name: 'Florida Statutes Chapter 83, Part I',
        description:
          'Governs commercial tenancies, covering landlord remedies, default procedures, and the rapid eviction process for commercial properties.',
        url: 'https://www.flsenate.gov',
      },
      {
        name: 'Florida Statutes Section 83.20',
        description:
          'Establishes the criteria and the rapid 3-day notice period for executing commercial evictions due to non-payment of rent.',
        url: 'https://www.flsenate.gov',
      },
    ],
    keyFacts: [
      {
        label: 'Regulatory Stance',
        value: 'Landlord-Friendly',
      },
      {
        label: 'Self-Help Evictions',
        value: 'Illegal. Judicial process required.',
      },
      {
        label: 'Commercial Rent Sales Tax',
        value: 'Yes. Florida charges state sales tax (plus county surtax) on commercial rent.',
      },
      {
        label: 'Abandonment',
        value: 'Legally presumed if the tenant is absent 30 days, rent is unpaid, and 10 days pass after notice.',
      },
      {
        label: 'Lien for Rent',
        value: 'Landlords possess a statutory lien on all tenant property located on the premises for past due rent.',
      },
    ],
    noticePeriods: [
      {
        type: 'Rent Default (Eviction)',
        period: '3 days',
        details:
          'A 3-day notice is the statutory default before a landlord can file for eviction due to non-payment of rent.',
      },
      {
        type: 'Non-Rent Lease Violation',
        period: '15 days',
        details:
          'A 15-day notice is required for curable lease violations other than non-payment of rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '15 days',
        details:
          '15 days of notice prior to the end of the monthly period is required to terminate.',
      },
      {
        type: 'Year-to-Year Termination',
        period: '3 months',
        details:
          '3 months of notice prior to the end of the annual period is required to terminate.',
      },
    ],
    auditRights: {
      summary:
        'No statutory commercial audit rights; strictly governed by the lease contract.',
      details:
        'Florida statutes do not grant commercial tenants any right to audit CAM or operating expenses. If an explicit audit clause is not actively negotiated and incorporated into the physical lease document, the tenant relies solely on Florida common law principles, which generally require initiating costly litigation to demand financial discovery from the landlord.',
    },
    faqs: [
      {
        question: 'How fast can a commercial landlord begin eviction proceedings in Florida?',
        answer:
          'Very fast. Under Florida Statutes Section 83.20, a landlord only needs to serve a 3-day written notice demanding rent before filing for eviction. This is one of the shortest timelines in the country.',
      },
      {
        question: 'Are there rules for holding commercial security deposits in FL?',
        answer:
          'No. While residential deposits have strict banking and notice requirements, commercial security deposits are entirely governed by the lease terms. Landlords may legally commingle funds unless the lease explicitly prohibits it.',
      },
      {
        question: 'Do I have to pay sales tax on my commercial lease in Florida?',
        answer:
          'Yes. Florida is the only state in the U.S. that charges state sales tax (plus local county discretionary sales surtax) directly on the total rent paid under a commercial lease.',
      },
      {
        question: 'What is the penalty for holding over in Florida?',
        answer:
          'If the lease does not specify a distinct rate, Florida statute allows the landlord to demand double the monthly rent for any period the tenant refuses to vacate after lease expiration.',
      },
    ],
    metaDescription:
      'Guide to Florida commercial lease laws, including Chapter 83 Part I, rapid 3-day eviction notices, commercial rent sales tax, and security deposit regulations.',
  },
  {
    state: 'Illinois',
    stateCode: 'IL',
    slug: 'illinois',
    overview:
      'Illinois commercial landlord-tenant law is firmly grounded in the state\'s Code of Civil Procedure, particularly the Forcible Entry and Detainer Act. The state attempts to balance the playing field between landlords and commercial enterprises, though local municipalities, most notably the City of Chicago, impose highly complex additional layers of regulatory compliance. Commercial eviction in Illinois requires strict adherence to judicial procedures; self-help lockouts are completely illegal and can result in severe financial damages assessed against the landlord.\n\nRecent legislative updates in Illinois include mandatory flood disclosures for rental agreements, expanding transparency requirements. In Chicago, the municipal code exerts heavy influence on commercial operations, including stringent requirements for commercial storefront registrations designed to combat urban blight. Understanding the complex interplay between state eviction statutes and Chicago municipal ordinances is critical for accurate lease administration and abstraction in this market.',
    keyStatutes: [
      {
        name: '735 ILCS 5/9 (Forcible Entry and Detainer Act)',
        description:
          'Governs all commercial eviction proceedings in Illinois, requiring landlords to follow strict statutory notice and filing requirements.',
        url: 'https://www.ilga.gov',
      },
      {
        name: '735 ILCS 5/9-209',
        description:
          'Establishes the exact 5-day notice requirement and formatting for nonpayment of rent.',
        url: 'https://www.ilga.gov',
      },
      {
        name: 'Chicago Municipal Code Chapter 5-14',
        description:
          'Mandates the registration, liability insurance, and maintenance of vacant commercial storefronts.',
        url: 'https://www.chicago.gov',
      },
    ],
    keyFacts: [
      {
        label: 'Regulatory Stance',
        value: 'Moderate / Localized (heavy Chicago overlay)',
      },
      {
        label: 'Self-Help Evictions',
        value: 'Illegal. Judicial process required.',
      },
      {
        label: 'Rent Acceptance',
        value: 'Accepting partial rent during a 5-day notice period may legally invalidate the eviction suit.',
      },
      {
        label: 'Vacant Storefronts (Chicago)',
        value: 'Owners must register vacant commercial storefronts, maintain liability insurance, and pay a fee every 6 months.',
      },
      {
        label: 'Flood Disclosures',
        value: 'Landlords must disclose FEMA flood zones and historical flooding prior to lease signing.',
      },
    ],
    noticePeriods: [
      {
        type: 'Rent Default (Eviction)',
        period: '5 days',
        details:
          'A 5-day notice demanding rent is required. The demand must solely include rent, not late fees or damages, to avoid invalidating the notice.',
      },
      {
        type: 'Lease Violation',
        period: '10 days',
        details:
          'A 10-day notice to quit is required for breaches of lease terms other than rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          '30 days of notice is required to terminate a month-to-month tenancy.',
      },
      {
        type: 'Year-to-Year Termination',
        period: '60 days',
        details:
          '60 days of notice is required to terminate a year-to-year lease.',
      },
    ],
    auditRights: {
      summary:
        'Governed entirely by the commercial lease agreement; no statutory mandate exists.',
      details:
        'Illinois statutes do not grant commercial tenants automatic rights to audit CAM charges or operating expenses. Tenants must negotiate precise audit parameters, such as the timeline, location of document review, and auditor qualifications, within the lease agreement. Disputes are handled strictly as standard breach of contract claims under Illinois civil law.',
    },
    faqs: [
      {
        question: 'How many days of notice must an IL commercial landlord give for unpaid rent?',
        answer:
          'The landlord must serve a 5-Day Notice demanding rent. The demand must solely include rent, not late fees or damages, to avoid legally invalidating the notice.',
      },
      {
        question: 'Are commercial landlords in Chicago required to register vacant space?',
        answer:
          'Yes. A Chicago ordinance requires property owners to register vacant commercial storefronts, maintain high-limit liability insurance, and pay a bi-annual fee to the city.',
      },
      {
        question: 'Does Illinois law require a commercial security deposit to be in an interest-bearing account?',
        answer:
          'No. The strict rules regarding interest on security deposits generally apply to residential properties in Illinois, not commercial leases.',
      },
      {
        question: 'Can accepting partial rent affect an eviction case in Illinois?',
        answer:
          'Yes. If a landlord accepts any partial rent payment during the 5-day notice period, it may legally invalidate the eviction suit and require the landlord to restart the process.',
      },
    ],
    metaDescription:
      'Overview of Illinois commercial lease law, 735 ILCS Forcible Entry Act, 5-day eviction notices, and Chicago municipal commercial registrations.',
  },
  {
    state: 'Pennsylvania',
    stateCode: 'PA',
    slug: 'pennsylvania',
    overview:
      'Pennsylvania commercial leasing operates under the Landlord and Tenant Act of 1951, a legacy statute that bridges both residential and commercial tenancies. Commercial parties are afforded far more flexibility to actively waive statutory defaults. The state\'s commercial real estate market relies heavily on customized lease drafting, as courts consistently uphold negotiated terms regarding liability, maintenance, and audit rights over statutory baselines.\n\nLocal municipalities exert considerable influence on commercial operations in Pennsylvania. Businesses operating in Philadelphia must navigate dense local taxation and registration requirements, such as obtaining a Commercial Activity License and a Business Income and Receipts Tax (BIRT) account, before they can legally operate. Unlike residential leases, where security deposits are strictly capped at two months\' rent, commercial leases in Pennsylvania face no statutory limits on deposit size or interest-bearing account requirements.',
    keyStatutes: [
      {
        name: '68 P.S. Section 250 (Landlord and Tenant Act of 1951)',
        description:
          'The primary statute governing commercial tenancies in PA, providing default notice periods and eviction procedures that can be modified by contract.',
        url: 'https://www.legis.state.pa.us',
      },
      {
        name: '68 P.S. Section 250.302 (Distress for Rent)',
        description:
          'Allows landlords to seize tenant personal property for unpaid rent, though its use is constitutionally restricted and highly complex.',
        url: 'https://www.legis.state.pa.us',
      },
      {
        name: 'Philadelphia Municipal Code',
        description:
          'Requires Commercial Activity Licenses for all businesses operating within the city.',
        url: 'https://www.phila.gov',
      },
    ],
    keyFacts: [
      {
        label: 'Regulatory Stance',
        value: 'Business-Flexible',
      },
      {
        label: 'Self-Help Evictions',
        value: 'Restricted. Judicial process is strongly advised.',
      },
      {
        label: 'Confession of Judgment',
        value: 'PA is one of the few states allowing these clauses in commercial leases, enabling rapid eviction or monetary judgments without trial.',
      },
      {
        label: 'Waiver of Notice',
        value: 'Commercial tenants can legally waive their right to receive a Notice to Quit directly in the lease.',
      },
      {
        label: 'Philadelphia Licensing',
        value: 'A Commercial Activity License (CAL) linked to a BIRT account is required for all commercial operations in Philadelphia.',
      },
    ],
    noticePeriods: [
      {
        type: 'Rent Default (with Notice to Quit)',
        period: '10 days',
        details:
          'A 10-day notice is the statutory default for nonpayment of rent, though this can be waived in the lease.',
      },
      {
        type: 'Lease Termination (Month-to-Month)',
        period: '15 days',
        details:
          'A 15-day notice is required to terminate a month-to-month commercial tenancy.',
      },
      {
        type: 'Lease Termination (Year-to-Year)',
        period: '30 days',
        details:
          'A 30-day notice is required to terminate a year-to-year tenancy, unless waived in the lease.',
      },
    ],
    auditRights: {
      summary:
        'No statutory audit rights; explicitly dependent on active lease negotiations.',
      details:
        'Pennsylvania\'s Landlord and Tenant Act does not address commercial CAM or operating expense audits. Sophisticated commercial leases in PA typically detail the procedural methodology for invoking an audit, limiting the look-back period (often to 1-2 years), and shifting the cost of the audit to the landlord only if an error margin (e.g., greater than 5%) is successfully discovered by the tenant.',
    },
    faqs: [
      {
        question: 'What is a Confession of Judgment clause?',
        answer:
          'A Confession of Judgment clause allows a landlord to obtain an immediate court judgment against a defaulting tenant without a trial. It is one of the most powerful tools in a Pennsylvania commercial landlord\'s arsenal and is enforceable in PA courts.',
      },
      {
        question: 'What is a Commercial Activity License in Philadelphia?',
        answer:
          'It is a mandatory municipal license required to operate any business inside Philadelphia city limits. It links the business directly to their Business Income and Receipts Tax (BIRT) account.',
      },
      {
        question: 'Can a commercial tenant waive the Notice to Quit in Pennsylvania?',
        answer:
          'Yes. In Pennsylvania commercial leases, tenants routinely waive their statutory right to receive a 15-day or 30-day Notice to Quit, allowing landlords to file for immediate eviction upon default.',
      },
      {
        question: 'Are there limits on commercial security deposits in PA?',
        answer:
          'No. Unlike residential leases, which cap security deposits at two months\' rent, commercial leases in Pennsylvania have no statutory limits on deposit amounts or interest requirements.',
      },
    ],
    metaDescription:
      'Pennsylvania commercial lease law insights, Landlord and Tenant Act of 1951, Philadelphia CAL licenses, and Confession of Judgment clauses.',
  },
  {
    state: 'Ohio',
    stateCode: 'OH',
    slug: 'ohio',
    overview:
      'Ohio offers a business-friendly, flexible regulatory environment for commercial real estate. While the Ohio Revised Code Chapter 5321 meticulously outlines residential landlord-tenant duties, these statutes expressly do not apply to commercial leases. Instead, commercial leasing in Ohio relies almost entirely on the written contract and common law principles, granting landlords and tenants immense latitude to negotiate their own rules regarding maintenance, liability, and operating expenses.\n\nEviction processes are governed by Ohio Revised Code Chapter 1923, known as Forcible Entry and Detainer. Ohio is one of the states where common law still permits commercial self-help evictions (lockouts) for rent default, provided the written lease explicitly authorizes the remedy, all notice periods have expired, and the lockout can be performed peacefully without a breach of the peace.',
    keyStatutes: [
      {
        name: 'Ohio Revised Code Chapter 1923 (Forcible Entry and Detainer)',
        description:
          'Governs commercial eviction proceedings, providing a fast-track judicial process for landlords to regain possession.',
        url: 'https://codes.ohio.gov',
      },
      {
        name: 'Ohio Revised Code Chapter 5321',
        description:
          'Residential landlord-tenant law. Important for commercial practitioners to know it specifically excludes commercial spaces.',
        url: 'https://codes.ohio.gov',
      },
    ],
    keyFacts: [
      {
        label: 'Regulatory Stance',
        value: 'Business-Flexible',
      },
      {
        label: 'Self-Help Evictions',
        value: 'Legal if the lease authorizes it and the lockout is peaceable.',
      },
      {
        label: 'Statutory Protections',
        value: 'Commercial tenants lack the habitability and retaliation defenses provided to residential tenants.',
      },
      {
        label: 'Security Deposits',
        value: 'No statutory regulations for commercial deposit returns or interest.',
      },
      {
        label: 'Eviction Timelines',
        value: 'Forcible Entry and Detainer hearings are scheduled rapidly, often within 1-2 weeks of filing.',
      },
    ],
    noticePeriods: [
      {
        type: 'Rent Default (Eviction)',
        period: '3 days',
        details:
          'A standard 3-day notice is required before filing an eviction, unless the lease alters the timeframe.',
      },
      {
        type: 'Notice and Cure',
        period: 'Contractual',
        details:
          'Before the 3-day notice, landlords must observe any Notice and Cure periods explicitly written into the commercial lease.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Ohio common law requires a 30-day written notice to terminate a month-to-month commercial tenancy, unless the parties have agreed to a different period in the lease.',
      },
    ],
    auditRights: {
      summary: 'Entirely dependent on negotiated lease provisions.',
      details:
        'Ohio law imposes no statutory obligation on commercial landlords to provide CAM or operating expense reconciliations. Tenants must proactively draft continuous audit rights into their leases. Without an express clause, an Ohio court will not infer an audit right, forcing tenants into costly litigation to access accounting records.',
    },
    faqs: [
      {
        question: 'Are commercial tenants covered by ORC 5321?',
        answer:
          'No. Ohio Revised Code Chapter 5321 strictly governs residential landlord-tenant relations. Commercial tenants have fewer statutory protections and must rely on their lease.',
      },
      {
        question: 'What is a Forcible Entry and Detainer action in Ohio?',
        answer:
          'It is the formal, fast-track judicial process used by landlords to evict tenants and regain possession of the property under ORC Chapter 1923.',
      },
      {
        question: 'Can an Ohio commercial landlord seize my business equipment?',
        answer:
          'A landlord may not seize control or ownership of the tenant\'s personal property or trade fixtures during a lockout. They must accommodate the tenant\'s retrieval of their contents.',
      },
      {
        question: 'Can a commercial landlord lock out a tenant in Ohio?',
        answer:
          'Yes, if the lease explicitly authorizes self-help, all notice periods have expired, and the lockout is performed peacefully without a breach of the peace. Many landlords still prefer the judicial process to avoid liability.',
      },
    ],
    metaDescription:
      'Learn about Ohio commercial real estate laws, ORC 1923 Forcible Entry and Detainer, commercial lockouts, and 3-day eviction notices.',
  },
  {
    state: 'Georgia',
    stateCode: 'GA',
    slug: 'georgia',
    overview:
      'Georgia operates as a highly landlord-friendly jurisdiction, with commercial lease dynamics heavily favoring the written contract. Title 44, Chapter 7 of the Georgia Code governs landlord and tenant relationships, outlining basic frameworks but allowing commercial parties broad flexibility to structure their agreements and liabilities.\n\nIn the absence of a written commercial lease, a tenancy at will is created, which mandates specific 60-day and 30-day notice periods for termination. Commercial landlords in Georgia must use the judicial dispossessory process to evict a tenant; self-help lockouts are illegal. Local governance plays a key role for operational businesses; for example, the City of Atlanta requires comprehensive Business Occupational Tax Certificates (business licenses), including E-Verify affidavits and lease copies, before a tenant can legally open their doors.',
    keyStatutes: [
      {
        name: 'O.C.G.A. Title 44, Chapter 7 (Landlord and Tenant)',
        description:
          'Governs the landlord-tenant relationship in Georgia, covering default provisions, eviction requirements, and tenancy at will rules.',
        url: 'https://law.justia.com',
      },
      {
        name: 'O.C.G.A. Section 44-7-7',
        description:
          'Dictates the strict notice requirements for terminating a tenancy at will (60 days for landlord, 30 days for tenant).',
        url: 'https://law.justia.com',
      },
    ],
    keyFacts: [
      {
        label: 'Regulatory Stance',
        value: 'Landlord-Friendly',
      },
      {
        label: 'Self-Help Evictions',
        value: 'Illegal. Judicial dispossessory process required.',
      },
      {
        label: 'Tenancy at Will',
        value: 'Created when a tenant occupies space and pays rent without a signed written lease.',
      },
      {
        label: 'Usufruct',
        value: 'Leases under 5 years grant a right to use rather than passing an estate in land, limiting transferability.',
      },
      {
        label: 'Atlanta Licensing',
        value: 'Atlanta mandates Occupational Tax Certificates and E-Verify affidavits for all operating businesses.',
      },
    ],
    noticePeriods: [
      {
        type: 'Tenancy at Will (Landlord Termination)',
        period: '60 days',
        details:
          'Landlord must provide 60 days of notice to terminate a tenancy at will.',
      },
      {
        type: 'Tenancy at Will (Tenant Termination)',
        period: '30 days',
        details:
          'Tenant must give 30 days of notice to terminate the arrangement.',
      },
      {
        type: 'Rent Default',
        period: 'Immediate',
        details:
          'Unless the lease states otherwise, a landlord can immediately demand possession and file a dispossessory affidavit upon failure to pay rent.',
      },
    ],
    auditRights: {
      summary: 'Purely contractual; no Georgia statutes mandate CAM transparency.',
      details:
        'Commercial tenants in Georgia must strictly negotiate their CAM audit rights within the lease. The courts view commercial leases as arms-length transactions between sophisticated parties and will strictly enforce the exact wording regarding look-back periods, CPA requirements, and document access.',
    },
    faqs: [
      {
        question: 'Can a Georgia landlord evict a commercial tenant without a court order?',
        answer:
          'No. Commercial landlords must go through the judicial process by filing a dispossessory affidavit. Self-help evictions are not permitted.',
      },
      {
        question: 'What notice is required if there is no written commercial lease?',
        answer:
          'It becomes a tenancy at will. The landlord must provide a 60-day notice to terminate or raise rent, and the tenant must provide a 30-day notice to leave.',
      },
      {
        question: 'Do I need a business license to sign a commercial lease in Atlanta?',
        answer:
          'While you do not need it to sign the lease, you must obtain a Business Occupational Tax Certificate from the City of Atlanta to legally operate. You will need to provide a copy of your lease to obtain the license.',
      },
      {
        question: 'What is a usufruct in Georgia real estate?',
        answer:
          'A usufruct is a right to use property owned by another party. In Georgia, commercial leases under 5 years grant a usufruct rather than an estate in land, which affects transferability and recording requirements.',
      },
    ],
    metaDescription:
      'Understand Georgia commercial landlord-tenant law, Title 44 Chapter 7, dispossessory affidavits, usufruct rules, and Atlanta business licensing.',
  },
  {
    state: 'New Jersey',
    stateCode: 'NJ',
    slug: 'new-jersey',
    overview:
      'New Jersey maintains a complex, highly protective statutory environment for tenants, though commercial leases are afforded less regulatory shielding than residential properties. Commercial evictions are governed primarily by N.J.S.A. 2A:18-53. New Jersey is notable for requiring highly specific, jurisdictional notice formats; failure to serve a Notice to Quit correctly completely deprives the court of jurisdiction and results in immediate case dismissal.\n\nUnlike residential actions under the Anti-Eviction Act, commercial landlords can evict holdover tenants or tenants who breach lease covenants with relatively short notice, provided the judicial process is strictly followed. The state prohibits commercial self-help lockouts, mandating that landlords file a summary dispossess complaint. New Jersey case law also strongly enforces common law inspection rights for corporate shareholders and partners, extending a culture of documentation transparency that often influences commercial lease audit negotiations.',
    keyStatutes: [
      {
        name: 'N.J.S.A. 2A:18-53 et seq.',
        description:
          'Governs commercial eviction proceedings, specifying the exact notice requirements and grounds for filing a summary dispossess action.',
        url: 'https://www.nj.gov/dca',
      },
      {
        name: 'N.J.S.A. 2A:18-56 (Warrant for Removal)',
        description:
          'Authorizes courts to issue a warrant for removal after a judgment of possession, setting the timeline and process for physically dispossessing a commercial tenant.',
        url: 'https://www.nj.gov/dca',
      },
    ],
    keyFacts: [
      {
        label: 'Regulatory Stance',
        value: 'Highly Procedural',
      },
      {
        label: 'Self-Help Evictions',
        value: 'Illegal. Summary dispossess complaint required.',
      },
      {
        label: 'Notice Jurisdiction',
        value: 'If a Notice to Quit is served improperly, the NJ court lacks jurisdiction and will dismiss the case.',
      },
      {
        label: 'Legal Representation',
        value: 'Business entities (LLCs, Corps) must be represented by an attorney in NJ landlord-tenant court.',
      },
      {
        label: 'Late Fees as Rent',
        value: 'Permitted in commercial leases if explicitly defined as "additional rent" in the contract.',
      },
    ],
    noticePeriods: [
      {
        type: 'Rent Default (Nonpayment)',
        period: 'No prior notice required',
        details:
          'Under N.J.S.A. 2A:18-53(b), a landlord can file a summary dispossess action immediately for nonpayment of rent without prior notice, unless the lease stipulates a grace period.',
      },
      {
        type: 'Disorderly / Willful Destruction',
        period: '3 days',
        details:
          'A 3-day Notice to Quit is required before filing suit for destruction or severe rules violations.',
      },
      {
        type: 'Lease Breach (with Re-entry right)',
        period: '3 days',
        details:
          'A 3-day Notice to Quit is required for a breach of covenant where the landlord reserved a right of reentry.',
      },
      {
        type: 'Holdover (Month-to-Month)',
        period: '1 month',
        details:
          '1 month Notice to Quit required to evict a month-to-month holdover tenant.',
      },
    ],
    auditRights: {
      summary: 'Driven by contract and common law implied rights.',
      details:
        'No specific NJ statute gives commercial tenants CAM audit rights. However, NJ courts have recognized implied rights to verify expenses under common law if the lease is silent. Prudent tenants still draft explicit limitations into the lease to avoid relying on litigation.',
    },
    faqs: [
      {
        question: 'Do I have to give notice before evicting a commercial tenant for unpaid rent in NJ?',
        answer:
          'No. Under N.J.S.A. 2A:18-53(b), a landlord can file a summary dispossess action immediately for nonpayment of rent without prior notice, unless the lease contract stipulates a grace period.',
      },
      {
        question: 'Can I represent my LLC in New Jersey landlord-tenant court?',
        answer:
          'No. New Jersey law requires that any business entity (Corporation, LLC, Partnership) be represented by a licensed New Jersey attorney in landlord-tenant proceedings.',
      },
      {
        question: 'What happens if a commercial tenant damages the property?',
        answer:
          'The landlord can issue a 3-day Notice to Quit for willful destruction of premises under N.J.S.A. 2A:18-53(c)(2) before filing for eviction.',
      },
      {
        question: 'What happens if a Notice to Quit is served incorrectly in NJ?',
        answer:
          'If the Notice to Quit does not meet the strict statutory formatting and service requirements, the court will lack jurisdiction over the case and will dismiss the eviction action entirely.',
      },
    ],
    metaDescription:
      'Explore New Jersey commercial lease laws, N.J.S.A. 2A:18-53 eviction statutes, Notice to Quit requirements, and commercial court procedures.',
  },
  {
    state: 'Virginia',
    stateCode: 'VA',
    slug: 'virginia',
    overview:
      'Virginia presents a robust, business-friendly commercial leasing environment governed strictly by Title 55.1, Chapter 14 of the Code of Virginia (Nonresidential Tenancies). Unlike the highly regulated Virginia Residential Landlord and Tenant Act (VRLTA), the commercial code explicitly defers to the terms of the lease agreement, stepping in to apply statutory boundaries only when the contract is completely silent.\n\nVirginia stands out nationally as one of the few remaining jurisdictions that explicitly permits commercial self-help evictions. If a tenant\'s right of possession is terminated due to default, a landlord may legally change the locks or shut off utilities without a court order, provided the action does not incite a physical breach of the peace. Virginia also enforces strict formalities for long-term real estate contracts; leases exceeding five years historically require a seal or seal substitute (such as the phrase "this deed") to be fully enforceable, presenting a unique abstraction challenge.',
    keyStatutes: [
      {
        name: 'Code of Virginia Title 55.1, Chapter 14 (Nonresidential Tenancies)',
        description:
          'The primary framework governing commercial landlord-tenant relationships in Virginia, including notice periods, default remedies, and self-help provisions.',
        url: 'https://law.lis.virginia.gov',
      },
      {
        name: 'Code of Virginia Section 55.1-1400',
        description:
          'Authorizes self-help evictions for commercial landlords, provided there is no breach of the peace.',
        url: 'https://law.lis.virginia.gov',
      },
      {
        name: 'Code of Virginia Section 55.1-1401',
        description:
          'Mandates that nonresident commercial property owners must continuously maintain a resident agent in Virginia for service of process.',
        url: 'https://law.lis.virginia.gov',
      },
    ],
    keyFacts: [
      {
        label: 'Regulatory Stance',
        value: 'Business-Flexible',
      },
      {
        label: 'Self-Help Evictions',
        value: 'Legal if performed peaceably (no breach of the peace).',
      },
      {
        label: 'Lease Formalities',
        value: 'Leases longer than five years traditionally require a seal or seal substitute to be fully enforceable.',
      },
      {
        label: 'Nonresident Owners',
        value: 'Out-of-state owners must appoint a resident agent for service of process.',
      },
      {
        label: 'Property Destruction',
        value: 'If premises are destroyed without tenant fault, the tenant is not bound to pay rent until restored, unless the lease says otherwise.',
      },
    ],
    noticePeriods: [
      {
        type: 'Rent Default',
        period: '5 days',
        details:
          'If the lease does not specify a different notice period, Virginia law requires the landlord to serve a 5-day written notice demanding payment or possession.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          '30 days of written notice prior to the next rent due date is required to terminate.',
      },
      {
        type: 'Year-to-Year Termination',
        period: '3 months',
        details:
          '3 months of notice prior to the end of the year is required.',
      },
      {
        type: 'Change of Use / Rehabilitation',
        period: '120 days',
        details:
          '120 days of notice required if terminating due to substantial building rehabilitation or change of use.',
      },
    ],
    auditRights: {
      summary: 'Governed entirely by the lease; no statutory right exists.',
      details:
        'Virginia commercial landlords are not statutorily required to provide audit rights for operating expenses. The scope of any CAM audit must be detailed in the lease document, as Virginia courts prioritize the literal interpretation of the contract over implied equitable rights.',
    },
    faqs: [
      {
        question: 'Can a Virginia landlord lock out a commercial tenant?',
        answer:
          'Yes. Virginia is one of the few states that explicitly permits commercial self-help evictions. If the tenant\'s right of possession is terminated due to default, the landlord may change the locks without a court order, provided the action is performed peaceably.',
      },
      {
        question: 'What is the 5-Day Notice in a Virginia commercial lease?',
        answer:
          'If a commercial lease does not specify a different notice period for default, Virginia law requires the landlord to serve a 5-day written notice demanding payment or possession before the tenant forfeits the space.',
      },
      {
        question: 'Why do some Virginia leases say "Deed" or "Seal"?',
        answer:
          'Under Virginia law, a lease extending beyond a five-year term must meet the formalities of a deed, requiring a seal or a seal substitute. Without it, the court may deem it a month-to-month tenancy.',
      },
      {
        question: 'Do out-of-state landlords need a registered agent in VA?',
        answer:
          'Yes. Nonresident property owners who lease commercial real estate in Virginia must continuously maintain a resident agent within the Commonwealth.',
      },
    ],
    metaDescription:
      'Virginia commercial landlord-tenant law overview, Title 55.1 Chapter 14, commercial self-help evictions, notice periods, and 5-year lease deed requirements.',
  },
  {
    state: 'Oklahoma',
    stateCode: 'OK',
    slug: 'oklahoma',
    overview:
      'Oklahoma occupies a moderately landlord-friendly position in the commercial leasing landscape, governed primarily by Title 41 of the Oklahoma Statutes, which provides a concise framework for landlord-tenant relations applicable to commercial as well as residential properties. The legislature has historically deferred to the freedom of contract, allowing commercial parties to override most statutory defaults through explicit lease provisions. Oklahoma courts treat commercial tenants as sophisticated actors and apply strict contractual interpretation when resolving disputes.\n\nOklahoma does not permit common-law self-help evictions for commercial properties; landlords must pursue a formal Forcible Entry and Detainer (FED) action in district court. However, the state\'s eviction procedures are relatively efficient by national standards, and the statutory notice periods before filing are short. The state imposes no commercial rent tax, and there is no statutory cap on commercial security deposits, giving landlords substantial flexibility in structuring tenancies. Energy-sector commercial norms-particularly in the oil and gas corridor from Tulsa to Oklahoma City-mean that practitioners should be alert to specialized lease provisions addressing surface rights, mineral rights, and environmental indemnities.',
    keyStatutes: [
      {
        name: 'Oklahoma Statutes Title 41 (Landlord and Tenant)',
        description:
          'The primary statute governing landlord-tenant relationships in Oklahoma, covering lease formation, rent obligations, default remedies, and eviction procedures for both commercial and residential properties.',
        url: 'https://www.oscn.net',
      },
      {
        name: 'Oklahoma Statutes Title 12, Section 1148.1 (Forcible Entry and Detainer)',
        description:
          'Establishes the procedural requirements for filing a Forcible Entry and Detainer action to evict a defaulting commercial tenant, including notice prerequisites and court filing standards.',
        url: 'https://www.oscn.net',
      },
      {
        name: 'Oklahoma Statutes Title 41, Section 131 (Security Deposits)',
        description:
          'Governs the handling of security deposits, requiring landlords to return deposits within 45 days of lease termination and to provide an itemized list of any deductions.',
        url: 'https://www.oscn.net',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Moderately Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Not permitted; formal FED court action required' },
      { label: 'Statutory Audit Rights', value: 'None; governed by negotiated lease terms' },
      { label: 'Security Deposit Return', value: '45 days after lease termination with itemized deductions' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent (Eviction)',
        period: '5 days',
        details:
          'Oklahoma law requires a landlord to serve a 5-day written notice to quit before filing a Forcible Entry and Detainer action for non-payment of commercial rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of written notice prior to the next rent due date to terminate a month-to-month commercial tenancy.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '10 days',
        details:
          'For material lease violations other than non-payment of rent, the landlord must provide a 10-day written notice to cure or quit before proceeding to court.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit rights are entirely contractual.',
      details:
        'Oklahoma does not grant commercial tenants any statutory right to audit landlord operating expense or CAM reconciliations. Tenants seeking audit rights must negotiate and secure them explicitly in the lease agreement, including the look-back period (typically 1–3 years), audit frequency, cost allocation, and acceptable methodologies. Oklahoma courts strictly enforce the written terms of the lease contract and will not imply audit rights where the document is silent.',
    },
    faqs: [
      {
        question: 'Can an Oklahoma commercial landlord change the locks on a defaulting tenant?',
        answer:
          'No. Oklahoma does not permit self-help evictions for commercial properties. A landlord must file a formal Forcible Entry and Detainer (FED) action in district court after serving the required 5-day notice to quit.',
      },
      {
        question: 'How long does a commercial eviction take in Oklahoma?',
        answer:
          'After serving the 5-day notice, a landlord can file a FED action. Oklahoma district courts typically schedule hearings within 10–30 days of filing, making the process relatively quick compared to many other states.',
      },
      {
        question: 'Are there special commercial lease considerations for oil and gas tenants in Oklahoma?',
        answer:
          'Yes. Commercial leases in Oklahoma\'s energy corridor should address surface use agreements, mineral rights conflicts, environmental indemnification, and potential NORM (naturally occurring radioactive material) liability, all of which are commonly negotiated in industrial and warehouse leases in the state.',
      },
      {
        question: 'What is the deadline for returning a commercial security deposit in Oklahoma?',
        answer:
          'A landlord must return the security deposit, or provide a written, itemized statement of deductions, within 45 days after the tenant vacates the premises and provides a forwarding address.',
      },
    ],
    metaDescription:
      'Oklahoma commercial landlord-tenant law overview: Title 41 statutes, 5-day eviction notice, Forcible Entry and Detainer procedures, and security deposit rules.',
  },
  {
    state: 'Arkansas',
    stateCode: 'AR',
    slug: 'arkansas',
    overview:
      'Arkansas presents a distinctly landlord-friendly commercial real estate environment, rooted in traditional common-law principles with relatively sparse statutory intervention. Commercial landlord-tenant relations are governed primarily by Arkansas Code Annotated Title 18, Subtitle 2, with courts giving heavy deference to the negotiated lease agreement. The state has historically permitted landlord self-help remedies, and the distraint for rent remedy-which allows landlords to seize and hold tenant personal property as security for unpaid rent-remains available under Arkansas law, though it is increasingly disfavored in practice.\n\nArkansas does not impose a commercial rent tax, and there is no statutory cap on commercial security deposits. The state\'s eviction process, known as an unlawful detainer action, moves through district court and is generally considered efficient. Commercial real estate practice in Arkansas is shaped substantially by the agricultural economy in the Delta region, the retail and logistics corridor along Interstate 40, and the growing technology and healthcare sectors in the Northwest Arkansas metropolitan area (Bentonville, Fayetteville, Rogers).',
    keyStatutes: [
      {
        name: 'Arkansas Code Annotated Title 18, Subtitle 2 (Landlord-Tenant)',
        description:
          'The foundational statutory framework governing all landlord-tenant relationships in Arkansas, including commercial leases, covering lease formation, default, and remedies.',
        url: 'https://advance.lexis.com',
      },
      {
        name: 'Arkansas Code Annotated § 18-17-901 et seq. (Unlawful Detainer)',
        description:
          'Governs the process and procedural requirements for filing an unlawful detainer action to regain possession of commercial premises from a defaulting tenant.',
        url: 'https://advance.lexis.com',
      },
      {
        name: 'Arkansas Code Annotated § 18-16-101 (Distraint for Rent)',
        description:
          'Preserves the common-law remedy of distraint, allowing commercial landlords to seize tenant personal property located on the premises as security for unpaid rent obligations.',
        url: 'https://advance.lexis.com',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Historically permitted; judicial process strongly preferred' },
      { label: 'Distraint for Rent', value: 'Available under Ark. Code Ann. § 18-16-101' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'A landlord must serve a 3-day written notice to pay rent or vacate before filing an unlawful detainer action for commercial non-payment.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Written notice of at least 30 days prior to the next rent due date is required to terminate a month-to-month commercial tenancy.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '14 days',
        details:
          'For material lease violations other than non-payment, the landlord should provide at least 14 days\' written notice to cure or quit, though lease terms govern if they specify otherwise.',
      },
    ],
    auditRights: {
      summary: 'No statutory right to audit; entirely governed by negotiated lease terms.',
      details:
        'Arkansas does not provide any statutory audit rights for commercial tenants with respect to CAM charges, operating expense reconciliations, or landlord financial records. Tenants must negotiate these rights prior to lease execution. Given the landlord-friendly legal climate, tenants should ensure audit clauses include a defined look-back period, the right to engage a third-party CPA, and provisions allocating audit costs if overcharges exceed a threshold percentage.',
    },
    faqs: [
      {
        question: 'What is distraint for rent in Arkansas?',
        answer:
          'Distraint for rent is a common-law remedy, preserved under Ark. Code Ann. § 18-16-101, that allows a commercial landlord to seize and hold personal property belonging to the tenant and located on the leased premises as security for unpaid rent. It is a powerful but procedurally complex remedy that is increasingly replaced by contractual remedies in modern leases.',
      },
      {
        question: 'How does the unlawful detainer process work in Arkansas?',
        answer:
          'After serving a 3-day written notice to pay or vacate, a landlord may file an unlawful detainer complaint in district court. The court schedules a hearing, typically within 30 days, and if the landlord prevails, a writ of possession is issued directing the sheriff to remove the tenant.',
      },
      {
        question: 'Is commercial rent subject to sales tax in Arkansas?',
        answer:
          'Generally, commercial real estate rent itself is not subject to Arkansas sales tax. However, certain services bundled into gross lease payments may be taxable, and tenants should consult a tax advisor when structuring complex lease payments.',
      },
      {
        question: 'Are commercial lease audit rights enforceable in Arkansas courts?',
        answer:
          'Yes. If the lease explicitly grants the tenant audit rights, Arkansas courts will enforce those contractual provisions. The absence of a statutory right makes precise contractual drafting essential to protect tenant interests.',
      },
    ],
    metaDescription:
      'Arkansas commercial landlord-tenant law: Title 18 statutes, distraint for rent, 3-day eviction notice, unlawful detainer process, and commercial lease audit rights.',
  },
  {
    state: 'Mississippi',
    stateCode: 'MS',
    slug: 'mississippi',
    overview:
      'Mississippi offers one of the most landlord-favorable commercial leasing environments in the southeastern United States. Governed primarily by the Mississippi Landlord and Tenant Act under Title 89 of the Mississippi Code Annotated, commercial landlord-tenant law in the state places very few statutory restrictions on lease terms and remedies. The legislature has deliberately maintained a minimalist regulatory posture, treating commercial tenants as sophisticated parties capable of negotiating their own protections.\n\nThe state permits the common-law remedy of distress for rent, allowing landlords to levy on tenant property for unpaid rent with minimal court involvement. While formal unlawful detainer proceedings are the standard route for eviction, the courts are generally efficient and landlord-receptive. Mississippi does not impose a commercial rent tax, and there is no statutory cap on commercial security deposits. The commercial real estate market is concentrated in the Gulf Coast gaming and hospitality corridor, the Jackson metro area, and the Memphis-adjacent logistics hub in DeSoto County, each of which carries industry-specific lease norms worth reviewing during abstraction.',
    keyStatutes: [
      {
        name: 'Mississippi Code Annotated Title 89 (Property)',
        description:
          'The foundational title governing real property law in Mississippi, including landlord-tenant relationships, lease enforcement, and remedies for both commercial and residential tenancies.',
        url: 'https://law.justia.com/codes/mississippi',
      },
      {
        name: 'Mississippi Code Annotated § 89-7-1 et seq. (Landlord and Tenant)',
        description:
          'The specific landlord and tenant chapter governing notice requirements, lease termination, unlawful detainer procedures, and distress for rent remedies for commercial properties.',
        url: 'https://law.justia.com/codes/mississippi',
      },
      {
        name: 'Mississippi Code Annotated § 89-7-45 (Distress for Rent)',
        description:
          'Permits a commercial landlord to distrain tenant personal property located on the leased premises to satisfy unpaid rent obligations.',
        url: 'https://law.justia.com/codes/mississippi',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Strongly Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Not permitted by statute; unlawful detainer required' },
      { label: 'Distress for Rent', value: 'Available under Miss. Code Ann. § 89-7-45' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'A landlord must serve a 3-day written notice to pay or quit before commencing an unlawful detainer action for non-payment of commercial rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice to terminate a month-to-month commercial tenancy.',
      },
      {
        type: 'Year-to-Year Termination',
        period: '2 months',
        details:
          'At common law, a year-to-year commercial tenancy requires approximately 2 months of notice prior to the end of the annual term, absent a specific lease provision.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit provisions must be fully negotiated in the lease.',
      details:
        'Mississippi law provides no statutory audit rights for commercial tenants seeking to review landlord CAM charges or operating expense reconciliations. All audit rights must be explicitly included in the lease. Given the state\'s strongly landlord-favorable legal environment, tenants-particularly national retailers and hospitality operators in the Gulf Coast market-should negotiate robust audit provisions including specific look-back periods, CPA qualification standards, and landlord cure obligations upon discovery of overcharges.',
    },
    faqs: [
      {
        question: 'What notice is required for a commercial eviction in Mississippi?',
        answer:
          'For non-payment of rent, a landlord must serve a 3-day written notice to pay or vacate before filing an unlawful detainer action. For lease violations, the notice period is typically governed by the lease terms.',
      },
      {
        question: 'Can a Mississippi commercial landlord use distress for rent?',
        answer:
          'Yes. Under Miss. Code Ann. § 89-7-45, a commercial landlord may distrain (seize and hold) tenant personal property located on the leased premises as security for unpaid rent. This is a powerful pre-judgment remedy that requires careful procedural compliance.',
      },
      {
        question: 'Are there any commercial lease protections for gaming or hospitality tenants in Mississippi?',
        answer:
          'No specific statutory protections exist for gaming or hospitality commercial tenants. These industries typically negotiate specialized lease provisions addressing liquor license conditionality, gaming license contingencies, and force majeure events specific to regulated operations.',
      },
      {
        question: 'Is there a commercial rent tax in Mississippi?',
        answer:
          'No. Mississippi does not impose a statewide commercial rent tax. Retail sales of tangible personal property and certain services are taxable, but commercial real estate lease payments themselves are generally not subject to Mississippi sales tax.',
      },
    ],
    metaDescription:
      'Mississippi commercial landlord-tenant law overview: Title 89 statutes, distress for rent, 3-day eviction notice, and commercial lease enforcement practices.',
  },
  {
    state: 'Iowa',
    stateCode: 'IA',
    slug: 'iowa',
    overview:
      'Iowa provides a balanced-to-landlord-friendly commercial leasing environment governed primarily by negotiated lease terms and general property law principles. Commercial landlord-tenant disputes are usually driven by the express terms of the lease, with statutory frameworks serving as gap-fillers. The Iowa Uniform Commercial Code does not extend to real property leases, reinforcing the importance of explicit contractual provisions.\n\nSelf-help evictions are not permitted in Iowa; commercial landlords must pursue a formal forcible entry and detainer (FED) proceeding in district court. The state offers no statutory CAM audit rights for commercial tenants. Iowa\'s commercial real estate market is anchored by the Des Moines financial and insurance corridor, the Cedar Rapids industrial and food-processing hub, and significant agricultural-support commercial properties throughout the state, each presenting unique lease considerations that practitioners should evaluate during abstraction.',
    keyStatutes: [
      {
        name: 'Iowa Code Chapter 562A (Iowa Uniform Residential Landlord and Tenant Act)',
        description:
          'While primarily residential, Chapter 562A informs commercial lease disputes as a baseline reference point for notice standards and landlord obligations where the commercial lease is silent.',
        url: 'https://www.legis.iowa.gov',
      },
      {
        name: 'Iowa Code Chapter 648 (Forcible Entry and Detainer)',
        description:
          'Governs the judicial process for evicting commercial tenants, requiring proper notice and court filing before a landlord can recover possession of commercial premises.',
        url: 'https://www.legis.iowa.gov',
      },
      {
        name: 'Iowa Code § 614.1 (Statute of Limitations for Written Contracts)',
        description:
          'Commercial lease actions are subject to a 10-year statute of limitations for written contracts, making timely enforcement of lease rights critical for both parties.',
        url: 'https://www.legis.iowa.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced (lease terms control)' },
      { label: 'Self-Help Evictions', value: 'Not permitted; FED court action required' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
      { label: 'Written Contract Limitation', value: '10-year statute of limitations for commercial lease claims' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'Iowa courts recognize a 3-day notice to pay or vacate before commencing a forcible entry and detainer action for commercial non-payment of rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'A month-to-month commercial tenancy may be terminated by either party with 30 days of written notice prior to the next rent due date.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '7 days',
        details:
          'If the commercial lease does not specify a cure period, Iowa courts generally recognize a reasonable notice period-commonly 7 days-for material non-monetary lease violations.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; must be negotiated in the lease.',
      details:
        'Iowa commercial tenants have no statutory right to audit landlord operating expense or CAM reconciliations. Audit rights must be explicitly drafted into the lease agreement. Iowa courts will strictly enforce the audit provisions as written, and tenants without such provisions have no equitable right to review landlord financial records absent active litigation discovery.',
    },
    faqs: [
      {
        question: 'How does the commercial eviction process work in Iowa?',
        answer:
          'After serving the required notice (typically 3 days for non-payment), the landlord files a forcible entry and detainer petition in Iowa district court. A hearing is typically scheduled within 3 weeks. If the landlord prevails, the court issues a writ of possession directing the sheriff to remove the tenant.',
      },
      {
        question: 'Are there commercial lease considerations unique to Iowa\'s agricultural market?',
        answer:
          'Yes. Commercial leases for grain storage facilities, co-op buildings, and agricultural processing plants in Iowa often include specialized provisions addressing commodity price triggers, seasonal access rights, and environmental compliance for fertilizer or chemical storage, which require careful review during lease abstraction.',
      },
      {
        question: 'Is there a duty to mitigate in Iowa commercial leases?',
        answer:
          'Yes. Iowa courts generally impose a duty on commercial landlords to make reasonable efforts to re-let abandoned commercial premises and mitigate damages. Unlike Texas, this duty is rooted in common law rather than statute, but it is broadly applied by Iowa courts.',
      },
      {
        question: 'What is the statute of limitations for suing on a commercial lease in Iowa?',
        answer:
          'Under Iowa Code § 614.1, actions based on written contracts have a 10-year statute of limitations. This means a landlord can sue for unpaid commercial rent for up to 10 years after the amount became due.',
      },
    ],
    metaDescription:
      'Iowa commercial landlord-tenant law: Chapter 562A, forcible entry and detainer process, notice periods, and commercial lease enforcement in Iowa courts.',
  },
  {
    state: 'Kansas',
    stateCode: 'KS',
    slug: 'kansas',
    overview:
      'Kansas maintains a moderately landlord-favorable commercial leasing environment. Commercial landlord-tenant relationships are governed primarily by the Kansas Landlord and Tenant Act under K.S.A. Chapter 58, Article 25, though commercial leases are subject to less statutory intervention than residential leases in the state. Kansas courts are strong adherents to freedom of contract principles, enforcing commercial lease provisions as written and treating business tenants as sophisticated parties capable of protecting their own interests.\n\nThe state does not permit self-help evictions; commercial landlords must file a petition for forcible detainer in district court after serving the required statutory notice. Kansas does not impose a commercial rent tax, and there is no statutory limit on commercial security deposits. Kansas\'s commercial real estate market is anchored by the Kansas City metro area (shared with Missouri), which presents cross-border leasing considerations, as well as the Wichita aerospace and manufacturing corridor and an extensive rural commercial property market serving the agricultural economy.',
    keyStatutes: [
      {
        name: 'K.S.A. Chapter 58, Article 25 (Landlord and Tenant)',
        description:
          'The primary statutory framework governing landlord-tenant relationships in Kansas, including lease enforcement, notice requirements, and remedies applicable to commercial tenancies.',
        url: 'https://www.kslegislature.org',
      },
      {
        name: 'K.S.A. § 61-3801 et seq. (Forcible Detainer)',
        description:
          'Governs the procedure for commercial landlords to regain possession of premises through the district court system, including required pre-litigation notice and filing standards.',
        url: 'https://www.kslegislature.org',
      },
      {
        name: 'K.S.A. § 58-2550 (Retaliatory Eviction Prohibition)',
        description:
          'Prohibits landlords from retaliating against tenants who exercise legal rights, applicable to commercial tenants who make good-faith complaints about lease violations.',
        url: 'https://www.kslegislature.org',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Moderately Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Not permitted; forcible detainer action required' },
      { label: 'Statutory Audit Rights', value: 'None; governed by lease terms' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
      { label: 'Cross-Border Consideration', value: 'KC metro leases may trigger both KS and MO jurisdiction issues' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'Kansas law requires a 3-day written notice to pay or vacate before a commercial landlord can file a forcible detainer action for non-payment of rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice to terminate a month-to-month commercial tenancy in Kansas.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '30 days (with cure)',
        details:
          'For material lease violations other than non-payment, the landlord must provide 30 days of written notice specifying the violation, with a reasonable opportunity to cure before filing for eviction.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; must be expressly negotiated in the lease.',
      details:
        'Kansas provides no statutory audit rights for commercial tenants. CAM and operating expense audit rights are entirely contractual. Kansas courts strictly enforce the plain language of commercial lease agreements, so tenants must negotiate detailed audit provisions-including look-back periods, frequency caps, CPA qualifications, and cost-shifting if overcharges are found-before executing the lease.',
    },
    faqs: [
      {
        question: 'What is the eviction notice period for a commercial tenant in Kansas?',
        answer:
          'For non-payment of rent, a landlord must serve a 3-day written notice to pay or vacate. For non-monetary lease violations, a 30-day notice with opportunity to cure is generally required before filing a forcible detainer action in district court.',
      },
      {
        question: 'Do Kansas City commercial leases raise special jurisdictional issues?',
        answer:
          'Yes. The Kansas City metropolitan area spans two states, and it is common for commercial properties in Johnson County or Wyandotte County, Kansas to involve tenants whose operations also touch Missouri. Practitioners should confirm which state\'s law governs the lease and ensure choice-of-law provisions are explicitly addressed.',
      },
      {
        question: 'Is there a commercial rent tax in Kansas?',
        answer:
          'No. Kansas does not impose a statewide tax on commercial real estate rent payments. However, Kansas\'s retail sales tax may apply to services bundled into gross lease obligations, so tenants should confirm the tax treatment of non-rent payment components.',
      },
      {
        question: 'Can a Kansas landlord enforce a personal guarantee on a commercial lease?',
        answer:
          'Yes. Kansas courts routinely enforce personal guarantees on commercial leases. Personal guarantees must be carefully reviewed during lease abstraction because they typically survive the underlying lease term and may expose guarantors to unlimited liability for rent, operating costs, and damages.',
      },
    ],
    metaDescription:
      'Kansas commercial landlord-tenant law overview: K.S.A. Chapter 58, 3-day eviction notice, forcible detainer process, and lease enforcement in Kansas courts.',
  },
  {
    state: 'Nebraska',
    stateCode: 'NE',
    slug: 'nebraska',
    overview:
      'Nebraska provides a straightforward, moderately landlord-friendly commercial leasing environment. The Nebraska Landlord and Tenant Act (Neb. Rev. Stat. §§ 76-1401 to 76-1449) serves as the primary statutory framework, though it is primarily oriented toward residential tenancies. Commercial leases in Nebraska are largely governed by freedom of contract principles, with courts deferring heavily to the explicit terms of the agreement. The state views commercial tenants as sophisticated parties not requiring the consumer protections afforded to residential tenants.\n\nNebraska does not permit commercial self-help evictions; landlords must pursue a formal Forcible Entry and Detainer (FED) action. The Omaha-Council Bluffs metro area-spanning Nebraska and Iowa-presents cross-border leasing dynamics similar to the Kansas City market. Nebraska\'s commercial real estate market is driven by agriculture, food processing, financial services headquartered in Omaha, and a significant logistics and transportation sector. Practitioners abstracting Nebraska leases should watch for provisions related to rail access, agricultural commodity storage, and data center power and cooling requirements, which are increasingly prevalent in the state.',
    keyStatutes: [
      {
        name: 'Nebraska Revised Statutes §§ 76-1401 to 76-1449 (Landlord and Tenant Act)',
        description:
          'The primary statutory framework for landlord-tenant relationships in Nebraska, establishing baseline obligations and remedies that inform commercial lease gap-filling when the agreement is silent.',
        url: 'https://nebraskalegislature.gov',
      },
      {
        name: 'Nebraska Revised Statutes § 76-1440 (Tenant Remedies)',
        description:
          'Enumerates tenant remedies for landlord breach, including rent withholding and termination rights, which serve as backstop protections even in commercial settings if the lease fails to address specific scenarios.',
        url: 'https://nebraskalegislature.gov',
      },
      {
        name: 'Nebraska Revised Statutes § 25-21,219 (Forcible Entry and Detainer)',
        description:
          'Establishes the procedures and notice requirements for commercial landlords to seek judicial recovery of possession through the district court system.',
        url: 'https://nebraskalegislature.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Moderately Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Not permitted; FED court action required' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
      { label: 'Cross-Border Note', value: 'Omaha metro leases may implicate Iowa law for Council Bluffs properties' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'A landlord must serve a 3-day written notice to pay or quit before filing a Forcible Entry and Detainer action for commercial non-payment of rent in Nebraska.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party may terminate a month-to-month commercial tenancy by providing 30 days of advance written notice.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '30 days (with cure)',
        details:
          'For material non-monetary lease violations, the landlord must provide a 30-day notice specifying the violation and allowing a reasonable cure period before proceeding with eviction.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; all audit rights are contractual.',
      details:
        'Nebraska does not provide any statutory CAM or operating expense audit rights for commercial tenants. Tenants must negotiate and document audit rights explicitly in the lease. Nebraska courts enforce commercial lease provisions as written, so the scope, timing, and methodology of any audit must be clearly specified in the agreement to be enforceable.',
    },
    faqs: [
      {
        question: 'How does commercial eviction work in Nebraska?',
        answer:
          'After serving the required 3-day notice for non-payment, a commercial landlord files a Forcible Entry and Detainer petition in county or district court. Hearings are typically scheduled within 2–4 weeks. If the landlord prevails, a writ of restitution is issued directing the sheriff to restore possession.',
      },
      {
        question: 'Are there unique lease considerations for data center tenants in Nebraska?',
        answer:
          'Yes. Nebraska hosts significant data center operations (Omaha and surrounding areas). Commercial leases for data centers often include critical provisions addressing guaranteed power supply, utility cost pass-through, cooling infrastructure obligations, fiber connectivity, and access security standards, which require careful abstraction.',
      },
      {
        question: 'Does Nebraska impose a commercial rent tax?',
        answer:
          'No. Nebraska does not impose a statewide tax on commercial real estate rent payments. Nebraska\'s sales tax applies to the sale of tangible personal property and certain enumerated services, but commercial real property leases are not subject to retail sales tax.',
      },
      {
        question: 'Can commercial lease disputes in Nebraska be resolved through arbitration?',
        answer:
          'Yes. Nebraska has adopted the Uniform Arbitration Act and courts will enforce arbitration clauses in commercial leases. Practitioners abstracting Nebraska leases should note whether the lease requires arbitration as the exclusive dispute resolution mechanism, as this affects litigation strategy.',
      },
    ],
    metaDescription:
      'Nebraska commercial landlord-tenant law: Neb. Rev. Stat. §§ 76-1401 to 76-1449, 3-day eviction notice, FED procedures, and commercial lease enforcement.',
  },
  {
    state: 'New Mexico',
    stateCode: 'NM',
    slug: 'new-mexico',
    overview:
      'New Mexico presents a moderately tenant-balanced commercial leasing environment, shaped by a blend of statutory frameworks and strong common-law contract principles. Commercial landlord-tenant relationships are primarily governed by the New Mexico Owner-Resident Relations Act (NMSA 1978, §§ 47-8-1 to 47-8-51), which focuses heavily on residential tenancies but informs commercial gap-filling. For commercial disputes specifically, parties rely primarily on contract law, NMSA 1978, §§ 42-4-1 et seq. (forcible entry and unlawful detainer), and general property law principles.\n\nNew Mexico does not permit commercial self-help evictions; landlords must use the formal unlawful detainer judicial process. The state\'s commercial real estate market is heavily influenced by the Albuquerque and Santa Fe metro areas, the oil and gas producing regions of the Permian Basin (Lea and Eddy counties), and federally-connected commercial activity near Sandia National Laboratories and Kirtland Air Force Base. Practitioners should pay particular attention to environmental indemnification provisions and surface rights for leases in the southeastern oil patch, as well as federal land adjacency issues affecting commercial access and use.',
    keyStatutes: [
      {
        name: 'NMSA 1978, §§ 47-8-1 to 47-8-51 (Owner-Resident Relations Act)',
        description:
          'While residential in focus, this act provides a reference framework for landlord obligations that courts may reference when commercial leases are silent on specific obligations.',
        url: 'https://nmonesource.com',
      },
      {
        name: 'NMSA 1978, §§ 42-4-1 et seq. (Forcible Entry and Unlawful Detainer)',
        description:
          'Governs the judicial process for commercial landlords to recover possession of leased premises, including statutory notice requirements and court filing procedures.',
        url: 'https://nmonesource.com',
      },
      {
        name: 'NMSA 1978, § 56-8-4 (Gross Receipts Tax on Commercial Rent)',
        description:
          'New Mexico imposes its Gross Receipts Tax (GRT) on commercial rent receipts, creating a unique tax obligation that affects both lease structuring and gross lease calculations.',
        url: 'https://nmonesource.com',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced (lease terms control)' },
      { label: 'Self-Help Evictions', value: 'Not permitted; unlawful detainer action required' },
      { label: 'Gross Receipts Tax on Rent', value: 'Yes-NM GRT applies to commercial rent receipts' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'A landlord must serve a 3-day written notice to pay or quit before filing an unlawful detainer action for non-payment of commercial rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of written advance notice to terminate a month-to-month commercial tenancy.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '7 days',
        details:
          'For material non-monetary lease violations, New Mexico courts generally recognize a 7-day notice to cure or quit before the landlord may file for eviction, absent specific lease provisions.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit provisions are entirely contractual.',
      details:
        'New Mexico does not provide any statutory CAM audit rights for commercial tenants. All audit rights must be negotiated in the lease. Given the presence of the New Mexico Gross Receipts Tax on commercial rent, careful lease drafting should address which party bears the GRT burden, how GRT is disclosed in reconciliations, and whether a tenant audit right extends to GRT pass-through calculations.',
    },
    faqs: [
      {
        question: 'Does New Mexico tax commercial rent?',
        answer:
          'Yes. New Mexico\'s Gross Receipts Tax (GRT) applies to commercial rent receipts received by the landlord. The current combined state and local GRT rate varies by location but typically ranges from 7% to 9%. This is a significant financial consideration that must be addressed in lease abstractions, as the lease should specify whether the rent amount is inclusive of or exclusive of GRT.',
      },
      {
        question: 'What are the eviction procedures for commercial tenants in New Mexico?',
        answer:
          'After serving a 3-day notice to pay or quit, the landlord files an unlawful detainer complaint in magistrate or district court depending on the rent amount at issue. The court schedules a hearing, and if the landlord prevails, a writ of restitution is issued directing the sheriff to restore possession.',
      },
      {
        question: 'Are there special lease considerations for oil and gas commercial properties in New Mexico?',
        answer:
          'Yes. Commercial leases in Lea and Eddy counties and surrounding Permian Basin areas frequently include specialized provisions addressing hazardous material storage, NORM contamination indemnification, surface use restrictions, and compatibility with subsurface mineral rights, all of which require careful review during lease abstraction.',
      },
      {
        question: 'Can a commercial landlord in New Mexico demand a personal guarantee?',
        answer:
          'Yes. Personal guarantees are commonly required in New Mexico commercial leases, particularly for new businesses or tenants with limited credit history. Guarantees are fully enforceable under New Mexico law and should be abstracted separately to capture guarantee scope, term, and any burn-down provisions.',
      },
    ],
    metaDescription:
      'New Mexico commercial lease law overview: GRT on rent, unlawful detainer procedures, 3-day notice requirements, and Permian Basin commercial lease considerations.',
  },
  {
    state: 'Hawaii',
    stateCode: 'HI',
    slug: 'hawaii',
    overview:
      'Hawaii presents a uniquely constrained and nuanced commercial leasing environment shaped by island geography, extremely limited land supply, and complex ownership structures dominated by large private and institutional landowners (kama\'aina estates). Commercial landlord-tenant law is governed primarily by Hawaii Revised Statutes (HRS) Chapter 521 for general landlord-tenant matters and HRS Chapter 666 for summary possession (eviction) proceedings. The state\'s leasehold land tenure system is pervasive in commercial real estate: many properties are ground-leased from large landowners, creating a layered leasehold structure where commercial tenants may occupy space under a sublease from a master tenant who itself holds a ground lease from the fee owner.\n\nSelf-help evictions are not permitted in Hawaii; landlords must use the formal summary possession judicial process under HRS Chapter 666. Hawaii does not provide statutory CAM audit rights for commercial tenants. The state imposes a General Excise Tax (GET) on commercial rent receipts-one of the most impactful commercial lease tax regimes in the country-which must be addressed in all lease abstractions. Commercial practitioners must also be aware of the Condominium Property Act (HRS Chapter 514B) where applicable to commercial condominium units, and the state\'s unique water rights and shoreline setback regulations affecting coastal commercial properties.',
    keyStatutes: [
      {
        name: 'Hawaii Revised Statutes Chapter 521 (Residential Landlord-Tenant Code)',
        description:
          'While primarily residential in scope, HRS Chapter 521 informs commercial leasing practice as a baseline for landlord obligations and notice standards in Hawaii.',
        url: 'https://www.capitol.hawaii.gov',
      },
      {
        name: 'Hawaii Revised Statutes Chapter 666 (Summary Possession)',
        description:
          'Governs the eviction process for commercial properties, providing the statutory framework for summary possession proceedings including required notices and court procedures.',
        url: 'https://www.capitol.hawaii.gov',
      },
      {
        name: 'Hawaii Revised Statutes § 237-16 (General Excise Tax on Lease Rent)',
        description:
          'Imposes the General Excise Tax (GET) on gross rent received by commercial landlords, a significant financial obligation that affects lease structuring and rent calculations throughout Hawaii.',
        url: 'https://www.capitol.hawaii.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced (constrained by land supply and GET)' },
      { label: 'Self-Help Evictions', value: 'Not permitted; summary possession action required' },
      { label: 'General Excise Tax on Rent', value: 'Yes-GET applies to all commercial rent receipts (4% state + 0.5% county surcharge)' },
      { label: 'Leasehold Land Tenure', value: 'Prevalent; many commercial properties held in ground lease structures' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '5 days',
        details:
          'Under HRS Chapter 666, a landlord must serve a 5-day written notice to pay rent or surrender possession before filing a summary possession action for non-payment of commercial rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '45 days',
        details:
          'Hawaii requires 45 days of advance written notice to terminate a month-to-month commercial tenancy.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '10 days',
        details:
          'For material lease violations other than non-payment of rent, a 10-day written notice to cure or quit is required before the landlord may file for summary possession.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; all audit provisions must be negotiated in the lease.',
      details:
        'Hawaii commercial tenants have no statutory right to audit landlord operating expenses or CAM reconciliations. Audit rights must be explicitly negotiated and documented in the lease. Given Hawaii\'s complex leasehold ownership structures, audit provisions should address whether the tenant\'s right extends to ground rent and master lease operating expenses that flow through to the sublease, as well as the proper allocation of GET obligations in reconciliation statements.',
    },
    faqs: [
      {
        question: 'What is the General Excise Tax (GET) and how does it affect commercial leases in Hawaii?',
        answer:
          'Hawaii\'s General Excise Tax (GET) is imposed on all business activities in the state, including commercial rent receipts. The current combined rate (state + county surcharge) is typically 4.5% for Oahu and 4.0% for other islands. Landlords are permitted to pass the GET through to tenants. Lease abstractions must clearly identify whether the stated rent is inclusive or exclusive of GET and how GET pass-throughs are calculated and documented.',
      },
      {
        question: 'What is a ground lease and why is it common in Hawaii commercial real estate?',
        answer:
          'A ground lease is a long-term lease (typically 55–99 years) of the underlying land, with the tenant or lessee constructing and owning improvements during the lease term. Ground leases are prevalent in Hawaii because major landholders (Bishop Estate/Kamehameha Schools, Damon Estate, Castle & Cooke, etc.) historically leased rather than sold land. Commercial tenants in Hawaii may hold a sublease from a master tenant who itself holds a ground lease, creating multiple layers of leasehold interests that must all be reviewed during lease abstraction.',
      },
      {
        question: 'How does a commercial eviction work in Hawaii?',
        answer:
          'After serving the required 5-day notice to pay or quit, the landlord files a summary possession complaint in district court under HRS Chapter 666. The court schedules a hearing within approximately 30 days. If the landlord prevails, a writ of possession is issued. Hawaii\'s courts are generally efficient for commercial eviction matters.',
      },
      {
        question: 'Are there unique considerations for commercial leases on neighbor islands vs. Oahu?',
        answer:
          'Yes. On neighbor islands (Maui, Hawaii Island, Kauai, Molokai, Lanai), commercial properties are often closer to agricultural land, shoreline regulated areas, and conservation districts. Lease provisions addressing permitted use, building permits, and compliance with state land use district regulations are more critical in these markets and require careful review during abstraction.',
      },
    ],
    metaDescription:
      'Hawaii commercial lease law: HRS Chapter 666, General Excise Tax on rent, ground lease structures, summary possession process, and island-specific CRE considerations.',
  },
  {
    state: 'Alaska',
    stateCode: 'AK',
    slug: 'alaska',
    overview:
      'Alaska presents a sparsely regulated, landlord-neutral commercial leasing environment governed primarily by Alaska Statutes Title 34 (Property), with general property law principles and the express terms of the commercial lease controlling most disputes. AS § 34.03 governs general landlord-tenant relations and is explicitly directed at residential tenancies; for commercial leases, Alaska courts rely on the lease agreement itself, general contract law, and common-law property principles.\n\nAlaska\'s commercial real estate market is among the smallest and most geographically concentrated in the country. The vast majority of commercial activity is concentrated in Anchorage, Fairbanks, Juneau, and a handful of other hub communities. The extreme geographic isolation of many Alaskan communities, along with the state\'s dependence on oil revenues, federal spending, and fishing and mining industries, creates a highly specialized commercial leasing market. Self-help evictions are not permitted; landlords must use the formal forcible entry and detainer (FED) process. Alaska has no state income tax and no state sales tax, and commercial rent is not subject to a statewide rent tax, though local borough and city taxes may apply in some jurisdictions.',
    keyStatutes: [
      {
        name: 'Alaska Statutes § 34.03 (Landlord and Tenant Act)',
        description:
          'Governs landlord-tenant relationships in Alaska, primarily in the residential context but providing baseline reference obligations for commercial tenancies where the lease is silent.',
        url: 'https://www.akleg.gov',
      },
      {
        name: 'Alaska Statutes § 09.45.060 et seq. (Forcible Entry and Detainer)',
        description:
          'Establishes the judicial process for commercial landlords to recover possession of premises from defaulting tenants, including required notice periods and court filing procedures.',
        url: 'https://www.akleg.gov',
      },
      {
        name: 'Alaska Statutes § 34.03.070 (Security Deposits)',
        description:
          'Governs security deposit obligations, requiring return within 14 days (if no deductions) or 30 days (with itemized deductions) after lease termination.',
        url: 'https://www.akleg.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Neutral (freedom of contract dominates)' },
      { label: 'Self-Help Evictions', value: 'Not permitted; FED court action required' },
      { label: 'State Income Tax', value: 'None (no state income tax)' },
      { label: 'State Sales Tax on Rent', value: 'None statewide; local borough/city taxes may apply' },
      { label: 'Security Deposit Return', value: '14 days (no deductions) or 30 days (with itemized deductions)' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '7 days',
        details:
          'Alaska statute provides for a 7-day notice to pay rent or vacate before a commercial landlord may file a forcible entry and detainer action for non-payment.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice to terminate a month-to-month commercial tenancy in Alaska.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '10 days',
        details:
          'For material non-monetary lease violations, Alaska courts recognize a reasonable cure notice period, typically 10 days, before the landlord may proceed with eviction.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit provisions must be contractually negotiated.',
      details:
        'Alaska provides no statutory CAM or operating expense audit rights for commercial tenants. All audit rights must be explicitly negotiated in the lease. Given the limited size of the commercial market and the relatively small number of major landlords in Anchorage and Fairbanks, audit rights are sometimes less rigorously negotiated than in major mainland markets, which can leave tenants exposed to unverified operating expense reconciliations.',
    },
    faqs: [
      {
        question: 'Are there special commercial lease considerations in Alaska due to its geography?',
        answer:
          'Yes. Commercial leases in Alaska should address utility supply continuity (particularly heating fuel), access and ingress guarantees during extreme weather, force majeure provisions covering seismic events (Alaska is highly seismically active), and building code compliance for snow load and arctic construction standards. Leases for remote hub communities may also need to address fly-in access and supply chain disruption scenarios.',
      },
      {
        question: 'How does commercial eviction work in Alaska?',
        answer:
          'After serving a 7-day notice to pay or quit, the commercial landlord files a forcible entry and detainer action in district or superior court. Given the concentration of commercial properties in Anchorage and Fairbanks, hearings are typically scheduled within 30–45 days of filing.',
      },
      {
        question: 'Is there a state sales tax on commercial rent in Alaska?',
        answer:
          'No. Alaska is one of the few states with no statewide sales tax, and commercial rent is not subject to a state-level rent tax. However, several Alaskan municipalities impose local sales taxes-including Juneau, Sitka, and others-which may apply to commercial rent payments, making local tax compliance essential for commercial property managers.',
      },
      {
        question: 'What industries drive Alaska\'s commercial real estate market?',
        answer:
          'Alaska\'s commercial market is primarily driven by oil and gas infrastructure support (particularly in Anchorage and Kenai), federal government and defense spending (Joint Base Elmendorf-Richardson, Eielson AFB), seafood processing and fishing industry support facilities, and the state\'s growing tourism and hospitality sector. These industry concentrations create specialized lease norms that practitioners should recognize during abstraction.',
      },
    ],
    metaDescription:
      'Alaska commercial lease law: AS § 34.03, no state income or sales tax, FED eviction process, 7-day notice requirement, and unique geographic lease considerations.',
  },
  {
    state: 'Idaho',
    stateCode: 'ID',
    slug: 'idaho',
    overview:
      'Idaho provides a landlord-friendly, freedom-of-contract-oriented commercial leasing environment. Commercial landlord-tenant relationships are governed primarily by Idaho Code Title 6 (Pleadings, Practices, and Proceedings) and Title 55 (Property), with courts treating commercial tenants as sophisticated parties who are fully bound by the terms they negotiate. The state does not impose a commercial rent tax, and there is no statutory limit on commercial security deposits.\n\nIdaho does not permit self-help evictions; commercial landlords must utilize the formal unlawful detainer judicial process under Idaho Code § 6-301 et seq. However, the state\'s courts are efficient, and commercial evictions are typically resolved within 30–60 days of filing. Idaho\'s commercial real estate market has experienced significant growth driven by the Treasure Valley (Boise, Nampa, Meridian) technology and semiconductor corridor, manufacturing expansion, and strong in-migration from California and other high-cost markets. This growth has created a competitive commercial leasing environment with increasing sophistication in lease negotiation, particularly for office, industrial, and mixed-use properties in the Boise metro area.',
    keyStatutes: [
      {
        name: 'Idaho Code § 6-301 et seq. (Unlawful Detainer)',
        description:
          'Governs the judicial eviction process for commercial properties, setting out the required notice periods and court procedures for recovering possession from a defaulting commercial tenant.',
        url: 'https://legislature.idaho.gov',
      },
      {
        name: 'Idaho Code § 55-201 et seq. (Landlord and Tenant)',
        description:
          'Establishes baseline commercial landlord-tenant obligations, lease formalities, and statutory rights when the commercial lease is silent on specific issues.',
        url: 'https://legislature.idaho.gov',
      },
      {
        name: 'Idaho Code § 55-208 (Duty to Mitigate)',
        description:
          'Codifies the landlord\'s duty to make reasonable efforts to re-let abandoned commercial premises, limiting the landlord\'s ability to simply allow damages to accrue after tenant abandonment.',
        url: 'https://legislature.idaho.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Not permitted; unlawful detainer action required' },
      { label: 'Duty to Mitigate', value: 'Codified; landlords must make reasonable re-letting efforts' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'Idaho Code requires a 3-day written notice to pay rent or quit before a commercial landlord can file an unlawful detainer action for non-payment.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '1 month',
        details:
          'Either party must provide at least 1 month of written notice prior to the next rent due date to terminate a month-to-month commercial tenancy.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '3 days',
        details:
          'For material lease violations, Idaho Code provides for a 3-day notice to perform the required covenant or quit before the landlord may file for eviction.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit provisions are entirely contractual.',
      details:
        'Idaho does not grant commercial tenants any statutory right to audit landlord operating expenses or CAM charges. Audit rights must be explicitly negotiated in the lease. With the growing sophistication of the Treasure Valley commercial market and increasing presence of institutional landlords, tenants should negotiate standard audit provisions including look-back periods, CPA qualification requirements, and cost-shifting provisions when overcharges exceed a specified threshold percentage.',
    },
    faqs: [
      {
        question: 'Does Idaho require a landlord to mitigate damages after a commercial tenant abandons?',
        answer:
          'Yes. Idaho Code § 55-208 codifies the landlord\'s duty to make reasonable efforts to re-let abandoned commercial premises. A landlord who fails to mitigate may have damages reduced proportionally to what could have been avoided through reasonable re-letting efforts.',
      },
      {
        question: 'What is the notice required for a commercial eviction in Idaho?',
        answer:
          'For non-payment of rent, Idaho requires a 3-day written notice to pay or quit. For lease violations, a 3-day notice to perform or quit is also required. After expiration of the notice period without compliance, the landlord may file an unlawful detainer action.',
      },
      {
        question: 'Are there unique commercial lease considerations in Idaho\'s Treasure Valley?',
        answer:
          'Yes. The rapid growth of the Treasure Valley has created competition for industrial and tech campus properties, with tenants negotiating expansion rights, right of first refusal on adjacent space, and early termination options. Commercial leases in semiconductor-adjacent industrial parks may also include specialized provisions addressing clean room specifications, power redundancy, and hazardous materials handling compliance.',
      },
      {
        question: 'Is commercial rent subject to Idaho sales tax?',
        answer:
          'Generally, commercial real estate rent is not subject to Idaho sales tax. Idaho\'s sales tax applies to the sale of tangible personal property and certain services. However, ancillary services bundled with a commercial lease-such as parking, storage, or equipment rentals-may be separately taxable, requiring careful analysis of gross lease payment components.',
      },
    ],
    metaDescription:
      'Idaho commercial lease law: Idaho Code § 6-301, 3-day eviction notice, statutory duty to mitigate, Treasure Valley CRE considerations, and commercial lease enforcement.',
  },
  {
    state: 'Montana',
    stateCode: 'MT',
    slug: 'montana',
    overview:
      'Montana provides a highly contract-driven, landlord-neutral commercial leasing environment shaped by its rural agricultural economy, vast geographic scale, and relatively small total commercial real estate market. Commercial landlord-tenant relationships are governed primarily by the Montana Residential Landlord and Tenant Act (MCA Title 70, Chapter 24) and the general property statutes under MCA Title 70. For commercial leases, Montana courts overwhelmingly defer to the express terms of the agreement, applying general contract law principles and common-law property doctrine where the lease is silent.\n\nMontana does not permit self-help commercial evictions; landlords must pursue formal unlawful detainer proceedings. The state\'s commercial market is driven by agriculture, ranching, timber, mining, and a growing outdoor recreation and tourism economy. Commercial leases for properties adjacent to or used in agricultural and ranching operations-grain storage, livestock facilities, irrigation equipment shops, and outfitter operations-carry specialized norms that differ significantly from urban commercial leases. The Billings, Bozeman, Great Falls, and Missoula markets represent the primary urban commercial real estate centers, with Bozeman experiencing significant tech and high-amenity commercial growth driven by in-migration.',
    keyStatutes: [
      {
        name: 'Montana Code Annotated Title 70, Chapter 24 (Residential Landlord and Tenant Act)',
        description:
          'While primarily residential, this act informs commercial lease practice by providing baseline landlord obligation and notice standards in Montana.',
        url: 'https://leg.mt.gov',
      },
      {
        name: 'Montana Code Annotated § 70-27-101 et seq. (Unlawful Detainer)',
        description:
          'Governs the judicial process for commercial landlords to recover possession of premises from defaulting tenants, including statutory notice requirements.',
        url: 'https://leg.mt.gov',
      },
      {
        name: 'Montana Code Annotated § 70-25-101 et seq. (Security Deposits)',
        description:
          'Establishes security deposit handling obligations, requiring return and itemized accounting within 30 days of lease termination.',
        url: 'https://leg.mt.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Neutral (contract terms control)' },
      { label: 'Self-Help Evictions', value: 'Not permitted; unlawful detainer required' },
      { label: 'Agricultural Lease Norms', value: 'Significant market influence; specialized provisions common' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Return', value: '30 days after lease termination with itemized deductions' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'Montana law requires a 3-day written notice to pay rent or vacate before a commercial landlord may file an unlawful detainer action for non-payment of commercial rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice to terminate a month-to-month commercial tenancy in Montana.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '14 days',
        details:
          'For material non-monetary lease violations, Montana courts recognize a 14-day notice to cure or quit before the landlord may proceed with unlawful detainer proceedings.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; entirely governed by the negotiated lease.',
      details:
        'Montana provides no statutory audit rights for commercial tenants with respect to CAM charges or operating expense reconciliations. All audit rights must be explicitly negotiated and documented in the lease agreement. Given Montana\'s market characteristics-often smaller, non-institutional landlords and relatively informal lease structures-tenants in NNN or modified gross leases should ensure audit provisions are clearly defined, as informal operating expense pass-throughs are common and may lack documentation standards found in larger markets.',
    },
    faqs: [
      {
        question: 'What special provisions are important in Montana agricultural and ranch-adjacent commercial leases?',
        answer:
          'Commercial leases for Montana properties adjacent to or serving agricultural operations should address water rights access and irrigation infrastructure obligations, weed and pest management responsibilities, livestock access restrictions, custom farming and custom harvesting activity schedules, and compliance with Montana Department of Agriculture regulations for storage and handling facilities.',
      },
      {
        question: 'How does the eviction process work for commercial tenants in Montana?',
        answer:
          'After serving a 3-day notice to pay or quit, the landlord files an unlawful detainer complaint in justice court or district court depending on the rent amount. Montana courts schedule eviction hearings relatively quickly, and writs of possession are typically issued within 30–45 days of filing if the landlord prevails.',
      },
      {
        question: 'Is commercial rent subject to Montana sales tax?',
        answer:
          'No. Montana is one of five states with no general sales tax, making it unique in the commercial leasing context. Commercial rent is not subject to any state or local sales tax in Montana. This eliminates a significant administrative compliance burden common in states like New Mexico and Hawaii.',
      },
      {
        question: 'How has the Bozeman tech corridor affected commercial lease norms in Montana?',
        answer:
          'The significant in-migration to Bozeman has driven demand for Class A office, R&D, and mixed-use commercial space, with leases increasingly resembling those in major tech markets. Provisions addressing technology infrastructure, co-tenancy, and tenant improvement allowances are now commonly negotiated in Bozeman commercial leases, representing a departure from the traditionally informal lease structures common in the rest of the state.',
      },
    ],
    metaDescription:
      'Montana commercial lease law: MCA Title 70, 3-day eviction notice, unlawful detainer process, agricultural commercial lease norms, and no state sales tax.',
  },
  {
    state: 'Wyoming',
    stateCode: 'WY',
    slug: 'wyoming',
    overview:
      'Wyoming provides one of the most landlord-friendly and business-permissive commercial leasing environments in the United States, consistent with the state\'s broader approach to minimal government regulation. Commercial landlord-tenant law is governed primarily by Wyoming Statutes Title 1, Chapter 21 (Forcible Entry and Detainer) and Title 34 (Property), with Wyoming courts strongly deferring to the express terms of the commercial lease. The legislature has intentionally minimized statutory intervention in commercial real estate transactions, viewing business-to-business leases as private contracts entitled to maximum contractual freedom.\n\nWyoming permits limited self-help remedies for commercial landlords in certain circumstances, though judicial eviction is the standard practice. The state has no income tax, no corporate income tax, no personal income tax, and no general sales tax on commercial rent, creating a uniquely tax-favorable commercial leasing environment. Wyoming\'s commercial real estate market is driven primarily by energy extraction (Powder River Basin coal, natural gas, trona), agriculture, and the growing Jackson Hole luxury tourism and amenity market. Commercial practitioners should be attentive to the highly specialized energy industry lease norms, including provisions addressing royalty interests, surface damage agreements, and environmental reclamation obligations.',
    keyStatutes: [
      {
        name: 'Wyoming Statutes § 1-21-1001 et seq. (Forcible Entry and Detainer)',
        description:
          'Governs the judicial process for commercial landlords to recover possession from defaulting tenants, establishing required notice periods and court procedures.',
        url: 'https://wyoleg.gov',
      },
      {
        name: 'Wyoming Statutes Title 34 (Property)',
        description:
          'Establishes foundational property rights and obligations applicable to commercial leases, including conveyance formalities and landlord-tenant common law principles codified in Wyoming.',
        url: 'https://wyoleg.gov',
      },
      {
        name: 'Wyoming Statutes § 34-2-101 (Leases Exceeding One Year)',
        description:
          'Requires commercial leases exceeding one year to be in writing and signed by the party to be charged, consistent with Wyoming\'s Statute of Frauds requirements.',
        url: 'https://wyoleg.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Strongly Landlord-Friendly / Business-Permissive' },
      { label: 'Self-Help Evictions', value: 'Limited self-help permitted; judicial eviction standard' },
      { label: 'State Income Tax', value: 'None (no state income tax of any kind)' },
      { label: 'Sales Tax on Commercial Rent', value: 'No state sales tax on commercial rent' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'Wyoming requires a 3-day written notice to pay rent or quit before a commercial landlord may file a forcible entry and detainer action for non-payment.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice to terminate a month-to-month commercial tenancy in Wyoming.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '3 days',
        details:
          'For material lease violations other than non-payment, Wyoming provides for a 3-day notice to comply or quit before the landlord may seek judicial eviction.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; all audit provisions are contractual.',
      details:
        'Wyoming provides no statutory CAM audit rights for commercial tenants. Audit rights must be negotiated and explicitly documented in the lease. Given Wyoming\'s energy-dominated commercial market, tenants in industrial, warehouse, and energy-support facilities should negotiate audit provisions that extend to specialized expense pass-throughs common in that sector, including environmental compliance costs, regulatory fee pass-throughs, and surface use restoration expenses.',
    },
    faqs: [
      {
        question: 'What makes Wyoming uniquely tax-favorable for commercial tenants?',
        answer:
          'Wyoming has no state income tax, no corporate income tax, no personal income tax, and no general sales tax on commercial rent. This creates a significant cost advantage for commercial tenants and businesses operating in Wyoming compared to neighboring states, making it a popular jurisdiction for holding companies and asset protection structures.',
      },
      {
        question: 'What special provisions are important for energy sector commercial leases in Wyoming?',
        answer:
          'Commercial leases in Wyoming\'s energy corridor (Powder River Basin, Green River Basin, Pinedale) should address surface use and damage agreements, environmental reclamation obligations, hazardous materials storage compliance, regulatory permit conditionality, and access rights for pipeline and utility corridors. These provisions are standard in the Wyoming energy commercial market and require careful review during lease abstraction.',
      },
      {
        question: 'How does a commercial eviction proceed in Wyoming?',
        answer:
          'After serving the required 3-day notice, the landlord files a forcible entry and detainer complaint in circuit or district court. Wyoming courts schedule eviction hearings promptly. If the landlord prevails, a writ of restitution is issued directing the sheriff to restore possession.',
      },
      {
        question: 'Are personal guarantees enforceable in Wyoming commercial leases?',
        answer:
          'Yes. Wyoming courts enforce personal guarantees on commercial leases. The guarantee must be in writing under Wyoming\'s Statute of Frauds. Practitioners abstracting Wyoming commercial leases should separately capture guarantee terms, including whether the guarantee is limited or unlimited, capped at a specific amount, or subject to a burn-down provision over time.',
      },
    ],
    metaDescription:
      'Wyoming commercial lease law: no income or sales tax, WY Stat. § 1-21-1001, 3-day eviction notice, energy sector lease norms, and landlord-friendly commercial framework.',
  },
  {
    state: 'North Dakota',
    stateCode: 'ND',
    slug: 'north-dakota',
    overview:
      'North Dakota provides a landlord-favorable, contract-driven commercial leasing environment. Commercial landlord-tenant relationships are governed by North Dakota Century Code Title 47 (Property) and Title 33 (Landlord and Tenant), with courts strongly deferring to the express lease terms and applying general contract law principles to fill gaps. The state\'s legislature maintains a minimalist approach to commercial lease regulation, consistent with North Dakota\'s broader pro-business regulatory philosophy.\n\nSelf-help evictions are not permitted for commercial properties; landlords must use the formal eviction (formerly "unlawful detainer") process. North Dakota does not impose a commercial rent tax, and there is no statutory cap on commercial security deposits. The state\'s commercial real estate market is heavily influenced by the oil and gas industry in the Bakken Formation (Williston Basin), agricultural processing and storage infrastructure throughout the Red River Valley and western plains, and government-related commercial activity in Bismarck, Fargo, and Grand Forks. Practitioners abstracting commercial leases in the Williston Basin oil patch should be particularly attentive to energy-sector-specific provisions, rapidly fluctuating occupancy patterns, and environmental indemnification clauses.',
    keyStatutes: [
      {
        name: 'North Dakota Century Code Title 47 (Property)',
        description:
          'The foundational property law title governing real estate transactions, lease formation, and landlord-tenant obligations in North Dakota for both commercial and residential properties.',
        url: 'https://www.legis.nd.gov',
      },
      {
        name: 'North Dakota Century Code Title 33 (Landlord and Tenant)',
        description:
          'Specifically governs the landlord-tenant relationship in North Dakota, providing statutory notice requirements, eviction procedures, and security deposit rules applicable to commercial tenancies.',
        url: 'https://www.legis.nd.gov',
      },
      {
        name: 'North Dakota Century Code § 33-06-01 et seq. (Eviction Proceedings)',
        description:
          'Establishes the procedures and required notices for commercial landlords to recover possession through the district court eviction process.',
        url: 'https://www.legis.nd.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Favorable' },
      { label: 'Self-Help Evictions', value: 'Not permitted; formal eviction proceedings required' },
      { label: 'Energy Sector Influence', value: 'Williston Basin commercial market significantly energy-driven' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'Under North Dakota law, a landlord must serve a 3-day written notice to pay rent or quit before commencing formal eviction proceedings for commercial non-payment.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice to terminate a month-to-month commercial tenancy in North Dakota.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '3 days',
        details:
          'For material non-monetary lease violations, North Dakota recognizes a 3-day written notice to comply or quit prior to commencing eviction proceedings.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit provisions must be contractually negotiated.',
      details:
        'North Dakota does not provide any statutory CAM or operating expense audit rights for commercial tenants. Audit rights are entirely contractual. Tenants in triple-net leases-common in the energy-sector commercial market-should negotiate explicit audit provisions covering not only standard CAM charges but also specialized pass-throughs such as environmental compliance costs, hazardous waste disposal expenses, and regulatory permit fees that are prevalent in the Williston Basin commercial market.',
    },
    faqs: [
      {
        question: 'What unique commercial lease provisions are important in North Dakota\'s oil patch?',
        answer:
          'Commercial leases in the Williston Basin (Williams, McKenzie, Mountrail, and Dunn counties) should address environmental indemnification for hydrocarbon and brine contamination, NORM (naturally occurring radioactive material) compliance, surface restoration obligations, volatile occupancy provisions, and access rights for pipeline and electrical infrastructure. The boom-and-bust nature of oil prices can also warrant early termination rights tied to commodity price or production thresholds.',
      },
      {
        question: 'How does commercial eviction work in North Dakota?',
        answer:
          'After serving the required 3-day notice, a commercial landlord files an eviction complaint in district court. North Dakota\'s eviction process is relatively efficient, with hearings typically scheduled within 30 days. If the landlord prevails, a writ of eviction is issued directing the sheriff to restore possession.',
      },
      {
        question: 'Is there a commercial rent tax in North Dakota?',
        answer:
          'No. North Dakota does not impose a statewide commercial rent tax. The state\'s sales and use tax applies to tangible personal property and certain services but does not extend to commercial real estate rent payments.',
      },
      {
        question: 'Are commercial leases subject to North Dakota\'s recording requirements?',
        answer:
          'Commercial leases exceeding 3 years are recordable in North Dakota and, if recorded, provide constructive notice to subsequent purchasers and encumbrancers. Long-term commercial leases in North Dakota should include recording provisions and specify which party bears the cost of recording.',
      },
    ],
    metaDescription:
      'North Dakota commercial lease law: NDCC Title 33 and 47, 3-day eviction notice, Bakken energy sector CRE norms, and commercial landlord-tenant practices.',
  },
  {
    state: 'South Dakota',
    stateCode: 'SD',
    slug: 'south-dakota',
    overview:
      'South Dakota is among the most business-friendly and landlord-favorable commercial leasing jurisdictions in the country, consistent with its broader regulatory philosophy of minimal state intervention in private commercial activity. Commercial landlord-tenant relationships are governed primarily by South Dakota Codified Laws Title 43 (Property) and Title 21, Chapter 16 (Forcible Entry and Detainer), with courts strongly deferring to the express terms of the commercial lease contract.\n\nSouth Dakota is notable for having no state income tax, no corporate income tax, and no personal income tax-making it a uniquely favorable commercial leasing jurisdiction from a pure tax cost perspective. The state does not impose a commercial rent tax. South Dakota\'s commercial real estate market is led by the Sioux Falls financial services corridor (the state hosts major credit card operations for Citibank, Wells Fargo, and others due to favorable usury law), Rapid City as a gateway to Mount Rushmore and Black Hills tourism, and extensive agricultural support commercial infrastructure throughout the state. Self-help evictions are limited in commercial contexts; judicial eviction through forcible entry and detainer proceedings is the standard.',
    keyStatutes: [
      {
        name: 'South Dakota Codified Laws Title 43 (Property)',
        description:
          'The foundational property law title governing real estate transactions and landlord-tenant relationships in South Dakota, including commercial lease formation and enforcement.',
        url: 'https://sdlegislature.gov',
      },
      {
        name: 'South Dakota Codified Laws § 21-16-1 et seq. (Forcible Entry and Detainer)',
        description:
          'Governs the judicial procedure for commercial landlords to recover possession from defaulting tenants, including required notice periods and court filing standards.',
        url: 'https://sdlegislature.gov',
      },
      {
        name: 'South Dakota Codified Laws § 43-32-6.1 (Security Deposits)',
        description:
          'Establishes security deposit obligations applicable to commercial tenancies, including return and accounting deadlines.',
        url: 'https://sdlegislature.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Strongly Landlord-Friendly / Business-Permissive' },
      { label: 'Self-Help Evictions', value: 'Limited; FED judicial proceedings are standard' },
      { label: 'State Income Tax', value: 'None (no state income tax)' },
      { label: 'Commercial Rent Tax', value: 'None statewide' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'South Dakota law requires a 3-day written notice to pay or quit before a commercial landlord may file a forcible entry and detainer action for non-payment of rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice to terminate a month-to-month commercial tenancy in South Dakota.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '3 days',
        details:
          'For material lease violations, South Dakota permits a 3-day notice to comply or quit before the landlord may seek judicial eviction, absent specific lease provisions.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; all audit provisions are contractual.',
      details:
        'South Dakota provides no statutory CAM or operating expense audit rights for commercial tenants. All audit rights must be explicitly negotiated in the lease agreement. South Dakota courts strictly enforce commercial lease contracts as written, and tenants without negotiated audit clauses have no implied right to review landlord financial records outside of active litigation discovery.',
    },
    faqs: [
      {
        question: 'Why is South Dakota considered uniquely tax-favorable for commercial tenants?',
        answer:
          'South Dakota has no state income tax, no corporate income tax, no personal income tax, and no commercial rent tax. This makes it one of a small group of states with the lowest commercial real estate holding costs from a pure tax perspective. Combined with South Dakota\'s favorable trust and business formation laws, this has made Sioux Falls a significant financial services hub.',
      },
      {
        question: 'What is the notice requirement for commercial evictions in South Dakota?',
        answer:
          'For non-payment of rent, a landlord must serve a 3-day written notice to pay or quit before filing a forcible entry and detainer complaint in circuit court. South Dakota courts schedule eviction hearings relatively promptly, typically within 3–4 weeks of filing.',
      },
      {
        question: 'Are there unique commercial lease considerations in the Sioux Falls financial services market?',
        answer:
          'Yes. Major financial institutions operating in Sioux Falls often negotiate sophisticated commercial leases with data center specifications, business continuity provisions, redundant power and connectivity requirements, and extended buildout timelines. Practitioners abstracting leases in this market should also flag co-tenancy and exclusivity provisions, which are common in the competitive Sioux Falls office market.',
      },
      {
        question: 'Can a commercial tenant sublease in South Dakota without landlord approval?',
        answer:
          'Under South Dakota common law, a commercial tenant may generally sublease unless the lease explicitly prohibits it or requires landlord consent. Most commercial leases in South Dakota include express consent-to-sublease requirements, and practitioners should carefully abstract these provisions along with any criteria the landlord may use to approve or deny sublease requests.',
      },
    ],
    metaDescription:
      'South Dakota commercial lease law: no income tax, SDCL Title 43, 3-day eviction notice, FED procedures, and Sioux Falls financial market commercial lease norms.',
  },
  {
    state: 'Delaware',
    stateCode: 'DE',
    slug: 'delaware',
    overview:
      'Delaware is a uniquely sophisticated commercial leasing jurisdiction, renowned for its business-friendly legal environment and world-class Court of Chancery, which serves as a preferred venue for complex commercial real estate disputes. Commercial landlord-tenant relationships are governed primarily by Delaware\'s Landlord-Tenant Code under Title 25 of the Delaware Code, though the court system-particularly the Court of Chancery with its expert jurists and absence of juries for most commercial matters-is as significant as the statutory framework itself.\n\nDelaware is strongly landlord-friendly in commercial contexts. The state permits a form of summary possession proceeding (known as a Complaint for Summary Possession in Justice of the Peace Court) that is efficient and landlord-receptive. The Court of Chancery\'s jurisdiction over complex commercial lease disputes involving injunctive relief, specific performance, or equitable remedies is a defining feature of Delaware\'s commercial leasing landscape. Delaware has no state sales tax on commercial rent. Given that a vast majority of Fortune 500 companies are incorporated in Delaware, practitioners frequently abstract Delaware commercial leases involving sophisticated institutional landlords and large corporate tenants-requiring careful attention to indemnification caps, consequential damages waivers, and sophisticated remedies provisions.',
    keyStatutes: [
      {
        name: 'Delaware Code Title 25 (Property)',
        description:
          'The primary property law title governing landlord-tenant relationships in Delaware, including commercial leases, notice requirements, eviction procedures, and security deposit obligations.',
        url: 'https://delcode.delaware.gov',
      },
      {
        name: 'Delaware Code Title 25, § 5502 et seq. (Summary Possession)',
        description:
          'Governs the summary possession (eviction) process for commercial tenants, establishing the required notice periods and procedures for filing in Justice of the Peace Court.',
        url: 'https://delcode.delaware.gov',
      },
      {
        name: 'Delaware Court of Chancery Rules (Complex Commercial Disputes)',
        description:
          'The Court of Chancery provides specialized jurisdiction over complex commercial lease disputes involving injunctive relief, specific performance, and equitable remedies, offering expert judicial resolution unavailable in most other states.',
        url: 'https://courts.delaware.gov/chancery',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Strongly Landlord-Friendly' },
      { label: 'Court of Chancery', value: 'Available for complex commercial lease disputes; no jury; expert jurists' },
      { label: 'Self-Help Evictions', value: 'Not permitted; summary possession required' },
      { label: 'State Sales Tax on Rent', value: 'None (Delaware has no sales tax)' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '5 days',
        details:
          'Delaware requires a 5-day written notice to pay rent or quit before a commercial landlord may file for summary possession in Justice of the Peace Court.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '60 days',
        details:
          'Either party must provide 60 days of advance written notice to terminate a month-to-month commercial tenancy under Delaware Title 25.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '7 days',
        details:
          'For material non-monetary lease violations, Delaware recognizes a 7-day written notice to cure or quit before the landlord may file for summary possession.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit provisions are entirely contractual.',
      details:
        'Delaware does not provide any statutory CAM or operating expense audit rights for commercial tenants. Given the sophistication of Delaware\'s commercial leasing market-frequently involving Fortune 500 tenants and institutional landlords-audit provisions are typically heavily negotiated and may include annual reconciliation obligations, specific audit methodologies, look-back periods of 1–3 years, and cost-shifting provisions. Delaware courts will strictly enforce these contractual audit provisions as written.',
    },
    faqs: [
      {
        question: 'What is the Court of Chancery and why does it matter for commercial leases in Delaware?',
        answer:
          'The Delaware Court of Chancery is a specialized equity court with jurisdiction over complex business disputes, including commercial lease matters involving injunctive relief, specific performance, or equitable remedies. It is staffed by expert jurists (chancellors and vice-chancellors) with deep commercial expertise and decides cases without juries. For complex commercial lease disputes-particularly involving large corporations-the Court of Chancery provides more predictable and sophisticated resolution than general trial courts in most other states.',
      },
      {
        question: 'What is the eviction process for commercial tenants in Delaware?',
        answer:
          'After serving a 5-day notice to pay or quit, the landlord files a Complaint for Summary Possession in Justice of the Peace Court. Delaware\'s summary possession process is efficient, with hearings typically scheduled within 15–30 days. If the landlord prevails, a writ of possession is issued.',
      },
      {
        question: 'Does Delaware\'s lack of a sales tax benefit commercial tenants?',
        answer:
          'Yes. Delaware\'s absence of a state sales tax means that commercial rent payments are not subject to a retail sales tax burden at the state level. This eliminates the compliance obligations present in states like Florida (which taxes commercial rent) and New Mexico (which imposes the Gross Receipts Tax on rent).',
      },
      {
        question: 'Are personal guarantees common and enforceable in Delaware commercial leases?',
        answer:
          'Yes. Personal guarantees are routinely required and fully enforceable in Delaware commercial leases. Delaware courts-including the Court of Chancery for equity-related guarantee disputes-will enforce guarantees strictly as written. Practitioners abstracting Delaware commercial leases should separately capture guarantee scope, duration, burn-down provisions, and any financial covenant triggers.',
      },
    ],
    metaDescription:
      'Delaware commercial lease law: Title 25 Landlord-Tenant Code, Court of Chancery advantage, summary possession process, no sales tax, and institutional lease norms.',
  },
  {
    state: 'Rhode Island',
    stateCode: 'RI',
    slug: 'rhode-island',
    overview:
      'Rhode Island provides a moderately tenant-balanced commercial leasing environment shaped by its dense urban commercial market, strong labor unions, and a legal culture that interprets commercial lease provisions carefully and often in favor of the weaker party. Commercial landlord-tenant relationships are governed by the Rhode Island Landlord and Tenant Act (R.I. Gen. Laws § 34-18-1 et seq.) and the Forcible Entry and Detainer statute (R.I. Gen. Laws § 34-17-1 et seq.), along with general contract and property law principles applied by Rhode Island courts.\n\nSelf-help evictions are expressly prohibited in Rhode Island, and landlords must pursue a formal eviction (FED) action in district court. Rhode Island does not impose a state sales tax specifically on commercial rent. The Providence commercial real estate market-anchored by financial services, healthcare, higher education, and a revitalizing Jewelry District technology corridor-is the dominant commercial market. Commercial practitioners abstracting Rhode Island leases should pay particular attention to building condition warranties, ADA compliance obligations, and local zoning restrictions, which are actively enforced in the densely built Providence and greater metro area.',
    keyStatutes: [
      {
        name: 'Rhode Island General Laws § 34-18-1 et seq. (Landlord and Tenant Act)',
        description:
          'Establishes the statutory framework for landlord-tenant relationships in Rhode Island, providing default notice standards and landlord obligations that inform commercial lease gap-filling.',
        url: 'https://webserver.rilin.state.ri.us',
      },
      {
        name: 'Rhode Island General Laws § 34-17-1 et seq. (Forcible Entry and Detainer)',
        description:
          'Governs the judicial process for commercial evictions in Rhode Island, including required notices and court procedures for recovering commercial premises.',
        url: 'https://webserver.rilin.state.ri.us',
      },
      {
        name: 'Rhode Island General Laws § 34-18-19 (Security Deposits)',
        description:
          'Governs security deposit handling obligations, requiring return within a specified period after lease termination with an itemized accounting of any deductions.',
        url: 'https://webserver.rilin.state.ri.us',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Moderately Balanced (tenant-aware)' },
      { label: 'Self-Help Evictions', value: 'Expressly prohibited; FED court action required' },
      { label: 'Commercial Rent Tax', value: 'No state commercial rent tax' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '5 days',
        details:
          'Rhode Island requires a 5-day written notice to pay rent or quit before a commercial landlord may file a forcible entry and detainer action for non-payment of commercial rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice prior to the next rent due date to terminate a month-to-month commercial tenancy.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '20 days',
        details:
          'For material non-monetary lease violations, Rhode Island generally recognizes a 20-day notice to cure or quit before the landlord may file for eviction.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit provisions are entirely contractual.',
      details:
        'Rhode Island does not provide any statutory CAM or operating expense audit rights for commercial tenants. All audit rights must be explicitly negotiated in the lease. Rhode Island courts carefully interpret commercial lease language, and tenants relying on implied audit rights without express contractual provisions will generally find limited judicial support. Given the Providence market\'s concentration of institutional landlords, tenants should negotiate standard audit provisions covering look-back periods, CPA requirements, and cost-shifting.',
    },
    faqs: [
      {
        question: 'Is commercial self-help eviction permitted in Rhode Island?',
        answer:
          'No. Rhode Island expressly prohibits self-help evictions for commercial properties. A landlord who changes locks, removes tenant property, or otherwise attempts to forcibly remove a commercial tenant without a court order is exposed to liability for wrongful eviction, including potential damages for business interruption.',
      },
      {
        question: 'How does commercial eviction proceed in Rhode Island?',
        answer:
          'After serving the required 5-day notice to pay or quit, the landlord files a forcible entry and detainer complaint in district court. Rhode Island district courts schedule commercial eviction hearings within approximately 20–30 days. If the landlord prevails, a writ of possession is issued.',
      },
      {
        question: 'Are there specific commercial lease considerations for Providence\'s Jewelry District?',
        answer:
          'Yes. The Providence Jewelry District (now a technology and innovation corridor) features significant adaptive reuse of historic mill and industrial buildings. Leases in this market often include complex provisions addressing historic building limitations, tenant improvement allowances for specialized tech and lab buildouts, and compliance with Rhode Island Historic Preservation and Heritage Commission requirements.',
      },
      {
        question: 'Does Rhode Island require commercial leases to be in writing?',
        answer:
          'Under Rhode Island\'s Statute of Frauds, commercial leases exceeding one year must be in writing and signed by the party against whom enforcement is sought. Oral agreements for commercial tenancies exceeding one year are generally unenforceable, though a tenant who has taken possession and paid rent under an oral understanding may have equitable claims.',
      },
    ],
    metaDescription:
      'Rhode Island commercial lease law: R.I. Gen. Laws § 34-18, 5-day eviction notice, FED procedures, and commercial landlord-tenant practices in the Providence market.',
  },
  {
    state: 'New Hampshire',
    stateCode: 'NH',
    slug: 'new-hampshire',
    overview:
      'New Hampshire presents a moderately landlord-favorable commercial leasing environment with a distinctive eviction process rooted in the state\'s tradition of judicial efficiency. Commercial landlord-tenant relationships are governed primarily by RSA 540-A (Prohibited Practices) and RSA 540 (Possessory Actions-Evictions), with general commercial lease disputes handled under contract law principles. New Hampshire is unique in that it has no state income tax on wages or general sales tax, creating a tax-favorable operating environment for commercial tenants.\n\nNew Hampshire\'s commercial eviction process requires landlords to provide a written Notice to Quit and then proceed with a Landlord/Tenant Writ (a simplified pleading form) filed in Circuit Court-District Division. This streamlined process is designed for efficiency and typically resolves within 30–60 days. Self-help commercial evictions are prohibited under RSA 540-A. The Manchester-Nashua I-93 corridor is the state\'s primary commercial real estate market, with significant office, logistics, and technology activity. Southern New Hampshire benefits from proximity to the Greater Boston metro area and has seen sustained commercial real estate growth driven by Massachusetts-based companies seeking lower-cost alternatives.',
    keyStatutes: [
      {
        name: 'New Hampshire RSA 540 (Possessory Actions-Evictions)',
        description:
          'Governs the commercial eviction process in New Hampshire, establishing required Notice to Quit periods, the Landlord/Tenant Writ procedure, and court filing requirements for possessory actions.',
        url: 'https://www.gencourt.state.nh.us',
      },
      {
        name: 'New Hampshire RSA 540-A (Prohibited Practices by Landlords)',
        description:
          'Prohibits commercial landlord self-help eviction methods including lockouts, utility shutoffs, and removal of tenant belongings without court authorization.',
        url: 'https://www.gencourt.state.nh.us',
      },
      {
        name: 'New Hampshire RSA 447 (Commercial Liens)',
        description:
          'Governs commercial liens in New Hampshire, including materialmen\'s and contractor\'s liens that may affect commercial properties subject to tenant improvement construction.',
        url: 'https://www.gencourt.state.nh.us',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Moderately Landlord-Favorable' },
      { label: 'Self-Help Evictions', value: 'Expressly prohibited under RSA 540-A' },
      { label: 'State Income Tax', value: 'None on wages or general income' },
      { label: 'State Sales Tax', value: 'None (no general state sales tax)' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '7 days',
        details:
          'Under RSA 540, a commercial landlord must serve a 7-day written Notice to Quit for non-payment of rent before filing a Landlord/Tenant Writ in Circuit Court-District Division.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice to terminate a month-to-month commercial tenancy in New Hampshire.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '30 days',
        details:
          'For material non-monetary lease violations, New Hampshire requires a 30-day Notice to Quit specifying the violation before the landlord may file for eviction.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; all audit provisions are contractual.',
      details:
        'New Hampshire does not provide any statutory CAM or operating expense audit rights for commercial tenants. All audit rights must be explicitly negotiated in the lease. New Hampshire courts enforce commercial lease provisions as written, applying strict contract law principles. Tenants in the Manchester-Nashua corridor-often sophisticated operations with Boston-area experience-typically negotiate standard institutional audit provisions.',
    },
    faqs: [
      {
        question: 'What are the prohibited landlord practices under RSA 540-A in New Hampshire?',
        answer:
          'RSA 540-A prohibits commercial landlords from engaging in self-help eviction tactics, including changing locks, removing tenant property, shutting off utilities, or otherwise physically interfering with a tenant\'s peaceful enjoyment of commercial premises without a court order. Violations expose landlords to injunctive relief and damages.',
      },
      {
        question: 'How does the Landlord/Tenant Writ process work in New Hampshire?',
        answer:
          'After serving the required Notice to Quit, the landlord files a Landlord/Tenant Writ-a simplified, court-provided form-in Circuit Court-District Division. The writ is served on the tenant, who must respond within a short period. A hearing date is set, typically within 30–45 days. If the landlord prevails, a Writ of Possession is issued.',
      },
      {
        question: 'Why do Massachusetts businesses often lease commercial space in southern New Hampshire?',
        answer:
          'Southern New Hampshire (Nashua, Manchester, Derry, Londonderry) offers significantly lower commercial rent, property tax, and operating costs than Greater Boston while remaining within commuting distance. New Hampshire\'s lack of a state income tax on wages makes it attractive for employee compensation as well, and the absence of a state sales tax eliminates a compliance burden present in Massachusetts.',
      },
      {
        question: 'Are commercial leases subject to recording requirements in New Hampshire?',
        answer:
          'Commercial leases exceeding 7 years must be recorded in the county Registry of Deeds under New Hampshire law to be enforceable against subsequent purchasers and mortgagees. Practitioners abstracting long-term New Hampshire commercial leases should confirm recordation status and flag any unrecorded leases exceeding the 7-year threshold.',
      },
    ],
    metaDescription:
      'New Hampshire commercial lease law: RSA 540 eviction process, RSA 540-A prohibited practices, no income or sales tax, and Manchester-Nashua CRE market overview.',
  },
  {
    state: 'Vermont',
    stateCode: 'VT',
    slug: 'vermont',
    overview:
      'Vermont presents one of the most tenant-balanced commercial leasing environments in New England, shaped by its small business-oriented economy, strong consumer and tenant protection culture, and a legal framework that emphasizes good faith dealing in commercial relationships. Commercial landlord-tenant relationships are governed primarily by Vermont Statutes Annotated Title 9 (Commerce and Trade) and Title 10 (Conservation and Development) for environmental overlays, with courts applying a balanced contract law approach that gives weight to both landlord remedies and tenant protections.\n\nVermont prohibits self-help commercial evictions and requires landlords to use the formal eviction process in Superior Court. The state\'s commercial real estate market is modest in scale and concentrated in Burlington, Montpelier, and Rutland, with a significant tourism-oriented commercial market in ski resort communities (Stowe, Killington, Sugarbush) and a growing clean energy technology corridor. Commercial practitioners in Vermont should pay particular attention to Act 250 (Vermont\'s land use control law), which imposes permitting requirements on significant commercial developments and can affect lease terms, buildout rights, and permitted use provisions in ways not found in most other states.',
    keyStatutes: [
      {
        name: 'Vermont Statutes Annotated Title 9, Chapter 137 (Rental of Residential Property)',
        description:
          'While residential in focus, Title 9 Chapter 137 informs commercial landlord obligations and good-faith dealing standards recognized by Vermont courts in commercial lease disputes.',
        url: 'https://legislature.vermont.gov',
      },
      {
        name: 'Vermont Rules of Civil Procedure, Rule 80.1 (Eviction Proceedings)',
        description:
          'Governs commercial eviction procedures in Vermont Superior Court, including the required notice to quit and court complaint process for recovering commercial premises.',
        url: 'https://legislature.vermont.gov',
      },
      {
        name: 'Vermont 10 V.S.A. Chapter 151 (Act 250 - Land Use and Development)',
        description:
          'Vermont\'s major land use law imposing Act 250 permit requirements on substantial commercial developments, directly affecting buildout rights, environmental compliance, and permitted use provisions in commercial leases.',
        url: 'https://legislature.vermont.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced / Tenant-Aware' },
      { label: 'Self-Help Evictions', value: 'Not permitted; Superior Court eviction required' },
      { label: 'Act 250 Compliance', value: 'Required for significant commercial developments; affects lease buildout rights' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '14 days',
        details:
          'Vermont requires a 14-day written notice to pay rent or quit before a commercial landlord may file an eviction action in Superior Court for non-payment of rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice to terminate a month-to-month commercial tenancy in Vermont.',
      },
      {
        type: 'Lease Violation (Non-Rent)',
        period: '30 days',
        details:
          'For material non-monetary lease violations, Vermont courts recognize a 30-day notice to cure or quit before the landlord may file for eviction, absent specific lease provisions.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit provisions are entirely contractual.',
      details:
        'Vermont does not provide any statutory CAM or operating expense audit rights for commercial tenants. Audit rights must be explicitly negotiated in the lease. Vermont courts interpret commercial lease provisions in light of good faith and fair dealing principles, which means that even in the absence of formal audit rights, a landlord who actively conceals or misrepresents operating expense allocations may face equitable challenges in Vermont courts.',
    },
    faqs: [
      {
        question: 'What is Act 250 and how does it affect commercial leases in Vermont?',
        answer:
          'Act 250 (10 V.S.A. Chapter 151) is Vermont\'s major land use permitting law that requires state-level approval for commercial developments meeting certain size and impact thresholds (generally construction of 10+ acres of impervious surface, or commercial buildings exceeding specified square footage thresholds in certain districts). Commercial leases for buildings subject to Act 250 review should address permit conditionality, buildout approval processes, compliance obligations, and the consequences if an Act 250 permit is denied or conditioned.',
      },
      {
        question: 'How does commercial eviction work in Vermont?',
        answer:
          'After serving the required 14-day notice to pay or quit, the landlord files an eviction complaint in Vermont Superior Court under Vermont Rules of Civil Procedure Rule 80.1. The court schedules a hearing, typically within 30–45 days. Vermont courts generally resolve commercial evictions on the merits within 60–90 days of filing.',
      },
      {
        question: 'Are there special considerations for commercial leases in Vermont ski resort communities?',
        answer:
          'Yes. Commercial leases in resort communities like Stowe, Killington, and Sugarbush frequently include seasonal use provisions, percentage rent clauses tied to skier visit counts or resort operations, co-tenancy provisions linked to resort anchor operations, and force majeure provisions covering snowless seasons or resort operational disruptions.',
      },
      {
        question: 'Does Vermont impose a sales or rent tax on commercial lease payments?',
        answer:
          'Vermont imposes a general state sales tax but commercial real estate rent itself is generally exempt from Vermont sales tax. However, certain services bundled into commercial lease payments-such as cleaning services, parking, or equipment rentals-may be separately taxable. Practitioners should analyze gross lease payment components for Vermont sales tax applicability.',
      },
    ],
    metaDescription:
      'Vermont commercial lease law: Act 250 land use permits, 14-day eviction notice, Superior Court procedures, ski resort CRE norms, and tenant-balanced lease practices.',
  },
  {
    state: 'Maine',
    stateCode: 'ME',
    slug: 'maine',
    overview:
      'Maine provides a moderately balanced commercial leasing environment shaped by its coastal economy, small business culture, and a legal framework that respects freedom of contract while maintaining meaningful tenant protections against abusive landlord practices. Commercial landlord-tenant relationships are governed primarily by Maine Revised Statutes Title 14, Chapter 709 (Forcible Entry and Detainer) and Title 33 (Property), with courts applying careful contractual interpretation to commercial lease disputes.\n\nSelf-help commercial evictions are prohibited in Maine; landlords must use the formal Forcible Entry and Detainer (FED) process in District Court. Maine\'s commercial real estate market is concentrated in the Greater Portland metro area (Maine\'s economic engine), Bangor as the regional center of Northern and Eastern Maine, and a significant seasonal tourism-commercial market along the southern coastal corridor (Portland, Kennebunkport, Bar Harbor). Commercial practitioners in Maine should be attentive to Maine\'s shoreland zoning regulations, which can significantly affect permitted uses and buildout rights for coastal commercial properties, and to the state\'s stringent environmental protection laws that can affect indemnification provisions in industrial and marine-adjacent commercial leases.',
    keyStatutes: [
      {
        name: 'Maine Revised Statutes Title 14, Chapter 709 (Forcible Entry and Detainer)',
        description:
          'Governs the judicial process for commercial evictions in Maine, setting required notice periods and procedural requirements for FED actions in District Court.',
        url: 'https://legislature.maine.gov',
      },
      {
        name: 'Maine Revised Statutes Title 33 (Property)',
        description:
          'The foundational property law title governing real estate transactions and landlord-tenant obligations in Maine, informing commercial lease formation and enforcement.',
        url: 'https://legislature.maine.gov',
      },
      {
        name: 'Maine Revised Statutes Title 38 (Waters and Navigation / Environmental Protection)',
        description:
          'Maine\'s stringent environmental protection statutes directly affect commercial lease indemnification provisions for waterfront, coastal, and industrial properties, including DEP permitting and cleanup liability.',
        url: 'https://legislature.maine.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced (contract terms control)' },
      { label: 'Self-Help Evictions', value: 'Not permitted; FED District Court action required' },
      { label: 'Shoreland Zoning', value: 'Strict coastal and shoreland zoning affects permitted uses for coastal CRE' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '7 days',
        details:
          'Maine requires a 7-day written notice to pay rent or quit before a commercial landlord may file a Forcible Entry and Detainer action in District Court for non-payment of commercial rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Either party must provide 30 days of advance written notice to terminate a month-to-month commercial tenancy in Maine.',
      },
      {
        type: 'Year-to-Year Termination',
        period: '3 months',
        details:
          'A year-to-year commercial tenancy in Maine requires 3 months of advance written notice prior to the end of the annual term to terminate.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit provisions are entirely contractual.',
      details:
        'Maine does not provide any statutory CAM or operating expense audit rights for commercial tenants. All audit rights must be explicitly negotiated in the lease. Maine courts apply careful contractual interpretation to commercial lease provisions and will enforce audit rights as written. Tenants in the Greater Portland market-increasingly involving sophisticated institutional landlords-should negotiate standard audit provisions including defined look-back periods, CPA qualification requirements, and landlord cure obligations upon discovery of material overcharges.',
    },
    faqs: [
      {
        question: 'How does the commercial eviction process work in Maine?',
        answer:
          'After serving a 7-day written notice to pay or quit, the commercial landlord files a Forcible Entry and Detainer complaint in Maine District Court. A hearing is scheduled, typically within 21–35 days. If the landlord prevails, the court issues a Writ of Possession directing the sheriff to restore possession.',
      },
      {
        question: 'What is shoreland zoning and how does it affect Maine commercial leases?',
        answer:
          'Maine\'s Mandatory Shoreland Zoning Act (Title 38, §435 et seq.) requires municipalities to regulate land use within 250 feet of significant water bodies and wetlands. Commercial properties in these zones face restrictions on impervious surface, building setbacks, and permitted activities. Commercial leases for coastal Maine properties must specifically address permitted use limitations imposed by shoreland zoning, as violations can result in DEP enforcement actions affecting tenant operations.',
      },
      {
        question: 'Are there special commercial lease considerations for seasonal tourism properties in Maine?',
        answer:
          'Yes. Commercial leases for seasonal retail, hospitality, and restaurant properties along Maine\'s southern coast and in Bar Harbor frequently include seasonal operating period provisions, percentage rent tied to tourist season revenues, winterization obligations, and storage rights during the off-season. These provisions require careful abstraction to identify financial obligations that may not be obvious from the base rent structure.',
      },
      {
        question: 'Does Maine impose a sales tax on commercial rent?',
        answer:
          'Maine generally does not impose its state sales tax on commercial real estate rent payments. However, Maine\'s sales tax applies to certain services and to tangible personal property, so practitioners should analyze whether any bundled services included in a gross lease payment are separately subject to Maine\'s 5.5% general sales tax rate.',
      },
    ],
    metaDescription:
      'Maine commercial lease law: Title 14 Chapter 709, 7-day eviction notice, FED procedures, shoreland zoning impacts, and Greater Portland commercial market overview.',
  },
  {
    state: 'West Virginia',
    stateCode: 'WV',
    slug: 'west-virginia',
    overview:
      'West Virginia provides a landlord-favorable commercial leasing environment rooted in the state\'s traditional extractive industry economy and a legal culture that strongly emphasizes freedom of contract in business transactions. Commercial landlord-tenant relationships are governed primarily by West Virginia Code Chapter 37 (Property), with courts heavily deferring to the express terms of the commercial lease. The state\'s long history as a coal, natural gas, and timber state has shaped commercial real estate norms in significant ways, particularly in southern West Virginia where industrial and energy-support commercial properties dominate.\n\nWest Virginia does not permit self-help commercial evictions; landlords must use the formal eviction process in magistrate court or circuit court. The state imposes no general state sales tax on commercial real estate rent. The primary commercial markets are Charleston (the state capital and primary financial and healthcare hub), Morgantown (anchored by West Virginia University), and Huntington. West Virginia\'s commercial real estate market faces ongoing challenges from population decline and economic transition away from coal, making commercial lease abstraction particularly important for evaluating occupancy risk, co-tenancy provisions, and force majeure protections in areas experiencing economic contraction.',
    keyStatutes: [
      {
        name: 'West Virginia Code Chapter 37 (Property)',
        description:
          'The primary property law chapter governing real estate transactions, lease formation, and landlord-tenant obligations in West Virginia, applicable to commercial tenancies.',
        url: 'https://code.wvlegislature.gov',
      },
      {
        name: 'West Virginia Code § 55-3A-1 et seq. (Wrongful Occupation of Residential Rental Property)',
        description:
          'While primarily residential, this chapter informs eviction procedure standards and provides reference guidance for commercial unlawful detainer proceedings in West Virginia courts.',
        url: 'https://code.wvlegislature.gov',
      },
      {
        name: 'West Virginia Code § 37-6-1 et seq. (Landlord and Tenant)',
        description:
          'Governs the landlord-tenant relationship in West Virginia, establishing default notice periods, security deposit obligations, and remedies available in commercial landlord-tenant disputes.',
        url: 'https://code.wvlegislature.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Favorable' },
      { label: 'Self-Help Evictions', value: 'Not permitted; magistrate or circuit court action required' },
      { label: 'Energy Sector Influence', value: 'Coal and natural gas commercial norms prevalent in southern WV' },
      { label: 'Statutory Audit Rights', value: 'None; entirely contractual' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '5 days',
        details:
          'West Virginia Code requires a 5-day written notice to pay rent or quit before a commercial landlord may file an eviction action in magistrate court for non-payment of commercial rent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '1 month',
        details:
          'Either party must provide 1 month of advance written notice prior to the next rent due date to terminate a month-to-month commercial tenancy in West Virginia.',
      },
      {
        type: 'Year-to-Year Termination',
        period: '3 months',
        details:
          'A year-to-year commercial tenancy in West Virginia requires 3 months of advance written notice prior to the end of the annual term to terminate, absent specific lease provisions.',
      },
    ],
    auditRights: {
      summary: 'No statutory right; audit provisions are entirely contractual.',
      details:
        'West Virginia does not provide any statutory CAM or operating expense audit rights for commercial tenants. Audit rights must be explicitly negotiated in the lease. West Virginia courts strictly enforce commercial lease provisions as written. Given the state\'s economic challenges and the prevalence of smaller, non-institutional landlords in most markets outside of Charleston and Morgantown, tenants should pay particular attention to operating expense allocation provisions and negotiate audit rights covering the full range of pass-through charges.',
    },
    faqs: [
      {
        question: 'What unique commercial lease provisions are important for energy-sector properties in West Virginia?',
        answer:
          'Commercial leases for coal support facilities, natural gas infrastructure, and industrial properties in southern West Virginia should address environmental indemnification for coal mine drainage, methane gas migration, acid mine drainage contamination, surface subsidence risk, and compliance with Mine Safety and Health Administration (MSHA) regulatory requirements. These provisions are critical risk management tools in a state with extensive legacy mining and gas extraction activity.',
      },
      {
        question: 'How does commercial eviction proceed in West Virginia?',
        answer:
          'After serving a 5-day notice to pay or quit, the commercial landlord files an eviction complaint in magistrate court (for smaller claims) or circuit court (for larger matters). West Virginia magistrate courts schedule eviction hearings relatively quickly, typically within 30 days. If the landlord prevails, a writ of eviction is issued. Either party may appeal to circuit court within 20 days of the magistrate\'s decision.',
      },
      {
        question: 'Are there commercial lease considerations related to West Virginia\'s economic transition?',
        answer:
          'Yes. As West Virginia transitions away from coal, many commercial properties in southern coalfield communities face declining demand and occupancy. Practitioners abstracting commercial leases in these markets should carefully evaluate co-tenancy rights, percentage rent provisions, kick-out clauses tied to sales or occupancy thresholds, and force majeure provisions broad enough to cover economic obsolescence scenarios.',
      },
      {
        question: 'Does West Virginia impose a sales tax on commercial rent?',
        answer:
          'West Virginia\'s general consumer sales tax does not apply to commercial real estate rent. The state\'s Business and Occupation Tax (B&O Tax) applies to the gross income of persons engaged in business activities in West Virginia, but commercial real estate leasing income is generally not subject to the B&O Tax in the same manner as retail sales. Practitioners should confirm the tax treatment of any service components bundled into gross lease payments.',
      },
    ],
    metaDescription:
      'West Virginia commercial lease law: WV Code Chapter 37, 5-day eviction notice, energy sector CRE norms, magistrate court procedures, and commercial landlord-tenant practices.',
  },
  {
    state: 'Washington',
    stateCode: 'WA',
    slug: 'washington',
    overview:
      'Washington State occupies a moderate, balanced position in commercial landlord-tenant law, leaning toward landlord primacy in lease enforcement while still imposing meaningful procedural safeguards. Commercial tenancies are principally governed by the Revised Code of Washington (RCW) Title 59, though Chapter 59.18 (the Residential Landlord-Tenant Act) explicitly excludes commercial premises. The state relies heavily on common law contract principles and the negotiated lease document.\n\nWashington does not permit commercial self-help evictions. Landlords must pursue a formal Unlawful Detainer action under RCW Chapter 59.12 to regain possession, beginning with proper written notice. The state imposes no cap on commercial security deposits and no specific statutory return timeline beyond general common law reasonableness. King County and Seattle do not impose a commercial rent tax, distinguishing Washington from gateway cities like New York. The relative simplicity of Washington\'s commercial framework makes the abstracted lease itself the primary legal document governing the tenancy.',
    keyStatutes: [
      {
        name: 'RCW Chapter 59.12 - Unlawful Detainer',
        description:
          'Governs the formal judicial eviction process landlords must follow to reclaim commercial premises, including mandatory written notice prerequisites before filing in Superior Court.',
        url: 'https://app.leg.wa.gov/RCW/default.aspx?cite=59.12',
      },
      {
        name: 'RCW Chapter 59.18 - Residential Landlord-Tenant Act',
        description:
          'Explicitly excludes commercial tenancies from its scope, confirming that commercial leases operate under common law and the negotiated lease agreement rather than residential statutory protections.',
        url: 'https://app.leg.wa.gov/RCW/default.aspx?cite=59.18',
      },
      {
        name: 'RCW Section 59.12.030 - Notice to Quit',
        description:
          'Specifies the notice periods required for various grounds of commercial eviction, including the 3-day notice for nonpayment of rent and the 20-day notice to terminate a month-to-month tenancy.',
        url: 'https://app.leg.wa.gov/RCW/default.aspx?cite=59.12.030',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced / Moderate' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Formal Unlawful Detainer action required.' },
      { label: 'Commercial Rent Tax', value: 'None at state or major municipal level' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'Under RCW 59.12.030(3), a landlord must serve a 3-day written notice to pay rent or vacate before filing an Unlawful Detainer action for nonpayment of commercial rent.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '10 days',
        details:
          'For material non-monetary lease violations, a 10-day notice to comply or vacate is required before commencing Unlawful Detainer proceedings in Washington Superior Court.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '20 days',
        details:
          'Under RCW 59.12.030(1), at least 20 days\' written notice prior to the end of a rental period is required to terminate a month-to-month commercial tenancy.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; entirely governed by the negotiated lease agreement.',
      details:
        'Washington law provides no statutory right for commercial tenants to audit landlord operating expense or CAM reconciliation statements. The right to audit, the look-back window (typically 1–3 years), the requirement for a licensed CPA, cost allocation between the parties, and the landlord\'s obligation to maintain records must all be expressly negotiated and memorialized in the lease. In the absence of a contractual audit clause, tenants seeking to challenge expense pass-throughs must generally pursue breach of contract claims through litigation.',
    },
    faqs: [
      {
        question: 'Can a Washington landlord lock out a commercial tenant for nonpayment?',
        answer:
          'No. Washington prohibits commercial self-help evictions. A landlord must serve a 3-day notice to pay or vacate and then file a formal Unlawful Detainer action in Superior Court to legally regain possession.',
      },
      {
        question: 'What notice is required to terminate a commercial month-to-month tenancy in WA?',
        answer:
          'At least 20 days\' written notice prior to the end of the rental period is required under RCW 59.12.030(1) to terminate a month-to-month commercial tenancy.',
      },
      {
        question: 'Are commercial security deposits regulated in Washington State?',
        answer:
          'No. Washington imposes no statutory cap on commercial security deposits and no specific statutory deadline for returning them. Return timelines and deduction procedures are governed entirely by the lease agreement.',
      },
      {
        question: 'Does Washington have any special protections for small business commercial tenants?',
        answer:
          'Washington has no equivalent to California\'s SB 1103 qualified tenant framework. Small business commercial tenants receive no enhanced statutory protections beyond what is negotiated in their lease, reinforcing the importance of careful lease abstraction and negotiation.',
      },
    ],
    metaDescription:
      'Washington State commercial landlord-tenant law overview: RCW Chapter 59.12 Unlawful Detainer, 3-day eviction notices, notice periods, and commercial lease audit rights.',
  },
  {
    state: 'Massachusetts',
    stateCode: 'MA',
    slug: 'massachusetts',
    overview:
      'Massachusetts commercial landlord-tenant law is primarily driven by common law and the specific terms of the negotiated lease, operating in a legal environment that otherwise imposes some of the strongest residential tenant protections in the nation. The Massachusetts General Laws (M.G.L.) do not contain a comprehensive commercial landlord-tenant act, leaving commercial disputes largely to contract interpretation, equity, and the general property statutes under M.G.L. Chapter 186. The state\'s courts have developed a well-established body of commercial real estate case law that practitioners must navigate alongside the statutory framework.\n\nSelf-help evictions are categorically prohibited under Massachusetts common law for commercial premises. Landlords must use the Summary Process (eviction) procedure under M.G.L. Chapter 239, requiring proper written notice and a formal court filing. Massachusetts is notable for its Consumer Protection Act (M.G.L. Chapter 93A), which can be asserted in commercial landlord-tenant disputes involving unfair or deceptive practices, adding meaningful litigation risk - including multiple damages and attorney\'s fees - for landlords who act in bad faith.',
    keyStatutes: [
      {
        name: 'M.G.L. Chapter 186 - Estates for Years and at Will',
        description:
          'Governs the fundamental framework for commercial tenancies, including notice requirements for terminating tenancies at will and year-to-year estates.',
        url: 'https://malegislature.gov/Laws/GeneralLaws/PartII/TitleI/Chapter186',
      },
      {
        name: 'M.G.L. Chapter 239 - Summary Process for Possession of Land',
        description:
          'Establishes the exclusive judicial procedure for commercial evictions, requiring proper notice and a formal court action before a landlord can recover possession of commercial premises.',
        url: 'https://malegislature.gov/Laws/GeneralLaws/PartIII/TitleIII/Chapter239',
      },
      {
        name: 'M.G.L. Chapter 93A - Consumer Protection Act',
        description:
          'Prohibits unfair or deceptive acts in trade or commerce, applicable to commercial lease disputes and enabling multiple damages and attorney\'s fees against landlords engaged in bad-faith conduct.',
        url: 'https://malegislature.gov/Laws/GeneralLaws/PartI/TitleXV/Chapter93A',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Moderate / Contract-Driven' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Summary Process under M.G.L. Ch. 239 required.' },
      { label: 'Commercial Rent Tax', value: 'None' },
      { label: 'Statutory Audit Rights', value: 'None. Negotiated lease terms govern.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent (Tenancy at Will)',
        period: '14 days',
        details:
          'Under M.G.L. Chapter 186 Section 11, a landlord must serve a 14-day written notice to quit for nonpayment of rent before commencing a Summary Process eviction action.',
      },
      {
        type: 'Termination of Tenancy at Will',
        period: '30 days (or one full rental period)',
        details:
          'Terminating a commercial tenancy at will requires at least 30 days\' notice, or one full rental period if longer, prior to the termination date under M.G.L. Chapter 186 Section 12.',
      },
      {
        type: 'Year-to-Year Tenancy Termination',
        period: '3 months',
        details:
          'A year-to-year commercial tenancy requires at least 3 months\' written notice prior to the anniversary date to effectuate a valid termination under M.G.L. Chapter 186.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; governed entirely by negotiated lease terms.',
      details:
        'Massachusetts does not grant commercial tenants any statutory right to audit landlord operating expenses or CAM charges. All audit provisions - including the right to audit, the look-back period, the identity of the auditor, cost allocation, and confidentiality obligations - must be negotiated and clearly stated in the lease. The state\'s Chapter 93A consumer protection statute can, however, create meaningful legal exposure for a landlord who intentionally provides materially false expense reconciliations, providing an alternative litigation pathway for tenants who lack a contractual audit clause.',
    },
    faqs: [
      {
        question: 'Can a Massachusetts landlord use self-help to evict a commercial tenant?',
        answer:
          'No. Massachusetts strictly prohibits self-help evictions for commercial premises. A landlord who changes locks, removes doors, or shuts off utilities to force out a commercial tenant faces significant tort liability and potential Chapter 93A multiple damages claims.',
      },
      {
        question: 'What notice is required for a commercial eviction in Massachusetts?',
        answer:
          'For nonpayment of rent in a tenancy at will, a 14-day notice to quit is required under M.G.L. Chapter 186 Section 11. The landlord must then file a Summary Process action in the appropriate court after the notice period expires.',
      },
      {
        question: 'Does Chapter 93A apply to commercial lease disputes in Massachusetts?',
        answer:
          'Yes. When a landlord engages in unfair or deceptive conduct in a commercial leasing context, a tenant may assert a Chapter 93A claim in addition to breach of contract, potentially recovering up to three times actual damages plus attorney\'s fees.',
      },
      {
        question: 'Are commercial security deposits regulated in Massachusetts?',
        answer:
          'No. Massachusetts\' strict residential security deposit statute (M.G.L. Chapter 186 Section 15B) does not apply to commercial leases. Commercial deposit amounts and return procedures are governed solely by the lease agreement.',
      },
    ],
    metaDescription:
      'Massachusetts commercial landlord-tenant law: M.G.L. Chapter 186 and 239, 14-day eviction notice, Chapter 93A consumer protection, and commercial lease audit rights.',
  },
  {
    state: 'Arizona',
    stateCode: 'AZ',
    slug: 'arizona',
    overview:
      'Arizona is a decidedly landlord-friendly commercial leasing state with a free-market regulatory philosophy. Commercial tenancies fall outside the scope of the Arizona Residential Landlord and Tenant Act (A.R.S. Title 33, Chapter 10) and are governed instead by common law, contract principles, and general property statutes. The state imposes minimal statutory requirements on commercial lease relationships, placing the burden on the negotiating parties to define their rights and remedies.\n\nArizona\'s formal eviction process for commercial tenants proceeds under the Forcible Entry and Detainer statutes (A.R.S. Title 12, Chapter 8, Article 4), which offer a comparatively fast judicial pathway. The state does not impose a commercial rent tax at the state level, though Arizona\'s Transaction Privilege Tax (TPT) may apply to certain commercial lease transactions at the local level in specific municipalities, creating a pass-through obligation commonly found in Arizona commercial leases. Arizona\'s strong pro-business climate makes it a popular jurisdiction for commercial real estate investment.',
    keyStatutes: [
      {
        name: 'A.R.S. Title 33, Chapter 3 - Landlord and Tenant (General)',
        description:
          'Provides foundational property law principles applicable to commercial lease relationships in Arizona, including lease construction, landlord lien rights, and default remedies.',
        url: 'https://www.azleg.gov/arstitle/',
      },
      {
        name: 'A.R.S. Title 12, Chapter 8, Article 4 - Forcible Entry and Detainer',
        description:
          'Governs the expedited court process for commercial evictions, providing a relatively fast judicial pathway for landlords to recover possession of commercial premises.',
        url: 'https://www.azleg.gov/arstitle/',
      },
      {
        name: 'A.R.S. Section 33-361 - Landlord\'s Lien',
        description:
          'Grants commercial landlords a lien on tenant personal property located on the premises for unpaid rent, subject to specific procedural requirements for enforcement.',
        url: 'https://www.azleg.gov/arstitle/',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Forcible Entry and Detainer process required.' },
      { label: 'Commercial Rent Tax', value: 'No state tax; local Transaction Privilege Tax (TPT) may apply' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '5 days',
        details:
          'Under A.R.S. Section 33-361, a landlord may serve a 5-day written notice to pay or quit for nonpayment of commercial rent before pursuing a Forcible Entry and Detainer action.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '5 days',
        details:
          'A 5-day notice to comply or quit is required for material non-monetary lease violations before filing a Forcible Entry and Detainer action in Arizona Justice Court or Superior Court.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'To terminate a month-to-month commercial tenancy in Arizona, either party must provide at least 30 days\' prior written notice before the end of the rental period.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; entirely governed by negotiated lease terms.',
      details:
        'Arizona imposes no statutory obligation on commercial landlords to allow tenants to audit operating expense or CAM reconciliation statements. The right to audit, including the scope, timing, auditor qualifications, and cost allocation, must be explicitly negotiated and documented in the lease. Tenants who discover discrepancies but lack a contractual audit clause are generally limited to breach of contract claims, which require demonstrating that specific lease obligations were violated rather than simply that charges appear excessive.',
    },
    faqs: [
      {
        question: 'What is the eviction process for commercial tenants in Arizona?',
        answer:
          'A landlord must first serve the appropriate written notice (5 days for nonpayment). If the tenant does not comply, the landlord files a Forcible Entry and Detainer action in Arizona Justice Court or Superior Court. Arizona\'s commercial eviction process is relatively expeditious compared to many states.',
      },
      {
        question: 'Does Arizona permit commercial landlord self-help evictions?',
        answer:
          'No. Arizona courts prohibit self-help evictions. While a lease may attempt to grant certain extra-judicial remedies, a landlord who changes locks or removes property without following proper legal procedures risks significant damages claims. Formal Forcible Entry and Detainer proceedings are required.',
      },
      {
        question: 'What are the local tax implications for commercial leases in Arizona?',
        answer:
          'Arizona\'s Transaction Privilege Tax (TPT) may apply to commercial lease transactions at the local level in certain cities. Landlords typically pass this cost through to tenants as additional rent, making its inclusion or exclusion in the lease base rent a critical abstraction point.',
      },
      {
        question: 'Is there a statutory security deposit return deadline for commercial leases in AZ?',
        answer:
          'No. Arizona\'s residential security deposit rules under A.R.S. Section 33-1321 do not apply to commercial leases. Return timing and deduction procedures are governed exclusively by the commercial lease agreement.',
      },
    ],
    metaDescription:
      'Arizona commercial landlord-tenant law overview: Forcible Entry and Detainer, 5-day eviction notice, landlord lien rights, TPT pass-throughs, and commercial lease audit rights.',
  },
  {
    state: 'Colorado',
    stateCode: 'CO',
    slug: 'colorado',
    overview:
      'Colorado commercial landlord-tenant law reflects a balanced approach, relying heavily on freedom of contract while imposing specific statutory procedural requirements that protect both parties in disputes. Commercial tenancies are not covered by the Colorado Warranty of Habitability (C.R.S. Section 38-12-503), which applies only to residential properties. Commercial lease relationships are governed by common law, lease contract terms, and the Colorado eviction statutes under C.R.S. Title 13, Article 40.\n\nColorado\'s Forcible Entry and Detainer (FED) statute provides a fast-track eviction process that can resolve commercial possession disputes in as few as two to three weeks. The state explicitly prohibits self-help commercial evictions - landlords who bypass the FED process expose themselves to significant statutory and tort liability. Denver and other Front Range municipalities do not impose a commercial rent tax, though landlords and tenants must navigate complex local sales and use tax structures on certain commercial activities.',
    keyStatutes: [
      {
        name: 'C.R.S. Title 13, Article 40 - Forcible Entry and Detainer',
        description:
          'Provides the exclusive and expedited judicial procedure for commercial evictions in Colorado, requiring mandatory notice periods before filing in County Court.',
        url: 'https://leg.colorado.gov',
      },
      {
        name: 'C.R.S. Section 13-40-104 - Notice to Quit',
        description:
          'Defines the specific notice periods required for different types of commercial lease defaults and terminations before a FED action may be filed.',
        url: 'https://leg.colorado.gov',
      },
      {
        name: 'C.R.S. Section 38-12-503 - Warranty of Habitability',
        description:
          'Applies exclusively to residential rental agreements and is explicitly inapplicable to commercial leases, confirming the contract-driven nature of commercial tenancy obligations.',
        url: 'https://leg.colorado.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced / Contract-Driven' },
      { label: 'Self-Help Evictions', value: 'Prohibited. FED process under C.R.S. Title 13, Article 40 required.' },
      { label: 'Commercial Rent Tax', value: 'None at state or Denver municipal level' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '10 days',
        details:
          'Under C.R.S. Section 13-40-104(1)(d), a commercial landlord must serve a 10-day written Demand for Compliance or Right to Possession for nonpayment of rent before filing a FED action.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '10 days',
        details:
          'A 10-day notice to comply or vacate is required for material non-monetary lease violations before a landlord may initiate Forcible Entry and Detainer proceedings.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '21 days',
        details:
          'Under C.R.S. Section 13-40-107, at least 21 days\' written notice prior to the end of the rental month is required to terminate a month-to-month commercial tenancy.',
      },
      {
        type: 'Year-to-Year Tenancy Termination',
        period: '91 days',
        details:
          'To terminate a year-to-year commercial tenancy in Colorado, at least 91 days\' prior written notice before the lease anniversary date is required.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; all audit provisions must be negotiated in the lease.',
      details:
        'Colorado provides no statutory mechanism granting commercial tenants the right to audit landlord CAM or operating expense reconciliations. The audit right, look-back period (typically 1–2 years), auditor qualification requirements, cost-sharing provisions, and landlord record retention obligations must all be specified in the lease. Colorado commercial leases in the Denver metro market frequently include audit rights in institutionally negotiated agreements, making the presence or absence of such a clause a significant abstraction data point.',
    },
    faqs: [
      {
        question: 'How fast is the commercial eviction process in Colorado?',
        answer:
          'Colorado\'s FED process is among the faster judicial eviction procedures in the country. After the notice period expires, a landlord can file in County Court and often obtain a possession judgment within two to four weeks, depending on court calendar and whether the tenant contests the action.',
      },
      {
        question: 'Can a landlord lock out a commercial tenant in Colorado?',
        answer:
          'No. Self-help evictions are illegal in Colorado. A landlord who changes locks, removes a tenant\'s property, or otherwise interferes with possession outside of the FED judicial process faces liability for wrongful eviction damages.',
      },
      {
        question: 'What is the notice period for commercial eviction due to nonpayment in CO?',
        answer:
          'A 10-day written Demand for Compliance or Right to Possession is required under C.R.S. Section 13-40-104(1)(d) before a landlord may file a FED action for nonpayment of commercial rent.',
      },
      {
        question: 'Are commercial security deposits regulated in Colorado?',
        answer:
          'No. Colorado\'s residential security deposit statute does not apply to commercial leases. The amount, return timing, and permissible deductions for commercial security deposits are governed solely by the lease agreement.',
      },
    ],
    metaDescription:
      'Colorado commercial landlord-tenant law overview: Forcible Entry and Detainer, 10-day nonpayment notice, 91-day year-to-year termination, and commercial lease audit rights.',
  },
  {
    state: 'Tennessee',
    stateCode: 'TN',
    slug: 'tennessee',
    overview:
      'Tennessee is a landlord-friendly commercial leasing state with a streamlined eviction process and minimal statutory interference in commercial lease relationships. Commercial tenancies are expressly excluded from the Tennessee Uniform Residential Landlord and Tenant Act (T.C.A. Title 66, Chapter 28), placing commercial lease disputes within the domain of contract law and the general property statutes under T.C.A. Title 66.\n\nTennessee\'s Detainer Warrant process, governed by T.C.A. Title 29, Chapter 18, provides landlords with one of the faster eviction pathways in the Southeast. The state does not impose a commercial rent tax, and Nashville and other major markets lack the municipal overlay complexity seen in gateway cities. Commercial landlords in Tennessee possess a statutory lien on tenant personal property under T.C.A. Section 66-7-109, a powerful leverage tool that reinforces the state\'s generally landlord-favorable posture.',
    keyStatutes: [
      {
        name: 'T.C.A. Title 66 - Property',
        description:
          'The primary body of Tennessee property law governing commercial lease relationships, including landlord remedies, lease construction, and landlord lien rights for unpaid rent.',
        url: 'https://www.tn.gov/lawsandpolicies.html',
      },
      {
        name: 'T.C.A. Title 29, Chapter 18 - Detainer Warrant',
        description:
          'Establishes Tennessee\'s expedited Detainer Warrant process for commercial evictions, providing landlords a relatively fast judicial pathway to recover possession of leased premises.',
        url: 'https://www.tn.gov/lawsandpolicies.html',
      },
      {
        name: 'T.C.A. Section 66-7-109 - Landlord\'s Lien',
        description:
          'Grants commercial landlords a lien on tenant personal property located on the premises for unpaid rent, providing a statutory remedy beyond the eviction process.',
        url: 'https://www.tn.gov/lawsandpolicies.html',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Detainer Warrant judicial process required.' },
      { label: 'Commercial Rent Tax', value: 'None' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '14 days',
        details:
          'Under T.C.A. Section 66-28-505, a 14-day written notice to pay or vacate is required for nonpayment of commercial rent before a landlord may file a Detainer Warrant.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '14 days',
        details:
          'A 14-day notice to remedy or vacate is required for material non-monetary lease violations before commencing Detainer Warrant proceedings in General Sessions Court.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'To terminate a month-to-month commercial tenancy in Tennessee, either party must provide at least 30 days\' prior written notice before the end of the rental period.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; governed entirely by negotiated lease terms.',
      details:
        'Tennessee provides no statutory right for commercial tenants to audit landlord operating expense or CAM reconciliation statements. All audit rights must be expressly negotiated and documented in the lease, including the look-back period, auditor qualification, cost allocation, and record retention requirements. Tennessee courts apply strict contract interpretation principles, meaning audit clause limitations will generally be enforced as written.',
    },
    faqs: [
      {
        question: 'What is the Detainer Warrant process in Tennessee?',
        answer:
          'A Detainer Warrant is Tennessee\'s primary judicial eviction mechanism. After serving the required notice, a landlord files a Detainer Warrant in General Sessions Court. The process can resolve commercial possession disputes in three to six weeks.',
      },
      {
        question: 'Can a Tennessee landlord seize a tenant\'s property for unpaid rent?',
        answer:
          'Tennessee law grants commercial landlords a statutory lien under T.C.A. Section 66-7-109 on tenant personal property at the leased premises for unpaid rent. The landlord must follow the prescribed legal process to enforce this lien and cannot simply seize property without a court order.',
      },
      {
        question: 'What notice is required for commercial eviction due to nonpayment in TN?',
        answer:
          'A 14-day written notice to pay rent or vacate is required before a Tennessee landlord may file a Detainer Warrant for nonpayment of commercial rent.',
      },
      {
        question: 'Is there a commercial rent tax in Nashville or Tennessee?',
        answer:
          'No. Tennessee imposes no state or local commercial rent tax, which is a meaningful cost advantage for commercial tenants operating in Nashville and other Tennessee markets.',
      },
    ],
    metaDescription:
      'Tennessee commercial landlord-tenant law overview: Detainer Warrant eviction process, 14-day nonpayment notice, T.C.A. Section 66-7-109 landlord lien, and commercial lease audit rules.',
  },
  {
    state: 'North Carolina',
    stateCode: 'NC',
    slug: 'north-carolina',
    overview:
      'North Carolina maintains a balanced commercial landlord-tenant framework, with the state generally deferring to the negotiated lease agreement while imposing structured judicial procedures for evictions. Commercial tenancies are excluded from the North Carolina Residential Rental Agreements Act (G.S. Chapter 42, Article 5), which applies only to residential dwellings. Commercial lease relationships operate under common law, G.S. Chapter 42 general provisions, and the lease document itself.\n\nNorth Carolina\'s Summary Ejectment process provides a structured but moderately paced eviction pathway through the General District Court. Self-help evictions are prohibited - landlords must follow the formal Summary Ejectment procedure. The state does not impose a commercial rent tax at the state or local level in Charlotte, Raleigh, or other major markets. North Carolina imposes no statutory cap on commercial security deposits and does not apply the residential Tenant Security Deposit Act (G.S. Chapter 42, Article 6) to commercial leases.',
    keyStatutes: [
      {
        name: 'G.S. Chapter 42 - Landlord and Tenant',
        description:
          'The foundational North Carolina landlord-tenant statute, with commercial tenancies governed by general provisions rather than the residential-specific articles.',
        url: 'https://www.ncleg.gov/Laws/GeneralStatuteSections/Chapter42',
      },
      {
        name: 'G.S. Chapter 42, Article 3 - Summary Ejectment',
        description:
          'Establishes the mandatory judicial procedure for commercial evictions, requiring landlords to file in General District Court after providing proper written notice.',
        url: 'https://www.ncleg.gov/Laws/GeneralStatuteSections/Chapter42',
      },
      {
        name: 'G.S. Section 42-14 - Notice to Quit',
        description:
          'Specifies notice periods required to terminate commercial tenancies, with defaults based on the rental payment interval when the lease is silent on the matter.',
        url: 'https://www.ncleg.gov/Laws/GeneralStatuteSections/Chapter42',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced / Moderate' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Summary Ejectment process required.' },
      { label: 'Commercial Rent Tax', value: 'None' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '10 days',
        details:
          'Under G.S. Section 42-3, a landlord must provide at least 10 days\' written notice of intent to terminate the lease for nonpayment of rent before filing a Summary Ejectment action.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '7 days',
        details:
          'Under G.S. Section 42-14, a month-to-month commercial tenancy requires at least 7 days\' written notice prior to the end of the rental period to effectuate termination.',
      },
      {
        type: 'Year-to-Year Tenancy Termination',
        period: '1 month (30 days)',
        details:
          'To terminate a year-to-year commercial tenancy, at least one month\'s written notice prior to the end of the lease year is required under G.S. Section 42-14.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; entirely governed by negotiated lease terms.',
      details:
        'North Carolina provides no statutory framework granting commercial tenants the right to audit operating expenses, CAM charges, or property tax reconciliation statements. All audit provisions - including the look-back period, auditor qualifications, cost allocation, and the landlord\'s record retention obligations - must be expressly stated in the lease. In the absence of a contractual audit clause, tenants who believe they have been overcharged must pursue breach of contract claims through litigation in the General District Court or Superior Court.',
    },
    faqs: [
      {
        question: 'What is the Summary Ejectment process in North Carolina?',
        answer:
          'Summary Ejectment is North Carolina\'s mandatory judicial eviction procedure. After the required notice period expires, the landlord files a complaint in General District Court. The process typically results in a hearing within one to three weeks, making it faster than many other states.',
      },
      {
        question: 'What notice is required for commercial eviction in North Carolina?',
        answer:
          'For nonpayment of rent, a 10-day written notice is required under G.S. Section 42-3. For lease termination, notice periods range from 7 days for month-to-month to 1 month for year-to-year tenancies under G.S. Section 42-14.',
      },
      {
        question: 'Are commercial security deposits regulated in North Carolina?',
        answer:
          'No. The North Carolina Tenant Security Deposit Act applies only to residential leases. Commercial security deposits are governed entirely by the lease agreement, including amount, permitted deductions, and return timeline.',
      },
      {
        question: 'Does North Carolina have a commercial rent tax?',
        answer:
          'No. North Carolina does not impose a commercial rent tax at the state or local level, making it less costly from a tax compliance standpoint than commercial markets in states like Florida.',
      },
    ],
    metaDescription:
      'North Carolina commercial landlord-tenant law overview: Summary Ejectment, notice to quit periods under G.S. Chapter 42, and commercial lease audit rights.',
  },
  {
    state: 'Michigan',
    stateCode: 'MI',
    slug: 'michigan',
    overview:
      'Michigan commercial landlord-tenant law is primarily contract-driven and operates under a framework that favors enforcement of the negotiated lease agreement with relatively limited statutory intervention. Commercial tenancies are not covered by the Michigan Truth in Renting Act or the residential Anti-Lockout Statute, though Michigan courts have broadly prohibited self-help commercial evictions under common law and the general prohibition on breach of the peace.\n\nMichigan\'s Summary Proceedings Act (M.C.L. Chapter 600, Subchapter 57) governs commercial evictions, providing a structured but reasonably expeditious pathway through the District Court system. Detroit and other major Michigan markets do not impose a commercial rent tax. The state is notable for its robust commercial landlord lien rights and for M.C.L. 554.134, which establishes default notice periods for lease termination when the commercial lease is silent.',
    keyStatutes: [
      {
        name: 'M.C.L. Chapter 600, Subchapter 57 - Summary Proceedings',
        description:
          'Governs the judicial process for recovering possession of commercial premises, requiring mandatory written notice and a formal District Court filing before eviction can proceed.',
        url: 'https://www.legislature.mi.gov',
      },
      {
        name: 'M.C.L. 554.134 - Termination of Tenancy',
        description:
          'Establishes default notice periods for terminating commercial tenancies in Michigan when the lease is silent, based on the rental payment frequency.',
        url: 'https://www.legislature.mi.gov',
      },
      {
        name: 'M.C.L. 600.5714 - Summary Proceedings, Grounds',
        description:
          'Specifies the grounds on which a landlord may bring a Summary Proceedings action for possession of commercial real property, including nonpayment and lease violation.',
        url: 'https://www.legislature.mi.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced / Contract-Driven' },
      { label: 'Self-Help Evictions', value: 'Prohibited under Michigan common law' },
      { label: 'Commercial Rent Tax', value: 'None' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '7 days',
        details:
          'Under M.C.L. 600.5714, a commercial landlord must serve a written 7-day Notice to Quit for nonpayment of rent before filing a Summary Proceedings action in District Court.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '30 days',
        details:
          'For material non-monetary lease violations, Michigan requires at least 30 days\' written notice to cure the violation or vacate before the landlord may commence Summary Proceedings.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '1 month (30 days)',
        details:
          'Under M.C.L. 554.134, to terminate a month-to-month commercial tenancy, either party must provide at least one month\'s prior written notice before the end of the rental period.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; all audit provisions must be negotiated in the lease.',
      details:
        'Michigan does not provide statutory audit rights for commercial tenants with respect to CAM charges, operating expenses, or property tax reconciliations. The right to audit, the permissible look-back period, required auditor credentials, cost allocation, and record retention obligations are all matters of contract. Michigan commercial practitioners commonly negotiate 1–3 year look-back periods with CPA audit requirements in institutional lease forms.',
    },
    faqs: [
      {
        question: 'Can a Michigan landlord lock out a commercial tenant for nonpayment?',
        answer:
          'No. Michigan courts have broadly held that self-help evictions are prohibited, even for commercial tenancies. A landlord who changes locks or removes a tenant\'s property without a court order faces significant liability for wrongful eviction.',
      },
      {
        question: 'What is the notice required for commercial eviction in Michigan?',
        answer:
          'A 7-day written Notice to Quit is required for nonpayment of commercial rent under M.C.L. 600.5714 before the landlord may file a Summary Proceedings action in District Court.',
      },
      {
        question: 'How long does a commercial eviction take in Michigan?',
        answer:
          'After the notice period expires and the landlord files in District Court, a hearing is typically scheduled within two to four weeks. If the tenant does not contest the action, the total process from notice to possession may take three to six weeks.',
      },
      {
        question: 'Are commercial security deposits regulated in Michigan?',
        answer:
          'No. Michigan\'s Security Deposit Act (M.C.L. 554.601 et seq.) applies only to residential tenancies. Commercial security deposit amounts and return procedures are governed entirely by the lease agreement.',
      },
    ],
    metaDescription:
      'Michigan commercial landlord-tenant law overview: M.C.L. 600.5714 Summary Proceedings, 7-day nonpayment notice, and commercial lease audit rights.',
  },
  {
    state: 'Maryland',
    stateCode: 'MD',
    slug: 'maryland',
    overview:
      'Maryland is notable for having one of the few dedicated state-level Commercial Landlord-Tenant Acts in the nation. The Maryland Commercial Landlord-Tenant Act, codified at Md. Code, Real Property Article, Sections 14-2001 through 14-2012, provides a comprehensive statutory framework governing commercial lease relationships that goes well beyond the common law baseline found in most states. This framework imposes specific obligations on both landlords and tenants, including mandatory notice requirements, prohibited lease provisions, and defined remedies.\n\nMaryland maintains a separate well-developed framework for commercial evictions through Real Property Article Sections 8-401 through 8-402. The state prohibits commercial self-help evictions. Baltimore City has historically had additional local commercial real estate overlays. Maryland\'s court system provides a relatively tenant-favorable forum compared to other Mid-Atlantic states, with judges scrutinizing harsh landlord remedies with heightened care.',
    keyStatutes: [
      {
        name: 'Md. Code, Real Property Article, Sections 14-2001 through 14-2012 - Commercial Landlord-Tenant Act',
        description:
          'Maryland\'s dedicated Commercial Landlord-Tenant Act governing commercial lease requirements, prohibited provisions, and defined landlord and tenant remedies beyond what common law provides.',
        url: 'https://mgaleg.maryland.gov',
      },
      {
        name: 'Md. Code, Real Property Article, Section 8-401 - Tenant Holding Over',
        description:
          'Establishes procedures and remedies for evicting commercial tenants who hold over after lease expiration or breach material lease obligations.',
        url: 'https://mgaleg.maryland.gov',
      },
      {
        name: 'Md. Code, Real Property Article, Section 8-211 - Distress for Rent',
        description:
          'Governs the historical distress remedy for unpaid rent in Maryland, subject to significant procedural constraints for commercial landlords.',
        url: 'https://mgaleg.maryland.gov',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Moderate / Has Dedicated Commercial Landlord-Tenant Act' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Judicial eviction process required.' },
      { label: 'Commercial Rent Tax', value: 'None at state level; local business taxes may apply' },
      { label: 'Statutory Audit Rights', value: 'Limited statutory framework; full scope governed by lease.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap under the Commercial Landlord-Tenant Act' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '10 days',
        details:
          'Under the Maryland Commercial Landlord-Tenant Act, a landlord must provide at least 10 days\' written notice before commencing a Failure to Pay Rent action in District Court.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'To terminate a month-to-month commercial tenancy in Maryland, at least 30 days\' written notice is required under common law and Real Property Article provisions.',
      },
      {
        type: 'Fixed-Term Lease Termination',
        period: 'As specified in lease',
        details:
          'For fixed-term commercial leases, the termination notice period is governed by the lease agreement. Maryland courts enforce written lease notice requirements strictly.',
      },
    ],
    auditRights: {
      summary: 'Maryland\'s Commercial Act provides a statutory foundation; full scope governed by lease terms.',
      details:
        'The Maryland Commercial Landlord-Tenant Act (Real Property Article Sections 14-2001 through 14-2012) imposes certain transparency obligations on commercial landlords regarding expense reconciliation, providing a stronger statutory baseline than pure common law states. However, the full scope of audit rights - including look-back period, auditor qualifications, and cost allocation - remains a matter of lease negotiation. Maryland commercial tenants have more statutory support when challenging landlord expense statements than tenants in states that rely solely on common law contract principles.',
    },
    faqs: [
      {
        question: 'What makes Maryland\'s commercial landlord-tenant law unique?',
        answer:
          'Maryland is one of the few states with a dedicated Commercial Landlord-Tenant Act (Real Property Article Sections 14-2001 through 14-2012) that provides specific statutory protections and obligations beyond common law, including prohibited lease provisions and defined remedies for both parties.',
      },
      {
        question: 'What notice is required for commercial eviction in Maryland?',
        answer:
          'For nonpayment of rent, a 10-day written notice is required before filing a Failure to Pay Rent action in Maryland District Court. For other lease violations, the notice period is typically governed by the lease terms.',
      },
      {
        question: 'Can a Maryland landlord use distress for rent in a commercial lease?',
        answer:
          'Maryland\'s distress remedy under Real Property Article Section 8-211 is subject to significant procedural constraints and is rarely used in modern commercial practice. Commercial landlords generally pursue judicial eviction through the District Court system.',
      },
      {
        question: 'Are there prohibited lease provisions under Maryland\'s Commercial Act?',
        answer:
          'Yes. The Maryland Commercial Landlord-Tenant Act identifies provisions that cannot be included in or waived by commercial lease agreements, providing commercial tenants with a statutory floor of protections that exists independently of the negotiated lease terms.',
      },
    ],
    metaDescription:
      'Maryland Commercial Landlord-Tenant Act: Real Property Article Sections 14-2001 through 14-2012, 10-day nonpayment notice, distress for rent, and commercial lease audit rights.',
  },
  {
    state: 'Minnesota',
    stateCode: 'MN',
    slug: 'minnesota',
    overview:
      'Minnesota commercial landlord-tenant law occupies a moderate, contract-driven position with meaningful judicial oversight of the eviction process. Commercial tenancies are excluded from the Minnesota Residential Landlord and Tenant Act (Minn. Stat. Chapter 504B), though Chapter 504B\'s general provisions governing eviction procedures apply to commercial tenancies as well. Minnesota courts take self-help eviction prohibitions seriously and impose significant liability on landlords who attempt to bypass the judicial Eviction Action process.\n\nThe Eviction Action (formerly Unlawful Detainer) process under Minn. Stat. Chapter 504B provides the exclusive pathway for commercial landlords to recover possession. Minnesota does not impose a commercial rent tax at the state or Minneapolis/St. Paul municipal level. The state\'s well-developed tenant protection philosophy in the residential space has produced a commercial leasing environment where courts scrutinize landlord conduct and enforce implied duties even where not expressly codified.',
    keyStatutes: [
      {
        name: 'Minn. Stat. Chapter 504B - Landlord and Tenant',
        description:
          'The primary Minnesota landlord-tenant statute, governing eviction procedures, prohibited practices, and landlord obligations applicable to commercial tenancies.',
        url: 'https://www.revisor.mn.gov/statutes/cite/504B',
      },
      {
        name: 'Minn. Stat. Section 504B.285 - Eviction Action (Recovery of Premises)',
        description:
          'Establishes the grounds and procedural requirements for commercial landlords to file an Eviction Action for possession, including mandatory prior written notice.',
        url: 'https://www.revisor.mn.gov/statutes/cite/504B.285',
      },
      {
        name: 'Minn. Stat. Section 504B.291 - Notice to Vacate',
        description:
          'Governs the notice periods required before a commercial landlord may file an Eviction Action, including the standard and expedited notice options.',
        url: 'https://www.revisor.mn.gov/statutes/cite/504B.291',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced / Moderate' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Eviction Action under Minn. Stat. Chapter 504B required.' },
      { label: 'Commercial Rent Tax', value: 'None at state or Minneapolis/St. Paul municipal level' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '14 days',
        details:
          'Under Minn. Stat. Section 504B.291, a commercial landlord must serve at least a 14-day written notice to pay rent or vacate before filing an Eviction Action for nonpayment of commercial rent.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: 'Reasonable time (as specified in lease)',
        details:
          'For non-monetary lease violations, Minnesota requires a reasonable opportunity to cure before filing an Eviction Action. The lease agreement typically defines the cure period; courts assess reasonableness when the lease is silent.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'To terminate a month-to-month commercial tenancy in Minnesota, either party must provide at least 30 days\' written notice prior to the end of the rental period.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; all audit provisions must be negotiated in the lease.',
      details:
        'Minnesota provides no statutory mechanism granting commercial tenants the right to audit landlord operating expenses or CAM charges. The full scope of audit rights - including the look-back period, auditor qualifications, cost allocation, and record retention - must be negotiated and expressly documented in the lease. Minnesota commercial leases in the Twin Cities market commonly include audit rights in institutionally negotiated agreements, and the presence or absence of an audit clause is a key abstraction data point.',
    },
    faqs: [
      {
        question: 'What is the commercial eviction process in Minnesota?',
        answer:
          'A landlord must first serve the required written notice (typically 14 days for nonpayment). After the notice period expires without compliance, the landlord files an Eviction Action in Conciliation Court or District Court. Minnesota\'s process typically resolves in two to four weeks for uncontested cases.',
      },
      {
        question: 'Can a Minnesota landlord lock out a commercial tenant?',
        answer:
          'No. Minnesota strictly prohibits self-help commercial evictions. A landlord who changes locks, removes utilities, or otherwise interferes with a tenant\'s possession without a court order faces significant damages under Minn. Stat. Chapter 504B.',
      },
      {
        question: 'What notice is required for nonpayment eviction in Minnesota?',
        answer:
          'Under Minn. Stat. Section 504B.291, a 14-day written notice to pay rent or vacate is required before a commercial landlord may file an Eviction Action for nonpayment of rent.',
      },
      {
        question: 'Are commercial security deposits regulated in Minnesota?',
        answer:
          'No. Minnesota\'s security deposit regulations under Minn. Stat. Section 504B.178 apply only to residential tenancies. Commercial security deposit amounts and return procedures are governed entirely by the lease agreement.',
      },
    ],
    metaDescription:
      'Minnesota commercial landlord-tenant law overview: Minn. Stat. Chapter 504B Eviction Action, 14-day nonpayment notice, and commercial lease audit rights in Minneapolis.',
  },
  {
    state: 'Nevada',
    stateCode: 'NV',
    slug: 'nevada',
    overview:
      'Nevada is a landlord-friendly commercial leasing state with a notably rapid summary eviction process and minimal statutory interference in commercial lease terms. Commercial tenancies are expressly excluded from the Nevada Landlord and Tenant Act (NRS Chapter 118A), which applies only to residential dwellings. Commercial lease relationships are governed by common law contract principles, NRS Chapter 40 (actions for possession), and the negotiated lease document.\n\nNevada is distinguished by possessing one of the fastest commercial eviction procedures in the United States. After expiration of the required notice, a landlord can obtain a Summary Eviction order from a Justice Court in as few as five to seven business days - far faster than most states. Nevada does not impose a commercial rent tax at the state or Clark County (Las Vegas) level. The state\'s strong pro-landlord posture and streamlined court process make the abstracted lease terms particularly consequential for tenants in this market.',
    keyStatutes: [
      {
        name: 'NRS Chapter 40 - Actions and Proceedings in Particular Cases',
        description:
          'Governs the summary eviction process for commercial tenancies in Nevada, providing the legal framework for landlords to recover possession through expedited Justice Court proceedings.',
        url: 'https://www.leg.state.nv.us/NRS/NRS-040.html',
      },
      {
        name: 'NRS Chapter 118A - Landlord and Tenant: Dwellings',
        description:
          'Explicitly excludes commercial tenancies from its protective scope, confirming that commercial leases in Nevada are governed by contract law rather than statutory tenant protections.',
        url: 'https://www.leg.state.nv.us/NRS/NRS-118A.html',
      },
      {
        name: 'NRS Section 40.2512 - Unlawful Detainer, Commercial',
        description:
          'Defines the specific grounds for commercial unlawful detainer and the corresponding notice periods that must be served before a Summary Eviction filing.',
        url: 'https://www.leg.state.nv.us/NRS/NRS-040.html',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Summary Eviction through Justice Court required.' },
      { label: 'Commercial Rent Tax', value: 'None at state or major municipal level' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '5 days',
        details:
          'Under NRS Section 40.2512, a commercial landlord must serve a 5-day written Notice to Pay or Quit before filing a Summary Eviction action for nonpayment of commercial rent.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '5 days',
        details:
          'For material non-monetary lease violations, a 5-day Notice to Perform or Quit must be served before commencing Summary Eviction proceedings in Nevada Justice Court.',
      },
      {
        type: 'Month-to-Month Termination (without cause)',
        period: '30 days',
        details:
          'To terminate a month-to-month commercial tenancy in Nevada without cause, either party must provide at least 30 days\' prior written notice before the end of the rental period.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; entirely governed by negotiated lease terms.',
      details:
        'Nevada imposes no statutory obligation on commercial landlords to permit tenant audits of operating expenses or CAM charges. All audit rights must be expressly negotiated in the lease agreement, covering the look-back period, auditor qualifications, cost allocation, and record retention obligations. The absence of statutory audit protections in Nevada, combined with the state\'s strong pro-landlord posture, makes careful lease negotiation and abstraction of audit clause terms especially important for commercial tenants.',
    },
    faqs: [
      {
        question: 'How fast is the commercial eviction process in Nevada?',
        answer:
          'Nevada has one of the fastest commercial eviction processes in the country. After the 5-day notice period expires, a landlord files a Summary Eviction complaint in Justice Court and can often receive a possession order within five to seven business days, assuming the tenant does not contest the filing.',
      },
      {
        question: 'Can a Nevada landlord lock out a commercial tenant?',
        answer:
          'No. Nevada prohibits self-help evictions for commercial premises. However, given the speed of Nevada\'s Summary Eviction process, landlords have a rapid judicial remedy available that makes self-help unnecessary and legally risky.',
      },
      {
        question: 'What notice is required for commercial eviction in Nevada?',
        answer:
          'For nonpayment of rent, a 5-day Notice to Pay or Quit is required under NRS Section 40.2512 before a landlord may file a Summary Eviction action. For no-fault month-to-month terminations, 30 days\' written notice is required.',
      },
      {
        question: 'Are commercial security deposits regulated in Nevada?',
        answer:
          'No. NRS Chapter 118A\'s residential security deposit requirements do not apply to commercial leases. Commercial deposit amounts, return timelines, and permissible deductions are governed entirely by the lease agreement.',
      },
    ],
    metaDescription:
      'Nevada commercial landlord-tenant law overview: NRS Chapter 40 Summary Eviction, 5-day nonpayment notice, fast-track eviction process, and commercial lease audit rights.',
  },
  {
    state: 'Indiana',
    stateCode: 'IN',
    slug: 'indiana',
    overview:
      'Indiana is a landlord-friendly commercial leasing state with streamlined eviction procedures and minimal statutory oversight of commercial lease terms. Commercial tenancies are excluded from the Indiana Code\'s residential landlord-tenant provisions (I.C. Title 32, Article 31) and are governed instead by common law contract principles, general property statutes under I.C. Title 32, and the negotiated lease document.\n\nIndiana\'s Small Claims and eviction courts handle commercial possession disputes through a relatively fast-track process. The state does not impose a commercial rent tax, and Indianapolis and other major Indiana markets lack the regulatory complexity of gateway cities. Indiana courts historically enforce commercial leases as written, with limited equitable deviation from unambiguous contract terms, reinforcing the importance of thorough lease abstraction in this jurisdiction.',
    keyStatutes: [
      {
        name: 'I.C. 32-30-3 - Actions to Recover Real Property',
        description:
          'Governs the judicial process for commercial landlords to recover possession of leased premises through ejectment or summary proceedings in Indiana courts.',
        url: 'https://iga.in.gov/laws/2023/ic/titles/32',
      },
      {
        name: 'I.C. 32-31 - Landlord-Tenant Relations',
        description:
          'Indiana\'s landlord-tenant statute, which primarily governs residential tenancies but provides the broader statutory context for commercial lease law in Indiana.',
        url: 'https://iga.in.gov/laws/2023/ic/titles/32',
      },
      {
        name: 'I.C. 32-31-1-8 - Notice to Quit',
        description:
          'Establishes statutory default notice periods for terminating commercial tenancies in Indiana when the lease agreement is silent on notice requirements.',
        url: 'https://iga.in.gov/laws/2023/ic/titles/32',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Judicial eviction process required.' },
      { label: 'Commercial Rent Tax', value: 'None' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '10 days',
        details:
          'Under I.C. 32-31-1-8, a commercial landlord must serve a 10-day written notice to pay or vacate before filing an action for possession for nonpayment of commercial rent.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '10 days',
        details:
          'For material non-monetary lease violations, Indiana requires a 10-day notice to cure or vacate before the landlord may commence judicial eviction proceedings.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '1 month (30 days)',
        details:
          'To terminate a month-to-month commercial tenancy in Indiana, either party must provide at least one month\'s prior written notice before the end of the rental period.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; governed entirely by negotiated lease terms.',
      details:
        'Indiana provides no statutory right for commercial tenants to audit landlord operating expenses or CAM charges. The right to audit, including look-back period, auditor qualifications, and cost allocation, must be explicitly negotiated and documented in the lease. Indiana courts apply strict contractual interpretation, and in the absence of an express audit clause, tenants have limited remedies for challenging expense reconciliation statements outside of formal breach of contract litigation.',
    },
    faqs: [
      {
        question: 'What is the commercial eviction process in Indiana?',
        answer:
          'After serving the required 10-day notice, an Indiana commercial landlord may file an eviction action in Small Claims Court or Circuit/Superior Court. Indiana\'s process is relatively straightforward and uncontested cases can typically be resolved in two to four weeks.',
      },
      {
        question: 'Can an Indiana landlord lock out a commercial tenant?',
        answer:
          'No. Indiana prohibits self-help commercial evictions. A landlord who changes locks or removes a tenant\'s property without a court order faces liability for wrongful eviction and related damages.',
      },
      {
        question: 'What notice is required for commercial eviction in Indiana?',
        answer:
          'A 10-day written notice to pay rent or vacate is required under I.C. 32-31-1-8 before an Indiana commercial landlord may file an action for possession based on nonpayment of rent.',
      },
      {
        question: 'Are commercial security deposits regulated in Indiana?',
        answer:
          'No. Indiana\'s residential security deposit statutes do not apply to commercial leases. Commercial deposit amounts, return timelines, and permissible deductions are governed entirely by the terms of the commercial lease agreement.',
      },
    ],
    metaDescription:
      'Indiana commercial landlord-tenant law overview: I.C. 32-31 eviction procedures, 10-day nonpayment notice, and commercial lease audit rights in Indianapolis.',
  },
  {
    state: 'Oregon',
    stateCode: 'OR',
    slug: 'oregon',
    overview:
      'Oregon is a tenant-protective commercial leasing jurisdiction compared to most Western states, reflecting the state\'s broader regulatory philosophy around housing and business tenancies. Commercial tenancies are governed by the Oregon Landlord-Tenant Act (ORS Chapter 90) only for residential purposes; commercial tenancies instead fall under ORS Chapter 91 and common law. However, Oregon courts have developed a commercial landlord-tenant jurisprudence that imposes meaningful constraints on landlord remedies.\n\nOregon explicitly prohibits commercial self-help evictions. Portland and other Oregon cities do not impose a commercial rent tax. Oregon is notable for the Forcible Entry and Wrongful Detainer (FED) statute (ORS Chapter 105), which provides the exclusive judicial pathway for commercial evictions. Oregon\'s eviction timeline is longer than states like Nevada, and courts will scrutinize lease compliance carefully. Portland\'s generally tenant-friendly political environment has produced several local commercial tenant protection measures that practitioners must monitor alongside state law.',
    keyStatutes: [
      {
        name: 'ORS Chapter 91 - Tenancy',
        description:
          'The primary Oregon statute governing commercial tenancies, establishing default rules for notice periods, lease termination, and landlord-tenant obligations in the absence of contrary lease terms.',
        url: 'https://www.oregonlegislature.gov/bills_laws/ors/ors091.html',
      },
      {
        name: 'ORS Chapter 105 - Property Rights and Transactions',
        description:
          'Governs Forcible Entry and Wrongful Detainer (FED) proceedings, the exclusive judicial mechanism for commercial evictions in Oregon.',
        url: 'https://www.oregonlegislature.gov/bills_laws/ors/ors105.html',
      },
      {
        name: 'ORS Section 91.090 - Termination of Tenancy at Will',
        description:
          'Establishes notice requirements for terminating Oregon commercial tenancies at will and month-to-month estates when the lease is silent.',
        url: 'https://www.oregonlegislature.gov/bills_laws/ors/ors091.html',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Tenant-Protective (relative to regional peers)' },
      { label: 'Self-Help Evictions', value: 'Prohibited. FED process under ORS Chapter 105 required.' },
      { label: 'Commercial Rent Tax', value: 'None at state or Portland municipal level' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '10 days',
        details:
          'Under ORS Chapter 91, a commercial landlord must serve a 10-day written notice to pay rent or vacate before filing a Forcible Entry and Wrongful Detainer (FED) action for nonpayment.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '30 days',
        details:
          'For material non-monetary lease violations, Oregon requires a 30-day notice to cure or vacate before the landlord may commence FED proceedings.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'Under ORS Section 91.090, to terminate a month-to-month commercial tenancy, either party must provide at least 30 days\' prior written notice before the end of the rental period.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; all audit provisions must be negotiated in the lease.',
      details:
        'Oregon provides no statutory right for commercial tenants to audit landlord CAM or operating expense reconciliation statements. All audit rights - including the look-back period, auditor qualifications, cost allocation, and record retention obligations - must be expressly stated in the lease. Oregon\'s tenant-protective judicial climate may provide some support for tenants challenging materially inaccurate expense statements through breach of contract litigation, but no statutory mechanism exists independent of the lease.',
    },
    faqs: [
      {
        question: 'Can a Portland or Oregon commercial landlord lock out a tenant?',
        answer:
          'No. Oregon strictly prohibits commercial self-help evictions. A landlord who changes locks, removes utilities, or otherwise interferes with a tenant\'s possession without a court order faces significant liability under Oregon law.',
      },
      {
        question: 'What is the FED process for commercial evictions in Oregon?',
        answer:
          'After the required notice period expires, a commercial landlord files a Forcible Entry and Wrongful Detainer (FED) action in Oregon Circuit Court. Oregon\'s commercial eviction process is lengthier than states like Nevada, typically taking four to eight weeks for uncontested cases.',
      },
      {
        question: 'What notice is required for commercial nonpayment eviction in Oregon?',
        answer:
          'A 10-day written notice to pay rent or vacate is required before an Oregon commercial landlord may file a FED action for nonpayment of commercial rent.',
      },
      {
        question: 'Are there local commercial tenant protections in Portland, Oregon?',
        answer:
          'Portland has historically enacted local measures addressing commercial tenant concerns, particularly for small businesses. Practitioners must monitor Portland City Code in addition to state law when advising commercial tenants in the Portland metro area.',
      },
    ],
    metaDescription:
      'Oregon commercial landlord-tenant law overview: ORS Chapter 91, FED eviction process, 10-day nonpayment notice, Portland tenant protections, and commercial lease audit rights.',
  },
  {
    state: 'Wisconsin',
    stateCode: 'WI',
    slug: 'wisconsin',
    overview:
      'Wisconsin commercial landlord-tenant law is primarily contract-driven, with the state deferring to the negotiated lease agreement in most commercial disputes. Commercial tenancies are governed by Wis. Stat. Chapter 704, which covers both residential and commercial tenancies but provides significantly more flexibility for commercial parties. Wisconsin courts enforce commercial lease terms as written with limited equitable intervention, reflecting the state\'s presumption that commercial tenants are sophisticated actors.\n\nWisconsin prohibits commercial self-help evictions. Landlords must use the Eviction Action process under Wis. Stat. Chapter 799 (Small Claims) or Chapter 704 to recover possession of commercial premises. The state does not impose a commercial rent tax at the state or Milwaukee municipal level. Wisconsin\'s commercial eviction process is relatively efficient by Midwest standards, with uncontested cases often resolved within three to five weeks of the initial notice.',
    keyStatutes: [
      {
        name: 'Wis. Stat. Chapter 704 - Landlord and Tenant',
        description:
          'Wisconsin\'s primary landlord-tenant statute governing both residential and commercial tenancies, including lease termination, notice requirements, and landlord and tenant remedies.',
        url: 'https://docs.legis.wisconsin.gov/statutes/statutes/704',
      },
      {
        name: 'Wis. Stat. Section 704.17 - Notice Terminating Tenancy',
        description:
          'Establishes the notice periods required to terminate commercial tenancies in Wisconsin, with defaults based on the rental payment interval when the lease is silent.',
        url: 'https://docs.legis.wisconsin.gov/statutes/statutes/704/17',
      },
      {
        name: 'Wis. Stat. Chapter 799 - Small Claims Procedure',
        description:
          'Governs the Small Claims court process commonly used for commercial eviction actions in Wisconsin, providing a relatively streamlined judicial pathway for possession.',
        url: 'https://docs.legis.wisconsin.gov/statutes/statutes/799',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced / Contract-Driven' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Eviction Action process required.' },
      { label: 'Commercial Rent Tax', value: 'None' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '5 days',
        details:
          'Under Wis. Stat. Section 704.17(2), a commercial landlord must serve a 5-day written notice to pay rent or vacate before commencing an Eviction Action for nonpayment.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '5 days (cure) / 30 days (termination)',
        details:
          'For material non-monetary lease violations, Wis. Stat. Section 704.17 requires a 5-day notice to cure for minor violations or a longer termination notice for repeated or uncurable violations.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '28 days',
        details:
          'Under Wis. Stat. Section 704.19, at least 28 days\' written notice prior to the end of the rental period is required to terminate a month-to-month commercial tenancy in Wisconsin.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; governed entirely by negotiated lease terms.',
      details:
        'Wisconsin provides no statutory framework granting commercial tenants the right to audit landlord operating expenses or CAM charges. All audit provisions - including the look-back period, auditor qualifications, cost allocation, and record retention obligations - must be explicitly negotiated and documented in the commercial lease. Tenants who lack a contractual audit clause must pursue breach of contract claims through litigation to challenge expense reconciliation statements.',
    },
    faqs: [
      {
        question: 'What is the commercial eviction process in Wisconsin?',
        answer:
          'After serving the required notice (5 days for nonpayment), a Wisconsin commercial landlord files an Eviction Action in Small Claims Court or Circuit Court. Uncontested cases are typically resolved within three to five weeks of the initial notice.',
      },
      {
        question: 'Can a Wisconsin landlord lock out a commercial tenant?',
        answer:
          'No. Wisconsin prohibits self-help commercial evictions. A landlord who changes locks or removes a tenant\'s property without a court order faces significant damages under Wis. Stat. Chapter 704.',
      },
      {
        question: 'What notice is required for commercial eviction in Wisconsin?',
        answer:
          'A 5-day written notice to pay rent or vacate is required under Wis. Stat. Section 704.17(2) before a Wisconsin commercial landlord may file an Eviction Action for nonpayment of rent.',
      },
      {
        question: 'Are commercial security deposits regulated in Wisconsin?',
        answer:
          'No. Wisconsin\'s residential security deposit regulations do not apply to commercial leases. Commercial deposit amounts and return procedures are governed entirely by the lease agreement.',
      },
    ],
    metaDescription:
      'Wisconsin commercial landlord-tenant law overview: Wis. Stat. Chapter 704, 5-day nonpayment notice, eviction procedures, and commercial lease audit rights in Milwaukee.',
  },
  {
    state: 'Missouri',
    stateCode: 'MO',
    slug: 'missouri',
    overview:
      'Missouri is a landlord-friendly commercial leasing state with minimal statutory intervention in commercial lease relationships. Commercial tenancies are not covered by Missouri\'s residential landlord-tenant law framework and are governed primarily by common law, general property statutes under Missouri Revised Statutes (RSMo) Chapter 441, and the negotiated lease document. Missouri courts strongly enforce commercial lease terms as written, consistent with the state\'s general presumption of commercial contract freedom.\n\nMissouri does not permit commercial self-help evictions. Landlords must follow the Unlawful Detainer process under RSMo Chapter 534 to recover possession of commercial premises. The state does not impose a commercial rent tax at the state or St. Louis/Kansas City municipal level. Missouri is notable for its landlord lien rights under RSMo Chapter 441, which grant commercial landlords substantial leverage over tenant personal property for unpaid rent - a powerful feature that must be carefully addressed in commercial lease abstractions.',
    keyStatutes: [
      {
        name: 'RSMo Chapter 441 - Landlord and Tenant',
        description:
          'Missouri\'s primary landlord-tenant statute governing commercial lease relationships, landlord lien rights on tenant property, and lease termination procedures.',
        url: 'https://revisor.mo.gov/main/OneChapter.aspx?chapter=441',
      },
      {
        name: 'RSMo Chapter 534 - Unlawful Detainer',
        description:
          'Provides the judicial framework for commercial evictions in Missouri, requiring mandatory notice before filing in Associate Circuit Court.',
        url: 'https://revisor.mo.gov/main/OneChapter.aspx?chapter=534',
      },
      {
        name: 'RSMo Section 441.060 - Landlord\'s Lien',
        description:
          'Grants commercial landlords a statutory lien on tenant personal property for unpaid rent, a significant leverage tool in Missouri commercial lease enforcement.',
        url: 'https://revisor.mo.gov/main/OneChapter.aspx?chapter=441',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Unlawful Detainer process required.' },
      { label: 'Commercial Rent Tax', value: 'None at state or major municipal level' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: 'Immediate (lease forfeiture) / per lease terms',
        details:
          'Missouri law allows commercial leases to include forfeiture clauses that may be triggered immediately upon nonpayment, though most leases provide a cure period. When the lease is silent, a landlord must demand rent before filing an Unlawful Detainer action.',
      },
      {
        type: 'Lease Termination (Month-to-Month)',
        period: '1 month (30 days)',
        details:
          'Under RSMo Chapter 441, to terminate a month-to-month commercial tenancy, either party must provide at least one month\'s prior written notice before the end of the rental period.',
      },
      {
        type: 'Year-to-Year Tenancy Termination',
        period: '3 months',
        details:
          'To terminate a year-to-year commercial tenancy in Missouri, at least 3 months\' written notice prior to the lease anniversary date is required.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; governed entirely by negotiated lease terms.',
      details:
        'Missouri provides no statutory mechanism granting commercial tenants the right to audit landlord operating expenses or CAM charges. All audit rights must be expressly negotiated in the lease, including the look-back period, auditor qualifications, cost allocation, and record retention obligations. Missouri courts strictly enforce the terms of commercial contracts, meaning audit clauses and their limitations will generally be applied as written without equitable modification.',
    },
    faqs: [
      {
        question: 'What is the Unlawful Detainer process for commercial tenants in Missouri?',
        answer:
          'After serving required notice and the tenant fails to comply, a Missouri commercial landlord files an Unlawful Detainer action in Associate Circuit Court. The process is relatively efficient, with uncontested cases often resolving in three to five weeks.',
      },
      {
        question: 'Can a Missouri landlord seize a commercial tenant\'s property for unpaid rent?',
        answer:
          'Missouri law grants commercial landlords a statutory lien under RSMo Section 441.060 on tenant personal property for unpaid rent. The landlord must follow prescribed legal procedures to enforce this lien and cannot seize property without court authorization.',
      },
      {
        question: 'What notice is required for commercial lease termination in Missouri?',
        answer:
          'For month-to-month tenancies, one month\'s prior written notice is required under RSMo Chapter 441. For year-to-year tenancies, at least 3 months\' prior notice is required.',
      },
      {
        question: 'Are commercial security deposits regulated in Missouri?',
        answer:
          'No. Missouri\'s residential security deposit statute does not apply to commercial leases. Commercial deposit amounts, return timelines, and permissible deductions are governed entirely by the lease agreement.',
      },
    ],
    metaDescription:
      'Missouri commercial landlord-tenant law overview: RSMo Chapter 441 and 534, Unlawful Detainer process, landlord lien rights, and commercial lease audit rights.',
  },
  {
    state: 'Connecticut',
    stateCode: 'CT',
    slug: 'connecticut',
    overview:
      'Connecticut is a moderately tenant-protective commercial leasing jurisdiction, reflecting the state\'s broader regulatory philosophy. Commercial tenancies are excluded from the Connecticut Landlord-Tenant Act (Conn. Gen. Stat. Chapter 830), which applies only to residential properties. Commercial lease relationships in Connecticut are governed by common law contract principles, the general property statutes, and the negotiated lease document, with the state\'s courts applying a consistent body of commercial real estate case law.\n\nConnecticut prohibits commercial self-help evictions. Landlords must use the Summary Process (eviction) procedure under Conn. Gen. Stat. Chapter 833 to recover possession. Connecticut does not impose a commercial rent tax at the state or Hartford/New Haven level. The state\'s courts have historically shown willingness to apply equitable doctrines to commercial lease disputes in ways that can benefit commercial tenants facing particularly harsh or one-sided lease provisions.',
    keyStatutes: [
      {
        name: 'Conn. Gen. Stat. Chapter 833 - Summary Process',
        description:
          'Establishes the exclusive judicial procedure for commercial evictions in Connecticut, requiring mandatory written notice before a landlord may file a Summary Process action.',
        url: 'https://www.cga.ct.gov/current/pub/title_47.htm',
      },
      {
        name: 'Conn. Gen. Stat. Section 47a-23 - Notice to Quit',
        description:
          'Specifies the notice to quit requirements applicable to commercial tenancies before a landlord may commence a Summary Process action for possession.',
        url: 'https://www.cga.ct.gov/current/pub/title_47a.htm',
      },
      {
        name: 'Conn. Gen. Stat. Chapter 830 - Landlord-Tenant Act',
        description:
          'Applies only to residential dwelling units and explicitly excludes commercial tenancies, confirming that commercial leases in Connecticut operate under common law principles.',
        url: 'https://www.cga.ct.gov/current/pub/title_47a.htm',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Moderate / Tenant-Protective Courts' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Summary Process required.' },
      { label: 'Commercial Rent Tax', value: 'None' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'Under Conn. Gen. Stat. Section 47a-23, a commercial landlord must serve a 3-day Notice to Quit for nonpayment of rent before filing a Summary Process action in Connecticut Housing Court.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '15 days',
        details:
          'For material non-monetary lease violations, Connecticut requires a 15-day Notice to Quit before the landlord may commence Summary Process eviction proceedings.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '3 days (notice to quit)',
        details:
          'Connecticut\'s Notice to Quit procedure applies to month-to-month tenancy terminations. After the notice period, the landlord must obtain a court order through Summary Process rather than proceeding by self-help.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; all audit provisions must be negotiated in the lease.',
      details:
        'Connecticut provides no statutory mechanism granting commercial tenants the right to audit landlord operating expenses or CAM charges. All audit rights - including the look-back period, auditor qualifications, cost allocation, and the landlord\'s record retention obligations - must be expressly negotiated and documented in the lease. Connecticut\'s courts have demonstrated willingness to apply equitable doctrines in commercial lease disputes, which may provide some practical support for tenants challenging materially inaccurate expense reconciliations even absent an explicit audit clause.',
    },
    faqs: [
      {
        question: 'What is the Summary Process for commercial evictions in Connecticut?',
        answer:
          'Summary Process is Connecticut\'s mandatory judicial eviction procedure. After serving the required Notice to Quit, a commercial landlord files a Summary Process action in Housing Court. Connecticut\'s process can take four to eight weeks depending on court calendar and whether the tenant contests the action.',
      },
      {
        question: 'Can a Connecticut landlord lock out a commercial tenant?',
        answer:
          'No. Connecticut prohibits commercial self-help evictions. A landlord who changes locks or removes a tenant\'s property without a court order faces significant tort and statutory liability.',
      },
      {
        question: 'What notice is required for commercial eviction in Connecticut?',
        answer:
          'For nonpayment of rent, a 3-day Notice to Quit is required under Conn. Gen. Stat. Section 47a-23 before a commercial landlord may file a Summary Process action. Non-monetary violations require a 15-day Notice to Quit.',
      },
      {
        question: 'Are commercial security deposits regulated in Connecticut?',
        answer:
          'No. Connecticut\'s residential security deposit statutes do not apply to commercial leases. Commercial deposit amounts and return procedures are governed entirely by the lease agreement.',
      },
    ],
    metaDescription:
      'Connecticut commercial landlord-tenant law overview: Summary Process eviction, 3-day nonpayment notice, Conn. Gen. Stat. Section 47a-23, and commercial lease audit rights.',
  },
  {
    state: 'Utah',
    stateCode: 'UT',
    slug: 'utah',
    overview:
      'Utah is a landlord-friendly commercial leasing state with minimal statutory interference in commercial lease terms and an efficient eviction process. Commercial tenancies are excluded from the Utah Fit Premises Act (Utah Code Title 57, Chapter 22), which applies only to residential dwellings. Commercial lease relationships in Utah are governed by common law, general property statutes under Utah Code Title 57, and the negotiated lease document.\n\nUtah\'s Unlawful Detainer statute (Utah Code Title 78B, Chapter 6, Part 8) provides a streamlined judicial pathway for commercial evictions that is among the more efficient in the Mountain West region. The state does not impose a commercial rent tax at the state or Salt Lake City municipal level. Utah courts strictly enforce commercial lease terms as written, with limited equitable deviation, reinforcing the paramount importance of thorough lease abstraction and negotiation for commercial tenants operating in this market.',
    keyStatutes: [
      {
        name: 'Utah Code Title 78B, Chapter 6, Part 8 - Unlawful Detainer',
        description:
          'Establishes the judicial process for commercial evictions in Utah, including mandatory notice requirements and the expedited court process for recovering possession of commercial premises.',
        url: 'https://le.utah.gov/xcode/Title78B/Chapter6/78B-6-P8.html',
      },
      {
        name: 'Utah Code Title 57, Chapter 17 - Utah Fit Premises Act',
        description:
          'Applies exclusively to residential properties and explicitly excludes commercial tenancies, confirming that commercial leases operate under common law and contract principles.',
        url: 'https://le.utah.gov/xcode/Title57/Chapter17/57-17.html',
      },
      {
        name: 'Utah Code Section 78B-6-802 - Unlawful Detainer by Lessee',
        description:
          'Defines the grounds for commercial Unlawful Detainer and the corresponding notice requirements that must be satisfied before a landlord may file for eviction.',
        url: 'https://le.utah.gov/xcode/Title78B/Chapter6/78B-6-S802.html',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Unlawful Detainer process required.' },
      { label: 'Commercial Rent Tax', value: 'None at state or Salt Lake City municipal level' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '3 days',
        details:
          'Under Utah Code Section 78B-6-802, a commercial landlord must serve a 3-day written Notice to Pay or Quit before filing an Unlawful Detainer action for nonpayment of commercial rent.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '3 days',
        details:
          'For material non-monetary lease violations, Utah requires a 3-day notice to remedy the violation or quit before the landlord may file an Unlawful Detainer action.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '15 days',
        details:
          'Under Utah Code Section 78B-6-802, to terminate a month-to-month commercial tenancy without cause, at least 15 days\' written notice prior to the end of the rental period is required.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; governed entirely by negotiated lease terms.',
      details:
        'Utah provides no statutory right for commercial tenants to audit landlord operating expenses or CAM charges. All audit rights must be expressly negotiated in the lease, including the look-back period, auditor qualifications, cost allocation, and record retention obligations. Utah courts strictly enforce contract terms, making a well-negotiated audit clause the tenant\'s primary protection against CAM overcharges in this jurisdiction.',
    },
    faqs: [
      {
        question: 'How fast is the commercial eviction process in Utah?',
        answer:
          'Utah\'s Unlawful Detainer process is among the more efficient in the Mountain West. After the 3-day notice period expires, a landlord files in District Court. Uncontested cases can often be resolved in two to four weeks, including the time required to obtain a writ of possession.',
      },
      {
        question: 'Can a Utah landlord lock out a commercial tenant for nonpayment?',
        answer:
          'No. Utah prohibits commercial self-help evictions. A landlord must serve a 3-day Notice to Pay or Quit and then file an Unlawful Detainer action in District Court to legally regain possession of commercial premises.',
      },
      {
        question: 'What notice is required for commercial nonpayment eviction in Utah?',
        answer:
          'A 3-day written Notice to Pay or Quit is required under Utah Code Section 78B-6-802 before a commercial landlord may file an Unlawful Detainer action for nonpayment of rent.',
      },
      {
        question: 'Are commercial security deposits regulated in Utah?',
        answer:
          'No. Utah\'s residential security deposit rules do not apply to commercial leases. Commercial deposit amounts, return timelines, and permissible deductions are governed entirely by the lease agreement.',
      },
    ],
    metaDescription:
      'Utah commercial landlord-tenant law overview: Utah Code Title 78B Unlawful Detainer, 3-day eviction notice, and commercial lease audit rights in Salt Lake City.',
  },
  {
    state: 'Louisiana',
    stateCode: 'LA',
    slug: 'louisiana',
    overview:
      'Louisiana is unique among U.S. states in that its commercial landlord-tenant law is rooted in the civil law tradition derived from the Napoleonic Code, rather than the Anglo-American common law that governs the other 49 states. Louisiana\'s lease law is codified in the Louisiana Civil Code, Articles 2668 through 2780, which define a lease as a synallagmatic (bilateral) contract and govern the rights and obligations of lessors and lessees with a distinct legal vocabulary and conceptual framework.\n\nThe Civil Code provides commercial lessors with strong, efficient remedies. Louisiana\'s Warrant of Distress procedure, while limited by modern courts, and the "lessor\'s privilege" (a lien on movable property of the lessee on the premises) are distinctive civil law tools with no direct equivalent in common law states. Louisiana does not permit self-help evictions; lessors must follow the Rule for Possession or Eviction proceeding. The state\'s unique legal framework makes accurate lease abstraction particularly important, as standard common law concepts may not translate directly to Louisiana\'s civil law equivalents.',
    keyStatutes: [
      {
        name: 'Louisiana Civil Code Articles 2668–2780 - Lease',
        description:
          'The foundational civil law framework governing commercial lease relationships in Louisiana, defining the rights and obligations of lessors and lessees under the civilian tradition.',
        url: 'https://www.legis.la.gov/legis/Law.aspx?d=109250',
      },
      {
        name: 'Louisiana Civil Code Article 2707 - Lessor\'s Privilege',
        description:
          'Grants commercial lessors a privilege (lien) on the lessee\'s movable property located on the leased premises for unpaid rent, a distinctive civil law remedy with broad practical effect.',
        url: 'https://www.legis.la.gov/legis/Law.aspx?d=109250',
      },
      {
        name: 'Louisiana Code of Civil Procedure, Article 4701 - Rule for Possession',
        description:
          'Establishes the judicial procedure for evicting a commercial lessee after a lease termination or breach, requiring a court order to recover possession.',
        url: 'https://www.legis.la.gov/legis/Law.aspx?d=109836',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced / Unique Civil Law Framework' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Rule for Possession proceeding required.' },
      { label: 'Commercial Rent Tax', value: 'None at state or New Orleans municipal level' },
      { label: 'Statutory Audit Rights', value: 'None. Governed by the lease contract.' },
      { label: 'Lessor\'s Privilege', value: 'Yes - statutory lien on movables on the premises for unpaid rent' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent (Fixed Term)',
        period: 'Per lease terms',
        details:
          'For fixed-term commercial leases in Louisiana, the lease agreement governs default and cure periods. Louisiana Civil Code Article 2729 permits the lessor to dissolve the lease for nonpayment subject to notice and opportunity to cure as specified in the contract.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '10 days (written notice)',
        details:
          'Under Louisiana Civil Code Article 2728, a month-to-month commercial lease may be terminated by either party with at least 10 days\' written notice before the end of the monthly rental period.',
      },
      {
        type: 'Rule for Possession Filing',
        period: '5 days after notice',
        details:
          'After proper notice and expiration of any cure period, the lessor files a Rule for Possession in Louisiana District Court. The rule is typically returnable within five to seven days for uncontested cases.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights under Louisiana Civil Code; governed by the lease contract.',
      details:
        'Louisiana\'s Civil Code does not provide commercial lessees with any statutory right to audit lessor operating expenses or CAM charges. All audit rights must be expressly negotiated in the lease agreement, consistent with the Civil Code\'s principle that parties may freely contract on the terms of their lease within the limits of public order (Civil Code Article 2668). Louisiana\'s civil law approach to contract interpretation - which focuses on the intent of the parties rather than the strict textual construction applied in common law states - may allow courts to imply certain audit-related obligations in some circumstances, but a well-drafted explicit audit clause remains essential.',
    },
    faqs: [
      {
        question: 'How is Louisiana commercial lease law different from other states?',
        answer:
          'Louisiana is the only U.S. state rooted in the civil law (Napoleonic Code) tradition rather than Anglo-American common law. Commercial leases are governed by the Louisiana Civil Code rather than common law lease rules, and practitioners must understand concepts like the lessor\'s privilege, synallagmatic contracts, and the Rule for Possession that have no direct common law equivalents.',
      },
      {
        question: 'What is the lessor\'s privilege in Louisiana?',
        answer:
          'The lessor\'s privilege under Louisiana Civil Code Article 2707 is a statutory lien on the lessee\'s movable property (equipment, inventory, furniture) located on the leased premises. It secures unpaid rent and gives the commercial lessor a powerful enforcement tool that must be addressed in any commercial lease abstraction for Louisiana properties.',
      },
      {
        question: 'Can a Louisiana commercial lessor lock out a lessee?',
        answer:
          'No. Louisiana prohibits self-help evictions. A lessor must file a Rule for Possession in District Court to legally recover possession of commercial premises after a lease breach or termination.',
      },
      {
        question: 'What notice is required to terminate a month-to-month commercial lease in Louisiana?',
        answer:
          'Under Louisiana Civil Code Article 2728, at least 10 days\' written notice before the end of the monthly rental period is required to terminate a month-to-month commercial lease.',
      },
    ],
    metaDescription:
      'Louisiana commercial lease law: Civil Code Articles 2668–2780, lessor\'s privilege, Rule for Possession eviction, and unique civil law framework for commercial landlord-tenant disputes.',
  },
  {
    state: 'Alabama',
    stateCode: 'AL',
    slug: 'alabama',
    overview:
      'Alabama is a landlord-friendly commercial leasing state with minimal statutory intervention in commercial lease relationships. Commercial tenancies are excluded from the Alabama Uniform Residential Landlord and Tenant Act (Ala. Code Title 35, Chapter 9A), which applies only to residential dwellings. Commercial lease relationships in Alabama are governed by common law, general property statutes under Ala. Code Title 35, and the negotiated lease document. Alabama courts strongly enforce commercial lease terms as written, with limited equitable intervention.\n\nAlabama does not permit commercial self-help evictions. Landlords must use the Unlawful Detainer process under Ala. Code Title 6, Chapter 6, Article 3 to recover possession of commercial premises through the court system. The state does not impose a commercial rent tax. Alabama is notable for its statutory landlord lien on tenant crops and personal property, a holdover from the state\'s agricultural legal heritage that has some application to commercial tenancies, particularly in rural and mixed-use properties.',
    keyStatutes: [
      {
        name: 'Ala. Code Title 35, Chapter 9 - Landlord and Tenant',
        description:
          'Alabama\'s primary commercial landlord-tenant statute governing lease relationships, notice requirements, tenant obligations, and landlord remedies for commercial properties.',
        url: 'https://alison.legislature.state.al.us/code-of-alabama',
      },
      {
        name: 'Ala. Code Title 6, Chapter 6, Article 3 - Unlawful Detainer',
        description:
          'Establishes the judicial eviction process for commercial landlords to recover possession of commercial premises, requiring written notice and a District Court filing.',
        url: 'https://alison.legislature.state.al.us/code-of-alabama',
      },
      {
        name: 'Ala. Code Section 35-9-1 - Landlord\'s Lien',
        description:
          'Grants commercial landlords a lien on tenant personal property on the premises for unpaid rent, providing an additional enforcement remedy beyond the eviction process.',
        url: 'https://alison.legislature.state.al.us/code-of-alabama',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Unlawful Detainer judicial process required.' },
      { label: 'Commercial Rent Tax', value: 'None at state level' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '7 days',
        details:
          'Under Ala. Code Section 35-9-6, a commercial landlord must serve a 7-day written notice to pay rent or vacate before filing an Unlawful Detainer action for nonpayment of commercial rent.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '7 days',
        details:
          'For material non-monetary lease violations, Alabama requires a 7-day notice to cure or vacate before the landlord may commence Unlawful Detainer proceedings.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'To terminate a month-to-month commercial tenancy in Alabama, either party must provide at least 30 days\' prior written notice before the end of the rental period.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; governed entirely by negotiated lease terms.',
      details:
        'Alabama provides no statutory right for commercial tenants to audit landlord operating expenses or CAM charges. All audit rights - including look-back period, auditor qualifications, cost allocation, and record retention obligations - must be expressly negotiated and documented in the lease. Alabama courts apply strict contractual interpretation principles, and in the absence of an express audit clause, tenants have limited remedies for challenging expense reconciliation statements.',
    },
    faqs: [
      {
        question: 'What is the commercial eviction process in Alabama?',
        answer:
          'After serving the required 7-day notice, an Alabama commercial landlord may file an Unlawful Detainer action in District Court. The process is relatively straightforward and uncontested cases are typically resolved within three to five weeks.',
      },
      {
        question: 'Can an Alabama landlord lock out a commercial tenant?',
        answer:
          'No. Alabama prohibits commercial self-help evictions. A landlord who changes locks or removes a tenant\'s property without a court order faces liability for wrongful eviction and related damages.',
      },
      {
        question: 'What notice is required for commercial eviction in Alabama?',
        answer:
          'A 7-day written notice to pay rent or vacate is required under Ala. Code Section 35-9-6 before an Alabama commercial landlord may file an Unlawful Detainer action for nonpayment of rent.',
      },
      {
        question: 'Are commercial security deposits regulated in Alabama?',
        answer:
          'No. Alabama\'s residential security deposit provisions under the Uniform Residential Landlord and Tenant Act do not apply to commercial leases. Commercial deposit amounts and return procedures are governed entirely by the lease agreement.',
      },
    ],
    metaDescription:
      'Alabama commercial landlord-tenant law overview: Ala. Code Title 35, Unlawful Detainer process, 7-day nonpayment notice, landlord lien rights, and commercial lease audit rights.',
  },
  {
    state: 'South Carolina',
    stateCode: 'SC',
    slug: 'south-carolina',
    overview:
      'South Carolina is a landlord-friendly commercial leasing state with limited statutory oversight of commercial lease relationships. Commercial tenancies are expressly excluded from the South Carolina Residential Landlord-Tenant Act (S.C. Code Ann. Title 27, Chapter 40), which applies only to residential dwellings. Commercial lease relationships in South Carolina are governed by common law, general property statutes under S.C. Code Ann. Title 27, and the negotiated lease document.\n\nSouth Carolina does not permit commercial self-help evictions. Landlords must follow the Ejectment or Summary Ejectment process under S.C. Code Ann. Title 27 to recover possession through the court system. The state does not impose a commercial rent tax at the state or Charleston/Columbia municipal level. South Carolina courts strongly enforce commercial lease terms as written and have historically been resistant to implying duties or protections not expressly stated in the lease, making the abstraction of exact lease terms essential in this market.',
    keyStatutes: [
      {
        name: 'S.C. Code Ann. Title 27 - Property',
        description:
          'The primary South Carolina property statute governing commercial lease relationships, landlord remedies, and ejectment procedures for commercial premises.',
        url: 'https://www.scstatehouse.gov/code/title27.php',
      },
      {
        name: 'S.C. Code Ann. Section 27-37-10 - Ejectment Process',
        description:
          'Provides the judicial framework for commercial landlords to recover possession of leased premises, requiring notice and a formal court action.',
        url: 'https://www.scstatehouse.gov/code/title27.php',
      },
      {
        name: 'S.C. Code Ann. Title 27, Chapter 40 - Residential Landlord-Tenant Act',
        description:
          'Applies exclusively to residential tenancies and explicitly excludes commercial leases, confirming that commercial leases in South Carolina are governed by contract law and common law.',
        url: 'https://www.scstatehouse.gov/code/title27.php',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Prohibited. Ejectment judicial process required.' },
      { label: 'Commercial Rent Tax', value: 'None' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '5 days',
        details:
          'Under S.C. Code Ann. Section 27-37-10, a commercial landlord must serve a 5-day written notice to pay rent or vacate before filing an Ejectment action for nonpayment of commercial rent.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '14 days',
        details:
          'For material non-monetary lease violations, South Carolina requires a 14-day notice to cure or vacate before the landlord may commence Ejectment proceedings.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'To terminate a month-to-month commercial tenancy in South Carolina, either party must provide at least 30 days\' prior written notice before the end of the rental period.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; governed entirely by negotiated lease terms.',
      details:
        'South Carolina provides no statutory right for commercial tenants to audit landlord operating expenses or CAM charges. All audit provisions - including the look-back period, auditor qualifications, cost allocation, and the landlord\'s record retention obligations - must be expressly negotiated and documented in the lease. South Carolina courts apply strict contract interpretation, and lease audit clause limitations will generally be enforced as written.',
    },
    faqs: [
      {
        question: 'What is the commercial eviction process in South Carolina?',
        answer:
          'After serving the required notice (5 days for nonpayment), a South Carolina commercial landlord files an Ejectment action in Magistrate\'s Court or Circuit Court. Uncontested cases are typically resolved within two to four weeks.',
      },
      {
        question: 'Can a South Carolina landlord lock out a commercial tenant?',
        answer:
          'No. South Carolina prohibits commercial self-help evictions. A landlord who changes locks or removes a tenant\'s property without a court order faces significant liability for wrongful eviction.',
      },
      {
        question: 'What notice is required for commercial eviction in South Carolina?',
        answer:
          'A 5-day written notice to pay rent or vacate is required under S.C. Code Ann. Section 27-37-10 before a South Carolina commercial landlord may file an Ejectment action for nonpayment of rent.',
      },
      {
        question: 'Are commercial security deposits regulated in South Carolina?',
        answer:
          'No. South Carolina\'s residential security deposit provisions under the Residential Landlord-Tenant Act do not apply to commercial leases. Commercial deposit amounts and return procedures are governed entirely by the lease agreement.',
      },
    ],
    metaDescription:
      'South Carolina commercial landlord-tenant law overview: S.C. Code Ann. Title 27, 5-day nonpayment notice, Ejectment process, and commercial lease audit rights.',
  },
  {
    state: 'Kentucky',
    stateCode: 'KY',
    slug: 'kentucky',
    overview:
      'Kentucky is a balanced to slightly landlord-friendly commercial leasing state with a straightforward eviction process and limited statutory interference in commercial lease terms. Commercial tenancies are excluded from the Kentucky Uniform Residential Landlord and Tenant Act (KRS Chapter 383), which applies only to residential dwellings in jurisdictions that have adopted the Act. Commercial lease relationships in Kentucky are governed by common law, general property statutes under KRS Chapter 383, and the negotiated lease document.\n\nKentucky prohibits commercial self-help evictions. Landlords must follow the Forcible Entry or Detainer (FED) process under KRS Chapter 383 to recover possession of commercial premises through the District Court system. The state does not impose a commercial rent tax at the state or Louisville/Lexington municipal level. Kentucky courts apply a strict contractual interpretation to commercial lease disputes, making the precise terms of the abstracted lease the primary legal instrument governing the tenancy.',
    keyStatutes: [
      {
        name: 'KRS Chapter 383 - Landlord-Tenant',
        description:
          'Kentucky\'s primary landlord-tenant statute, providing the framework for commercial lease relationships, notice requirements, and landlord remedies applicable to commercial properties.',
        url: 'https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=38932',
      },
      {
        name: 'KRS Section 383.660 - Notice to Vacate',
        description:
          'Establishes the notice periods required before a commercial landlord may file a Forcible Entry and Detainer action for possession of commercial premises.',
        url: 'https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=38932',
      },
      {
        name: 'KRS Chapter 383, Subchapter 5 - Forcible Entry and Detainer',
        description:
          'Governs the judicial Forcible Entry and Detainer process for commercial evictions in Kentucky, providing the exclusive legal pathway for landlords to recover possession.',
        url: 'https://apps.legislature.ky.gov/law/statutes/chapter.aspx?id=38932',
      },
    ],
    keyFacts: [
      { label: 'Regulatory Stance', value: 'Balanced / Slightly Landlord-Friendly' },
      { label: 'Self-Help Evictions', value: 'Prohibited. FED judicial process required.' },
      { label: 'Commercial Rent Tax', value: 'None at state or major municipal level' },
      { label: 'Statutory Audit Rights', value: 'None. Governed entirely by the lease contract.' },
      { label: 'Security Deposit Cap', value: 'No statutory cap for commercial leases' },
    ],
    noticePeriods: [
      {
        type: 'Nonpayment of Rent',
        period: '7 days',
        details:
          'Under KRS Section 383.660, a commercial landlord must serve a 7-day written notice to pay rent or vacate before filing a Forcible Entry and Detainer action for nonpayment of commercial rent.',
      },
      {
        type: 'Lease Violation (Non-Monetary)',
        period: '15 days',
        details:
          'For material non-monetary lease violations, Kentucky requires a 15-day notice to cure or vacate before the landlord may commence Forcible Entry and Detainer proceedings.',
      },
      {
        type: 'Month-to-Month Termination',
        period: '30 days',
        details:
          'To terminate a month-to-month commercial tenancy in Kentucky, either party must provide at least 30 days\' prior written notice before the end of the rental period.',
      },
    ],
    auditRights: {
      summary: 'No statutory audit rights; governed entirely by negotiated lease terms.',
      details:
        'Kentucky provides no statutory right for commercial tenants to audit landlord operating expenses or CAM charges. All audit provisions - including the look-back period, auditor qualifications, cost allocation, and the landlord\'s record retention obligations - must be expressly negotiated and documented in the commercial lease. Kentucky courts apply strict contract interpretation principles, and audit clause limitations will generally be enforced as written without equitable modification.',
    },
    faqs: [
      {
        question: 'What is the Forcible Entry and Detainer process in Kentucky?',
        answer:
          'After serving the required notice (7 days for nonpayment), a Kentucky commercial landlord files a Forcible Entry and Detainer action in District Court. Uncontested commercial eviction cases are typically resolved within two to four weeks.',
      },
      {
        question: 'Can a Kentucky landlord lock out a commercial tenant?',
        answer:
          'No. Kentucky prohibits commercial self-help evictions. A landlord who changes locks, removes utilities, or removes a tenant\'s property without a court order faces significant liability for wrongful eviction.',
      },
      {
        question: 'What notice is required for commercial eviction in Kentucky?',
        answer:
          'A 7-day written notice to pay rent or vacate is required under KRS Section 383.660 before a Kentucky commercial landlord may file a Forcible Entry and Detainer action for nonpayment of rent.',
      },
      {
        question: 'Are commercial security deposits regulated in Kentucky?',
        answer:
          'No. Kentucky\'s residential security deposit provisions under KRS Chapter 383 apply only in jurisdictions that have adopted the Uniform Residential Landlord and Tenant Act and do not apply to commercial leases. Commercial deposit amounts and return procedures are governed entirely by the lease agreement.',
      },
    ],
    metaDescription:
      'Kentucky commercial landlord-tenant law overview: KRS Chapter 383, 7-day nonpayment notice, Forcible Entry and Detainer process, and commercial lease audit rights.',
  },
]

// ─── Cross-Link Enrichment ──────────────────────────────────────────

// All state pages share these common related fields and red flags
const STATE_COMMON_FIELDS = ['governing-law-state', 'monetary-cure-period', 'non-monetary-cure-period', 'holdover-rate', 'security-deposit-amount']
const STATE_COMMON_RED_FLAGS = ['short-cure-period', 'aggressive-holdover-rate', 'missing-audit-rights']

for (const state of stateData) {
  state.relatedFields = STATE_COMMON_FIELDS
  state.relatedRedFlags = STATE_COMMON_RED_FLAGS
}

/**
 * Find a state by its URL slug.
 */
export function getStateBySlug(slug: string): StateLandlordTenantData | undefined {
  return stateData.find((s) => s.slug === slug)
}

/**
 * Get all state slugs for static generation.
 */
export function getAllStateSlugs(): string[] {
  return stateData.map((s) => s.slug)
}

/**
 * Get a brief excerpt from the state overview (first sentence).
 */
export function getStateExcerpt(state: StateLandlordTenantData): string {
  const firstSentence = state.overview.split('. ')[0]
  return firstSentence.endsWith('.') ? firstSentence : `${firstSentence}.`
}
