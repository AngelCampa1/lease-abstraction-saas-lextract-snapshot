import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CONFIDENCE_COLORS } from '@/lib/design-tokens'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    onClick?: () => void
    [key: string]: unknown
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}))

const mockCaptureEvent = vi.fn()
vi.mock('@/lib/posthog', () => ({
  captureEvent: (...args: unknown[]) => mockCaptureEvent(...args),
  EVENTS: { upload_sample_clicked: 'upload_sample_clicked' },
}))

vi.mock('@/lib/sample-extraction', () => ({
  SAMPLE_EXTRACTION_ID: 'sample',
}))

describe('SampleTeaser', () => {
  let SampleTeaser: React.ComponentType

  beforeAll(async () => {
    const mod = await import('@/components/upload/sample-teaser')
    SampleTeaser = mod.SampleTeaser
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with data-testid', () => {
    render(<SampleTeaser />)
    expect(screen.getByTestId('sample-teaser')).toBeInTheDocument()
  })

  it('renders all 5 field labels', () => {
    render(<SampleTeaser />)
    expect(screen.getByText('Base Rent')).toBeInTheDocument()
    expect(screen.getByText('Lease Expiration')).toBeInTheDocument()
    expect(screen.getByText('Renewal Option')).toBeInTheDocument()
    expect(screen.getByText('CAM Cap')).toBeInTheDocument()
    expect(screen.getByText('Personal Guarantee')).toBeInTheDocument()
  })

  it('renders field values', () => {
    render(<SampleTeaser />)
    expect(screen.getByText('$14,583/mo ($42.50/sqft/yr)')).toBeInTheDocument()
    expect(screen.getByText('Jun 30, 2030')).toBeInTheDocument()
    expect(screen.getByText('2 × 5-year options')).toBeInTheDocument()
    expect(screen.getByText('5% annually, non-compounding')).toBeInTheDocument()
    expect(screen.getByText('Full-term guarantee required')).toBeInTheDocument()
  })

  it('renders a red flag indicator on Personal Guarantee', () => {
    render(<SampleTeaser />)
    const redFlags = screen.getAllByLabelText('red flag')
    expect(redFlags).toHaveLength(1)
  })

  it('renders confidence percentages as badges', () => {
    render(<SampleTeaser />)
    expect(screen.getByText('98%')).toBeInTheDocument()
    expect(screen.getByText('99%')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.getByText('91%')).toBeInTheDocument()
    expect(screen.getByText('87%')).toBeInTheDocument()
  })

  it('applies correct confidence tier badge colors', () => {
    render(<SampleTeaser />)
    const badge98 = screen.getByText('98%')
    CONFIDENCE_COLORS.high.split(' ').forEach((cls) => {
      expect(badge98.className).toContain(cls)
    })
    const badge91 = screen.getByText('91%')
    CONFIDENCE_COLORS.medium.split(' ').forEach((cls) => {
      expect(badge91.className).toContain(cls)
    })
    const badge87 = screen.getByText('87%')
    CONFIDENCE_COLORS.medium.split(' ').forEach((cls) => {
      expect(badge87.className).toContain(cls)
    })
  })

  it('renders a sample preview link pointing to sample results', () => {
    render(<SampleTeaser />)
    const link = screen.getByTestId('sample-teaser-link')
    expect(link).toHaveAttribute('href', '/results/sample')
    expect(link).toHaveTextContent('See sample preview')
    expect(link).not.toHaveTextContent('See all 126 fields')
  })

  it('fires upload_sample_clicked with location teaser_link when link is clicked', async () => {
    render(<SampleTeaser />)
    const link = screen.getByTestId('sample-teaser-link')
    await userEvent.click(link)
    expect(mockCaptureEvent).toHaveBeenCalledWith('upload_sample_clicked', { location: 'teaser_link' })
  })
})
