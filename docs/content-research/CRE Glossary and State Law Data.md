# **Commercial Real Estate Data Architecture: Standardized Terminology and Jurisdictional Frameworks**

The commercial real estate (CRE) sector operates upon deeply complex, heavily negotiated contractual frameworks where minor linguistic variations carry multi-million dollar implications. While the foundation of commercial leasing remains rooted in common law and the doctrine of freedom of contract, an evolving landscape of statutory interventions, hyper-local municipal regulations, and nuanced judicial precedents requires advanced abstraction capabilities. The extraction of structured fields from dense commercial lease PDFs relies fundamentally on a unified ontology of legal, financial, and operational concepts, paired inextricably with a precise understanding of state-specific landlord-tenant statutes.

Traditional, manual lease abstraction is inherently prone to human error, often overlooking the interplay between a generic lease clause and a superseding state statute. Modern AI-powered extraction methodologies resolve this by mapping lease clauses against a standardized set of structured data fields. The following data architecture codifies 29 critical commercial lease terms and synthesizes the commercial landlord-tenant statutory frameworks across 10 key United States markets. This structured data schema is engineered to support automated abstraction modeling, ensuring that critical dates, financial liabilities, expansion rights, and jurisdictional notice periods are parsed, contextualized, and accurately surfaced for CRE professionals.

## **Ontology of Commercial Lease Abstraction**

To effectively abstract a commercial lease, parsing engines must categorize provisions into distinct domains: Financial, Legal, Operational, Parties, and Property. The precision of natural language processing (NLP) models depends on training data that thoroughly defines these concepts, their typical applications, and the hidden negotiation levers embedded within them.

For instance, understanding the extraction of Common Area Maintenance (CAM) charges requires the system to simultaneously recognize "Operating Expense Pass-Through" mechanisms and locate corresponding "Audit Rights." If a lease is entirely silent on audit rights, common law precedents in certain jurisdictions still provide an implied right to verify billed expenses.1 Conversely, explicit limitations placed on the timeline, location, or auditor credentials can severely restrict a tenant's ability to challenge overcharges.1

The following TypeScript schema establishes the semantic baseline for both natural language processing and manual abstraction review.

TypeScript

export interface GlossaryTerm {  
  term: string  
  slug: string  
  definition: string        // 2-4 sentences, plain English  
  extendedDefinition: string // 1-2 paragraphs, more detail \+ examples  
  relatedTerms: string    // slugs of related terms in this glossary  
  seeAlso: string         // labels for external concepts (not linked)  
  category: 'financial' | 'legal' | 'operational' | 'parties' | 'property'  
}

