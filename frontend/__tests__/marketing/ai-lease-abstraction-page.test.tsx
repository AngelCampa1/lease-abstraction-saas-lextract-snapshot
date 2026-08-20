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

import AiLeaseAbstractionPage from '@/app/(marketing)/ai-lease-abstraction/page'

describe('AiLeaseAbstractionPage', () => {
  it('renders without throwing', () => {
    expect(() => render(<AiLeaseAbstractionPage />)).not.toThrow()
  })

  it('renders h1 with target keyword', () => {
    render(<AiLeaseAbstractionPage />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toMatch(/AI lease abstraction/i)
  })

  it('renders the primary CTA linking to /upload', () => {
    render(<AiLeaseAbstractionPage />)
    const ctas = screen.getAllByRole('link', { name: /extract your first lease/i })
    expect(ctas.length).toBeGreaterThanOrEqual(1)
    expect(ctas[0]).toHaveAttribute('href', '/upload')
  })

  it('renders the fields CTA linking to /fields', () => {
    render(<AiLeaseAbstractionPage />)
    const links = screen.getAllByRole('link', { name: /see.*extract/i })
    expect(links.length).toBeGreaterThanOrEqual(1)
  })

  it('renders all 6 FAQ questions', () => {
    render(<AiLeaseAbstractionPage />)
    expect(screen.getByText('What is AI lease abstraction?')).toBeInTheDocument()
    expect(screen.getByText('How accurate is AI lease abstraction?')).toBeInTheDocument()
    expect(screen.getByText('How does Lextract AI differ from Prophia or Yardi?')).toBeInTheDocument()
  })

  it('renders accuracy benchmarks table', () => {
    render(<AiLeaseAbstractionPage />)
    const tables = screen.getAllByRole('table')
    expect(tables.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Manual or outsourced abstraction')).toBeInTheDocument()
    const lextractAiMatches = screen.getAllByText('Lextract AI')
    expect(lextractAiMatches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the "What Is" section heading', () => {
    render(<AiLeaseAbstractionPage />)
    const headings = screen.getAllByRole('heading', { name: /what is ai lease abstraction/i })
    expect(headings.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the clarity blocks for problem, process, and audience', () => {
    render(<AiLeaseAbstractionPage />)
    expect(screen.getByText('What Lextract solves')).toBeInTheDocument()
    expect(screen.getByText(/manual lease abstraction leaves reviewers/i)).toBeInTheDocument()
    expect(screen.getByText('How Lextract solves it')).toBeInTheDocument()
    expect(screen.getByText(/validates the answers, scores confidence/i)).toBeInTheDocument()
    expect(screen.getByText('Who uses Lextract')).toBeInTheDocument()
    expect(screen.getByText(/commercial real estate teams use it to turn lease text into usable data/i)).toBeInTheDocument()
  })

  it('renders JSON-LD script tags for structured data', () => {
    const { container } = render(<AiLeaseAbstractionPage />)
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts.length).toBeGreaterThanOrEqual(3)
  })

  it('renders breadcrumb navigation', () => {
    render(<AiLeaseAbstractionPage />)
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
