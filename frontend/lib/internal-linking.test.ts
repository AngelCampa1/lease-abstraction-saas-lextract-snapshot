import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CALCULATORS } from '@/data/calculators'
import { PRODUCT_FEATURES } from '@/data/features'
import { INTEGRATIONS } from '@/data/integrations'
import { INDEXABLE_LOCATIONS } from '@/data/locations'
import { resolveFieldHref, resolveRedFlagHref } from '@/lib/pseo-paths'
import {
  getFunnelLinksForRoute,
  getInboundLinkGraph,
  getPublicSeoRoutes,
  resolveCanonicalInternalHref,
} from './internal-linking'
import {
  getAllResourceHubHrefs,
  getResourceHubByHref,
  getResourceHubChildren,
  getResourceHubSections,
} from './resource-hubs'
import { getResourceMenuSections } from './resource-menu'

function flattenResourceHrefs(): string[] {
  return getResourceMenuSections().flatMap((section) =>
    section.links.map((link) => link.href)
  )
}

describe('internal linking', () => {
  it('drives the resources menu from the shared hub registry', () => {
    const menuSections = getResourceMenuSections()
    const hubSections = getResourceHubSections()

    expect(menuSections).toEqual(
      hubSections.map((section) => ({
        heading: section.heading,
        links: section.hubs.map((hub) => ({
          label: hub.label,
          href: hub.href,
          description: hub.description,
        })),
      }))
    )
  })

  it('attaches every resources mega menu hub to a complete child directory', () => {
    const routeMap = new Map(getPublicSeoRoutes().map((route) => [route.href, route]))

    for (const href of getAllResourceHubHrefs()) {
      const hub = getResourceHubByHref(href)
      const children = getResourceHubChildren(href)

      expect(hub).toBeDefined()
      expect(children.length, `${href} should list at least one child`).toBeGreaterThan(0)
      expect(children.every((child) => routeMap.has(child.href))).toBe(true)
      expect(children.every((child) => child.parentHref === href)).toBe(true)
    }
  })

  it('groups every SEO hub in the resources menu exactly once', () => {
    const expectedHubs = [
      '/resources/articles',
      '/resources/guides',
      '/faq',
      '/case-studies',
      '/glossary',
      '/fields',
      '/clauses',
      '/red-flags',
      '/resources/states',
      '/for',
      '/industries',
      '/use-cases',
      '/lease-types',
      '/property-types',
      '/locations',
      '/calculators',
      '/templates',
      '/workflows',
      '/integrations',
      '/resources/comparisons',
    ]

    const menuHrefs = flattenResourceHrefs()
    expect(menuHrefs).toEqual(expect.arrayContaining(expectedHubs))
    for (const href of expectedHubs) {
      expect(menuHrefs.filter((candidate) => candidate === href)).toHaveLength(1)
    }
  })

  it('canonicalizes known stale or redirect-only internal links', () => {
    expect(resolveCanonicalInternalHref('/comparisons')).toBe(
      '/resources/comparisons'
    )
    expect(resolveCanonicalInternalHref('/lease-types/nnn')).toBe(
      '/lease-types/nnn-lease'
    )
    expect(resolveCanonicalInternalHref('/red-flags/uncapped-cam-charges')).toBe(
      '/red-flags/no-cam-cap'
    )
    expect(resolveCanonicalInternalHref('/fields/cam-audit-rights')).toBe(
      '/fields/audit-rights'
    )
    expect(resolveCanonicalInternalHref('/fields/rent-escalation-rate')).toBe(
      '/fields/fixed-escalation-rate'
    )
    expect(
      resolveCanonicalInternalHref(
        '/resources/articles/free-ai-lease-abstraction-tools-what-they-miss'
      )
    ).toBe('/resources/articles/best-ai-lease-abstraction-tools-2026')
  })

  it('keeps static calculator related links canonical and resolvable', () => {
    const routes = new Set(getPublicSeoRoutes().map((route) => route.href))
    const brokenLinks = CALCULATORS.flatMap((calculator) =>
      calculator.relatedLinks
        .map((link) => ({
          calculator: calculator.slug,
          href: link.href,
          canonical: resolveCanonicalInternalHref(link.href),
        }))
        .filter(
          (link) =>
            link.href.startsWith('/') &&
            (link.href !== link.canonical || !routes.has(link.canonical))
        )
    )

    expect(brokenLinks).toEqual([])
  })

  it('keeps location field and red flag references linkable', () => {
    const brokenReferences = INDEXABLE_LOCATIONS.flatMap((location) => [
      ...location.keyFields
        .filter((slug) => resolveFieldHref(slug) === null)
        .map((slug) => `${location.slug}:field:${slug}`),
      ...location.localRedFlags
        .filter((slug) => resolveRedFlagHref(slug) === null)
        .map((slug) => `${location.slug}:red-flag:${slug}`),
    ])

    expect(brokenReferences).toEqual([])
  })

  it('renders integration critical fields through canonical field href resolution', () => {
    const template = readFileSync(
      join(process.cwd(), 'app/(marketing)/integrations/[slug]/page.tsx'),
      'utf8'
    )
    const brokenCriticalFields = INTEGRATIONS.flatMap((integration) =>
      integration.criticalFields
        .filter((slug) => resolveFieldHref(slug) === null)
        .map((slug) => `${integration.slug}:${slug}`)
    )

    expect(template).toContain('resolveFieldHref')
    expect(template).not.toContain('href={`/fields/${fieldSlug}`}')
    expect(brokenCriticalFields).toEqual([])
  })

  it('gives every public SEO route at least one inbound internal link', () => {
    const graph = getInboundLinkGraph()
    const orphanRoutes = getPublicSeoRoutes()
      .filter((route) => route.requiresInboundLink)
      .filter((route) => (graph[route.href] ?? []).length === 0)
      .map((route) => route.href)

    expect(orphanRoutes).toEqual([])
  })

  it('registers feature pages in the public SEO route graph', () => {
    const routes = getPublicSeoRoutes()
    const routeMap = new Map(routes.map((route) => [route.href, route]))

    expect(routeMap.get('/features')).toMatchObject({
      kind: 'hub',
      vertical: 'features',
      requiresInboundLink: true,
    })

    for (const feature of PRODUCT_FEATURES) {
      expect(routeMap.get(`/features/${feature.slug}`)).toMatchObject({
        kind: 'detail',
        vertical: 'features',
        parentHref: '/features',
        requiresInboundLink: true,
      })
    }
  })

  it('adds funnel links for every feature detail page', () => {
    for (const feature of PRODUCT_FEATURES) {
      const links = getFunnelLinksForRoute(`/features/${feature.slug}`)

      expect(links.parent).toEqual([{ label: 'Features', href: '/features' }])
      expect(links.siblings.length).toBeGreaterThanOrEqual(1)
      expect(links.nextSteps.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('adds funnel-aware outbound links for every SEO detail route', () => {
    const routes = new Set(getPublicSeoRoutes().map((route) => route.href))
    const routesWithoutFunnelLinks = getPublicSeoRoutes()
      .filter((route) => route.kind === 'detail')
      .filter((route) => {
        const links = getFunnelLinksForRoute(route.href)
        return (
          links.parent.length < 1 ||
          links.siblings.length < 1 ||
          links.nextSteps.length < 1 ||
          [...links.parent, ...links.siblings, ...links.crossLinks, ...links.nextSteps]
            .some((link) => link.href.startsWith('/') && !routes.has(link.href))
        )
      })
      .map((route) => route.href)

    expect(routesWithoutFunnelLinks).toEqual([])
  })

  it('renders the SEO funnel block in every programmatic SEO detail template', () => {
    const templatePaths = [
      'app/(marketing)/calculators/[slug]/page.tsx',
      'app/(marketing)/case-studies/[slug]/page.tsx',
      'app/(marketing)/clauses/[slug]/page.tsx',
      'app/(marketing)/faq/[slug]/page.tsx',
      'app/(marketing)/fields/[slug]/page.tsx',
      'app/(marketing)/for/[slug]/page.tsx',
      'app/(marketing)/glossary/[slug]/page.tsx',
      'app/(marketing)/industries/[slug]/page.tsx',
      'app/(marketing)/integrations/[slug]/page.tsx',
      'app/(marketing)/lease-types/[slug]/page.tsx',
      'app/(marketing)/locations/[slug]/page.tsx',
      'app/(marketing)/property-types/[slug]/page.tsx',
      'app/(marketing)/red-flags/[slug]/page.tsx',
      'app/(marketing)/resources/articles/[slug]/page.tsx',
      'app/(marketing)/resources/comparisons/[competitor]/page.tsx',
      'app/(marketing)/resources/guides/[slug]/page.tsx',
      'app/(marketing)/resources/states/[state]/page.tsx',
      'app/(marketing)/templates/[slug]/page.tsx',
      'app/(marketing)/tools/lease-comparison/page.tsx',
      'app/(marketing)/use-cases/[slug]/page.tsx',
      'app/(marketing)/workflows/[slug]/page.tsx',
    ]

    const missingFunnelBlock = templatePaths.filter((templatePath) => {
      const source = readFileSync(join(process.cwd(), templatePath), 'utf8')
      return !source.includes('<SeoFunnelLinks routeHref=')
    })

    expect(missingFunnelBlock).toEqual([])
  })

  it('renders the complete hub directory on every resources mega menu hub page', () => {
    const hubPagePaths = [
      'app/(marketing)/resources/articles/page.tsx',
      'app/(marketing)/resources/guides/page.tsx',
      'app/(marketing)/faq/page.tsx',
      'app/(marketing)/case-studies/page.tsx',
      'app/(marketing)/glossary/page.tsx',
      'app/(marketing)/fields/page.tsx',
      'app/(marketing)/clauses/page.tsx',
      'app/(marketing)/red-flags/page.tsx',
      'app/(marketing)/resources/states/page.tsx',
      'app/(marketing)/for/page.tsx',
      'app/(marketing)/industries/page.tsx',
      'app/(marketing)/use-cases/page.tsx',
      'app/(marketing)/lease-types/page.tsx',
      'app/(marketing)/property-types/page.tsx',
      'app/(marketing)/locations/page.tsx',
      'app/(marketing)/calculators/page.tsx',
      'app/(marketing)/templates/page.tsx',
      'app/(marketing)/workflows/page.tsx',
      'app/(marketing)/integrations/page.tsx',
      'app/(marketing)/resources/comparisons/page.tsx',
    ]

    const missingDirectory = hubPagePaths.filter((templatePath) => {
      const source = readFileSync(join(process.cwd(), templatePath), 'utf8')
      return !source.includes('<ResourceHubDirectory hubHref=')
    })

    expect(missingDirectory).toEqual([])
  })
})