export const glossaryTerms: GlossaryTerm \= Accurate abstraction of base rent is critical, as it serves as the foundation for calculating holdover penalties and security deposit requirements.",  
    relatedTerms: \["percentage-rent", "cpi-escalation", "rent-escalation-schedule", "rentable-square-footage"\],  
    seeAlso:,  
    category: "financial"  
  },  
  {  
    term: "Percentage Rent",  
    slug: "percentage-rent",  
    definition: "A variable rent structure primarily utilized in retail and restaurant leasing, requiring the tenant to pay a base rent plus a predetermined percentage of their gross sales. The percentage portion typically only triggers after the tenant's sales revenue exceeds a specific threshold known as the natural breakpoint.",  
    extendedDefinition: "Percentage rent serves to align the financial interests and risks of the commercial landlord and the retail tenant, as the landlord directly profits from high foot traffic and the operational success of the shopping center. The 'natural breakpoint' is standardly calculated by dividing the annualized base rent by the agreed-upon percentage. For instance, if the annual base rent is $150,000 and the percentage rent is 5%, the natural breakpoint sits at $3,000,000. The tenant will only be obligated to pay the 5% premium on gross sales that exceed $3,000,000 within a given lease year. Sophisticated tenants must carefully negotiate the definition of 'gross sales' to explicitly exclude non-profit generating items such as merchandise returns, employee discounts, wholesale transfers between store locations, and collected sales taxes.",  
    relatedTerms: \["base-rent", "audit-rights", "continuous-operation-clause"\],  
    seeAlso:,  
    category: "financial"  
  },  
  {  
    term: "CPI Escalation",  
    slug: "cpi-escalation",  
    definition: "A lease provision that automatically adjusts the base rent annually based on changes in the Consumer Price Index (CPI), an economic indicator of inflation. This mechanism ensures that the landlord's rental income retains its purchasing power over the duration of a long-term lease.",  
    extendedDefinition: "CPI escalations effectively transfer macroeconomic inflation risk from the property owner to the commercial tenant. The abstraction of this clause requires absolute precision regarding which specific CPI index is utilized; contracts must designate whether the calculation relies on the CPI-U (All Urban Consumers) or the CPI-W (Urban Wage Earners and Clerical Workers), and must specify the geographic region acting as the reference base.\[3\] To protect against sudden hyperinflationary spikes, tenants typically negotiate a 'cap' on the maximum allowable annual increase, stipulating terms such as 'CPI increases shall not exceed 4% in any given calendar year'.\[4\] Conversely, landlords may negotiate a 'floor' or stipulate that rent shall never decrease, ensuring the base rent remains stable even during deflationary economic periods.",  
    relatedTerms: \["rent-escalation-schedule", "base-rent"\],  
    seeAlso:,  
    category: "financial"  
  },  
  {  
    term: "Operating Expense Pass-Through",  
    slug: "operating-expense-pass-through",  
    definition: "The financial mechanism by which a commercial landlord transfers the costs of running, maintaining, and insuring the building to the tenants. Tenants are billed a pro-rata share of these expenses based on the proportional size of their leased premises.",  
    extendedDefinition: "Operating expense pass-throughs are the hallmark of net leasing structures. Landlords calculate an estimate of these costs at the beginning of the fiscal year and bill tenants in monthly installments alongside base rent. At the conclusion of the lease year, the landlord performs a comprehensive reconciliation; if the estimated payments collected fell short of actual operational costs, the tenant receives a bill for the shortfall, and if they overpaid, they receive a credit against future rent.\[5\] Careful abstraction of this clause is vital for corporate accounting, as tenants routinely negotiate 'expense stops' or rigorous exclusions—such as capital improvements, executive salaries, or landlord legal fees—to strictly limit their financial exposure.",  
    relatedTerms: \["cam-charges", "nnn-lease", "cam-reconciliation"\],  
    seeAlso:,  
    category: "financial"  
  },  
  {  
    term: "CAM Charges (Common Area Maintenance)",  
    slug: "cam-charges",  
    definition: "Specific fees paid by commercial tenants to cover the routine costs of maintaining the shared, public areas of a commercial property. These areas typically include parking lots, lobbies, elevators, public restrooms, hallways, and exterior landscaping.",  
    extendedDefinition: "CAM charges frequently represent a substantial 15% to 35% of a tenant's total occupancy costs, making them one of the most heavily scrutinized components of commercial lease agreements.\[6\] Eligible CAM costs generally encompass snow removal, security personnel, janitorial services for common areas, utilities for shared spaces, and property management administration fees. Because landlords may improperly attempt to misclassify major capital improvements (such as a total roof replacement or structural foundation work) as standard maintenance, sophisticated tenants demand highly detailed CAM definitions and robust, multi-year audit rights.\[7\] In complex retail settings like shopping malls, CAM calculations factor in variables such as anchor tenant contributions and gross-up provisions, complicating abstraction efforts.",  
    relatedTerms: \["operating-expense-pass-through", "audit-rights", "cam-reconciliation"\],  
    seeAlso: \["Capital Expenditures", "Gross-Up Provision", "Administrative Margin"\],  
    category: "financial"  
  },  
  {  
    term: "NNN Lease (Triple Net)",  
    slug: "nnn-lease",  
    definition: "A commercial lease structure where the tenant is legally responsible for paying almost all operating expenses associated with the property in addition to their base rent. The 'three nets' represent the tenant's assumption of property taxes, property insurance, and structural maintenance.",  
    extendedDefinition: "Triple Net (NNN) leases are highly favored by commercial landlords—particularly in single-tenant properties, retail outparcels, and industrial facilities—because they provide a highly predictable, bond-like income stream completely insulated from fluctuating operational and tax costs. While the tenant assumes the heavy burden of variable building expenses, NNN base rents are typically negotiated at a lower price point than those of Gross leases to compensate for the added financial risk. Abstracting a NNN lease requires careful parsing of roof, HVAC, and structural maintenance responsibilities; if the landlord retains the risk for the roof and exterior walls, it is often termed a standard NNN lease, whereas a tenant assuming absolutely all structural risks holds an 'Absolute Net' lease.",  
    relatedTerms: \["gross-lease", "operating-expense-pass-through", "cam-charges"\],  
    seeAlso: \["Absolute Net Lease", "Modified Gross Lease", "Net-Net Lease"\],  
    category: "financial"  
  },  
  {  
    term: "Gross Lease",  
    slug: "gross-lease",  
    definition: "A lease arrangement where the tenant pays a single, flat, all-inclusive monthly rent, and the landlord covers all property operating expenses out of that revenue. The landlord uses the collected rent to pay for real estate taxes, insurance, and routine maintenance.",  
    extendedDefinition: "Gross leases, frequently termed 'Full Service' leases, offer maximum financial predictability for the tenant, who completely avoids the risk of unexpected maintenance repair bills or sudden municipal tax hikes. They are the dominant lease structure in multi-tenant office buildings and shorter-term commercial engagements. A common variation called the 'Modified Gross Lease' requires the tenant to pay for their own direct, separately metered utilities or interior janitorial services, while the landlord handles exterior and structural costs. Because building operating costs inevitably rise due to inflation, modern Gross leases almost always include a 'Base Year' escalation clause, allowing the landlord to pass any future expense increases—above the costs established during the tenant's first year of occupancy—back to the tenant.",  
    relatedTerms: \["nnn-lease", "base-rent"\],  
    seeAlso:,  
    category: "financial"  
  },  
  {  
    term: "Tenant Improvement Allowance (TI Allowance)",  
    slug: "tenant-improvement-allowance",  
    definition: "A negotiated sum of capital provided by the commercial landlord to assist the incoming tenant with customizing or renovating the leased interior space. It is usually calculated and disbursed as a specific dollar amount per usable square foot.",  
    extendedDefinition: "The TI Allowance serves as a critical inducement to convince tenants to sign long-term lease commitments by drastically defraying the high upfront capital costs of interior commercial construction (such as erecting walls, installing specialized flooring, or routing HVAC ductwork). If a lease provides a generous $50/USF allowance on a 10,000 USF space, the landlord contributes up to $500,000 toward the tenant's customized build-out. Allowances are strictly governed by complex disbursement schedules and work letters, typically requiring the tenant to submit architect certificates and lien waivers from general contractors before the landlord will release any funds.\[8\] Unused TI funds may sometimes be converted into free rent, provided the lease contains explicit conversion language.",  
    relatedTerms: \["base-rent", "usable-square-footage"\],  
    seeAlso:,  
    category: "financial"  
  },  
  {  
    term: "Estoppel Certificate",  
    slug: "estoppel-certificate",  
    definition: "A binding legal document signed by a commercial tenant that officially confirms the current details and status of their lease. It verifies facts such as the rent amount, security deposit held, lease expiration date, and that the landlord is not currently in default.",  
    extendedDefinition: "Estoppel certificates provide critical, binding proof to third parties—specifically prospective property buyers or mortgage lenders—that the commercial lease exists exactly as represented by the landlord and that no hidden disputes or defaults exist.\[9\] Because the tenant is legally 'estopped' (prevented by law) from later contradicting the factual statements made in the signed certificate, absolute accuracy is paramount. Commercial leases universally mandate that tenants must sign and return an estoppel certificate within a strict, short timeframe, usually 10 to 15 days of a request. Failure to execute the certificate can be deemed a material event of default, or the lease may contain language granting the landlord power of attorney to execute it on the tenant's behalf.",  
    relatedTerms: \["snda"\],  
    seeAlso:,  
    category: "legal"  
  },  
  {  
    term: "Subordination, Non-Disturbance & Attornment (SNDA)",  
    slug: "snda",  
    definition: "A complex, three-part legal agreement between a commercial tenant, a landlord, and the landlord's mortgage lender. It protects the lender's priority claim on the property while simultaneously guaranteeing the tenant will not be evicted if the landlord defaults on their mortgage.",  
    extendedDefinition: "The SNDA is a paramount risk-mitigation document in commercial real estate leasing and financing.\[10, 11\] The 'Subordination' clause acknowledges that the lender's mortgage lien is superior to the tenant's leasehold interest. The 'Non-Disturbance' clause—representing the most vital protection for the commercial tenant—guarantees that the lender will honor the terms of the lease and will not evict the tenant in the event of a property foreclosure, provided the tenant continues to pay rent.\[12\] Finally, the 'Attornment' clause requires the tenant to recognize the new property owner (whether the lender or a buyer at a foreclosure auction) as their new, legitimate landlord. SNDAs are heavily negotiated to preserve tenant rights regarding unspent TI allowances and casualty repairs.",  
    relatedTerms: \["estoppel-certificate"\],  
    seeAlso: \["Foreclosure", "Mortgage Priority", "Leasehold Interest"\],  
    category: "legal"  
  },  
  {  
    term: "Personal Guarantee",  
    slug: "personal-guarantee",  
    definition: "A legally binding promise made by an individual, typically the business owner or CEO, to personally repay rent or property damages if their business entity defaults on the commercial lease. It allows the landlord to pursue the guarantor's personal assets.",  
    extendedDefinition: "Commercial landlords require personal guarantees to mitigate risk when leasing space to startups, small businesses, or Limited Liability Companies (LLCs) with brief operating histories and shallow capitalization. By successfully piercing the corporate veil of limited liability via the guarantee, the landlord can place judicial liens on the business owner's personal bank accounts, vehicles, or residential home in the event of a breach. To mitigate this extreme risk, tenant representatives often negotiate 'Good Guy Guarantees'—which strictly limit the individual's liability to only the rent accrued up until the exact date the space is vacated and keys are returned to the landlord—or 'burning' guarantees that systematically reduce in value or expire after a set number of years of on-time rent payments.",  
    relatedTerms: \["tenant-representative"\],  
    seeAlso: \["Corporate Guarantee", "Good Guy Guarantee", "Letter of Credit"\],  
    category: "legal"  
  },  
  {  
    term: "Assignment and Subletting",  
    slug: "assignment-and-subletting",  
    definition: "The legal mechanisms by which a commercial tenant transfers their lease obligations or physical space to a third party. An assignment transfers the entire lease contract to a new tenant, while a sublet allows the original tenant to rent a portion of the space to a subtenant.",  
    extendedDefinition: "In a formal assignment, the assignee assumes a direct contractual relationship with the landlord, though the original tenant usually remains secondarily liable as a guarantor unless explicitly released in writing. In a sublease, the original tenant acts as a 'sublandlord,' collecting rent from the subtenant and remaining fully, primarily responsible for paying the master landlord. Commercial leases inherently restrict these transfers to protect the landlord's asset, typically requiring prior written consent which 'shall not be unreasonably withheld, conditioned, or delayed.' Advanced AI abstraction requires identifying 'recapture rights'—punitive clauses that allow the landlord to terminate the lease entirely and take back the physical space rather than permit the requested sublet.",  
    relatedTerms: \["tenant-representative"\],  
    seeAlso:,  
    category: "legal"  
  },  
  {  
    term: "Force Majeure",  
    slug: "force-majeure",  
    definition: "A legal contract clause that frees both the landlord and tenant from liability or strict obligation when an extraordinary, unforeseeable event prevents them from fulfilling their duties. These events are often historically referred to as 'acts of God.'",  
    extendedDefinition: "Force majeure covers extreme, unavoidable circumstances such as natural disasters, wars, global pandemics, or government-mandated labor strikes. In the context of commercial leases, while force majeure may legally delay the landlord's obligation to deliver the premises by the commencement date or complete construction of tenant improvements, it almost never excuses the tenant's fundamental, independent obligation to pay monthly rent. The precise enumeration of covered events—for instance, whether public health emergencies or supply chain material shortages are explicitly listed in the text—dictates the clause's ultimate enforceability. Courts tend to interpret these clauses very narrowly, requiring the event to directly render performance impossible, not merely unprofitable.",  
    relatedTerms: \["commencement-date"\],  
    seeAlso: \["Act of God", "Frustration of Purpose", "Impossibility"\],  
    category: "legal"  
  },  
  {  
    term: "Holdover Provision",  
    slug: "holdover-provision",  
    definition: "A severe penalty clause that triggers if a commercial tenant remains in the physical leased space after the lease term officially expires without signing a formal renewal. It usually imposes a drastically increased daily or monthly rental rate.",  
    extendedDefinition: "The punitive holdover rate is strategically designed to compel commercial tenants to either vacate the premises on time or formally negotiate a lease renewal, aggressively compensating the landlord for the inability to deliver the vacant space to a waiting new tenant. Typical commercial holdover rates range from 125% to 200% of the last month's base rent.\[13\] Beyond steep rent hikes, holdover clauses routinely expose the tenant to consequential damages; if the landlord's incoming tenant sues the landlord for failure to deliver possession of the space, the holdover tenant is liable for those legal costs. Upon holding over, the legal status of the tenant often reverts to a month-to-month tenancy or a strict 'tenancy at sufferance' under state law.",  
    relatedTerms: \["base-rent", "critical-date"\],  
    seeAlso:,  
    category: "legal"  
  },  
  {  
    term: "Right of First Refusal (ROFR)",  
    slug: "right-of\-first-refusal",  
    definition: "A powerful expansion right granting an existing commercial tenant the option to lease additional adjacent space by matching an economic offer the landlord has already received from an outside third party.",  
    extendedDefinition: "A ROFR provides ultimate real estate security for rapidly growing tenants, but institutional landlords strongly dislike them because they hinder open-market leasing; third parties are hesitant to spend capital negotiating a letter of intent knowing an existing tenant can simply match the terms and poach the space.\[14, 15\] When the landlord presents a bona fide, executed third-party offer, the tenant typically has a critically short window (e.g., 5 to 10 business days) to exercise their ROFR. Crucially, unlike a ROFO, the tenant must accept the exact economic terms the third party negotiated, which may dictate a longer lease term or higher rent than the tenant originally anticipated.\[16\]",  
    relatedTerms: \["right-of\-first-offer"\],  
    seeAlso:,  
    category: "legal"  
  },  
  {  
    term: "Right of First Offer (ROFO)",  
    slug: "right-of\-first-offer",  
    definition: "A negotiated lease agreement requiring the commercial landlord to offer newly available or adjacent space to an existing tenant before marketing the space to the general public or competing brokerages.",  
    extendedDefinition: "A ROFO requires the landlord to proactively present proposed lease terms to the tenant the moment a neighboring space becomes vacant. If the tenant declines the offered terms or fails to respond within a strictly specified notice period, the landlord is entirely free to lease the space to third parties on the open market.\[14, 15\] Landlords significantly prefer ROFOs over ROFRs because they do not chill third-party negotiations or complicate broker commissions. However, protective leases usually stipulate that if the landlord later decides to offer the space to a third party at a significantly lower rate (e.g., 10% less than initially offered to the original tenant), the tenant's ROFO rights must automatically reactivate.\[17\]",  
    relatedTerms: \["right-of-first-refusal"\],  
    seeAlso:,  
    category: "legal"  
  },  
  {  
    term: "Exclusive Use Clause",  
    slug: "exclusive-use-clause",  
    definition: "A protective lease provision that strictly prohibits the landlord from leasing other physical space within the same building or shopping center to a direct business competitor of the tenant.",  
    extendedDefinition: "Crucial in retail and medical environments, an exclusive use clause protects a tenant's localized market share, foot traffic, and overall viability.\[18, 19\] For example, a specialty coffee shop may demand that no other tenant in the strip center be permitted to generate more than 10% of their gross revenue from coffee or espresso sales. Vague or broadly written language can lead to severe operational disputes; therefore, highly specific definitions of 'competing goods' and 'primary business use' are absolutely required.\[20\] Tenants must negotiate powerful, self-executing remedies, such as the right to reduce base rent by 50% or terminate the lease entirely without penalty, if the landlord breaches the exclusivity provision by leasing to a competitor.",  
    relatedTerms: \["continuous-operation-clause"\],  
    seeAlso:,  
    category: "legal"  
  },  
  {  
    term: "Continuous Operation Clause",  
    slug: "continuous-operation-clause",  
    definition: "A strict lease requirement that the commercial tenant keeps their business fully open, adequately stocked, and fully staffed during the property's standard operating hours for the entire duration of the lease.",  
    extendedDefinition: "Commonly found in retail centers and shopping mall leases, continuous operation clauses explicitly prevent a tenant from 'going dark'.\[21, 22\] Because mall landlords rely heavily on maximum, uninterrupted foot traffic to support the synergy of all adjacent tenants and drive Percentage Rent yields, a closed or abandoned storefront damages the entire retail ecosystem. If a tenant physically abandons the property but continues to pay their monthly base rent on time, they are still fundamentally in default under this clause.\[23\] Tenants often counter this liability by demanding 'Co-Tenancy Clauses,' which legally allow them to close their doors or pay drastically reduced rent if the mall's primary anchor tenant vacates.",  
    relatedTerms: \["percentage-rent", "exclusive-use-clause"\],  
    seeAlso:,  
    category: "operational"  
  },  
  {  
    term: "Lease Abstract",  
    slug: "lease-abstract",  
    definition: "A concise, structured summary document that extracts the most critical financial, legal, and operational data points from a dense, multi-page commercial lease contract.",  
    extendedDefinition: "The commercial lease abstract distills a complex 100\-page legal document into a highly readable 2\- to 5\-page operational cheat sheet. It captures essential metrics such as entity details, base rent schedules, CAM formulas, renewal options, exclusive use clauses, and critical notice periods. Property managers, accountants, and investment brokers rely heavily on abstracts for day-to-day portfolio management and valuation modeling without having to continuously parse complex legal jargon. Ensuring the total accuracy of a lease abstract is critical to prevent revenue leakage, though abstracts universally contain legal disclaimers stating that the original master lease document governs in the event of any contractual dispute.",  
    relatedTerms: \["lease-abstraction", "critical-date"\],  
    seeAlso:,  
    category: "operational"  
  },  
  {  
    term: "Lease Abstraction",  
    slug: "lease-abstraction",  
    definition: "The methodical process of reading, analyzing, and extracting structured, actionable data from a commercial lease contract to create a summary report or populate a property management database.",  
    extendedDefinition: "Lease abstraction has historically been a highly labor-intensive, manual task performed by junior attorneys, paralegals, or offshore accounting teams. Today, advanced AI-powered platforms utilize natural language processing (NLP) to automate the extraction of dozens of structured fields, drastically reducing human error, accelerating due diligence, and standardizing data across massive real estate portfolios. Effective abstraction requires an engine capable of understanding hyper-specific legal terminology, recognizing non-standard clauses, reconciling conflicting provisions, and identifying referenced exhibits or subsequent amendments that fundamentally alter the terms of the original master lease.",  
    relatedTerms: \["lease-abstract"\],  
    seeAlso:,  
    category: "operational"  
  },  
  {  
    term: "Critical Date",  
    slug: "critical-date",  
    definition: "A specific, hard deadline embedded within the lease that requires proactive action by the landlord or tenant, such as lease expiration dates, renewal option deadlines, or rent bump dates.",  
    extendedDefinition: "Missing a critical date in commercial real estate can trigger catastrophic financial consequences. For example, failing to formally exercise a renewal option by the critical date (which is often situated 6 to 9 months before the actual lease expiration) results in the permanent loss of the tenant's right to renew, exposing the business to immediate eviction or massive, punitive holdover rent penalties. Robust abstraction software meticulously flags these dates and feeds them directly into automated tickler systems or ERP software so that property managers and tenant representatives are alerted well in advance of the impending deadline.",  
    relatedTerms: \["holdover-provision", "lease-abstraction", "commencement-date"\],  
    seeAlso:,  
    category: "operational"  
  },  
  {  
    term: "Commencement Date",  
    slug: "commencement-date",  
    definition: "The official starting date of the commercial lease term. This specific date triggers the tenant's legal right to occupy the premises and starts the clock on the ultimate lease expiration.",  
    extendedDefinition: "The commencement date is rarely as simple as the day the lease is signed. It is frequently tied to the 'Delivery of Possession'—the exact date the landlord officially hands over the keys after substantially completing their designated construction work (often termed Landlord's Work).\[2, 24\] If the landlord is delayed by permitting or construction issues, the commencement date is systematically pushed back. It is absolutely crucial to distinguish the Commencement Date from the 'Rent Commencement Date,' as commercial tenants frequently negotiate free rent periods where they occupy the physical space for interior build-out purposes but do not pay base rent for several months.\[8\]",  
    relatedTerms: \["base-rent", "critical-date"\],  
    seeAlso:,  
    category: "operational"  
  },  
  {  
    term: "Rent Escalation Schedule",  
    slug: "rent-escalation-schedule",  
    definition: "A definitive timeline embedded in the lease outlining exactly when, and by what specific mathematical formula or amount, the base rent will increase over the lifespan of the contract.",  
    extendedDefinition: "Rent escalations are essential mechanisms to combat inflation and systematically increase the commercial asset's capitalization rate and overall valuation. The schedule may dictate fixed percentage increases (e.g., a flat 3% annually on the anniversary of the rent commencement date), fixed dollar amount step-ups (e.g., rising from $30/RSF to $32/RSF in Year 3), or variable CPI-linked increases. Abstracting this schedule with perfect accuracy is mandatory for the accounting department to accurately calculate straight-line rent, prevent severe revenue leakage for landlords, or prevent insidious, compounding overpayment by tenants.",  
    relatedTerms: \["base-rent", "cpi-escalation"\],  
    seeAlso:,  
    category: "operational"  
  },  
  {  
    term: "CAM Reconciliation",  
    slug: "cam-reconciliation",  
    definition: "The mandatory annual accounting process where the commercial landlord compares the estimated CAM and operating fees collected from tenants throughout the year against the actual, documented expenses incurred by the building.",  
    extendedDefinition: "Because CAM is billed on an estimated monthly basis, a year-end true\-up is mandatory to align projections with reality.\[7\] Landlords compile all operating invoices, calculate each tenant's precise pro-rata share, and issue a formal reconciliation statement. If a tenant underpaid based on the initial estimates, they must issue a check for the shortfall, typically within 30 days of receipt. If they overpaid, the landlord credits the surplus toward future rent obligations. The delivery of the final reconciliation statement is a critical date, as it almost always triggers a strict countdown for the tenant to legally invoke their audit rights to challenge the landlord's arithmetic or categorization.",  
    relatedTerms: \["cam-charges", "operating-expense-pass-through", "audit-rights"\],  
    seeAlso:,  
    category: "operational"  
  },  
  {  
    term: "Audit Rights",  
    slug: "audit-rights",  
    definition: "A highly negotiated clause that allows a commercial tenant to hire an independent accountant to review the landlord's financial records, ensuring that operating expenses and CAM charges were billed correctly and fairly.",  
    extendedDefinition: "Because state laws rarely provide statutory audit rights for commercial leases (with recent exceptions like California's SB 1103), this right must be explicitly negotiated and drafted into the contract.\[1, 5\] Without a defined audit right, tenants are forced to rely on common law implied rights, which often require filing a costly lawsuit to force formal legal discovery just to view the invoices.\[1\] A robust, tenant-friendly audit clause specifies when the audit can occur (e.g., within 180 days of receiving the CAM reconciliation), who can perform it (landlords typically ban contingency-fee auditors), and explicitly requires the landlord to refund overcharges—sometimes with interest and audit cost reimbursement—if discrepancies exceed a certain threshold, such as 5%.\[1\]",  
    relatedTerms: \["cam-charges", "cam-reconciliation"\],  
    seeAlso:,  
    category: "operational"  
  },  
  {  
    term: "Tenant Representative (Tenant Rep)",  
    slug: "tenant-representative",  
    definition: "A specialized commercial real estate broker who exclusively represents the interests of the business leasing the space, rather than the landlord who owns the building.",  
    extendedDefinition: "Tenant reps act as strategic advisors and fierce advocates, helping businesses analyze complex space requirements, identify potential properties, and aggressively negotiate financial and legal terms—such as TI allowances, base rent, exclusive use clauses, and expansion rights. While they advocate solely for the tenant to achieve the lowest possible occupancy cost, their commission is paradoxically typically paid by the landlord, calculated as a percentage of the total gross lease value and split with the landlord's listing broker. Strict fiduciary duty requires the tenant rep to secure the most favorable terms possible for the lessee, ignoring the financial impact on the landlord.",  
    relatedTerms: \["property-manager"\],  
    seeAlso:,  
    category: "parties"  
  },  
  {  
    term: "Property Manager",  
    slug: "property-manager",  
    definition: "The specialized individual or professional firm hired by the commercial landlord to oversee the day-to-day physical maintenance, tenant relations, and financial operations of the commercial building.",  
    extendedDefinition: "Property managers serve as the primary operational point of contact for all tenants in a building. They are responsible for collecting monthly rent, dispatching maintenance teams, managing critical vendor contracts (landscaping, HVAC maintenance, security), and enforcing strict lease compliance. Crucially from a financial abstraction perspective, property managers compile the property's annual operating budget and calculate the complex year-end CAM reconciliations. Property management administration fees are typically passed through directly to the tenants as an allowable operating expense, normally calculated as 3% to 5% of the building's total gross revenues.",  
    relatedTerms: \["tenant-representative", "cam-charges", "cam-reconciliation"\],  
    seeAlso: \["Asset Manager", "Facility Manager", "Management Fee"\],  
    category: "parties"  
  },  
  {  
    term: "Rentable Square Footage (RSF)",  
    slug: "rentable-square-footage",  
    definition: "The total calculated square footage upon which a commercial tenant's financial rent obligation is based. It includes the tenant's private usable space plus a proportionate, mathematical share of the building's shared common areas.",  
    extendedDefinition: "RSF serves as the ultimate multiplier that determines the tenant's exact financial liability for both base rent and operating expenses. To calculate RSF, the building's total common area (including grand lobbies, public restrooms, fitness centers, and corridors) is mathematically divided among all tenants using a 'load factor' or 'core factor'. For instance, if a tenant physically occupies 10,000 Usable Square Feet (USF) in an office building with a 15% load factor, their Rentable Square Footage (RSF) is logged as 11,500\. Rent and CAM charges are strictly calculated based on this 11,500 RSF figure. BOMA (Building Owners and Managers Association) measurement standards typically govern exactly how these complex spaces are measured and allocated.",  
    relatedTerms: \["usable-square-footage", "base-rent"\],  
    seeAlso:,  
    category: "property"  
  },  
  {  
    term: "Usable Square Footage (USF)",  
    slug: "usable-square-footage",  
    definition: "The actual, physical enclosed space that a tenant exclusively occupies and can actively utilize for their daily business operations, bounded by the interior walls of the leased premises.",  
    extendedDefinition: "USF represents the exact, physical footprint where the commercial tenant actually places desks, inventory, servers, and employees. Crucially, it does not include shared lobbies, elevator banks, or public restrooms. Space planning architects focus purely on USF to determine if a company's projected headcount will fit comfortably within the suite. While the landlord advertises space and charges rent based on the inflated RSF figure, the true spatial efficiency of a commercial building is judged by its ratio of USF to RSF; an older building with massive, inefficient lobbies will feature a disproportionately high load factor, forcing tenants to pay high rent for non-usable aesthetic space.",  
    relatedTerms: \["rentable-square-footage"\],  
    seeAlso:,  
    category: "property"  
  }  
