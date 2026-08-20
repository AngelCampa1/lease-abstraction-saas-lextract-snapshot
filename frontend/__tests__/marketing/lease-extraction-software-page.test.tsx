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

import LeaseExtractionSoftwarePage from '@/app/(marketing)/lease-extraction-software/page'

describe('LeaseExtractionSoftwarePage', () => {
  it('renders the clarity blocks for problem, process, and audience', () => {
    render(<LeaseExtractionSoftwarePage />)
    expect(screen.getByText('What Lextract solves')).toBeInTheDocument()
    expect(screen.getByText(/lease data is usually trapped in PDFs/i)).toBeInTheDocument()
    expect(screen.getByText('How Lextract solves it')).toBeInTheDocument()
    expect(screen.getByText(/scores confidence, flags lease risks/i)).toBeInTheDocument()
    expect(screen.getByText('Who uses Lextract')).toBeInTheDocument()
    expect(screen.getByText(/commercial real estate teams, brokers, attorneys/i)).toBeInTheDocument()
  })

  it('preserves the primary extraction CTA', () => {
    render(<LeaseExtractionSoftwarePage />)
    const ctas = screen.getAllByRole('link', { name: /extract your first lease/i })
    expect(ctas.length).toBeGreaterThanOrEqual(1)
    expect(ctas[0]).toHaveAttribute('href', '/upload')
  })
})
