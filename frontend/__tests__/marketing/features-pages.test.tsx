import { cleanup, render, screen, within } from '@testing-library/react'
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
  PSEO_LAUNCH_DATE: '2026-04-01',
}))

import FeaturesPage, { metadata as featuresMetadata } from '@/app/(marketing)/features/page'
import FeaturePage, {
  generateMetadata,
  generateStaticParams,
} from '@/app/(marketing)/features/[slug]/page'
import sitemap from '@/app/sitemap'
import { PRODUCT_FEATURES } from '@/data/features'

const EM_DASH = '\u2014'

describe('feature landing pages', () => {
  it('defines a landing page for every product feature', () => {
    expect(PRODUCT_FEATURES.map((feature) => feature.slug)).toEqual([
      '126-field-lease-extraction',
      'pdf-native-ai-extraction',
      'multi-pass-validation',
      'confidence-scoring',
      'red-flag-detection',
      'reviewable-results',
      'excel-word-pdf-exports',
      'pay-per-lease-pricing',
    ])

    for (const feature of PRODUCT_FEATURES) {
      expect(feature.problem).toMatch(/\S/)
      expect(feature.solution).toMatch(/\S/)
      expect(feature.fastAnswer).toMatch(/\S/)
      expect(feature.internalLinks.length).toBeGreaterThanOrEqual(4)
      expect(feature.faqs.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps feature fast answers distinct for AI answer extraction', () => {
    const fastAnswers = PRODUCT_FEATURES.map((feature) => feature.fastAnswer)

    expect(new Set(fastAnswers).size).toBe(PRODUCT_FEATURES.length)
  })

  it('renders the /features index with clickable links to every feature', () => {
    render(<FeaturesPage />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /commercial lease abstraction features/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/lease PDFs are long, and key terms get missed/i)).toBeInTheDocument()
    expect(screen.getByText(/lextract turns each lease into reviewable data/i)).toBeInTheDocument()

    for (const feature of PRODUCT_FEATURES) {
      const link = screen.getByRole('link', { name: new RegExp(feature.name, 'i') })
      expect(link).toHaveAttribute('href', `/features/${feature.slug}`)
    }
  })

  it('renders index page AI and SEO schema', () => {
    const { container } = render(<FeaturesPage />)
    const scripts = Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
    expect(scripts.length).toBeGreaterThanOrEqual(4)

    const json = scripts.map((script) => JSON.parse(script.textContent ?? '{}'))
    expect(json.some((schema) => schema['@type'] === 'CollectionPage')).toBe(true)
    expect(json.some((schema) => schema['@type'] === 'ItemList')).toBe(true)
    expect(json.some((schema) => schema['@type'] === 'FAQPage')).toBe(true)
    expect(json.some((schema) => schema['@type'] === 'WebPage' && schema.speakable)).toBe(true)
  })

  it('sets index metadata with a canonical URL and no em dash characters', () => {
    expect(featuresMetadata.title).toMatch(/Commercial Lease Abstraction Features/)
    expect(featuresMetadata.description).toMatch(/problem/)
    expect(featuresMetadata.alternates?.canonical).toBe('https://lextract.io/features')

    const serialized = JSON.stringify(featuresMetadata)
    expect(serialized).not.toContain(EM_DASH)
  })

  it('generates static params for every feature detail page', () => {
    expect(generateStaticParams()).toEqual(
      PRODUCT_FEATURES.map((feature) => ({ slug: feature.slug })),
    )
  })

  it('renders each feature detail page with problem first, solution second, and strong links', async () => {
    for (const feature of PRODUCT_FEATURES) {
      render(await FeaturePage({ params: Promise.resolve({ slug: feature.slug }) }))

      const h1 = screen.getByRole('heading', { level: 1, name: new RegExp(feature.name, 'i') })
      expect(h1).toBeInTheDocument()

      const problemHeading = screen.getByRole('heading', {
        level: 2,
        name: /the problem/i,
      })
      const solutionHeading = screen.getByRole('heading', {
        level: 2,
        name: /how lextract solves it/i,
      })
      expect(problemHeading.compareDocumentPosition(solutionHeading)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )

      const related = screen.getByRole('navigation', { name: /related feature links/i })
      expect(within(related).getAllByRole('link').length).toBeGreaterThanOrEqual(4)
      expect(screen.getByRole('link', { name: /view all features/i })).toHaveAttribute(
        'href',
        '/features',
      )
      cleanup()
    }
  })

  it('renders feature detail JSON-LD for FAQ, breadcrumb, article, and speakable answers', async () => {
    const { container } = render(
      await FeaturePage({ params: Promise.resolve({ slug: 'confidence-scoring' }) }),
    )
    const json = Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map(
      (script) => JSON.parse(script.textContent ?? '{}'),
    )

    expect(json.some((schema) => schema['@type'] === 'FAQPage')).toBe(true)
    expect(json.some((schema) => schema['@type'] === 'BreadcrumbList')).toBe(true)
    expect(json.some((schema) => schema['@type'] === 'Article')).toBe(true)
    expect(json.some((schema) => schema['@type'] === 'WebPage' && schema.speakable)).toBe(true)
  })

  it('generates detail metadata with canonical URLs and feature keywords', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'red-flag-detection' }),
    })

    expect(metadata.title).toMatch(/Red Flag Detection/)
    expect(metadata.description).toMatch(/commercial lease/i)
    expect(metadata.alternates?.canonical).toBe(
      'https://lextract.io/features/red-flag-detection',
    )
    expect(JSON.stringify(metadata)).not.toContain(EM_DASH)
  })

  it('keeps all feature page copy free of em dash characters', async () => {
    render(<FeaturesPage />)
    for (const feature of PRODUCT_FEATURES) {
      render(await FeaturePage({ params: Promise.resolve({ slug: feature.slug }) }))
    }

    expect(document.body.textContent).not.toContain(EM_DASH)
  })

  it('adds feature pages to the sitemap', async () => {
    const routes = await sitemap()
    const urls = routes.map((route) => route.url)

    expect(urls).toContain('https://lextract.io/features')
    for (const feature of PRODUCT_FEATURES) {
      expect(urls).toContain(`https://lextract.io/features/${feature.slug}`)
    }
  })

  it('keeps every feature internal link pointed at a sitemap route', async () => {
    const sitemapPaths = new Set(
      (await sitemap()).map((route) => new URL(route.url).pathname),
    )

    const brokenLinks = PRODUCT_FEATURES.flatMap((feature) =>
      feature.internalLinks
        .filter((link) => link.href.startsWith('/'))
        .filter((link) => !sitemapPaths.has(link.href))
        .map((link) => `${feature.slug}:${link.href}`),
    )

    expect(brokenLinks).toEqual([])
  })

  it('keeps each feature internal link list unique', () => {
    const duplicateLinks = PRODUCT_FEATURES.flatMap((feature) => {
      const seen = new Set<string>()
      return feature.internalLinks
        .map((link) => link.href)
        .filter((href) => {
          if (seen.has(href)) return true
          seen.add(href)
          return false
        })
        .map((href) => `${feature.slug}:${href}`)
    })

    expect(duplicateLinks).toEqual([])
  })
})