\];

## **Jurisdictional Interventions and Commercial Abstraction Strategies**

While the ontology of terms provides the linguistic framework for extraction, the true intelligence of a lease abstraction platform relies on mapping these clauses against state-specific statutory realities. Historically, commercial leasing was entirely insulated from the consumer-protection laws designed for residential tenants; courts viewed commercial leases as contracts between sophisticated, well-capitalized entities capable of negotiating their own risk allocation.25

However, recent legislative shifts demonstrate a fracturing of this doctrine. States like California are applying residential-style transparency protections to small businesses 26, while states like Texas and Virginia aggressively protect the landlord's right to rapid, non-judicial remedies.28

The integration of state-level data into automated abstraction workflows is essential. For instance, if an NLP engine extracts a "Self-Help Eviction" right from a lease for a property located in Illinois or New Jersey, the system must immediately flag that clause as statutorily void and unenforceable, preventing the property manager from executing an illegal lockout.30

To illustrate the spectrum of regulation, the following analysis categorizes 10 major U.S. markets based on statutory eviction mechanics, municipal rent taxes, and regulatory protections.

### **Comparative Jurisdictional Overview**

| State | Regulatory Stance | Self-Help Lockouts Permitted? | Commercial Rent Tax Imposed? | Statutory Commercial Audit Rights | Key Governing Statute |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **California** | Tenant-Protective | Strictly Illegal | Local overlays only | Yes (Qualified Tenants) | Cal. Civ. Code 1950.9 |
| **Texas** | Landlord-Friendly | **Legal** (If delinquent) | No | No (Lease dictates) | Tex. Prop. Code Ch. 93 |
| **New York** | Moderate / Complex | Restricted | **Yes** (NYC specific) | No (Lease dictates) | RPAPL / NYC Admin Code |
| **Florida** | Landlord-Friendly | Illegal | **Yes** (Statewide) | No (Lease dictates) | Fla. Stat. Chapter 83 |
| **Illinois** | Moderate / Localized | Illegal | Local overlays only | No (Lease dictates) | 735 ILCS 5/9 |
| **Pennsylvania** | Business-Flexible | Restricted | **Yes** (Philadelphia) | No (Lease dictates) | 68 P.S. § 250 |
| **Ohio** | Business-Flexible | **Legal** (Peaceable only) | No | No (Lease dictates) | Ohio Rev. Code Ch. 1923 |
| **Georgia** | Landlord-Friendly | Illegal | Local overlays only | No (Lease dictates) | O.C.G.A. Title 44 |
| **New Jersey** | Highly Procedural | Illegal | No | Implied via Common Law | N.J.S.A. 2A:18-53 |
| **Virginia** | Business-Flexible | **Legal** (Peaceable only) | No | No (Lease dictates) | Code of VA § 55.1-1400 |

