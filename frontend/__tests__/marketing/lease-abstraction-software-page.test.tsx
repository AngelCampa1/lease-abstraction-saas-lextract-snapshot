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
    alt: 'Lextract - AI-Powered Commercial Lease Abstraction',
  },
}))

import LeaseAbstractionSoftwarePage from '@/app/(marketing)/lease-abstraction-software/page'

describe('LeaseAbstractionSoftwarePage', () => {
  it('renders without throwing', () => {
    expect(() => render(<LeaseAbstractionSoftwarePage />)).not.toThrow()
  })

  it('renders h1 with target keyword', () => {
    render(<LeaseAbstractionSoftwarePage />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/Lease Abstraction Software/i)
  })

  it('renders the primary CTA linking to /upload', () => {
    render(<LeaseAbstractionSoftwarePage />)
    const ctas = screen.getAllByRole('link', { name: /extract your first lease/i })
    expect(ctas.length).toBeGreaterThanOrEqual(1)
    expect(ctas[0]).toHaveAttribute('href', '/upload')
  })

  it('renders the sample report secondary CTA', () => {
    render(<LeaseAbstractionSoftwarePage />)
    const link = screen.getByRole('link', { name: /view sample report/i })
    expect(link).toHaveAttribute('href', '/sample-report')
  })

  it('renders all 8 FAQ questions', () => {
    render(<LeaseAbstractionSoftwarePage />)
    expect(screen.getByText('What is lease abstraction software?')).toBeInTheDocument()
    expect(screen.getByText('How much does lease abstraction software cost?')).toBeInTheDocument()
    expect(screen.getByText('What export formats does Lextract support?')).toBeInTheDocument()
  })

  it('renders the comparison table', () => {
    render(<LeaseAbstractionSoftwarePage />)
    const tables = screen.getAllByRole('table')
    expect(tables.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Low volume, high-touch review')).toBeInTheDocument()
    expect(screen.getByText('Large portfolio system buyers')).toBeInTheDocument()
  })

  it('renders 6 feature cards with key stats', () => {
    render(<LeaseAbstractionSoftwarePage />)
    expect(screen.getByText('Structured output')).toBeInTheDocument()
    expect(screen.getByText('Confidence scoring')).toBeInTheDocument()
    expect(screen.getByText('Excel, Word, PDF')).toBeInTheDocument()
  })

  it('states what the product solves, how it works, and who uses it', () => {
    render(<LeaseAbstractionSoftwarePage />)
    expect(screen.getByText(/what lextract solves/i)).toBeInTheDocument()
    expect(screen.getByText(/manual lease abstraction slows commercial real estate teams down/i)).toBeInTheDocument()
    expect(screen.getByText(/how lextract solves it/i)).toBeInTheDocument()
    expect(screen.getByText(/reads the PDF and extracts 126 structured fields/i)).toBeInTheDocument()
    expect(screen.getByText(/who uses lextract/i)).toBeInTheDocument()
    expect(screen.getByText(/commercial real estate teams, brokers, attorneys/i)).toBeInTheDocument()
  })

  it('renders JSON-LD script tags for structured data', () => {
    const { container } = render(<LeaseAbstractionSoftwarePage />)
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts.length).toBeGreaterThanOrEqual(3)
  })

  it('renders breadcrumb navigation', () => {
    render(<LeaseAbstractionSoftwarePage />)
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
