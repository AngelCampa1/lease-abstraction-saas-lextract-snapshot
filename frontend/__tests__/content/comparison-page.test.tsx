import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

// Mock site-config
vi.mock('@/lib/site-config', () => ({
  SITE_URL: 'https://lextract.io',
  SITE_NAME: 'Lextract',
  SITE_DISPLAY_DOMAIN: 'lextract.io',
  DEFAULT_OG_IMAGE: {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Lextract — AI-Powered Commercial Lease Abstraction',
  },
}))

// Mock json-ld component
vi.mock('@/components/seo/json-ld', () => ({
  JsonLd: ({ schema }: { schema: unknown }) => (
    <script
      type="application/ld+json"
      data-testid="json-ld"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  ),
}))

import ComparisonsPage from '@/app/(marketing)/resources/comparisons/page'
import CompetitorComparisonPage, {
  generateStaticParams,
  generateMetadata,
} from '@/app/(marketing)/resources/comparisons/[competitor]/page'
import { COMPARISONS } from '@/data/comparisons'

describe('ComparisonsPage (index)', () => {
  it('renders the page heading', () => {
    render(<ComparisonsPage />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Best AI Lease Abstraction Software in 2026: Full Comparison'
    )
  })

  it('renders a card for each comparison', () => {
    render(<ComparisonsPage />)
    for (const comp of COMPARISONS) {
      // Each competitor name appears in an h3 inside a card link
      const headings = screen.getAllByText(comp.competitor)
      expect(headings.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('renders links to each comparison page', () => {
    const { container } = render(<ComparisonsPage />)
    for (const comp of COMPARISONS) {
      const link = container.querySelector(
        `a[href="/resources/comparisons/${comp.competitorSlug}"]`
      )
      expect(link).toBeTruthy()
    }
  })

  it('renders breadcrumbs', () => {
    render(<ComparisonsPage />)
    const breadcrumbNav = screen.getByRole('navigation', {
      name: /breadcrumb/i,
    })
    expect(breadcrumbNav).toBeInTheDocument()
  })

  it('renders JSON-LD breadcrumb schema', () => {
    render(<ComparisonsPage />)
    const jsonLdScripts = screen.getAllByTestId('json-ld')
    expect(jsonLdScripts.length).toBeGreaterThanOrEqual(1)

    const schemas = jsonLdScripts.map((el) => JSON.parse(el.innerHTML))
    const breadcrumb = schemas.find(
      (s: Record<string, unknown>) => s['@type'] === 'BreadcrumbList'
    )
    expect(breadcrumb).toBeDefined()
  })

  it('renders a CTA section', () => {
    render(<ComparisonsPage />)
    expect(
      screen.getByText(/ready to see lextract in action/i)
    ).toBeInTheDocument()
  })

  it('exports metadata with title and description', async () => {
    const mod = await import('@/app/(marketing)/resources/comparisons/page')
    const metadata = mod.metadata
    expect(metadata.title).toBeDefined()
    expect(metadata.description).toBeDefined()
  })
})

describe('CompetitorComparisonPage', () => {
  it('renders heading for LeaseLens comparison', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Lextract vs LeaseLens'
    )
  })

  it('renders heading for outsourced services comparison', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'outsourced-services' }),
    })
    render(Page)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Lextract vs Outsourced Abstraction Services'
    )
  })

  it('renders the feature comparison table', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('renders pricing section', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)
    expect(screen.getByRole('heading', { level: 2, name: 'Pricing' })).toBeInTheDocument()
  })

  it('renders strengths and weaknesses section', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)
    expect(
      screen.getByRole('heading', { level: 2, name: /strengths and weaknesses/i })
    ).toBeInTheDocument()
  })

  it('renders "Who Should Use Each" section', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)
    expect(
      screen.getByRole('heading', { level: 2, name: /who should use each/i })
    ).toBeInTheDocument()
  })

  it('renders verdict section', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)
    expect(
      screen.getByRole('heading', { level: 2, name: /verdict/i })
    ).toBeInTheDocument()
  })

  it('renders advantage score badges', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)
    // Hero score widget: "N Lextract wins" label
    expect(screen.getByText('Lextract wins')).toBeInTheDocument()
    // Winner callout banner: "Lextract wins N of M feature categories"
    expect(screen.getByText(/Lextract wins \d+ of \d+ feature categories/)).toBeInTheDocument()
  })

  it('renders JSON-LD Article and Breadcrumb schemas', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)
    const jsonLdScripts = screen.getAllByTestId('json-ld')
    expect(jsonLdScripts.length).toBeGreaterThanOrEqual(2)

    const schemas = jsonLdScripts.map((el) => JSON.parse(el.innerHTML))
    expect(schemas.find((s: Record<string, unknown>) => s['@type'] === 'Article')).toBeDefined()
    expect(
      schemas.find((s: Record<string, unknown>) => s['@type'] === 'BreadcrumbList')
    ).toBeDefined()
  })

  it('emits Angel Campa as the comparison article author', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)
    const jsonLdScripts = screen.getAllByTestId('json-ld')
    const schemas = jsonLdScripts.map((el) => JSON.parse(el.innerHTML))
    const article = schemas.find(
      (schema: Record<string, unknown>) => schema['@type'] === 'Article'
    )
    expect(article?.author).toMatchObject({
      '@type': 'Person',
      name: 'Angel Campa',
      jobTitle: 'Founder',
      url: 'https://lextract.io/about/angel-campa',
    })
  })

  it('renders a CTA section', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)
    expect(screen.getByText(/try lextract on your next lease/i)).toBeInTheDocument()
  })

  it('renders source provenance for comparison claims', async () => {
    const Page = await CompetitorComparisonPage({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    render(Page)

    expect(screen.getByRole('heading', { name: /sources checked/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /leaselens product site/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /lextract pricing/i })).toHaveAttribute(
      'href',
      'https://lextract.io/pricing',
    )
  })

  it('calls notFound for invalid slug', async () => {
    await expect(
      CompetitorComparisonPage({
        params: Promise.resolve({ competitor: 'nonexistent' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('generateStaticParams', () => {
  it('returns params for all comparisons', async () => {
    const params = await generateStaticParams()
    expect(params.length).toBe(COMPARISONS.length)
    for (const comp of COMPARISONS) {
      expect(params).toContainEqual({ competitor: comp.competitorSlug })
    }
  })
})

describe('generateMetadata', () => {
  it('returns metadata for valid slug', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ competitor: 'leaselens' }),
    })
    expect(metadata.title).toContain('LeaseLens')
    expect(metadata.description).toBeDefined()
  })

  it('returns fallback for invalid slug', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ competitor: 'nonexistent' }),
    })
    expect(metadata.title).toBe('Comparison Not Found')
  })
})
