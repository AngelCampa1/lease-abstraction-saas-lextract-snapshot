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

// Mock content-cta component
vi.mock('@/components/content/content-cta', () => ({
  ContentCta: ({ heading }: { heading: string }) => (
    <div data-testid="content-cta">{heading}</div>
  ),
}))

// Mock breadcrumbs component
vi.mock('@/components/content/breadcrumbs', () => ({
  Breadcrumbs: ({ crumbs }: { crumbs: Array<{ label: string; href?: string }> }) => (
    <nav aria-label="breadcrumb">
      {crumbs.map((c) => (
        <span key={c.label}>{c.label}</span>
      ))}
    </nav>
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

import WorkflowsIndexPage from '@/app/(marketing)/workflows/page'
import { WORKFLOWS } from '@/data/workflows'

describe('WorkflowsIndexPage', () => {
  it('renders the page heading', async () => {
    render(await WorkflowsIndexPage())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Lease Data Workflows',
    )
  })

  it('renders the workflow count in the header', async () => {
    render(await WorkflowsIndexPage())
    const count = WORKFLOWS.length.toString()
    const matches = screen.getAllByText(new RegExp(count))
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders workflow cards linking to detail pages', async () => {
    render(await WorkflowsIndexPage())
    for (const workflow of WORKFLOWS) {
      const link = document.querySelector(`a[href="/workflows/${workflow.slug}"]`)
      expect(link, `missing link for ${workflow.slug}`).toBeInTheDocument()
    }
  })

  it('renders category section headings', async () => {
    render(await WorkflowsIndexPage())
    // At least one category heading should be present
    expect(screen.getByRole('heading', { name: 'Import', level: 2 })).toBeInTheDocument()
  })

  it('renders workflow names', async () => {
    render(await WorkflowsIndexPage())
    for (const workflow of WORKFLOWS) {
      const elements = screen.getAllByText(workflow.name)
      expect(elements.length, `missing name: ${workflow.name}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('renders breadcrumbs navigation', async () => {
    render(await WorkflowsIndexPage())
    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(breadcrumb).toBeInTheDocument()
  })

  it('renders JSON-LD structured data', async () => {
    render(await WorkflowsIndexPage())
    const jsonLdScripts = screen.getAllByTestId('json-ld')
    expect(jsonLdScripts.length).toBeGreaterThanOrEqual(1)
    const schemas = jsonLdScripts.map((el) => JSON.parse(el.innerHTML) as Record<string, unknown>)
    const breadcrumb = schemas.find((s) => s['@type'] === 'BreadcrumbList')
    expect(breadcrumb).toBeDefined()
  })

  it('renders the CTA section', async () => {
    render(await WorkflowsIndexPage())
    expect(screen.getByTestId('content-cta')).toBeInTheDocument()
    expect(
      screen.getByText('Start extracting lease data in minutes'),
    ).toBeInTheDocument()
  })

  it('exports metadata with correct title', async () => {
    const mod = await import('@/app/(marketing)/workflows/page')
    const metadata = mod.metadata
    expect(metadata.title).toContain('Workflows')
  })
})