The structured data below maps the nuanced statutory landscape across these 10 vital commercial markets. This schema is designed to power automated logic engines, ensuring that critical notice periods extracted from a lease are cross-referenced against the non-waivable minimums mandated by state law.

TypeScript

export interface StateLandlordTenantData {  
  state: string  
  stateCode: string         // 2-letter code  
  slug: string              // lowercase state name with hyphens  
  overview: string          // 2-3 paragraph overview of the state's commercial lease landscape  
  keyStatutes: {  
    name: string            // statute name/code  
    description: string     // what it covers  
    url?: string            // link to official state code if available  
  }  
  keyFacts: {  
    label: string  
    value: string  
  }  
  noticePeriods: {  
    type: string            // e.g., "Lease Termination", "Rent Default"  
    period: string          // e.g., "30 days", "10 business days"  
    details: string  
  }  
  auditRights: {  
    summary: string         // brief overview of CAM audit rights in this state  
    details: string         // paragraph with specifics  
  }  
  faqs: {  
    question: string  
    answer: string  
  }                       // 4-6 FAQs per state, for FAQ schema  
  metaDescription: string   // 150-160 chars for SEO  
}

export const stateData: StateLandlordTenantData \=\\n\\nFor general commercial tenancies not covered by the SB 1103 qualifications, California remains relatively balanced but inherently leans tenant-friendly regarding eviction proceedings. Landlords must strictly adhere to the state's formal Unlawful Detainer process; commercial 'self-help' evictions and lockouts are expressly illegal and expose landlords to severe punitive damages and business interruption lawsuits. Furthermore, the complex interplay of local municipal ordinances—such as localized rent control limits and zoning overlay restrictions in major hubs like San Francisco and Los Angeles—requires practitioners to continuously look beyond the state Civil Code when structuring or abstracting commercial agreements.",  
    keyStatutes:,  
    keyFacts:,  
    noticePeriods:" },  
      { type: "Lease Termination (Qualified Tenant, \> 1 year)", period: "60 days", details: "A mandatory extended notice period for qualified tenants occupying the space for over one year, regardless of contract terms.\[32\]" },  
      { type: "Rent Increase \> 10% (Qualified Tenant)", period: "90 days", details: "Requires 90 days' formal notice for any month-to-month rent increases exceeding 10% of the previous year's rent.\[26\]" }  
    \],  
    auditRights: {  
      summary: "Statutory rights introduced for Qualified Tenants; otherwise strictly governed by negotiated lease terms.",  
      details: "Historically, commercial CAM audit rights in California were strictly contractual. However, under Civil Code Section 1950.9 (SB 1103), landlords are now required to proactively notify Qualified Commercial Tenants of their right to inspect OPEX documentation prior to lease execution. These tenants possess an automatic, non-waivable statutory right to audit upon 30 days' prior written notice, and landlord noncompliance serves as a powerful affirmative defense to any eviction action.\[26\] For larger, non-qualified corporate tenants, common law and explicit lease terms still strictly dictate audit boundaries."  
    },  
    faqs:" },  
      { question: "Can a commercial landlord legally lock out a tenant in California?", answer: "No. California strictly outlaws all forms of self-help evictions for commercial properties. A landlord must go through the formal, judicial Unlawful Detainer court process." },  
      { question: "What happens if a landlord fails to translate a commercial lease?", answer: "Under Civil Code Section 1632, if the lease was negotiated orally in Spanish, Chinese, Tagalog, Vietnamese, or Korean, failure to provide a fully translated lease gives the qualified tenant the absolute right to rescind the lease entirely without penalty." },  
      { question: "Is there a statutory limit on commercial security deposits in CA?", answer: "No. Unlike residential leases which are capped, California Civil Code Section 1950.7 does not place any statutory cap on the amount a landlord can demand for a commercial security deposit." }  
    \],  
    metaDescription: "Explore California commercial landlord-tenant laws, including new SB 1103 protections for qualified tenants, mandatory notice periods, and commercial eviction rules."  
  },  
  {  
    state: "Texas",  
    stateCode: "TX",  
    slug: "texas",  
    overview: "Texas boasts one of the most vigorously landlord-friendly commercial leasing environments in the United States. Commercial real estate operates on the foundational presumption that business entities are sophisticated actors capable of negotiating their own risk and liabilities. Consequently, commercial operations are governed primarily by the common law and the specific, literal terms of the lease contract, which are granted extraordinary deference by Texas judges. Statutory intervention is intentionally minimal, mostly contained within Chapter 93 of the Texas Property Code, which applies exclusively to commercial tenancies and outlines the few boundaries of landlord power.\[25, 28\]\\n\\nUnlike jurisdictions that heavily restrict landlord remedies and mandate long judicial processes, Texas is highly unique in permitting commercial landlords to utilize 'self-help' eviction methods. Specifically, commercial landlords possess the statutory right to change the locks of a commercial tenant who is delinquent in paying rent, circumventing the courts entirely (subject to specific notice posting requirements).\[28, 33\] This regulatory climate results in minimal consumer-style protections for commercial tenants, making the abstraction and negotiation of exact lease terms paramount for tenant survival in the state.",  
    keyStatutes:",  
        url: "https://statutes.capitol.texas.gov"  
      },  
      {  
        name: "Tex. Prop. Code Section 91.001",  
        description: "Establishes default notice periods for terminating tenancies strictly in scenarios where the commercial lease is silent.\[28\]",  
        url: "https://statutes.capitol.texas.gov"  
      }  
    \],  
    keyFacts:" }  
    \],  
    noticePeriods:" },  
      { type: "Month-to-Month Termination", period: "1 month", details: "Requires one month's notice, terminating on the later of the specified day or one month after notice is formally given.\[28\]" }  
    \],  
    auditRights: {  
      summary: "Governed entirely by the negotiated lease terms; there are no statutory commercial audit rights.",  
      details: "Texas law respects the absolute sanctity of the commercial contract. If a commercial tenant wishes to audit CAM charges, property taxes, or operating expenses, the absolute right, procedural methodology, look-back period, and financial remedies must be explicitly codified within the lease agreement. While Texas common law may support limited discovery rights during active litigation, there is absolutely no statutory mandate compelling landlords to open their accounting books to tenants."  
    },  
    faqs:" },  
      { question: "What is the security deposit deadline in Texas?", answer: "Commercial landlords must return the security deposit, or provide a detailed, itemized list of deductions, within 60 days after the tenant surrenders possession and provides a forwarding address.\[34\]" },  
      { question: "Is the duty to mitigate damages waivable in a Texas lease?", answer: "No. Texas law firmly requires landlords to make an objective, good faith effort to find a replacement tenant if a commercial tenant abandons the lease early. This specific duty cannot be waived in the lease contract." },  
      { question: "What notice is required for a commercial eviction lawsuit in TX?", answer: "Unless the commercial lease explicitly alters the timeline, a landlord must serve a 3\-day written Notice to Vacate before filing a forcible detainer suit in justice court.\[33\]" }  
    \],  
    metaDescription: "Understand Texas commercial lease laws, Property Code Chapter 93, commercial lockouts, statutory eviction notices, and landlord-tenant rules."  
  },  
  {  
    state: "New York",  
    stateCode: "NY",  
    slug: "new\-york",  
    overview: "New York presents a complex, bifurcated commercial leasing environment marked by the tension between broader state common laws and the highly specialized, hyper-dense regulatory matrix of New York City. State-level commercial real estate law relies heavily on strict contractual interpretation, viewing commercial tenants as highly sophisticated actors capable of protecting their own interests. However, in stark contrast to states like Texas, New York commercial tenants benefit from stringent anti-harassment protections and exceptionally strict judicial procedures for evictions, heavily disfavoring any form of landlord self-help.\[35\]\\n\\nIn New York City, the abstraction landscape is vastly complicated by powerful municipal overlays, most notably the NYC Commercial Rent Tax (CRT), which actively taxes tenants based on their annualized base rent metrics.\[36\] Additionally, the NYC Non-Residential Tenant Harassment Law offers specific statutory protections against landlords utilizing aggressive operational tactics—such as intentional scaffolding placement or interrupting essential HVAC services—to force out commercial tenants. Eviction proceedings, known legally as summary nonpayment or holdover proceedings, require absolute strict adherence to statutory notice demands before a court filing will be accepted.",  
    keyStatutes:",  
        url: "https://nycadmincode.readthedocs.io"  
      },  
      {  
        name: "NY Real Property Actions and Proceedings Law (RPAPL)",  
        description: "Dictates the strict procedural requirements for commercial evictions, including the mandatory 14-day rent demand.",  
        url: ""  
      },  
      {  
        name: "NYC Non-Residential Tenant Harassment Law",  
        description: "Protects commercial businesses from intentional interference with proper and customary building use designed to force vacatur.\[35\]",  
        url: ""  
      }  
    \],  
    keyFacts:" },  
      { label: "Self-Help Evictions", value: "Heavily restricted by common law; landlords are strongly advised by counsel to exclusively use judicial summary proceedings." },  
      { label: "Security Deposits", value: "No statutory limit for commercial leases, but funds must absolutely not be commingled with the landlord's personal operating assets.\[39\]" },  
      { label: "Harassment Protections", value: "Specific NYC municipal codes protect commercial businesses from 'urban blight' and aggressive operational disruption tactics.\[35\]" },  
      { label: "Warranty of Habitability", value: "Does not apply to commercial leases; a tenant must rely entirely on the negotiated lease maintenance clauses." }  
    \],  
    noticePeriods:" },  
      { type: "Month-to-Month Termination (1-2 yrs occupancy)", period: "60 days", details: "A 60-day notice to vacate is statutorily required for tenants occupying the space for between 1 and 2 years.\[35\]" },  
      { type: "Month-to-Month Termination (\> 2 yrs occupancy)", period: "90 days", details: "A 90-day notice to vacate is required if the tenant has occupied the space for more than 2 full years.\[35\]" }  
    \],  
    auditRights: {  
      summary: "Strictly contract-driven; there is no state statutory right to audit commercial CAM.",  
      details: "New York does not possess any statutory mechanism granting commercial tenants the right to audit landlord operating expenses or CAM charges. The entire scope of audit rights, look-back periods, and the allocation of CPA audit costs must be heavily negotiated prior to execution. Under New York common law, if a lease is silent on audit rights, a tenant must generally allege a formal breach of contract in court to utilize the discovery process to review landlord financial records."  
    },  
    faqs:" },  
      { question: "How much notice is required for a commercial eviction in NY?", answer: "For nonpayment of rent, landlords must serve a strict 14-day written rent demand. For month-to-month lease terminations, the notice period scales from 30 to 90 days depending on the length of occupancy.\[35\]" },  
      { question: "Can a landlord cut off utilities to evict a tenant in NYC?", answer: "No. The NYC Non-Residential Tenant Harassment Law makes it explicitly illegal to intentionally interrupt essential services (such as electricity, water, or heat) in an attempt to force a commercial tenant to vacate the premises.\[35\]" },  
      { question: "Is commercial rent control legal in New York?", answer: "No. While residential rent stabilization is a massive component of NY law, there is currently no legal framework for commercial rent control in New York state." }  
    \],  
    metaDescription: "Navigate New York commercial lease laws, the NYC Commercial Rent Tax (CRT), statutory 14-day rent demands, and strict commercial tenant harassment protections."  
  },  
  {  
    state: "Florida",  
    stateCode: "FL",  
    slug: "florida",  
    overview: "Florida maintains a highly landlord-friendly and remarkably fast-paced commercial real estate ecosystem. Commercial tenancies are strictly governed by Part I of Chapter 83 of the Florida Statutes, which provides a straightforward, highly efficient framework for landlords managing tenant defaults. Unlike states that blend residential and commercial protections or rely heavily on municipal overlays, Florida law explicitly separates the two property types, offering virtually zero consumer-style protections to commercial lessees.\\n\\nThe state emphasizes the absolute primacy of the negotiated lease agreement above all else. Where the lease is silent, statutory defaults apply, which famously include rapid 3-day notice periods for eviction filings.\[40\] Furthermore, Florida is highly unique in imposing a state sales tax directly on commercial rent payments (though the rate has been subject to recent, incremental legislative reductions), creating an additional layer of financial abstraction, liability, and compliance for both property managers and tenants.",  
    keyStatutes:",  
        url: "https://www.flsenate.gov"  
      },  
      {  
        name: "Fla. Stat. § 83.20",  
        description: "Establishes the criteria and the rapid 3-day notice period for executing commercial evictions due to non-payment of rent.\[40\]",  
        url: "https://www.flsenate.gov"  
      }  
    \],  
    keyFacts:" },  
      { label: "Abandonment", value: "Legally presumed if the tenant is absent 30 days, rent is unpaid, and 10 days pass post-notice.\[40\]" },  
      { label: "Lien for Rent", value: "Landlords possess a powerful statutory lien on all tenant property located on the premises for past due rent." }  
    \],  
    noticePeriods:" },  
      { type: "Non-Rent Lease Violation", period: "15 days", details: "A 15-day notice is required for curable lease violations other than non-payment of rent.\[43\]" },  
      { type: "Tenancy at Will (Month-to-Month)", period: "15 days", details: "15 days' notice prior to the exact end of the monthly period is required to terminate.\[41\]" },  
      { type: "Tenancy at Will (Year-to-Year)", period: "3 months", details: "3 months' notice prior to the end of the annual period is required to terminate.\[41\]" }  
    \],  
    auditRights: {  
      summary: "No statutory commercial audit rights; strictly governed by the lease contract.",  
      details: "Florida statutes do not grant commercial tenants any right to audit CAM or operating expenses. If an explicit audit clause is not actively negotiated and incorporated into the physical lease document, the tenant relies solely on Florida common law principles, which generally require initiating costly litigation to demand financial discovery from the landlord."  
    },  
    faqs:" },  
      { question: "Are there rules for holding commercial security deposits in FL?", answer: "No. While residential deposits have strict banking and notice requirements, commercial security deposits are entirely governed by the lease terms. Landlords may legally commingle funds unless the lease explicitly prohibits it.\[42\]" },  
      { question: "Do I have to pay sales tax on my commercial lease in Florida?", answer: "Yes. Florida is the only state in the U.S. that charges state sales tax (plus local county discretionary sales surtax) directly on the total rent paid under a commercial lease." },  
      { question: "What is the penalty for holding over in Florida?", answer: "If the lease does not specify a distinct rate, Florida statute allows the landlord to demand double the monthly rent for any period the tenant refuses to vacate after lease expiration." }  
    \],  
    metaDescription: "Guide to Florida commercial lease laws, including Chapter 83 Part I, rapid 3-day eviction notices, commercial rent sales tax, and security deposit regulations."  
  },  
  {  
    state: "Illinois",  
    stateCode: "IL",  
    slug: "illinois",  
    overview: "Illinois commercial landlord-tenant law is firmly grounded in the state's Code of Civil Procedure, particularly the Forcible Entry and Detainer Act. The state attempts to balance the playing field between landlords and commercial enterprises, though local municipalities—most notably the City of Chicago—impose highly complex additional layers of regulatory compliance. Commercial eviction in Illinois requires strict, unwavering adherence to judicial procedures; self-help lockouts are completely illegal and can result in severe financial damages assessed against the landlord.\[30, 44\]\\n\\nRecent legislative updates in Illinois include mandatory flood disclosures for rental agreements, expanding transparency requirements.\[45\] In Chicago, the municipal code exerts heavy influence on commercial operations, including stringent requirements for commercial storefront registrations designed to combat urban blight.\[46\] Understanding the complex interplay between state eviction statutes and Chicago municipal ordinances is absolutely critical for accurate lease administration and abstraction in this market.",  
    keyStatutes:",  
        url: "https://www.ilga.gov"  
      },  
      {  
        name: "735 ILCS 5/9-209",  
        description: "Establishes the exact 5-day notice requirement and formatting for nonpayment of rent.\[47\]",  
        url: "https://www.ilga.gov"  
      },  
      {  
        name: "Chicago Municipal Code Chapter 5-14",  
        description: "Mandates the registration, liability insurance, and maintenance of vacant commercial storefronts.\[46\]",  
        url: "https://www.chicago.gov"  
      }  
    \],  
    keyFacts:" },  
      { label: "Rent Acceptance", value: "Accepting partial rent during a 5\-day notice period may legally invalidate the eviction suit.\[47\]" },  
      { label: "Vacant Storefronts (Chicago)", value: "Owners must register vacant commercial storefronts, maintain liability insurance, and pay a fee every 6 months.\[46\]" },  
      { label: "Flood Disclosures", value: "Landlords must disclose FEMA flood zones and historical flooding prior to lease signing.\[45\]" },  
      { label: "Process Servers", value: "In Cook County (2025), private process servers can now be utilized for serving eviction notices, speeding up timelines.\[45\]" }  
    \],  
    noticePeriods:" },  
      { type: "Lease Violation", period: "10 days", details: "A 10-day notice to quit is required for breaches of lease terms other than rent.\[48\]" },  
      { type: "Month-to-Month Termination", period: "30 days", details: "30 days' notice is required to terminate a month-to-month tenancy.\[49, 50\]" },  
      { type: "Year-to-Year Termination", period: "60 days", details: "60 days' notice is required to terminate a year-to-year lease.\[49\]" }  
    \],  
    auditRights: {  
      summary: "Governed entirely by the commercial lease agreement; no statutory mandate exists.",  
      details: "Illinois statutes do not grant commercial tenants automatic rights to audit CAM charges or operating expenses. Tenants must negotiate precise audit parameters—such as the timeline, location of document review, and auditor qualifications—within the lease agreement. Disputes are handled strictly as standard breach of contract claims under Illinois civil law."  
    },  
    faqs:" },  
      { question: "How many days' notice must an IL commercial landlord give for unpaid rent?", answer: "The landlord must serve a 5-Day Notice demanding rent. Crucially, the demand must solely include rent, not late fees or damages, to avoid legally invalidating the notice.\[47, 51\]" },  
      { question: "Are commercial landlords in Chicago required to register vacant space?", answer: "Yes. A Chicago ordinance requires property owners to register vacant commercial storefronts, maintain high-limit liability insurance, and pay a bi-annual fee to the city.\[46\]" },  
      { question: "Does Illinois law require a commercial security deposit to be in an interest-bearing account?", answer: "No. The strict rules regarding interest on security deposits generally apply to residential properties in Illinois, not commercial leases." }  
    \],  
    metaDescription: "Comprehensive overview of Illinois commercial lease law, 735 ILCS Forcible Entry Act, 5-day eviction notices, and Chicago municipal commercial registrations."  
  },  
  {  
    state: "Pennsylvania",  
    stateCode: "PA",  
    slug: "pennsylvania",  
    overview: "Pennsylvania commercial leasing operates under the Landlord and Tenant Act of 1951, a legacy statute that bridges both residential and commercial tenancies. However, commercial parties are afforded far more flexibility to actively waive statutory defaults.\[52, 53\] The state's commercial real estate market relies heavily on customized lease drafting, as courts consistently uphold negotiated terms regarding liability, maintenance, and audit rights over statutory baselines.\\n\\nLocal municipalities exert considerable influence on commercial operations in Pennsylvania. For instance, businesses operating in Philadelphia must navigate dense local taxation and registration requirements, such as obtaining a Commercial Activity License and a Business Income and Receipts Tax (BIRT) account, before they can legally operate.\[54, 55\] Unlike residential leases, where security deposits are strictly capped at two months' rent, commercial leases in Pennsylvania face absolutely no statutory limits on deposit size or interest-bearing account requirements.\[56, 57\]",  
    keyStatutes:",  
        url: "https://www.legis.state.pa.us"  
      },  
      {  
        name: "68 P.S. § 250.302 (Distress for Rent)",  
        description: "Allows landlords to seize tenant personal property for unpaid rent, though its use is constitutionally restricted and highly complex.",  
        url: "https://www.legis.state.pa.us"  
      },  
      {  
        name: "Philadelphia Municipal Code",  
        description: "Requires Commercial Activity Licenses for all businesses operating within the city.\[54\]",  
        url: "https://www.phila.gov"  
      }  
    \],  
    keyFacts:" },  
      { label: "Distraint/Distress", value: "Landlords theoretically retain a right to distrain property for rent, but formal judicial process is heavily advised." },  
      { label: "Commercial Activity License", value: "Required for all commercial operations in Philadelphia, inextricably tied to a BIRT account.\[55\]" },  
      { label: "Waiver of Notice", value: "Commercial tenants in PA can legally waive their right to receive a Notice to Quit directly within the lease text." },  
      { label: "Confession of Judgment", value: "PA is one of the few states that allows 'Confession of Judgment' clauses in commercial leases, allowing rapid eviction or monetary judgments without trial." }  
    \],  
    noticePeriods:,  
    auditRights: {  
      summary: "No statutory audit rights; explicitly dependent on active lease negotiations.",  
      details: "Pennsylvania's Landlord and Tenant Act does not address commercial CAM or operating expense audits. Sophisticated commercial leases in PA typically detail the procedural methodology for invoking an audit, limiting the look-back period (often to 1\-2 years), and shifting the cost of the audit to the landlord only if an error margin (e.g., \>5%) is successfully discovered by the tenant."  
    },  
    faqs:" },  
      { question: "What is a Commercial Activity License in Philadelphia?", answer: "It is a mandatory municipal license required to operate any business inside Philadelphia city limits. It links the business directly to their Business Income and Receipts Tax (BIRT) account.\[54\]" },  
      { question: "Can a commercial tenant waive the Notice to Quit in Pennsylvania?", answer: "Yes. In Pennsylvania commercial leases, tenants routinely waive their statutory right to receive a 15-day or 30-day Notice to Quit, allowing landlords to file for immediate eviction upon default." }  
    \],  
    metaDescription: "Pennsylvania commercial lease law insights, Landlord and Tenant Act of 1951, Philadelphia CAL licenses, and Confession of Judgment clauses."  
  },  
  {  
    state: "Ohio",  
    stateCode: "OH",  
    slug: "ohio",  
    overview: "Ohio offers a business-friendly, flexible regulatory environment for commercial real estate. While the Ohio Revised Code Chapter 5321 meticulously outlines residential landlord-tenant duties, these statutes expressly do not apply to commercial leases.\[60, 61\] Instead, commercial leasing in Ohio relies almost entirely on the written contract and common law principles, granting landlords and tenants immense latitude to negotiate their own rules regarding maintenance, liability, and operating expenses.\\n\\nEviction processes are governed by Ohio Revised Code Chapter 1923, known as Forcible Entry and Detainer.\[62\] Notably, Ohio is one of the states where common law still permits commercial 'self-help' evictions (lockouts) for rent default, provided the written lease explicitly authorizes the remedy, all notice periods have expired, and the lockout can be performed peacefully without a breach of the peace.\[61, 63\]",  
    keyStatutes:",  
        url: "https://codes.ohio.gov"  
      },  
      {  
        name: "Ohio Revised Code Chapter 5321",  
        description: "Residential landlord-tenant law. Crucial for commercial practitioners to know it specifically excludes commercial spaces.\[60, 61\]",  
        url: "https://codes.ohio.gov"  
      }  
    \],  
    keyFacts:" },  
      { label: "Statutory Protections", value: "Commercial tenants lack the habitability and retaliation defenses provided to residential tenants.\[65\]" },  
      { label: "Security Deposits", value: "No statutory regulations for commercial security deposit returns or interest; governed entirely by lease." },  
      { label: "Eviction Timelines", value: "Forcible Entry and Detainer hearings are scheduled rapidly, often within 1\-2 weeks of filing.\[65\]" },  
      { label: "Notices", value: "A standard 3\-day notice is required before filing an eviction, unless the lease alters the timeframe.\[61\]" }  
    \],  
    noticePeriods:" },  
      { type: "Notice and Cure", period: "Contractual", details: "Before the 3-day notice, landlords must observe any 'Notice and Cure' periods explicitly written into the commercial lease.\[61\]" }  
    \],  
    auditRights: {  
      summary: "Entirely dependent on negotiated lease provisions.",  
      details: "Ohio law imposes no statutory obligation on commercial landlords to provide CAM or operating expense reconciliations. Tenants must proactively draft continuous audit rights into their leases. Without an express clause, an Ohio court will not infer an audit right, forcing tenants into costly litigation to access accounting records."  
    },  
    faqs:" },  
      { question: "Are commercial tenants covered by ORC 5321?", answer: "No. Ohio Revised Code Chapter 5321 strictly governs residential landlord-tenant relations. Commercial tenants have fewer statutory protections and must rely on their lease.\[61\]" },  
      { question: "What is a Forcible Entry and Detainer action in Ohio?", answer: "It is the formal, fast-track judicial process used by landlords to evict tenants and regain possession of the property under ORC Chapter 1923\.\[61, 62, 65\]" },  
      { question: "Can an Ohio commercial landlord seize my business equipment?", answer: "A landlord may not seize control or ownership of the tenant's personal property or trade fixtures during a lockout. They must accommodate the tenant's retrieval of their contents.\[63\]" }  
    \],  
    metaDescription: "Learn about Ohio commercial real estate laws, ORC 1923 Forcible Entry and Detainer, commercial lockouts, and 3\-day eviction notices."  
  },  
  {  
    state: "Georgia",  
    stateCode: "GA",  
    slug: "georgia",  
    overview: "Georgia operates as a highly landlord-friendly jurisdiction, with commercial lease dynamics heavily favoring the written contract. Title 44, Chapter 7 of the Georgia Code governs landlord and tenant relationships, outlining basic frameworks but allowing commercial parties broad flexibility to structure their agreements and liabilities.\[66, 67\]\\n\\nIn the absence of a written commercial lease, a 'tenancy at will' is created, which mandates specific 60\-day and 30\-day notice periods for termination.\[68\] Commercial landlords in Georgia must use the judicial 'dispossessory' process to evict a tenant; self-help lockouts are illegal. Local governance plays a key role for operational businesses; for example, the City of Atlanta requires comprehensive Business Occupational Tax Certificates (business licenses), necessitating E-Verify affidavits and lease copies, before a tenant can legally open their doors.\[69, 70\]",  
    keyStatutes:",  
        url: "https://law.justia.com"  
      },  
      {  
        name: "O.C.G.A. Section 44-7-7",  
        description: "Dictates the strict notice requirements for terminating a tenancy at will (60 days for landlord, 30 days for tenant).\[71\]",  
        url: "https://law.justia.com"  
      }  
    \],  
    keyFacts:" },  
      { label: "Tenancy at Will", value: "Created when a tenant occupies space and pays rent without a signed written lease.\[68\]" },  
      { label: "Security Deposits", value: "No commercial limits; if tenant vacates without notice, landlord may compile damages and withhold the deposit.\[72\]" },  
      { label: "Usufruct", value: "Leases under 5 years grant a 'usufruct' (right to use) rather than passing an estate in land, limiting transferability.\[67, 73\]" },  
      { label: "Atlanta Licensing", value: "Atlanta mandates Occupational Tax Certificates and E-Verify affidavits for all operating businesses.\[69, 70\]" }  
    \],  
    noticePeriods:" },  
      { type: "Tenancy at Will (Tenant Termination)", period: "30 days", details: "Tenant must give 30 days' notice to terminate the arrangement.\[68\]" },  
      { type: "Rent Default", period: "Immediate", details: "Unless the lease states otherwise, a landlord can immediately demand possession and file a dispossessory affidavit upon failure to pay rent.\[68\]" }  
    \],  
    auditRights: {  
      summary: "Purely contractual; no Georgia statutes mandate CAM transparency.",  
      details: "Commercial tenants in Georgia must strictly negotiate their CAM audit rights within the lease. The courts view commercial leases as arms-length transactions between sophisticated parties and will strictly enforce the exact wording regarding look-back periods, CPA requirements, and document access."  
    },  
    faqs:" },  
      { question: "Can a Georgia landlord evict a commercial tenant without a court order?", answer: "No. Commercial landlords must go through the judicial process by filing a dispossessory affidavit. Self-help evictions are not permitted.\[68\]" },  
      { question: "What notice is required if there is no written commercial lease?", answer: "It becomes a tenancy at will. The landlord must provide a 60\-day notice to terminate or raise rent, and the tenant must provide a 30\-day notice to leave.\[68\]" },  
      { question: "Do I need a business license to sign a commercial lease in Atlanta?", answer: "While you don't need it to sign the lease, you must obtain a Business Occupational Tax Certificate from the City of Atlanta to legally operate. You will need to provide a copy of your lease to obtain the license.\[69, 70\]" }  
    \],  
    metaDescription: "Understand Georgia commercial landlord-tenant law, Title 44 Chapter 7, dispossessory affidavits, usufruct rules, and Atlanta business licensing."  
  },  
  {  
    state: "New Jersey",  
    stateCode: "NJ",  
    slug: "new-jersey",  
    overview: "New Jersey maintains a complex, highly protective statutory environment for tenants, though commercial leases are afforded less regulatory shielding than residential properties. Commercial evictions are governed primarily by N.J.S.A. 2A:18-53. New Jersey is notable for requiring highly specific, jurisdictional notice formats; failure to serve a 'Notice to Quit' correctly completely deprives the court of jurisdiction and results in immediate case dismissal.\[13\]\\n\\nUnlike residential actions under the Anti-Eviction Act, commercial landlords can evict holdover tenants or tenants who breach lease covenants with relatively short notice, provided the judicial process is strictly followed.\[13\] The state prohibits commercial self-help lockouts, mandating that landlords file a summary dispossess complaint. Additionally, New Jersey case law strongly enforces common law inspection rights for corporate shareholders and partners, extending a culture of documentation transparency that often influences commercial lease audit negotiations.\[74\]",  
    keyStatutes:",  
        url: "https://www.nj.gov/dca"  
      }  
    \],  
    keyFacts:" },  
      { label: "Notice Jurisdiction", value: "If a Notice to Quit is served improperly, the NJ court lacks jurisdiction and will dismiss the case.\[13\]" },  
      { label: "Legal Representation", value: "Business entities (LLCs, Corps) must be represented by an attorney in NJ landlord-tenant court.\[31\]" },  
      { label: "Late Fees as Rent", value: "Permitted in commercial leases if explicitly defined as 'additional rent' in the contract." }  
    \],  
    noticePeriods:" },  
      { type: "Disorderly / Willful Destruction", period: "3 days", details: "A 3-day Notice to Quit is required before filing suit for destruction or severe rules violations.\[13, 75\]" },  
      { type: "Lease Breach (with Re-entry right)", period: "3 days", details: "A 3-day Notice to Quit is required for a breach of covenant where the landlord reserved a right of reentry.\[13, 75\]" },  
      { type: "Holdover (Month-to-Month)", period: "1 month", details: "1 month Notice to Quit required to evict a month-to-month holdover tenant.\[13, 75\]" }  
    \],  
    auditRights: {  
      summary: "Driven by contract and common law implied rights.",  
      details: "No specific NJ statute gives commercial tenants CAM audit rights. However, NJ courts have recognized implied rights to verify expenses under common law if the lease is 'silent'. Prudent tenants still draft explicit limitations into the lease to avoid relying on litigation."  
    },  
    faqs:" },  
      { question: "Do I have to give notice before evicting a commercial tenant for unpaid rent in NJ?", answer: "No. Under N.J.S.A. 2A:18-53(b), a landlord can file a summary dispossess action immediately for nonpayment of rent without prior notice, unless the lease contract stipulates a grace period.\[13, 75\]" },  
      { question: "Can I represent my LLC in New Jersey landlord-tenant court?", answer: "No. New Jersey law requires that any business entity (Corporation, LLC, Partnership) be represented by a licensed New Jersey attorney in landlord-tenant proceedings.\[31\]" },  
      { question: "What happens if a commercial tenant damages the property?", answer: "The landlord can issue a 3-day Notice to Quit for willful destruction of premises under N.J.S.A. 2A:18-53(c)(2) before filing for eviction.\[13, 75\]" }  
    \],  
    metaDescription: "Explore New Jersey commercial lease laws, N.J.S.A. 2A:18-53 eviction statutes, Notice to Quit requirements, and commercial court procedures."  
  },  
  {  
    state: "Virginia",  
    stateCode: "VA",  
    slug: "virginia",  
    overview: "Virginia presents a highly robust, business-friendly commercial leasing environment governed strictly by Title 55.1, Chapter 14 of the Code of Virginia (Nonresidential Tenancies).\[29\] Unlike the highly regulated Virginia Residential Landlord and Tenant Act (VRLTA), the commercial code explicitly defers to the terms of the lease agreement, stepping in to apply statutory boundaries only when the contract is completely silent.\[29, 76\]\\n\\nVirginia stands out nationally as one of the few remaining jurisdictions that explicitly permits commercial 'self-help' evictions. If a tenant's right of possession is terminated due to default, a landlord may legally change the locks or shut off utilities without a court order, provided the action does not incite a physical breach of the peace.\[29, 76\] Furthermore, Virginia enforces strict formalities for long-term real estate contracts; leases exceeding five years historically require a seal or seal substitute (such as the phrase 'this deed') to be fully enforceable, presenting a unique abstraction challenge.\[77\]",  
    keyStatutes:",  
        url: "https://law.lis.virginia.gov"  
      },  
      {  
        name: "Code of Virginia § 55.1-1400",  
        description: "Authorizes self-help evictions for commercial landlords, provided there is no breach of the peace.\[29\]",  
        url: "https://law.lis.virginia.gov"  
      },  
      {  
        name: "Code of Virginia § 55.1-1401",  
        description: "Mandates that nonresident commercial property owners must continuously maintain a resident agent in Virginia for service of process.\[29\]",  
        url: "https://law.lis.virginia.gov"  
      }  
    \],  
    keyFacts:" },  
      { label: "Lease Formalities", value: "Leases longer than five years traditionally require a seal or seal substitute (e.g., 'this deed') to be fully enforceable.\[77\]" },  
      { label: "Nonresident Owners", value: "Out-of\-state owners must appoint a resident agent for service of process.\[29\]" },  
      { label: "Property Destruction", value: "If premises are destroyed without tenant fault, the tenant is not bound to pay rent until restored, unless the lease says otherwise.\[29\]" },  
      { label: "Abandoned Property", value: "Following an eviction, the tenant has exactly 24 hours to remove property from the public way before landlord disposal.\[29\]" }  
    \],  
    noticePeriods:" },  
      { type: "Month-to-Month Termination", period: "30 days", details: "30 days' written notice prior to the next rent due date is required to terminate.\[29\]" },  
      { type: "Year-to-Year Termination", period: "3 months", details: "3 months' notice prior to the end of the year is required.\[29\]" },  
      { type: "Change of Use / Rehab", period: "120 days", details: "120 days' notice required if terminating due to substantial building rehabilitation or change of use.\[29\]" }  
    \],  
    auditRights: {  
      summary: "Governed entirely by the lease; no statutory right exists.",  
      details: "Virginia commercial landlords are not statutorily required to provide audit rights for operating expenses. The scope of any CAM audit must be intricately detailed in the lease document, as Virginia courts aggressively prioritize the literal interpretation of the contract over implied equitable rights."  
    },  
    faqs:" },  
      { question: "What is the 5\-Day Notice in a Virginia commercial lease?", answer: "If a commercial lease does not specify a different notice period for default, Virginia law requires the landlord to serve a 5\-day written notice demanding payment or possession before the tenant forfeits the space.\[29, 76\]" },  
      { question: "Why do some Virginia leases say 'Deed' or 'Seal'?", answer: "Under Virginia law, a lease extending beyond a five-year term must meet the formalities of a deed, requiring a seal or a seal substitute. Without it, the court may deem it a month-to-month tenancy.\[77\]" },  
      { question: "Do out-of\-state landlords need a registered agent in VA?", answer: "Yes. Nonresident property owners who lease commercial real estate in Virginia must continuously maintain a resident agent within the Commonwealth.\[29\]" }  
    \],  
    metaDescription: "Virginia commercial landlord-tenant law overview, Title 55.1 Chapter 14, commercial self-help evictions, notice periods, and 5\-year lease deed requirements."  
  }  
