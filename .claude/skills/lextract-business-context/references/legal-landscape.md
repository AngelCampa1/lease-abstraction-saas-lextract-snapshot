# Legal Landscape Reference

Commercial lease legal context relevant to Lextract's extraction schema, red flag detection, and content strategy. For full state-by-state data, see `docs/content-research/CRE Glossary and State Law Data.md`.

---

## Core Legal Framework for Commercial Leases

Commercial leasing is fundamentally **contract-driven**. Unlike residential leasing, which is heavily regulated by statute, commercial lease terms are primarily governed by the negotiated agreement between the parties. Key principles:

1. **Freedom of contract** -- commercial parties are presumed to be sophisticated and can agree to virtually any terms. Courts rarely intervene to "protect" commercial tenants.
2. **Independent covenant doctrine** -- in most states, a tenant's obligation to pay rent is independent of whether the landlord has fully performed. Tenants cannot withhold rent to pressure dispute resolution.
3. **Contra proferentem** -- ambiguous lease language is construed against the drafter (typically the landlord). This is a tenant's primary interpretive tool.
4. **Lease governs** -- courts interpret obligations according to the lease language. Industry standards (BOMA, IREM) are reference points, not controlling authority.

---

## Commercial Lease Types

Lextract's `lease_structure_type` field captures these classifications. Each type has different implications for CAM exposure, red flag severity, and CamAudit relevance.

### Triple Net (NNN)

The tenant pays base rent plus all operating expenses: property taxes, insurance, and maintenance (the "three nets"). The landlord receives a "clean" net income stream.

- **CAM exposure:** Maximum. Tenant bears all variable costs.
- **Red flag relevance:** All 9 CAM-related red flags (RF-001 through RF-006, RF-013 through RF-020) are critically important.
- **CamAudit relevance:** Highest. NNN tenants have the most to gain from CAM auditing.
- **Common in:** Retail (single-tenant and strip centers), industrial, single-tenant office.

### Gross Lease (Full Service)

The tenant pays a single flat rent amount. The landlord pays all operating expenses from that revenue.

- **CAM exposure:** Minimal in year 1. However, most gross leases include a **base year stop** -- the tenant pays increases above the base year expenses.
- **Red flag relevance:** RF-013 (No Base Year Gross-Up) is the primary concern.
- **CamAudit relevance:** Moderate. Base year manipulation and expense escalation above the stop are auditable.
- **Common in:** Multi-tenant office buildings, short-term commercial engagements.

### Modified Gross

A hybrid structure where the tenant pays base rent plus some, but not all, operating expenses. Typically the tenant pays utilities and janitorial directly while the landlord covers taxes, insurance, and structural maintenance.

- **CAM exposure:** Moderate. Varies significantly by lease.
- **Red flag relevance:** Depends on which expenses are passed through.
- **CamAudit relevance:** Moderate. The split responsibility creates more opportunities for misallocation.
- **Common in:** Office, medical office.

### Percentage Lease

The tenant pays base rent plus a percentage of gross sales above a breakpoint threshold. Primarily retail.

- **CAM exposure:** Varies -- percentage leases can be NNN or gross on the operating expense side.
- **Red flag relevance:** Sales breakpoint and exclusion definitions are critical.
- **CamAudit relevance:** Depends on CAM structure.
- **Common in:** Retail (shopping centers, malls).

### Ground Lease

A long-term lease of land only. The tenant constructs improvements on the land. Terms typically run 50-99 years.

- **CAM exposure:** Typically minimal -- the tenant owns and operates the improvements.
- **Red flag relevance:** Different risk profile; termination and restoration are primary concerns.
- **CamAudit relevance:** Low.
- **Common in:** Development sites, institutional real estate.

---

## State-Specific Commercial Lease Requirements

Commercial lease law varies significantly by state. Lextract extracts the `governing_law_state` field, which determines the legal framework for interpreting the lease. The following summaries cover the 10 states profiled in the content research.

### California

- **Climate:** Tenant-friendly (relatively, for commercial). Extensive statutory framework.
- **Key statute:** Cal. Civ. Code Section 1950.7 (security deposit rules); SB 1103 (eff. Jan 1, 2025) expanded commercial tenant protections for small businesses.
- **SOL (breach of contract):** 4 years (CCP Section 337).
- **Audit rights:** Not statutory for commercial; negotiated in lease. SB 1103 adds some disclosure obligations.
- **Notable:** No statutory limit on commercial security deposits. Lease recording required for terms >1 year. San Francisco and LA have additional commercial tenant ordinances.

