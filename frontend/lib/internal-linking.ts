import type { FunnelStage } from './content-types'
import { getNextStage, VERTICAL_FUNNEL_MAP } from './funnel-config'
import { getResourceMenuSections as getStaticResourceMenuSections } from './resource-menu'
import type { ResourceMenuSection } from './resource-menu'
import { getContentRedirectTarget } from './seo-inventory'
import type { ContentCollection } from './seo-inventory'
import { getResourceHubChildren, getResourceHubSections } from './resource-hubs'
import { getClauseSeoRedirect } from '@/data/clauses'
import { getFieldSeoRedirect } from '@/data/fields'
import { getGlossarySeoRedirect } from '@/data/glossary'
import { getLeaseTypeSeoRedirect } from '@/data/lease-types'
import { getRedFlagSeoRedirect } from '@/data/red-flags'
import { PRODUCT_FEATURES } from '@/data/features'

export interface InternalLink {
  label: string
  href: string
  description?: string
}

export interface PublicSeoRoute extends InternalLink {
  kind: 'hub' | 'detail' | 'money' | 'utility'
  vertical: string
  funnelStage: FunnelStage
  parentHref?: string
  requiresInboundLink: boolean
}

export interface FunnelLinks {
  parent: InternalLink[]
  siblings: InternalLink[]
  crossLinks: InternalLink[]
  nextSteps: InternalLink[]
}

const MONEY_ROUTES: PublicSeoRoute[] = [
  route('/', 'Home', 'money', 'home', 'bofu', false),
  route('/lease-abstraction-software', 'Lease Abstraction Software', 'money', 'product', 'bofu'),
  route('/lease-extraction-software', 'Lease Extraction Software', 'money', 'product', 'bofu'),
  route('/ai-lease-abstraction', 'AI Lease Abstraction', 'money', 'product', 'bofu'),
  route('/automated-lease-abstraction', 'Automated Lease Abstraction', 'money', 'product', 'bofu'),
  route('/lease-abstraction-services', 'Lease Abstraction Services', 'money', 'product', 'bofu'),
  route('/pricing', 'Pricing', 'money', 'product', 'bofu'),
  route('/sample-report', 'Sample Report', 'money', 'product', 'bofu'),
  route('/features', 'Features', 'hub', 'features', 'mofu'),
  route('/upload', 'Upload a Lease', 'utility', 'conversion', 'bofu'),
  route('/login', 'Log In', 'utility', 'auth', 'bofu', false),
  route('/signup', 'Sign Up', 'utility', 'auth', 'bofu', false),
  route('/about', 'About', 'utility', 'company', 'mofu'),
  route('/about/angel-campa', 'Angel Campa', 'utility', 'company', 'mofu'),
  route('/privacy', 'Privacy Policy', 'utility', 'legal', 'tofu'),
  route('/terms', 'Terms of Service', 'utility', 'legal', 'tofu'),
]

const KNOWN_CANONICAL_HREFS: Record<string, string> = {
  '/blog': '/resources',
  '/articles': '/resources/articles',
  '/guides': '/resources/guides',
  '/comparisons': '/resources/comparisons',
  '/lease-types/nnn': '/lease-types/nnn-lease',
  '/lease-types/retail': '/lease-types/percentage-lease',
  '/red-flags/uncapped-cam-charges': '/red-flags/no-cam-cap',
  '/fields/cam-audit-rights': '/fields/audit-rights',
  '/fields/rent-escalation-rate': '/fields/fixed-escalation-rate',
  '/fields/tenant-improvement-allowance': '/fields/ti-allowance-per-rsf',
  '/fields/free-rent-period': '/glossary/rent-abatement',
  '/fields/percentage-rent-breakpoint': '/lease-types/percentage-lease',
  '/clauses/cpi-escalation': '/fields/escalation-type',
  '/clauses/cam-charges': '/glossary/cam-charges',
}

function route(
  href: string,
  label: string,
  kind: PublicSeoRoute['kind'],
  vertical: string,
  funnelStage: FunnelStage,
  requiresInboundLink = true,
  parentHref?: string
): PublicSeoRoute {
  return {
    href,
    label,
    kind,
    vertical,
    funnelStage,
    requiresInboundLink,
    parentHref,
  }
}

function detailRoute(
  href: string,
  label: string,
  vertical: string,
  parentHref: string,
  funnelStage?: FunnelStage
): PublicSeoRoute {
  return route(
    href,
    label,
    'detail',
    vertical,
    funnelStage ?? VERTICAL_FUNNEL_MAP[vertical] ?? 'mofu',
    true,
    parentHref
  )
}

