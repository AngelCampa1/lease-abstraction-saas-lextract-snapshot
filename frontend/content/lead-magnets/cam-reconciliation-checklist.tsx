import { Document, Page, Text, View, StyleSheet, Link, Image } from '@react-pdf/renderer'
import React from 'react'

const BRAND_LOGO = 'public/brand/lextract-email-logo.png'

const styles = StyleSheet.create({
  page: { padding: '40px 50px', fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  coverPage: {
    padding: '80px 60px',
    backgroundColor: '#0D9488',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  brandLogo: { width: 170, height: 44, marginBottom: 40, backgroundColor: '#FFFFFF', padding: 4, borderRadius: 3 },
  coverTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.3,
    marginBottom: 16,
  },
  coverTagline: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 60 },
  coverFooter: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 'auto' },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0D9488',
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1.5px solid #0D9488',
  },
  checkRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  checkbox: {
    width: 12,
    height: 12,
    border: '1.5px solid #CBD5E1',
    marginRight: 8,
    marginTop: 1,
    flexShrink: 0,
  },
  checkText: { fontSize: 10, color: '#374151', lineHeight: 1.5, flex: 1 },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 8,
    borderBottom: '1px solid #E2E8F0',
  },
  pageHeaderLogo: { width: 74, height: 19 },
  pageHeaderTitle: { fontSize: 10, color: '#94A3B8' },
  pageNumber: { position: 'absolute', bottom: 20, right: 50, fontSize: 9, color: '#94A3B8' },
  ctaPage: { padding: '60px 50px', backgroundColor: '#F8FAFC' },
  ctaTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#0F1923', marginBottom: 16 },
  ctaStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  ctaStepNum: {
    width: 24,
    height: 24,
    backgroundColor: '#0D9488',
    borderRadius: 12,
    marginRight: 12,
    flexShrink: 0,
  },
  ctaStepText: { fontSize: 11, color: '#374151', lineHeight: 1.6, flex: 1 },
  ctaUrl: { fontSize: 14, color: '#0D9488', fontFamily: 'Helvetica-Bold', marginTop: 24 },
})

function CheckItem({ text }: { text: string }) {
  return (
    <View style={styles.checkRow}>
      <View style={styles.checkbox} />
      <Text style={styles.checkText}>{text}</Text>
    </View>
  )
}

function ContentPageHeader({ title }: { title: string }) {
  return (
    <View style={styles.pageHeader}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not support alt props. */}
      <Image src={BRAND_LOGO} style={styles.pageHeaderLogo} />
      <Text style={styles.pageHeaderTitle}>{title}</Text>
    </View>
  )
}