### Texas

- **Climate:** Landlord-friendly. Minimal statutory intervention in commercial leasing.
- **Key statute:** Tex. Prop. Code Chapter 93 (commercial tenancy). Tex. Civ. Prac. & Rem. Code Section 16.004 (SOL).
- **SOL:** 4 years.
- **Audit rights:** Not statutory; fully contractual.
- **Notable:** No specific commercial tenant protection statutes. Freedom of contract is the dominant principle. No rent control or commercial tenant anti-retaliation protections.

### New York

- **Climate:** Complex regulatory environment with unique NYC rules.
- **Key statute:** CPLR Section 213 (6-year SOL). NYC has additional commercial rent tax and lease registration requirements.
- **SOL:** 6 years.
- **Audit rights:** Not statutory; contractual. Courts generally enforce lease-defined audit deadlines strictly.
- **Notable:** NYC commercial rent tax applies to tenants paying >$250K/year in certain Manhattan locations. Lease-defined audit windows are strictly enforced.

### Florida

- **Climate:** Landlord-friendly. Growing commercial market.
- **Key statute:** Fla. Stat. Section 83 (landlord-tenant law, primarily residential provisions); Fla. Stat. Section 95.11 (SOL).
- **SOL:** 5 years.
- **Audit rights:** Not statutory; contractual.
- **Notable:** No specific commercial CAM statute. Contract law governs. Security deposit rules under Section 83.49 apply to commercial leases.

### Illinois

- **Climate:** Chicago-centric with specific municipal requirements.
- **Key statute:** 735 ILCS 5/13-206 (10-year SOL for written contracts). Note: 13-205 (5-year) applies to oral contracts.
- **SOL:** 10 years (written contracts) -- longest in the US.
- **Audit rights:** Not statutory; contractual.
- **Notable:** Chicago has specific lease registration and disclosure requirements. The 10-year SOL creates significant lookback potential for CAM disputes.

### Pennsylvania

- **Climate:** Moderate regulation. Philadelphia and Pittsburgh are primary markets.
- **Key statute:** 42 Pa.C.S. Section 5525 (4-year SOL for contract actions).
- **SOL:** 4 years.
- **Audit rights:** Not statutory; contractual.
- **Notable:** Philadelphia has business privilege tax implications for commercial tenants. Confession of judgment clauses (allowing landlord to obtain judgment without trial) are enforceable in PA -- a significant tenant risk.

### Ohio

- **Climate:** Business-friendly. Straightforward statutory framework.
- **Key statute:** ORC Section 2305.06 (6-year SOL, but 8-year for written contracts under certain interpretations).
- **SOL:** 6-8 years.
- **Audit rights:** Not statutory; contractual.
- **Notable:** Ohio's Uniform Commercial Code provisions apply to some lease transactions. Cleveland and Columbus are primary commercial markets.

### Georgia

- **Climate:** Landlord-friendly. Atlanta is the dominant market.
- **Key statute:** O.C.G.A. Title 44 (property code). O.C.G.A. Section 9-3-24 (6-year SOL).
- **SOL:** 6 years.
- **Audit rights:** Not statutory; contractual.
- **Notable:** Georgia law allows landlords significant remedies for tenant default, including distress warrants. No commercial tenant anti-retaliation protections.

### New Jersey

- **Climate:** Tenant-protective relative to other commercial lease states.
- **Key statute:** N.J.S.A. 2A:14-1 (6-year SOL). N.J.S.A. 46:8-19 et seq. (commercial lease provisions).
- **SOL:** 6 years.
- **Audit rights:** Not statutory; contractual, but NJ courts are relatively tenant-friendly in interpreting audit provisions.
- **Notable:** Dense commercial market with significant tenant protections compared to neighboring states. Anti-eviction protections may extend to some commercial tenants in specific municipalities.

### Virginia

- **Climate:** Business-friendly. Northern Virginia/DC corridor is the primary market.
- **Key statute:** Va. Code Section 55.1-1200 et seq. (Virginia Residential Landlord Tenant Act -- does NOT apply to commercial). Va. Code Section 8.01-246 (5-year SOL).
- **SOL:** 5 years.
- **Audit rights:** Not statutory; contractual.
- **Notable:** Virginia's commercial lease law is entirely common law. The Virginia Residential Landlord Tenant Act explicitly does not apply to commercial tenancies. Northern Virginia market is heavily influenced by federal government lease requirements.

