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

import PricingPage from '@/app/(marketing)/pricing/page'

describe('PricingPage', () => {
  it('renders pricing clarity blocks', () => {
    render(<PricingPage />)
    expect(screen.getByText('What you are buying')).toBeInTheDocument()
    expect(screen.getByText(/126 fields, confidence scores, 20 red flag checks/i)).toBeInTheDocument()
    expect(screen.getByText('How pricing works')).toBeInTheDocument()
    expect(screen.getByText(/upload and preview first/i)).toBeInTheDocument()
    expect(screen.getByText('Who this fits')).toBeInTheDocument()
    expect(screen.getByText(/commercial real estate teams, brokers, attorneys/i)).toBeInTheDocument()
  })

  it('uses specific upload CTAs on pricing cards', () => {
    render(<PricingPage />)
    const ctas = screen.getAllByRole('link', { name: /get a free preview/i })
    expect(ctas.length).toBe(3)
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', '/upload')
    }
  })
})
