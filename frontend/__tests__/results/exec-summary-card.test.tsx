import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExecSummaryCard } from '@/components/results/exec-summary-card'

/** Local type for test data — ExecSummaryCard accepts a structural subset */
interface TestFlag {
  category?: string
  severity?: string
  name?: string
  description?: string
}

const FULL_DATA: Record<string, unknown> = {
  lease_structure_type: { value: 'NNN' },
  base_rent_annual: { value: '$120,000' },
  expiration_date: { value: '2031-12-31' },
  fixed_escalation_rate: { value: '3% per year' },
  has_renewal_option: { value: true },
  renewal_terms: { value: '2 × 5-year options' },
  security_deposit_amount: { value: '$10,000' },
}

const RED_FLAGS: TestFlag[] = [
  { name: 'cam_cap_percentage', severity: 'HIGH', description: 'No CAM cap', category: 'CAM & Operating Expenses' },
  { name: 'audit_rights', severity: 'MEDIUM', description: 'Audit limited', category: 'CAM & Operating Expenses' },
  { name: 'snda_provided', severity: 'LOW', description: 'SNDA missing', category: 'Miscellaneous' },
]

describe('ExecSummaryCard', () => {
  it('renders all 6 field labels', () => {
    render(<ExecSummaryCard extractedData={FULL_DATA} redFlags={[]} />)
    expect(screen.getByText('Lease Type')).toBeInTheDocument()
    expect(screen.getByText('Annual Rent')).toBeInTheDocument()
    expect(screen.getByText('Lease Expires')).toBeInTheDocument()
    expect(screen.getByText('Annual Escalation')).toBeInTheDocument()
    expect(screen.getByText('Renewal Options')).toBeInTheDocument()
    expect(screen.getByText('Security Deposit')).toBeInTheDocument()
  })

  it('renders field values from extractedData', () => {
    render(<ExecSummaryCard extractedData={FULL_DATA} redFlags={[]} />)
    expect(screen.getByText('NNN')).toBeInTheDocument()
    expect(screen.getByText('$120,000')).toBeInTheDocument()
    expect(screen.getByText('2031-12-31')).toBeInTheDocument()
    expect(screen.getByText('3% per year')).toBeInTheDocument()
    expect(screen.getByText('2 × 5-year options')).toBeInTheDocument()
    expect(screen.getByText('$10,000')).toBeInTheDocument()
  })

  // "None" is an assertion that the lease grants no renewal option. A field that
  // was never extracted must not make that assertion: a tenant rep reading
  // "None" on a lease that does have a renewal option can lose the renewal.
  // Unknown reads as '-', the same as every other absent field.
  it('renders - for every field when extractedData is empty', () => {
    render(<ExecSummaryCard extractedData={{}} redFlags={[]} />)
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(6)
    expect(screen.queryByText('None')).not.toBeInTheDocument()
  })

  it('renders - for every field whose value is null', () => {
    const dataWithNulls: Record<string, unknown> = {
      lease_structure_type: { value: null },
      base_rent_annual: { value: null },
      expiration_date: { value: null },
      fixed_escalation_rate: { value: null },
      has_renewal_option: { value: null },
      renewal_terms: { value: null },
      security_deposit_amount: { value: null },
    }
    render(<ExecSummaryCard extractedData={dataWithNulls} redFlags={[]} />)
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(6)
    expect(screen.queryByText('None')).not.toBeInTheDocument()
  })

  it('shows Yes when a renewal option exists but its terms were not extracted', () => {
    const data: Record<string, unknown> = {
      ...FULL_DATA,
      has_renewal_option: { value: true },
      renewal_terms: { value: null },
    }
    render(<ExecSummaryCard extractedData={data} redFlags={[]} />)
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('shows "None" for renewal options when has_renewal_option is false', () => {
    const data: Record<string, unknown> = {
      ...FULL_DATA,
      has_renewal_option: { value: false },
      renewal_terms: { value: '2 × 5-year options' },
    }
    render(<ExecSummaryCard extractedData={data} redFlags={[]} />)
    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.queryByText('2 × 5-year options')).not.toBeInTheDocument()
  })

  it('shows - not None when has_renewal_option is null, even with terms present', () => {
    const data: Record<string, unknown> = {
      ...FULL_DATA,
      has_renewal_option: { value: null },
    }
    render(<ExecSummaryCard extractedData={data} redFlags={[]} />)
    expect(screen.queryByText('None')).not.toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1)
  })

  it('shows renewal_terms value when has_renewal_option is truthy', () => {
    render(<ExecSummaryCard extractedData={FULL_DATA} redFlags={[]} />)
    expect(screen.getByText('2 × 5-year options')).toBeInTheDocument()
  })

  it('falls back to escalation_type when fixed_escalation_rate is absent', () => {
    const data: Record<string, unknown> = {
      ...FULL_DATA,
      fixed_escalation_rate: undefined,
      escalation_type: { value: 'CPI-based' },
    }
    render(<ExecSummaryCard extractedData={data} redFlags={[]} />)
    expect(screen.getByText('CPI-based')).toBeInTheDocument()
  })

  it('shows red flag pill with count when flags present', () => {
    render(<ExecSummaryCard extractedData={FULL_DATA} redFlags={RED_FLAGS} />)
    expect(screen.getByText(/3 red flags/i)).toBeInTheDocument()
  })

  it('shows singular "red flag" when only 1 flag', () => {
    render(<ExecSummaryCard extractedData={FULL_DATA} redFlags={[RED_FLAGS[0]]} />)
    expect(screen.getByText(/1 red flag/i)).toBeInTheDocument()
  })

  it('shows "No red flags ✓" badge when no flags', () => {
    render(<ExecSummaryCard extractedData={FULL_DATA} redFlags={[]} />)
    expect(screen.getByText(/No red flags/i)).toBeInTheDocument()
  })

  it('shows up to 2 unique flag categories in summary', () => {
    render(<ExecSummaryCard extractedData={FULL_DATA} redFlags={RED_FLAGS} />)
    // RED_FLAGS has categories: 'CAM & Operating Expenses' (×2) and 'Miscellaneous' (×1)
    // Should show up to 2 unique categories
    expect(screen.getByText(/CAM & Operating Expenses/)).toBeInTheDocument()
    expect(screen.getByText(/Miscellaneous/)).toBeInTheDocument()
  })

  it('shows at most 2 flag categories even when more are available', () => {
    const manyFlags: TestFlag[] = [
      { name: 'f1', severity: 'HIGH', description: 'd1', category: 'Cat A' },
      { name: 'f2', severity: 'HIGH', description: 'd2', category: 'Cat B' },
      { name: 'f3', severity: 'HIGH', description: 'd3', category: 'Cat C' },
    ]
    render(<ExecSummaryCard extractedData={FULL_DATA} redFlags={manyFlags} />)
    // Cat A and Cat B should appear, Cat C should not
    expect(screen.getByText(/Cat A/)).toBeInTheDocument()
    expect(screen.getByText(/Cat B/)).toBeInTheDocument()
    expect(screen.queryByText(/Cat C/)).not.toBeInTheDocument()
  })

  it('omits category text if no flags have categories', () => {
    const flagsNoCategory: TestFlag[] = [
      { name: 'f1', severity: 'HIGH', description: 'd1' },
    ]
    render(<ExecSummaryCard extractedData={FULL_DATA} redFlags={flagsNoCategory} />)
    // Should show pill with count but no category list
    expect(screen.getByText(/1 red flag/i)).toBeInTheDocument()
  })

  // The extractor emits base_rent_annual and security_deposit_amount as numbers,
  // not as pre-formatted strings. Every test above passes strings that are
  // already formatted, which is why raw numbers reaching the summary card went
  // unnoticed: a lease abstraction rendering "1381000" for annual rent.
  it('formats numeric money values as currency', () => {
    const numericData: Record<string, unknown> = {
      ...FULL_DATA,
      base_rent_annual: { value: 1381000 },
      security_deposit_amount: { value: 115083.33 },
    }
    render(<ExecSummaryCard extractedData={numericData} redFlags={[]} />)
    expect(screen.getByText('$1,381,000')).toBeInTheDocument()
    expect(screen.getByText('$115,083.33')).toBeInTheDocument()
  })

  it('formats numeric money values supplied as numeric strings', () => {
    const numericData: Record<string, unknown> = {
      ...FULL_DATA,
      base_rent_annual: { value: '1381000' },
      security_deposit_amount: { value: '115083.5' },
    }
    render(<ExecSummaryCard extractedData={numericData} redFlags={[]} />)
    expect(screen.getByText('$1,381,000')).toBeInTheDocument()
    expect(screen.getByText('$115,083.50')).toBeInTheDocument()
  })

  it('leaves already-formatted and non-numeric money values alone', () => {
    const mixed: Record<string, unknown> = {
      ...FULL_DATA,
      base_rent_annual: { value: '$120,000' },
      security_deposit_amount: { value: 'two months rent' },
    }
    render(<ExecSummaryCard extractedData={mixed} redFlags={[]} />)
    expect(screen.getByText('$120,000')).toBeInTheDocument()
    expect(screen.getByText('two months rent')).toBeInTheDocument()
  })

  it('renders with teal border styling', () => {
    const { container } = render(<ExecSummaryCard extractedData={FULL_DATA} redFlags={[]} />)
    // The root element should have border-primary class
    const card = container.firstElementChild
    expect(card?.className).toMatch(/border-primary/)
  })
})
