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

// Mock JSON-LD component
vi.mock('@/components/seo/json-ld', () => ({
  JsonLd: ({ schema }: { schema: unknown }) => (
    <script
      type="application/ld+json"
      data-testid="json-ld"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  ),
}))

// Mock Breadcrumbs
vi.mock('@/components/content/breadcrumbs', () => ({
  Breadcrumbs: ({ crumbs }: { crumbs: Array<{ label: string; href?: string }> }) => (
    <nav aria-label="breadcrumb">
      {crumbs.map((c) => <span key={c.label}>{c.label}</span>)}
    </nav>
  ),
}))

vi.mock('@/lib/content-matching', () => ({
  getAllContentItems: vi.fn().mockResolvedValue([
    {
      title: 'What Is Lease Abstraction?',
      slug: 'what-is-lease-abstraction',
      description: 'A guide to lease abstraction.',
      category: 'articles',
      author: 'Angel Campa, Founder',
      publishedAt: '2026-03-01',
      readingTime: 5,
      tags: [],
      featured: false,
      funnelStage: 'tofu',
      silo: 'lease-abstraction',
    },
    {
      title: 'CAM Reconciliation Guide',
      slug: 'cam-reconciliation-guide',
      description: 'How CAM reconciliation works.',
      category: 'guides',
      author: 'Angel Campa, Founder',
      publishedAt: '2026-03-05',
      readingTime: 8,
      tags: [],
      featured: false,
      funnelStage: 'mofu',
      silo: 'cam-audit',
    },
  ]),
}))

import AngelCampaPage from '@/app/(marketing)/about/angel-campa/page'

describe('AngelCampaPage', () => {
  it('renders the author name as H1', async () => {
    render(await AngelCampaPage())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Angel Campa')
  })

  it('renders the founder title', async () => {
    render(await AngelCampaPage())
    expect(screen.getByText('Founder, Lextract')).toBeInTheDocument()
  })

  it('renders a LinkedIn link', async () => {
    render(await AngelCampaPage())
    const linkedInLink = screen.getByRole('link', { name: /linkedin/i })
    expect(linkedInLink).toHaveAttribute('href', 'https://www.linkedin.com/in/angelcampa1/')
    expect(linkedInLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the Published Content section when authored content exists', async () => {
    render(await AngelCampaPage())
    expect(screen.getByRole('heading', { level: 2, name: 'Published Content' })).toBeInTheDocument()
    expect(screen.getByText('What Is Lease Abstraction?')).toBeInTheDocument()
    expect(screen.getByText('CAM Reconciliation Guide')).toBeInTheDocument()
  })

  it('links authored content to correct resource paths', async () => {
    render(await AngelCampaPage())
    const articleLink = screen.getByRole('link', { name: /What Is Lease Abstraction/i })
    expect(articleLink).toHaveAttribute('href', '/resources/articles/what-is-lease-abstraction')
    const guideLink = screen.getByRole('link', { name: /CAM Reconciliation Guide/i })
    expect(guideLink).toHaveAttribute('href', '/resources/guides/cam-reconciliation-guide')
  })

  it('hides Published Content section when no authored content', async () => {
    const { getAllContentItems } = await import('@/lib/content-matching')
    vi.mocked(getAllContentItems).mockResolvedValueOnce([])
    render(await AngelCampaPage())
    expect(screen.queryByRole('heading', { level: 2, name: 'Published Content' })).toBeNull()
  })

  it('renders breadcrumb navigation', async () => {
    render(await AngelCampaPage())
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
    expect(nav).toHaveTextContent('Angel Campa')
  })

  it('emits Person JSON-LD schema', async () => {
    render(await AngelCampaPage())
    const scripts = document.querySelectorAll('script[data-testid="json-ld"]')
    const schemas = Array.from(scripts).map((s) => JSON.parse(s.innerHTML))
    const personSchema = schemas.find((s) => s['@type'] === 'Person')
    expect(personSchema).toBeDefined()
    expect(personSchema.name).toBe('Angel Campa')
    expect(personSchema.sameAs).toContain('https://www.linkedin.com/in/angelcampa1/')
  })
})
