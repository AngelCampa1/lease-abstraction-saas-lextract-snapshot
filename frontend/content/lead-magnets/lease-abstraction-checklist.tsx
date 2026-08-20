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

export default function LeaseAbstractionChecklist() {
  return (
    <Document
      title="Commercial Lease Abstraction Checklist"
      author="Angel Campa, Founder"
      subject="126-field commercial lease abstraction reference checklist"
    >
      {/* Cover Page */}
      <Page size="LETTER" style={styles.coverPage}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not support alt props. */}
        <Image src={BRAND_LOGO} style={styles.brandLogo} />
        <Text style={styles.coverTitle}>Commercial Lease{'\n'}Abstraction Checklist</Text>
        <Text style={styles.coverTagline}>126 fields. Every clause. Nothing missed.</Text>
        <Text style={styles.coverFooter}>lextract.io</Text>
      </Page>

      {/* Page 2 - Sections 1-4 */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Abstraction Checklist" />

        <Text style={styles.sectionTitle}>Section 1 - Parties &amp; Property</Text>
        <CheckItem text="Verify landlord legal entity name matches signature block exactly" />
        <CheckItem text="Verify tenant legal entity name and state of formation" />
        <CheckItem text="Confirm premises address, building name, floor, and suite number" />
        <CheckItem text="Record total rentable square footage and method of measurement (BOMA, usable, etc.)" />
        <CheckItem text="Identify all guarantors and confirm guaranty type (full, partial, burn-down)" />

        <Text style={styles.sectionTitle}>Section 2 - Lease Term &amp; Key Dates</Text>
        <CheckItem text="Record commencement date and confirm against possession or occupancy certificate" />
        <CheckItem text="Record expiration date and calculate total term length" />
        <CheckItem text="Note any landlord contingencies that could delay commencement" />
        <CheckItem text="Extract rent commencement date (may differ from commencement date)" />
        <CheckItem text="Record all renewal option exercise deadlines with required notice periods" />
        <CheckItem text='Flag any date tied to a "going dark" or co-tenancy trigger' />

        <Text style={styles.sectionTitle}>Section 3 - Base Rent &amp; Escalations</Text>
        <CheckItem text="Extract base rent for each lease year in $/SF/year and $/month" />
        <CheckItem text="Identify escalation type: fixed step, CPI, percentage over base" />
        <CheckItem text="For CPI escalations: note index, cap, floor, and calculation date" />
        <CheckItem text="For fixed steps: tabulate every rent step through lease expiration" />
        <CheckItem text="Confirm free rent periods, abatements, and their conditions for claw-back" />
        <CheckItem text="Note any percentage rent provision and natural breakpoint calculation" />
        <CheckItem text="Flag any rent reconciliation or true-up obligations" />

        <Text style={styles.sectionTitle}>Section 4 - Operating Expenses &amp; CAM</Text>
        <CheckItem text="Identify gross, modified gross, NNN, or full-service lease structure" />
        <CheckItem text="Extract estimated CAM pass-through amount and reconciliation frequency" />
        <CheckItem text="Identify all exclusions from operating expenses (capital, management fee cap, etc.)" />
        <CheckItem text="Note any CAM cap: cumulative or year-over-year, controllable vs. total" />
        <CheckItem text="Record admin/management fee percentage and whether it applies to all expenses" />
        <CheckItem text="Confirm tenant's pro-rata share and calculation method (leased vs. total vs. occupied)" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 3 - Sections 5-8 */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Abstraction Checklist" />

        <Text style={styles.sectionTitle}>Section 5 - Tenant Improvements &amp; Allowances</Text>
        <CheckItem text="Extract TI allowance amount ($/SF or lump sum)" />
        <CheckItem text="Note TI outside date and consequences of missing deadline" />
        <CheckItem text="Identify landlord work vs. tenant work scope" />
        <CheckItem text="Record any landlord control rights over TI construction" />
        <CheckItem text="Note TI claw-back provisions if tenant vacates early" />

        <Text style={styles.sectionTitle}>Section 6 - Options (Renewal, Expansion, Termination)</Text>
        <CheckItem text="List all renewal options: number of terms, notice period, new rent formula" />
        <CheckItem text="List all expansion options: space, timing, notice, rent terms" />
        <CheckItem text="List any right of first offer or right of first refusal and trigger conditions" />
        <CheckItem text="Extract termination option: date, penalty formula (unamortized costs + additional), notice" />
        <CheckItem text="Confirm whether options are personal to named tenant and survive assignment" />
        <CheckItem text="Note any conditions precedent (must not be in default, must be occupying, etc.)" />

        <Text style={styles.sectionTitle}>Section 7 - Use, Exclusivity &amp; Parking</Text>
        <CheckItem text="Extract permitted use clause verbatim" />
        <CheckItem text="Identify any exclusive use provision benefiting the tenant" />
        <CheckItem text="Identify any exclusive use provision restricting the tenant (check co-tenants)" />
        <CheckItem text="Note prohibited uses and hours of operation requirements" />
        <CheckItem text="Extract parking ratio, reserved spaces, and monthly parking cost if applicable" />

        <Text style={styles.sectionTitle}>Section 8 - Assignment &amp; Subletting</Text>
        <CheckItem text="Note whether landlord consent is required and any deemed-consent period" />
        <CheckItem text="Identify recapture rights and whether landlord shares in profit" />
        <CheckItem text='Confirm transfer to affiliates/parent: is it a "permitted transfer"?' />
        <CheckItem text="Note any change-of-control provision that triggers assignment consent" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 4 - Sections 9-11 */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Abstraction Checklist" />

        <Text style={styles.sectionTitle}>Section 9 - Insurance &amp; Indemnity</Text>
        <CheckItem text="Extract tenant's required commercial general liability coverage limit" />
        <CheckItem text="Note additional insured requirements and waiver of subrogation" />
        <CheckItem text="Confirm property insurance obligations and who insures tenant improvements" />
        <CheckItem text="Identify any indemnification obligations beyond standard mutual indemnity" />

        <Text style={styles.sectionTitle}>Section 10 - Default &amp; Remedies</Text>
        <CheckItem text="Record monetary default cure period (days after notice)" />
        <CheckItem text="Record non-monetary default cure period (days, plus extended cure for complex repairs)" />
        <CheckItem text="Identify any self-help rights for tenant if landlord fails to make repairs" />
        <CheckItem text="Note landlord's remedies at law and any limitation on consequential damages" />
        <CheckItem text="Confirm notice requirements: written, certified mail, to whom" />

        <Text style={styles.sectionTitle}>Section 11 - Special Provisions &amp; Red Flags</Text>
        <CheckItem text="Flag any co-tenancy clause (anchor tenant, occupancy %, remedy)" />
        <CheckItem text="Flag any force majeure clause that could excuse rent or extend term" />
        <CheckItem text="Note any SNDA status: signed, recorded, in negotiation" />
        <CheckItem text="Identify any construction, expansion, or major renovation rights for landlord" />
        <CheckItem text="Flag any rooftop, signage, or antenna rights" />
        <CheckItem text="Confirm governing law and venue for dispute resolution" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 5 - Quality Control Workflow */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Abstraction Checklist" />

        <Text style={styles.sectionTitle}>Quality Control Pass - Source Verification</Text>
        <CheckItem text="For every economic field, record the exact page and section reference used as the source of truth" />
        <CheckItem text="Compare base lease values against every amendment and use the latest controlling provision" />
        <CheckItem text="Mark any inferred value as review-required; do not present calculations as verbatim lease text" />
        <CheckItem text="Separate current obligations from historical obligations that expired before the review date" />
        <CheckItem text="Confirm all defined terms used in the source clause are traced back to their definitions" />
        <CheckItem text="Flag any value that appears in an exhibit but conflicts with the body of the lease" />

        <Text style={styles.sectionTitle}>Field-Level Review Notes</Text>
        <CheckItem text="Dates: verify whether deadlines run from expiration, commencement, rent commencement, or fiscal year end" />
        <CheckItem text="Rent: capture both monthly dollar amount and annual per-square-foot economics when both are available" />
        <CheckItem text="CAM: split estimated payments, reconciled actuals, exclusions, caps, and audit rights into separate fields" />
        <CheckItem text="Options: calculate notice deadlines backward and note the required delivery method" />
        <CheckItem text="Insurance: separate coverage limits from endorsement requirements and waiver obligations" />
        <CheckItem text="Assignment: distinguish ordinary consent rights from affiliate transfers, mergers, and change of control" />

        <Text style={styles.sectionTitle}>Confidence Tags to Apply</Text>
        <CheckItem text="High confidence: value appears clearly in one controlling clause and all amendments agree" />
        <CheckItem text="Medium confidence: value is present but requires a cross-reference, calculation, or amendment comparison" />
        <CheckItem text="Low confidence: value is missing, ambiguous, contradicted, handwritten, or sourced from degraded scan text" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* Page 6 - Red Flag Review */}
      <Page size="LETTER" style={styles.page}>
        <ContentPageHeader title="Commercial Lease Abstraction Checklist" />

        <Text style={styles.sectionTitle}>Red Flag Review - CAM &amp; Operating Expenses</Text>
        <CheckItem text="No audit rights or audit window shorter than 90 days after reconciliation delivery" />
        <CheckItem text="Uncapped controllable operating expenses in a NNN or modified gross lease" />
        <CheckItem text="Management fee above 5%, applied to excluded expenses, or stacked with an admin fee" />
        <CheckItem text="Capital expenditures passed through immediately rather than amortized over useful life" />
        <CheckItem text="Gross-up provision missing, overly broad, or applied to non-variable costs" />

        <Text style={styles.sectionTitle}>Red Flag Review - Business Terms</Text>
        <CheckItem text="Renewal option notice deadline already expired or less than 180 days away" />
        <CheckItem text="Holdover rent over 200% or holdover converts into a new fixed term" />
        <CheckItem text="Personal guaranty lacks cap, burn-down, or release tied to tenant performance" />
        <CheckItem text="Assignment clause gives landlord recapture rights or profit-sharing without affiliate carveout" />
        <CheckItem text="Exclusive use or co-tenancy clause can materially impair future operations or value" />

        <Text style={styles.sectionTitle}>Final Abstraction Review</Text>
        <CheckItem text="Confirm every required field has a value, explicit 'not found', or low-confidence review note" />
        <CheckItem text="Spot-check at least 10 high-risk fields against the PDF before sharing the abstract" />
        <CheckItem text="Export a clean copy for business users and retain a source-reference copy for audit trail" />

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>

      {/* CTA Page */}
      <Page size="LETTER" style={styles.ctaPage}>
        <Text style={styles.ctaTitle}>
          How Lextract automates this checklist{'\n'}in 5-15 minutes
        </Text>

        <View style={styles.ctaStep}>
          <View style={styles.ctaStepNum} />
          <Text style={styles.ctaStepText}>
            Upload your lease PDF - Lextract extracts all 126 fields into structured review output
          </Text>
        </View>
        <View style={styles.ctaStep}>
          <View style={styles.ctaStepNum} />
          <Text style={styles.ctaStepText}>
            Every item on this checklist is extracted, validated, and scored for confidence
          </Text>
        </View>
        <View style={styles.ctaStep}>
          <View style={styles.ctaStepNum} />
          <Text style={styles.ctaStepText}>
            Export to PDF or CSV, share with your team
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