function isContentCollection(value: string): value is ContentCollection {
  return value === 'articles' || value === 'guides'
}

function uniqueRoutes(routes: PublicSeoRoute[]): PublicSeoRoute[] {
  const seen = new Set<string>()
  const result: PublicSeoRoute[] = []
  for (const candidate of routes) {
    const canonicalHref = resolveCanonicalInternalHref(candidate.href)
    if (seen.has(canonicalHref)) continue
    seen.add(canonicalHref)
    result.push({ ...candidate, href: canonicalHref })
  }
  return result
}

export function getResourceMenuSections(): ResourceMenuSection[] {
  return getStaticResourceMenuSections().map((section) => ({
    ...section,
    links: section.links.map((link) => ({
      ...link,
      href: resolveCanonicalInternalHref(link.href),
    })),
  }))
}

export function getPublicSeoRoutes(): PublicSeoRoute[] {
  const resourceHubs = getResourceHubSections().flatMap((section) => section.hubs)
  const hubRoutes = getResourceMenuSections()
    .flatMap((section) => section.links)
    .map((link) => {
      const hub = resourceHubs.find((candidate) => candidate.href === link.href)

      return route(
        link.href,
        link.label,
        'hub',
        hub?.vertical ?? link.href.split('/').filter(Boolean).at(-1) ?? 'resources',
        hub?.funnelStage ?? 'mofu'
      )
    })

  const routes = [
    ...MONEY_ROUTES,
    route('/resources', 'Resources', 'hub', 'resources', 'tofu'),
    route('/tools', 'Tools', 'hub', 'tools', 'mofu'),
    route('/tools/lease-comparison', 'Lease Comparison Tool', 'detail', 'tools', 'mofu', true, '/tools'),
    ...PRODUCT_FEATURES.map((feature) =>
      detailRoute(`/features/${feature.slug}`, feature.name, 'features', '/features', 'mofu')
    ),
    ...hubRoutes,
    ...resourceHubs.flatMap((hub) =>
      getResourceHubChildren(hub.href).map((child) =>
        detailRoute(child.href, child.label, child.vertical, child.parentHref, child.funnelStage)
      )
    ),
  ]

  return uniqueRoutes(routes)
}

