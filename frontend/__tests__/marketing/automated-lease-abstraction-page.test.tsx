import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/site-config', () => ({
  SITE_URL: 'https://lextract.io',
  DEFAULT_OG_IMAGE: {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Lextract — AI-Powered Commercial Lease Abstraction',
  },
}))

import AutomatedLeaseAbstractionPage from '@/app/(marketing)/automated-lease-abstraction/page'

describe('AutomatedLeaseAbstractionPage', () => {
  it('renders without throwing', () => {
    expect(() => render(<AutomatedLeaseAbstractionPage />)).not.toThrow()
  })

  it('renders h1 with target keyword', () => {
    render(<AutomatedLeaseAbstractionPage />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/Automated Lease Abstraction/i)
  })

  it('renders primary CTA linking to /upload', () => {
    render(<AutomatedLeaseAbstractionPage />)
    const ctas = screen.getAllByRole('link', { name: /automate your lease abstraction/i })
    expect(ctas.length).toBeGreaterThanOrEqual(1)
    expect(ctas[0]).toHaveAttribute('href', '/upload')
  })

  it('renders all 5 FAQ questions', () => {
    render(<AutomatedLeaseAbstractionPage />)
    expect(screen.getByText('What is automated lease abstraction?')).toBeInTheDocument()
    expect(screen.getByText('How accurate is automated lease abstraction?')).toBeInTheDocument()
    expect(screen.getByText('How much does automated lease abstraction cost?')).toBeInTheDocument()
  })

  it('renders the ROI calculation cards', () => {
    render(<AutomatedLeaseAbstractionPage />)
    expect(screen.getByText('$900–$2,500')).toBeInTheDocument()
    expect(screen.getByText('$120')).toBeInTheDocument()
    expect(screen.getByText('126 fields')).toBeInTheDocument()
  })

  it('renders savings in emerald (design system success color)', () => {
    const { container } = render(<AutomatedLeaseAbstractionPage />)
    const savingsAmount = container.querySelector('.text-emerald-600')
    expect(savingsAmount).toBeInTheDocument()
    expect(savingsAmount?.textContent).toBe('126 fields')
  })

  it('renders the automation steps table', () => {
    render(<AutomatedLeaseAbstractionPage />)
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(screen.getByText('Document digitization')).toBeInTheDocument()
    expect(screen.getByText('Field extraction')).toBeInTheDocument()
  })

  it('renders the clarity blocks for problem, process, and audience', () => {
    render(<AutomatedLeaseAbstractionPage />)
    expect(screen.getByText('What Lextract solves')).toBeInTheDocument()
    expect(screen.getByText(/manual abstraction makes teams read/i)).toBeInTheDocument()
    expect(screen.getByText('How Lextract solves it')).toBeInTheDocument()
    expect(screen.getByText(/returns 126 structured fields, scores confidence/i)).toBeInTheDocument()
    expect(screen.getByText('Who uses Lextract')).toBeInTheDocument()
    expect(screen.getByText(/commercial real estate teams use it for faster review/i)).toBeInTheDocument()
  })

  it('renders the 100-lease portfolio callout', () => {
    render(<AutomatedLeaseAbstractionPage />)
    expect(screen.getByText('Larger portfolios')).toBeInTheDocument()
    expect(screen.getByText(/Lextract 10-pack pricing of \$12 per lease/)).toBeInTheDocument()
    expect(screen.getByText(/the same 100 leases cost about \$1,200/)).toBeInTheDocument()
  })

  it('renders JSON-LD script tags for structured data', () => {
    const { container } = render(<AutomatedLeaseAbstractionPage />)
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts.length).toBeGreaterThanOrEqual(3)
  })

  it('renders breadcrumb navigation', () => {
    render(<AutomatedLeaseAbstractionPage />)
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
  })
})
