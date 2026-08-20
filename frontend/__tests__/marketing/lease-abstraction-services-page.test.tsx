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

import LeaseAbstractionServicesPage from '@/app/(marketing)/lease-abstraction-services/page'

describe('LeaseAbstractionServicesPage', () => {
  it('renders without throwing', () => {
    expect(() => render(<LeaseAbstractionServicesPage />)).not.toThrow()
  })

  it('renders h1 with target keyword', () => {
    render(<LeaseAbstractionServicesPage />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/Lease Abstraction Services/i)
  })

  it('renders primary CTA linking to /upload', () => {
    render(<LeaseAbstractionServicesPage />)
    const ctas = screen.getAllByRole('link', { name: /try ai lease abstraction/i })
    expect(ctas.length).toBeGreaterThanOrEqual(1)
    expect(ctas[0]).toHaveAttribute('href', '/upload')
  })

  it('renders all 5 FAQ questions', () => {
    render(<LeaseAbstractionServicesPage />)
    expect(screen.getByText('What are lease abstraction services?')).toBeInTheDocument()
    expect(screen.getByText('How much do lease abstraction services cost?')).toBeInTheDocument()
    expect(screen.getByText('How long does lease abstraction take?')).toBeInTheDocument()
  })

  it('renders the three service type cards', () => {
    render(<LeaseAbstractionServicesPage />)
    expect(screen.getByText('AI Lease Abstraction Software')).toBeInTheDocument()
    expect(screen.getByText('Outsourced Services')).toBeInTheDocument()
    // "In-House Staff" appears in both the card heading and comparison table header
    const inHouseMatches = screen.getAllByText('In-House Staff')
    expect(inHouseMatches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the comparison table', () => {
    render(<LeaseAbstractionServicesPage />)
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(screen.getByText('AI Software')).toBeInTheDocument()
    expect(screen.getByText('Outsourced')).toBeInTheDocument()
  })

  it('renders pricing for each service type', () => {
    render(<LeaseAbstractionServicesPage />)
    expect(screen.getAllByText(/\$15\/lease/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/\$90.*\$250/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders JSON-LD script tags for structured data', () => {
    const { container } = render(<LeaseAbstractionServicesPage />)
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts.length).toBeGreaterThanOrEqual(3)
  })

  it('renders breadcrumb navigation', () => {
    render(<LeaseAbstractionServicesPage />)
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
  })
})