---

## Key Dates and Deadlines

Lextract extracts multiple date-related fields. The following explains the legal significance of each.

### Renewal Notice Periods

The `renewal_notice_days` field captures when the tenant must notify the landlord of intent to renew. Missing this deadline typically results in permanent forfeiture of the renewal option.

- **Typical range:** 90-365 days before expiration
- **Critical implication:** Once missed, most leases do not provide a cure or second chance
- **Why Lextract flags this:** RF-011 fires when no renewal option exists at all

### Cure Periods

The `monetary_cure_period` and `non_monetary_cure_period` fields capture how long a tenant has to fix a default.

- **Monetary default cure:** Typically 5-30 days after notice
- **Non-monetary default cure:** Typically 30-60 days after notice
- **Critical implication:** Cure periods under 10 days (RF-007) leave almost no margin for error

### Audit Rights Deadlines

The `cam_audit_deadline_days` field captures the window for disputing CAM reconciliation statements.

- **Typical range:** 90-365 days after statement receipt
- **Critical implication:** Missing the deadline may permanently bar the claim
- **Why Lextract flags this:** RF-015 fires when the window is under 60 days
- **State interaction:** Some states (MA, NM, AK) toll the SOL clock until the tenant discovers the overcharge (discovery rule)

---

## Audit Rights Legal Context

Audit rights are the legal mechanism by which tenants verify landlord CAM charges. This is the bridge between Lextract (extraction) and CamAudit (forensic audit).

### Contractual vs. Statutory

- **Contractual (most states):** Audit rights are negotiated in the lease. If the lease is silent, the tenant generally has no right to audit unless common law provides an implied right.
- **Statutory (very few states):** California's SB 1103 (2025) adds some transparency obligations. Most states have no commercial-specific audit rights statute.
- **Implied rights (some jurisdictions):** Courts in some states recognize an implied right to verify billed amounts under the duty of good faith and fair dealing (*McClain v. Octagon Plaza*, California).

### Audit Rights Clause Patterns

Lextract's schema captures `audit_rights` (boolean) and `cam_audit_deadline_days` (number). Common patterns in lease language:

1. **Full audit rights:** Tenant may audit at any time during the lease term and for [X] years after expiration. Broadest protection.
2. **Time-limited audit rights:** Tenant must audit within [X] days of receiving the reconciliation statement. Most common.
3. **Conditional audit rights:** Tenant may audit only if the dispute exceeds [X]% of billed amount. Creates a financial threshold.
4. **No audit rights:** Lease is silent or explicitly denies audit rights. RF-002 fires.

### Cost of Audit Provisions

Many leases include clauses about who pays for the audit:
- **Tenant pays unless overcharge exceeds [X]%:** Common; typically 3-5% threshold
- **Landlord pays if overcharge exceeds [X]%:** Less common but tenant-favorable
- **Tenant always pays:** Unfavorable but not uncommon

---

## Legal Disclaimers

Lextract output is informational only. Required disclaimers:

**In the UI (results view and export footer):**
"Lextract is a document analysis tool. The extraction results do not constitute legal, tax, or accounting advice. Users should verify all extracted data against the original lease documents. Consult a licensed attorney before making decisions based on extracted data."

**In post-extraction emails:**
"This extraction was generated by Lextract, a document analysis tool. It does not constitute legal advice. [Date]. Verify results against the original lease."

**In exported reports:**
"This report was generated by Lextract.io, an AI-powered lease abstraction platform. The extracted data is provided for informational purposes only and should be verified against the original lease documents. Lextract does not provide legal, tax, or accounting advice."

---

## Commercial Retaliation Gap

Unlike residential tenants, commercial tenants in most states have no statutory protection against landlord retaliation for exercising lease rights (including audit rights).

**Practical consequence:** A landlord can legally decline to renew a commercial tenant's lease after a CAM dispute. This fear is real and rational, especially for small business tenants.

**How Lextract and CamAudit address this:** The CamAudit dispute letter tone selector (Collaborative / Neutral / Aggressive) lets tenants approach disputes non-confrontationally. Lextract's red flag framing uses language like "potential issue" and "review recommended" rather than "violation" to support a collaborative posture.