export function resolveCanonicalInternalHref(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href

  const [pathWithPossibleSlash] = href.split(/[?#]/)
  const normalizedPath =
    pathWithPossibleSlash.length > 1 && pathWithPossibleSlash.endsWith('/')
      ? pathWithPossibleSlash.slice(0, -1)
      : pathWithPossibleSlash

  if (KNOWN_CANONICAL_HREFS[normalizedPath]) {
    return KNOWN_CANONICAL_HREFS[normalizedPath]
  }

  const contentMatch = normalizedPath.match(/^\/resources\/(articles|guides)\/([^/]+)$/)
  if (contentMatch) {
    const [, collection, slug] = contentMatch
    if (!isContentCollection(collection)) return normalizedPath
    const redirect = getContentRedirectTarget(collection, slug)
    return redirect ?? normalizedPath
  }

  const redirectResolvers: Array<[RegExp, (slug: string) => string | null]> = [
    [/^\/fields\/([^/]+)$/, getFieldSeoRedirect],
    [/^\/glossary\/([^/]+)$/, getGlossarySeoRedirect],
    [/^\/clauses\/([^/]+)$/, getClauseSeoRedirect],
    [/^\/red-flags\/([^/]+)$/, getRedFlagSeoRedirect],
    [/^\/lease-types\/([^/]+)$/, getLeaseTypeSeoRedirect],
  ]

  for (const [pattern, resolver] of redirectResolvers) {
    const match = normalizedPath.match(pattern)
    if (!match) continue
    return resolver(match[1]) ?? normalizedPath
  }

  return normalizedPath
}

function routesByHref(): Map<string, PublicSeoRoute> {
  return new Map(getPublicSeoRoutes().map((candidate) => [candidate.href, candidate]))
}

function getSiblingLinks(current: PublicSeoRoute, max = 4): InternalLink[] {
  const sameVertical = getPublicSeoRoutes()
    .filter((candidate) => candidate.kind === 'detail')
    .filter((candidate) => candidate.href !== current.href)
    .filter((candidate) => candidate.vertical === current.vertical)
    .slice(0, max)
    .map(({ label, href }) => ({ label, href }))

  if (sameVertical.length > 0) return sameVertical

  return getPublicSeoRoutes()
    .filter((candidate) => candidate.kind === 'detail')
    .filter((candidate) => candidate.href !== current.href)
    .filter((candidate) => candidate.funnelStage === current.funnelStage)
    .slice(0, max)
    .map(({ label, href }) => ({ label, href }))
}

function getCrossLinks(current: PublicSeoRoute, max = 4): InternalLink[] {
  const nextStage = getNextStage(current.funnelStage)
  return getPublicSeoRoutes()
    .filter((candidate) => candidate.kind === 'detail')
    .filter((candidate) => candidate.href !== current.href)
    .filter((candidate) => candidate.vertical !== current.vertical)
    .filter((candidate) => (nextStage ? candidate.funnelStage === nextStage : true))
    .slice(0, max)
    .map(({ label, href }) => ({ label, href }))
}

function getNextStepLinks(current: PublicSeoRoute): InternalLink[] {
  const shared = [
    { label: 'Upload a Lease', href: '/upload' },
    { label: 'View Sample Report', href: '/sample-report' },
  ]

  if (current.funnelStage === 'tofu') {
    return [
      { label: 'AI Lease Abstraction', href: '/ai-lease-abstraction' },
      { label: 'Lease Abstraction Software', href: '/lease-abstraction-software' },
      ...shared.slice(0, 1),
    ]
  }

  if (current.funnelStage === 'mofu') {
    return [
      { label: 'See Pricing', href: '/pricing' },
      { label: 'Lease Extraction Software', href: '/lease-extraction-software' },
      ...shared,
    ]
  }

  return [
    { label: 'Upload a Lease', href: '/upload' },
    { label: 'See Pricing', href: '/pricing' },
    { label: 'View Sample Report', href: '/sample-report' },
  ]
}

export function getFunnelLinksForRoute(href: string): FunnelLinks {
  const canonicalHref = resolveCanonicalInternalHref(href)
  const routeMap = routesByHref()
  const current = routeMap.get(canonicalHref)
  if (!current) {
    return { parent: [], siblings: [], crossLinks: [], nextSteps: [] }
  }

  const parent = current.parentHref
    ? [routeMap.get(current.parentHref)]
        .filter((candidate): candidate is PublicSeoRoute => candidate !== undefined)
        .map(({ label, href: parentHref }) => ({ label, href: parentHref }))
    : []

  return {
    parent,
    siblings: getSiblingLinks(current),
    crossLinks: getCrossLinks(current),
    nextSteps: getNextStepLinks(current).map((link) => ({
      ...link,
      href: resolveCanonicalInternalHref(link.href),
    })),
  }
}

export function getInboundLinkGraph(): Record<string, string[]> {
  const routes = getPublicSeoRoutes()
  const routeHrefs = new Set(routes.map((candidate) => candidate.href))
  const graph: Record<string, string[]> = Object.fromEntries(
    routes.map((candidate) => [candidate.href, []])
  )

  function addLink(source: string, target: string): void {
    const canonicalTarget = resolveCanonicalInternalHref(target)
    if (!routeHrefs.has(canonicalTarget) || source === canonicalTarget) return
    graph[canonicalTarget].push(source)
  }

  for (const routeEntry of routes) {
    if (routeEntry.parentHref) addLink(routeEntry.parentHref, routeEntry.href)
    const links = getFunnelLinksForRoute(routeEntry.href)
    for (const link of [
      ...links.parent,
      ...links.siblings,
      ...links.crossLinks,
      ...links.nextSteps,
    ]) {
      addLink(routeEntry.href, link.href)
    }
  }

  for (const section of getResourceMenuSections()) {
    for (const link of section.links) addLink('/resources', link.href)
  }

  const globalNavigationLinks = [
    '/lease-abstraction-software',
    '/lease-extraction-software',
    '/ai-lease-abstraction',
    '/automated-lease-abstraction',
    '/lease-abstraction-services',
    '/pricing',
    '/sample-report',
    '/features',
    '/upload',
    '/resources',
    '/tools',
    '/about',
    '/about/angel-campa',
    '/privacy',
    '/terms',
    ...getResourceMenuSections().flatMap((section) =>
      section.links.map((link) => link.href)
    ),
  ]

  for (const href of globalNavigationLinks) addLink('/', href)

  return graph
}
