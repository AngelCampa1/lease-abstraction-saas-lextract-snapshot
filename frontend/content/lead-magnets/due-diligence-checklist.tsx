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

export default function DueDiligenceChecklist() {
  return (
    <Document
      title="Commercial Lease Due Diligence Checklist"
      author="Angel Campa, Founder"
      subject="Due diligence checklist for commercial real estate acquisitions and portfolio reviews"
    >
      {/* Cover Page */}
      <Page size="LETTER" style={styles.coverPage}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not support alt props. */}
        <Image src={BRAND_LOGO} style={styles.brandLogo} />
        <Text style={styles.coverTitle}>Commercial Lease Due{'\n'}Diligence Checklist</Text>
        <Text style={styles.coverTagline}>For acquisitions, portfolio reviews, and lease-up</Text>
        <Text style={styles.coverFooter}>lextract.io</Text>
      </Page>

      {/* Page 2 - Sections 1-3 */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Due Diligence Checklist" />

        <Text style={styles.sectionTitle}>Section 1 - Rent Roll Verification</Text>
        <CheckItem text="Confirm all tenants on the rent roll have executed leases on file" />
        <CheckItem text="Verify current in-place rent against each lease's current rent schedule" />
        <CheckItem text="Identify any side letters, concessions, or informal arrangements not in the lease" />
        <CheckItem text="Confirm all rent abatements, free rent periods, and their remaining duration" />
        <CheckItem text="Flag tenants paying below-market rent and assess economic impact on value" />
        <CheckItem text="Verify security deposit amounts on hand match lease schedules" />

        <Text style={styles.sectionTitle}>Section 2 - Lease Document Review</Text>
        <CheckItem text="Confirm fully executed copy of every lease, amendment, and exhibit is available" />
        <CheckItem text="Identify all amendments and riders and verify they are reflected in the rent roll" />
        <CheckItem text="Check for any lease guaranties and confirm current validity of each guarantor" />
        <CheckItem text="Verify no unexercised options that could encumber future ownership" />
        <CheckItem text="Confirm lease is binding on successors and assigns (standard assignment clause)" />
        <CheckItem text="Review any side letter or comfort letter that modifies economic terms" />

        <Text style={styles.sectionTitle}>Section 3 - Tenant Financial Status</Text>
        <CheckItem text="Assess payment history for last 24 months for each tenant" />
        <CheckItem text="Identify any tenants in arrears or with recurring late payment patterns" />
        <CheckItem text="Review any prior default notices or cure letters on file" />
        <CheckItem text="Assess tenant credit quality: public company financials, Dun &amp; Bradstreet, etc." />
        <CheckItem text="Identify any tenants in active bankruptcy or reorganization proceedings" />
        <CheckItem text="Flag any tenants on month-to-month holdover and assess rollover risk" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 3 - Sections 4-5 */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Due Diligence Checklist" />

        <Text style={styles.sectionTitle}>Section 4 - Options &amp; Encumbrances</Text>
        <CheckItem text="Inventory all unexercised renewal options and their notice deadlines" />
        <CheckItem text="Identify all ROFOs and ROFRs that could affect future sale or lease" />
        <CheckItem text="Confirm no outstanding expansion options that could reduce vacant space" />
        <CheckItem text="Review all co-tenancy clauses and assess whether current anchor status is stable" />
        <CheckItem text="Identify any ground lease or master lease structure affecting title" />

        <Text style={styles.sectionTitle}>Section 5 - Operating Expense Obligations</Text>
        <CheckItem text="Quantify outstanding TI allowances and landlord work obligations" />
        <CheckItem text="Calculate total remaining free rent obligations across all tenants" />
        <CheckItem text="Assess deferred maintenance and landlord repair obligations per lease" />
        <CheckItem text="Review CAM reconciliation status: any open disputes or unpaid amounts" />
        <CheckItem text="Confirm all estoppel certificates are current (dated within 30 days of close)" />

        <Text style={styles.sectionTitle}>Section 6 - Insurance &amp; Legal Compliance</Text>
        <CheckItem text="Verify all tenants carry required insurance and landlord is named additional insured" />
        <CheckItem text="Confirm landlord's property and liability insurance is in force through close" />
        <CheckItem text="Review any pending litigation involving the property or any tenant" />
        <CheckItem text="Check zoning compliance for all tenant uses" />
        <CheckItem text="Confirm certificate of occupancy is in place for all occupied spaces" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 4 - Section 7 */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Due Diligence Checklist" />

        <Text style={styles.sectionTitle}>Section 7 - Rollover &amp; Leasing Risk</Text>
        <CheckItem text="Identify all leases expiring within 12, 24, and 36 months" />
        <CheckItem text="Calculate percentage of total GLA at risk of rollover in each period" />
        <CheckItem text="Assess market absorption and achievable renewal/replacement rents" />
        <CheckItem text="Review any exclusive use restrictions that limit re-leasing flexibility" />
        <CheckItem text="Estimate leasing cost exposure: TI, free rent, broker commissions per square foot" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 5 - Rent Roll Tie-Out */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Due Diligence Checklist" />

        <Text style={styles.sectionTitle}>Section 8 - Rent Roll Tie-Out Procedure</Text>
        <CheckItem text="Tie every occupied suite on the rent roll to an executed lease, amendment, commencement agreement, or estoppel" />
        <CheckItem text="Recalculate current monthly rent from the lease schedule and compare it to seller's rent roll" />
        <CheckItem text="Verify expense recoveries separately from base rent so NNN and gross leases are not blended" />
        <CheckItem text="Create a variance log for rent, square footage, lease dates, security deposits, and options" />
        <CheckItem text="Ask seller to explain every variance before inspection period expiration" />
        <CheckItem text="Confirm seller prorations at closing use corrected values, not the original marketing rent roll" />

        <Text style={styles.sectionTitle}>Section 9 - Estoppel Cross-Check</Text>
        <CheckItem text="Compare estoppel-stated rent, deposit, commencement, expiration, amendments, and defaults against abstracted lease data" />
        <CheckItem text="Flag any tenant exception in the estoppel as a diligence issue until counsel clears it" />
        <CheckItem text="Confirm estoppels are dated close enough to closing to satisfy lender and purchase agreement requirements" />
        <CheckItem text="Treat missing anchor or major-tenant estoppels as a closing condition, not a post-close task" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 6 - Closing Risk Register */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Due Diligence Checklist" />

        <Text style={styles.sectionTitle}>Section 10 - Closing Risk Register</Text>
        <CheckItem text="List every open lease issue with owner, severity, financial impact, and required closing action" />
        <CheckItem text="Quantify landlord obligations that survive closing: TI allowances, free rent, repairs, signage, and exclusive-use enforcement" />
        <CheckItem text="Separate purchase-price issues from post-close asset-management issues" />
        <CheckItem text="Identify which issues require seller credit, escrow, representation, indemnity, or closing condition" />
        <CheckItem text="Confirm all lease files, notices, guarantees, certificates, and correspondence are included in final data-room export" />

        <Text style={styles.sectionTitle}>Section 11 - Investment Committee Summary</Text>
        <CheckItem text="Summarize lease-driven upside: mark-to-market rent, expiring below-market leases, recoverable CAM, and expansion demand" />
        <CheckItem text="Summarize downside: rollover concentration, weak guaranties, unfunded obligations, co-tenancy exposure, and option deadlines" />
        <CheckItem text="Provide a corrected rent roll and explain every material difference from seller's initial rent roll" />
        <CheckItem text="Attach the risk register and flag unresolved items that must be tracked on day one after closing" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 7 - Post-Close Handoff */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Due Diligence Checklist" />

        <Text style={styles.sectionTitle}>Section 12 - Day-One Asset Management Handoff</Text>
        <CheckItem text="Transfer corrected abstracts, rent roll, estoppels, guarantees, and notice addresses into the asset management system" />
        <CheckItem text="Calendar all option deadlines, CAM reconciliation windows, TI obligations, and insurance certificate renewal dates" />
        <CheckItem text="Assign an owner for every open seller obligation, tenant dispute, and unresolved lease-document gap" />
        <CheckItem text="Send tenant welcome letters only after verifying legal notice addresses and payment instructions" />
        <CheckItem text="Reconcile security deposits received at closing to the lease file and tenant ledger" />
        <CheckItem text="Create a 30/60/90 day follow-up plan for expiring leases, open estoppels, and missing insurance certificates" />

        <Text style={styles.sectionTitle}>Section 13 - Diligence Lessons Learned</Text>
        <CheckItem text="Record recurring seller data-room gaps so the next acquisition request list is sharper" />
        <CheckItem text="Track which lease fields required attorney review and which could be standardized in future abstracts" />
        <CheckItem text="Compare diligence findings against underwriting assumptions after close and update acquisition templates" />
        <CheckItem text="Archive the corrected source-of-truth rent roll separately from seller's original marketing rent roll" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 8 - Diligence Deliverables */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Due Diligence Checklist" />

        <Text style={styles.sectionTitle}>Appendix - Final Diligence Deliverables</Text>
        <CheckItem text="Corrected rent roll with source references for rent, square footage, lease dates, recovery structure, deposits, and options" />
        <CheckItem text="Lease exception report listing every missing document, tenant default, estoppel exception, open obligation, and pricing issue" />
        <CheckItem text="Critical dates calendar covering option notices, expirations, rent escalations, audit windows, TI deadlines, and insurance renewals" />
        <CheckItem text="Closing credit schedule for unfunded TI, free rent, tenant disputes, deposits, and seller-prorated obligations" />
        <CheckItem text="Post-close action plan with owner, due date, and resolution status for every open lease issue" />
        <CheckItem text="Investment committee memo appendix summarizing lease-driven value impact by tenant and risk category" />

        <Text style={styles.sectionTitle}>Evidence Standard</Text>
        <CheckItem text="No material diligence conclusion should rely only on seller summary data when the lease document is available" />
        <CheckItem text="Every material rent roll correction should cite the lease, amendment, estoppel, or tenant ledger that supports it" />
        <CheckItem text="All unresolved exceptions should be expressly accepted, credited, escrowed, or made a closing condition" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* CTA Page */}
      <Page size="LETTER" style={styles.ctaPage}>
        <Text style={styles.ctaTitle}>
          Lextract processes your entire{'\n'}rent roll in minutes
        </Text>

        <View style={styles.ctaStep}>
          <View style={styles.ctaStepNum} />
          <Text style={styles.ctaStepText}>
            Upload each lease PDF - Lextract extracts all critical due diligence fields automatically
          </Text>
        </View>
        <View style={styles.ctaStep}>
          <View style={styles.ctaStepNum} />
          <Text style={styles.ctaStepText}>
            Options, encumbrances, TI obligations, and rollover risk are extracted and flagged in seconds
          </Text>
        </View>
        <View style={styles.ctaStep}>
          <View style={styles.ctaStepNum} />
          <Text style={styles.ctaStepText}>
            Export a structured Excel workbook or PDF abstract to share with your team
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