export default function CamReconChecklist() {
  return (
    <Document
      title="CAM Reconciliation Audit Checklist"
      author="Angel Campa, Founder"
      subject="CAM reconciliation audit reference checklist for commercial tenants"
    >
      {/* Cover Page */}
      <Page size="LETTER" style={styles.coverPage}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not support alt props. */}
        <Image src={BRAND_LOGO} style={styles.brandLogo} />
        <Text style={styles.coverTitle}>CAM Reconciliation{'\n'}Audit Checklist</Text>
        <Text style={styles.coverTagline}>Verify every charge. Recover what&apos;s yours.</Text>
        <Text style={styles.coverFooter}>lextract.io</Text>
      </Page>

      {/* Page 2 - Sections 1-4 */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="CAM Reconciliation Audit Checklist" />

        <Text style={styles.sectionTitle}>Section 1 - Pre-Audit Setup</Text>
        <CheckItem text="Pull the lease, all amendments, and exhibits before requesting landlord&apos;s reconciliation" />
        <CheckItem text="Identify the lease year(s) being audited and confirm the audit rights window (typically 1-3 years)" />
        <CheckItem text="Confirm your pro-rata share in the reconciliation matches the lease&apos;s calculation method" />
        <CheckItem text="Request the landlord&apos;s full operating expense breakdown by line item for the audit year" />
        <CheckItem text="Document the controllable expense base for cap calculations" />

        <Text style={styles.sectionTitle}>Section 2 - Gross-Up Verification</Text>
        <CheckItem text="Identify any partial-occupancy years where expenses were grossed up" />
        <CheckItem text="Confirm gross-up percentage used (typically to 90% or 95% occupancy)" />
        <CheckItem text="Verify that only controllable expenses were grossed up, not utilities or insurance" />
        <CheckItem text="Cross-reference gross-up calculation against actual occupancy data" />

        <Text style={styles.sectionTitle}>Section 3 - Exclusions Audit</Text>
        <CheckItem text="Compare each line item against the lease&apos;s exclusions schedule" />
        <CheckItem text="Common exclusions to check: capital improvements, landlord depreciation, leasing commissions, advertising, financing costs" />
        <CheckItem text="Flag any management fee exceeding the lease&apos;s stated cap (typically 3-5% of gross revenues)" />
        <CheckItem text="Identify any single-tenant costs charged to the common area pool" />

        <Text style={styles.sectionTitle}>Section 4 - Capital Expenditure Treatment</Text>
        <CheckItem text="Separate capital from expense line items in the landlord&apos;s statement" />
        <CheckItem text="Confirm capital items are amortized (not expensed) over useful life per the lease" />
        <CheckItem text="Verify amortization period aligns with lease requirements" />
        <CheckItem text="Flag any capital items added in the final 3 years of the lease term" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 3 - Sections 5-8 */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="CAM Reconciliation Audit Checklist" />

        <Text style={styles.sectionTitle}>Section 5 - Pro-Rata Share Verification</Text>
        <CheckItem text="Confirm denominator used: total rentable, occupied, or leased area" />
        <CheckItem text="Verify denominator against current rent roll and lease provisions" />
        <CheckItem text="Calculate your pro-rata share independently and compare" />
        <CheckItem text="Flag discrepancies greater than 0.5% as material" />

        <Text style={styles.sectionTitle}>Section 6 - Administrative &amp; Management Fees</Text>
        <CheckItem text="Confirm management fee is applied only to eligible expenses per the lease" />
        <CheckItem text="Check whether management fee is included in the CAM cap calculation" />
        <CheckItem text="Verify no double-counting of management fee and other administrative costs" />
        <CheckItem text="Compare management fee percentage to lease provision and market norms (3-5%)" />

        <Text style={styles.sectionTitle}>Section 7 - Controllable Expense Cap</Text>
        <CheckItem text="Identify all controllable expenses subject to the annual cap" />
        <CheckItem text="Confirm cap percentage (typically 3-5% year-over-year or cumulative)" />
        <CheckItem text="Calculate maximum allowed controllable pass-through based on prior year actual" />
        <CheckItem text="Flag any year where controllable expenses exceeded the cap" />

        <Text style={styles.sectionTitle}>Section 8 - Reconciliation Math Check</Text>
        <CheckItem text="Recompute tenant&apos;s share from line items independently" />
        <CheckItem text="Compare to landlord&apos;s billed amount" />
        <CheckItem text="Calculate estimated over/under-payment" />
        <CheckItem text="Document findings for demand letter or negotiation" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 4 - Document Request Package */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="CAM Reconciliation Audit Checklist" />

        <Text style={styles.sectionTitle}>Section 9 - Document Request Package</Text>
        <CheckItem text="Annual CAM reconciliation statement with tenant ledger detail and all monthly estimated CAM payments credited" />
        <CheckItem text="General ledger export for each operating expense account included in CAM" />
        <CheckItem text="Vendor invoices for every line item over 10% of total CAM or any item that increased more than 15% year over year" />
        <CheckItem text="Management agreement and fee calculation schedule showing the fee base used by the landlord" />
        <CheckItem text="Insurance premium invoices, tax bills, utility bills, and payroll allocation schedules" />
        <CheckItem text="Capital project invoices, amortization schedule, useful-life support, and interest rate used" />

        <Text style={styles.sectionTitle}>Section 10 - Receipt Tracking</Text>
        <CheckItem text="Log request date, landlord response deadline, documents received, and missing document follow-up date" />
        <CheckItem text="Mark incomplete support as disputed until landlord provides invoice-level detail" />
        <CheckItem text="Keep original files untouched and work from copies so the audit trail remains clean" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 5 - Calculation Worksheet */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="CAM Reconciliation Audit Checklist" />

        <Text style={styles.sectionTitle}>Section 11 - Cap Calculation Checks</Text>
        <CheckItem text="Start with prior year actual controllable expenses after removing exclusions and non-controllable charges" />
        <CheckItem text="Apply the contractual cap percentage only to expenses the lease defines as controllable" />
        <CheckItem text="For non-cumulative caps, compare current year controllable expenses to prior year allowed controllable expenses" />
        <CheckItem text="For cumulative caps, calculate unused carryforward and document the cumulative cap bank" />
        <CheckItem text="Remove taxes, insurance, utilities, snow removal, and other non-controllable costs before cap testing when required" />

        <Text style={styles.sectionTitle}>Section 12 - Overcharge Summary</Text>
        <CheckItem text="Calculate gross billed CAM less allowed CAM before applying tenant pro-rata share" />
        <CheckItem text="Multiply disallowed expense by tenant pro-rata share and tie to the amount billed" />
        <CheckItem text="Separate confirmed overcharges from documentation gaps that require follow-up" />
        <CheckItem text="Add interest only if the lease, statute, or settlement position supports it" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 6 - Dispute and Escalation Workflow */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="CAM Reconciliation Audit Checklist" />

        <Text style={styles.sectionTitle}>Section 13 - Dispute Notice Workflow</Text>
        <CheckItem text="Confirm the dispute deadline and notice method before sending any preliminary findings" />
        <CheckItem text="State the audit year, disputed categories, requested backup, and reservation of rights clearly" />
        <CheckItem text="Attach a summary schedule showing lease clause, landlord charge, allowed amount, and variance" />
        <CheckItem text="Send by the lease-required method and keep delivery confirmation with the audit file" />
        <CheckItem text="Calendar response deadlines, follow-up calls, and any tolling agreement dates" />

        <Text style={styles.sectionTitle}>Section 14 - Settlement Preparation</Text>
        <CheckItem text="Rank findings by documentary strength: clear lease violation, unsupported charge, market reasonableness issue" />
        <CheckItem text="Separate refund request, future billing correction, and backup-documentation request" />
        <CheckItem text="Prepare a clean executive summary that a property manager can approve without reading the full audit file" />
        <CheckItem text="Track agreed credits through the next reconciliation so the recovery is actually received" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 7 - Line Item Review Guide */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="CAM Reconciliation Audit Checklist" />

        <Text style={styles.sectionTitle}>Section 15 - High-Risk Line Items</Text>
        <CheckItem text="Repairs and maintenance: inspect large one-time repairs for capital treatment or tenant-specific benefit" />
        <CheckItem text="Security: confirm service hours, staffing levels, and allocation across common areas versus tenant spaces" />
        <CheckItem text="Utilities: verify meters, vacant-space allocations, after-hours charges, and non-recoverable tenant usage" />
        <CheckItem text="Insurance: separate property insurance, liability insurance, deductibles, and landlord corporate coverage" />
        <CheckItem text="Taxes: confirm appeals, refunds, special assessments, and tax consultant fees are handled as the lease requires" />
        <CheckItem text="Payroll: verify only on-site personnel and permitted overhead allocations are included" />

        <Text style={styles.sectionTitle}>Section 16 - Evidence File Naming</Text>
        <CheckItem text="Name files by audit year, expense category, vendor, and invoice date so support can be traced quickly" />
        <CheckItem text="Keep a findings index with one row per disputed charge and links to support documents" />
        <CheckItem text="Mark each finding as lease-supported, documentation-supported, both, or unresolved" />
        <CheckItem text="Retain a clean copy of the final reconciliation and a marked copy with audit annotations" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 8 - Audit File Index */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="CAM Reconciliation Audit Checklist" />

        <Text style={styles.sectionTitle}>Appendix - Audit File Index</Text>
        <CheckItem text="Lease and amendment package with highlighted CAM, audit rights, cap, exclusion, tax, insurance, and notice provisions" />
        <CheckItem text="Landlord reconciliation statement, tenant ledger, prior-year statement, and annual budget for variance testing" />
        <CheckItem text="Expense support folder organized by category with invoice, contract, and payment backup where available" />
        <CheckItem text="Calculation workbook showing allowed CAM, disallowed CAM, cap calculation, pro-rata share, and tenant recovery request" />
        <CheckItem text="Correspondence log with request dates, landlord responses, follow-up notes, dispute notices, and delivery confirmations" />
        <CheckItem text="Settlement tracker showing requested credit, agreed credit, payment timing, and next reconciliation confirmation" />

        <Text style={styles.sectionTitle}>Final Review Before Sending Findings</Text>
        <CheckItem text="Every disputed charge ties to both a lease clause and a supporting document gap or invoice-level issue" />
        <CheckItem text="All math is reviewed independently and formulas are locked before the summary is sent" />
        <CheckItem text="The dispute notice deadline is confirmed one last time against the lease and receipt date" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* CTA Page */}
      <Page size="LETTER" style={styles.ctaPage}>
        <Text style={styles.ctaTitle}>
          Let Lextract flag CAM issues before{'\n'}your audit rights expire
        </Text>

        <View style={styles.ctaStep}>
          <View style={styles.ctaStepNum} />
          <Text style={styles.ctaStepText}>
            Upload your lease - Lextract extracts CAM provisions, caps, exclusions, and pro-rata share methodology
          </Text>
        </View>
        <View style={styles.ctaStep}>
          <View style={styles.ctaStepNum} />
          <Text style={styles.ctaStepText}>
            Every CAM clause is validated and flagged if it deviates from market standard
          </Text>
        </View>
        <View style={styles.ctaStep}>
          <View style={styles.ctaStepNum} />
          <Text style={styles.ctaStepText}>
            Export your abstraction to share with your auditor before the window closes
          </Text>
        </View>

        <Link src="https://lextract.io" style={styles.ctaUrl}>
          Try free at lextract.io - no credit card required
        </Link>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>
    </Document>
  )
}