\];

## **Strategic Implications for Lease Abstraction and Data Integrity**

The commercial real estate sector is witnessing a foundational paradigm shift in how risk is underwritten and managed. Historically insulated from consumer-protection legislation, commercial leases are now increasingly subject to hyper-local municipal ordinances and sweeping state statutes. The architecture defined above illustrates exactly why static, manual lease abstraction is no longer sufficient; NLP models and CRE professionals must contextualize extracted textual data against the jurisdictional reality of the physical asset.

The introduction of California’s SB 1103 (effective January 2025\) marks a watershed moment in commercial leasing regulation. By introducing the "Qualified Commercial Tenant" framework, California has effectively imposed residential-style transparency protections on microenterprises and nonprofits. Abstracting a California commercial lease now fundamentally requires analyzing whether the tenant fits the statutory criteria (under 5 employees for general businesses, under 10 for restaurants). If they do, standard contractual clauses—such as a 30-day termination notice for a multi-year tenant—are statutorily superseded by mandatory 60-day or 90-day periods. Furthermore, the mandatory translation requirements (Civil Code § 1632\) introduce severe rescission risks if a lease negotiated in Spanish or Mandarin is executed solely in English. Extraction platforms must now flag "negotiation language" as a critical risk variable.

Conversely, the data highlights the stark polarity in landlord remedies across the United States. In jurisdictions like Texas, Ohio, and Virginia, "self-help" evictions (lockouts) remain a legal and highly effective tool for commercial landlords to recover possession without lengthy judicial intervention. However, the legal prerequisite for this remedy often depends on the exact phrasing within the lease contract. An NLP abstraction engine must scan for specific "Right of Re-entry" or "Self-Help Authorization" clauses in Ohio and Texas leases. In New Jersey, Illinois, and New York, such clauses are void as against public policy; attempting a lockout based on boilerplate lease text will expose the landlord to massive business interruption lawsuits.

