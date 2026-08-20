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
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
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

// Mock related-content component
vi.mock('@/components/content/related-content', () => ({
  RelatedContent: () => null,
}))

// Mock breadcrumbs
vi.mock('@/components/content/breadcrumbs', () => ({
  Breadcrumbs: ({ crumbs }: { crumbs: Array<{ label: string; href?: string }> }) => (
    <nav aria-label="breadcrumb">
      {crumbs.map((c) => (
        <span key={c.label}>{c.label}</span>
      ))}
    </nav>
  ),
}))

// Mock content-cta
vi.mock('@/components/content/content-cta', () => ({
  ContentCta: ({ heading }: { heading: string }) => (
    <div data-testid="content-cta">{heading}</div>
  ),
}))

// Mock browse-verticals
vi.mock('@/components/content/browse-verticals', () => ({
  BrowseVerticals: () => null,
}))

import FieldsIndexPage from '@/app/(marketing)/fields/page'
import { INDEXABLE_FIELDS as FIELDS } from '@/data/fields'

describe('FieldsIndexPage', () => {
  it('renders the page heading', async () => {
    render(await FieldsIndexPage())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Commercial Lease Fields for Your Workflow'
    )
  })

  it('renders category section headings', async () => {
    render(await FieldsIndexPage())
    expect(screen.getByRole('heading', { level: 2, name: 'Parties & Property' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Rent & Escalations' })).toBeInTheDocument()
  })

  it('renders field cards linking to detail pages', async () => {
    render(await FieldsIndexPage())
    const fieldHrefs = new Set(
      screen
        .getAllByRole('link')
        .map((el) => el.getAttribute('href'))
        .filter((href): href is string => href?.startsWith('/fields/') === true)
    )
    expect(fieldHrefs.size).toBe(FIELDS.length)
  })

  it('renders breadcrumb navigation', async () => {
    render(await FieldsIndexPage())
    const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(breadcrumbNav).toBeInTheDocument()
    expect(breadcrumbNav).toHaveTextContent('Fields')
  })

  it('renders a CTA section', async () => {
    render(await FieldsIndexPage())
    expect(screen.getByTestId('content-cta')).toHaveTextContent(/skip the manual review/i)
  })

  it('renders JSON-LD structured data', async () => {
    render(await FieldsIndexPage())
    const jsonLdScripts = screen.getAllByTestId('json-ld')
    expect(jsonLdScripts.length).toBeGreaterThanOrEqual(2)

    const schemas = jsonLdScripts.map((el) => JSON.parse(el.innerHTML) as Record<string, unknown>)

    // BreadcrumbList schema
    const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList')
    expect(breadcrumb).toBeDefined()

    // ItemList schema with all 126 fields
    const itemList = schemas.find((s) => s['@type'] === 'ItemList')
    expect(itemList).toBeDefined()
    expect(itemList!.numberOfItems).toBe(FIELDS.length)
    const elements = (itemList as Record<string, Array<Record<string, unknown>>>).itemListElement
    expect(elements[0].position).toBe(1)
    expect(typeof elements[0].url).toBe('string')
    expect((elements[0].url as string).startsWith('https://lextract.io/fields/')).toBe(true)
  })

  it('exports metadata with correct title and canonical', async () => {
    const mod = await import('@/app/(marketing)/fields/page')
    const metadata = mod.metadata
    expect(metadata.title).toBe('Commercial Lease Fields for Abstraction Workflows')
    expect(metadata.alternates?.canonical).toBe('https://lextract.io/fields')
  })
})
