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

import SampleReportPage from '@/app/(marketing)/sample-report/page'

describe('SampleReportPage', () => {
  it('renders without throwing', () => {
    expect(() => render(<SampleReportPage />)).not.toThrow()
  })

  it('renders h1 with the sample report keyword', () => {
    render(<SampleReportPage />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/Sample Lease Extraction Report/i)
  })

  it('renders extracted field categories with values', () => {
    render(<SampleReportPage />)
    expect(screen.getAllByText('Acme Corp LLC').length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByText('MainStreet Properties LP').length,
    ).toBeGreaterThanOrEqual(1)
  })

  it('renders the detected red flags', () => {
    render(<SampleReportPage />)
    expect(screen.getByText('2 found')).toBeInTheDocument()
  })

  it('renders the primary CTA linking to /upload', () => {
    render(<SampleReportPage />)
    const ctas = screen.getAllByRole('link', { name: /extract my lease/i })
    expect(ctas.length).toBeGreaterThanOrEqual(1)
    expect(ctas[0]).toHaveAttribute('href', '/upload')
  })

  it('renders JSON-LD script tags for structured data', () => {
    const { container } = render(<SampleReportPage />)
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts.length).toBeGreaterThanOrEqual(3)
  })

  it('renders breadcrumb navigation', () => {
    render(<SampleReportPage />)
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
  })

  it('shows the AI accuracy and liability disclaimer in the fine print', () => {
    render(<SampleReportPage />)
    const disclaimer = screen.getByTestId('sample-report-accuracy-disclaimer')
    expect(disclaimer).toHaveTextContent(/this is a sample/i)
    expect(disclaimer).toHaveTextContent(/AI can make mistakes/i)
    expect(disclaimer).toHaveTextContent(
      /check each field against your lease before you rely on it/i,
    )
    expect(disclaimer).toHaveTextContent(/Lextract is not responsible for errors/i)
    expect(disclaimer).toHaveTextContent(
      /not responsible for choices you make from these results/i,
    )
  })
})