The financial abstraction challenge is equally complex regarding CAM reconciliations and Audit Rights. Because states like Florida, Texas, and Virginia offer no statutory transparency requirements for commercial operating expenses, tenants rely entirely on negotiated text. The extraction of these clauses requires high-fidelity NLP to capture the four distinct parameters of an audit right: the look-back period (When), auditor restrictions (Who), the physical location of the audit (Where), and the scope of permissible review (What). When a lease is "silent" on audit rights, common law in states like New Jersey provides an implied right of discovery, though realizing this right requires litigation. Abstracting the precise limitations of CAM clauses protects tenants from gross-up mathematical errors and improper capital expenditure pass-throughs.

Ultimately, the synthesis of standardized glossary terminology with dynamic state-law frameworks empowers CRE professionals to move beyond basic data entry. By structuring lease data precisely—mapping financial covenants, continuous operation clauses, and exclusivity provisions against statutory realities—stakeholders can proactively manage portfolio risk, enforce expansion rights (ROFR/ROFO), and optimize their operational revenue.

#### **Works cited**

1. When Audit Rights Go Wrong\! \- NRTA, accessed March 3, 2026, [https://nrta.org/when-audit-rights-go-wrong/](https://nrta.org/when-audit-rights-go-wrong/)  
2. 4.0 landlord/tenant issues \- State Bar of Texas, accessed March 3, 2026, [https://www.texasbar.com/AM/Template.cfm?Section=Disaster\_Resources\_for\_Attorneys\&Template=/CM/ContentDisplay.cfm\&ContentID=42603](https://www.texasbar.com/AM/Template.cfm?Section=Disaster_Resources_for_Attorneys&Template=/CM/ContentDisplay.cfm&ContentID=42603)  
3. SB 1103 A Significant Shift for California Commercial Landlords ..., accessed March 3, 2026, [https://www.squirepattonboggs.com/insights/publications/sb-1103-a-significant-shift-for-california-commercial-landlords-commencing-on-january-1-2025/](https://www.squirepattonboggs.com/insights/publications/sb-1103-a-significant-shift-for-california-commercial-landlords-commencing-on-january-1-2025/)  
4. Commercial Leasing Changes You NEED to Know Starting January 1, 2025, accessed March 3, 2026, [https://bbklaw.com/resources/la-110524-commercial-leasing-changes-you-need-to-know-starting-january-1-2025](https://bbklaw.com/resources/la-110524-commercial-leasing-changes-you-need-to-know-starting-january-1-2025)  
5. Landlords and Tenants Guide \- Texas Real Estate Research Center, accessed March 3, 2026, [https://trerc.tamu.edu/wp-content/uploads/2023/10/Landlord-and-Tenants-Guide.pdf](https://trerc.tamu.edu/wp-content/uploads/2023/10/Landlord-and-Tenants-Guide.pdf)  
6. Code of Virginia Code \- Chapter 14\. Nonresidential Tenancies, accessed March 3, 2026, [https://law.lis.virginia.gov/vacodefull/title55.1/chapter14/](https://law.lis.virginia.gov/vacodefull/title55.1/chapter14/)  
7. Illinois General Assembly \- 735 ILCS 5/ Code of Civil Procedure. \- ILGA.gov, accessed March 3, 2026, [https://www.ilga.gov/legislation/ILCS/details?MajorTopic=\&Chapter=\&ActName=Code%20of%20Civil%20Procedure.\&ActID=2017\&ChapterID=56\&ChapAct=735+ILCS+5%2F\&SeqStart=67300000\&SeqEnd=75500000](https://www.ilga.gov/legislation/ILCS/details?MajorTopic&Chapter&ActName=Code+of+Civil+Procedure.&ActID=2017&ChapterID=56&ChapAct=735+ILCS+5/&SeqStart=67300000&SeqEnd=75500000)  
8. Landlord/Tenant \- NJ Courts, accessed March 3, 2026, [https://www.njcourts.gov/self-help/landlord-tenant](https://www.njcourts.gov/self-help/landlord-tenant)