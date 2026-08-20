import { vi, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock IntersectionObserver which is not available in jsdom
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
}
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
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

// Mock content-matching so async getAllContentItems resolves instantly
vi.mock('@/lib/content-matching', () => ({
  getAllContentItems: vi.fn().mockResolvedValue([]),
  getRelatedContentForPseo: vi.fn().mockReturnValue([]),
}))

// Mock related-content component (no featured articles in unit tests)
vi.mock('@/components/content/related-content', () => ({
  RelatedContent: () => null,
}))

// Mock breadcrumbs
vi.mock('@/components/content/breadcrumbs', () => ({
  Breadcrumbs: ({ crumbs }: { crumbs: Array<{ label: string; href?: string }> }) => (
    <nav aria-label="breadcrumb">
      {crumbs.map((c) => <span key={c.label}>{c.label}</span>)}
    </nav>
  ),
}))

// Mock content-cta
vi.mock('@/components/content/content-cta', () => ({
  ContentCta: ({ heading }: { heading: string }) => (
    <div data-testid="content-cta">{heading}</div>
  ),
}))

import GlossaryPage from '@/app/(marketing)/glossary/page'
import {
  INDEXABLE_GLOSSARY_TERMS as GLOSSARY_TERMS,
  GLOSSARY_TERM_COUNT,
  getAlphabetIndex,
} from '@/data/glossary'

describe('GlossaryPage', () => {
  it('renders the page heading', async () => {
    render(await GlossaryPage())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Commercial Lease Glossary'
    )
  })

  it('displays the term count in the description', async () => {
    render(await GlossaryPage())
    // The term count appears in the page description paragraph
    const matches = screen.getAllByText(new RegExp(`${GLOSSARY_TERM_COUNT}`))
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders alphabetical navigation links', async () => {
    render(await GlossaryPage())
    const alphabetNav = screen.getByRole('navigation', {
      name: /alphabetical/i,
    })
    expect(alphabetNav).toBeInTheDocument()

    const index = getAlphabetIndex()
    for (const letter of index) {
      const link = alphabetNav.querySelector(`a[href="#letter-${letter}"]`)
      expect(link).toBeInTheDocument()
    }
  })

  it('renders all glossary terms', async () => {
    render(await GlossaryPage())
    for (const term of GLOSSARY_TERMS) {
      // Terms may appear multiple times (in headings and as related term pills)
      const elements = screen.getAllByText(term.term)
      expect(elements.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('renders category badges for each term', async () => {
    render(await GlossaryPage())
    // Check that at least some category labels are rendered
    expect(screen.getAllByText('Financial').length).toBeGreaterThan(0)
  })

  it('renders "Read more" expandable sections', async () => {
    render(await GlossaryPage())
    const readMoreButtons = screen.getAllByText('Read more')
    expect(readMoreButtons.length).toBe(GLOSSARY_TERMS.length)
  })

  it('renders related term links', async () => {
    render(await GlossaryPage())
    // At least one term should have related terms rendered as links
    const relatedLabels = screen.getAllByText('Related:')
    expect(relatedLabels.length).toBeGreaterThan(0)
  })

  it('renders letter section headings', async () => {
    render(await GlossaryPage())
    const index = getAlphabetIndex()
    for (const letter of index) {
      expect(screen.getByRole('heading', { level: 2, name: letter })).toBeInTheDocument()
    }
  })

  it('renders JSON-LD structured data', async () => {
    render(await GlossaryPage())
    const jsonLdScripts = screen.getAllByTestId('json-ld')
    expect(jsonLdScripts.length).toBeGreaterThanOrEqual(3)

    const schemas = jsonLdScripts.map((el) => JSON.parse(el.innerHTML) as Record<string, unknown>)

    // DefinedTermSet schema is present and covers all terms
    const definedTermSet = schemas.find((s) => s['@type'] === 'DefinedTermSet')
    expect(definedTermSet).toBeDefined()
    expect((definedTermSet as Record<string, unknown[]>).definedTerm.length).toBe(GLOSSARY_TERMS.length)

    // ItemList schema is present with 1-based positions and correct item count
    const itemList = schemas.find((s) => s['@type'] === 'ItemList')
    expect(itemList).toBeDefined()
    expect(itemList!.numberOfItems).toBe(GLOSSARY_TERMS.length)
    const elements = (itemList as Record<string, Array<Record<string, unknown>>>).itemListElement
    expect(elements[0].position).toBe(1)
    expect(typeof elements[0].url).toBe('string')
    expect((elements[0].url as string).startsWith('https://lextract.io/glossary/')).toBe(true)

    // BreadcrumbList schema is present
    const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList')
    expect(breadcrumb).toBeDefined()
  })

  it('renders breadcrumbs', async () => {
    render(await GlossaryPage())
    const breadcrumbNav = screen.getByRole('navigation', {
      name: /breadcrumb/i,
    })
    expect(breadcrumbNav).toBeInTheDocument()
  })

  it('renders a CTA section', async () => {
    render(await GlossaryPage())
    expect(
      screen.getByText(/extract these terms from your leases/i)
    ).toBeInTheDocument()
  })

  it('exports metadata with correct title and description', async () => {
    const mod = await import('@/app/(marketing)/glossary/page')
    const metadata = mod.metadata
    expect(metadata.title).toBe('Commercial Lease Glossary | High-Value CRE Terms in Plain English')
    expect(metadata.description).toContain('Plain-English definitions')
  })
})
