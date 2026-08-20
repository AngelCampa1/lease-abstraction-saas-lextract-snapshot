export type SeoRoutePolicyKind = 'indexable' | 'private' | 'utilityNoindex'

export interface SeoRoutePolicy {
  path: string
  kind: SeoRoutePolicyKind
  includeInSitemap: boolean
  allowInRobots: boolean
  indexNowEligible: boolean
  metadata: 'required' | 'noindex'
}

export const SEO_ROUTE_POLICIES = [
  {
    path: '/login',
    kind: 'private',
    includeInSitemap: false,
    allowInRobots: true,
    indexNowEligible: false,
    metadata: 'noindex',
  },
  {
    path: '/signup',
    kind: 'private',
    includeInSitemap: false,
    allowInRobots: true,
    indexNowEligible: false,
    metadata: 'noindex',
  },
  {
    path: '/dashboard',
    kind: 'private',
    includeInSitemap: false,
    allowInRobots: false,
    indexNowEligible: false,
    metadata: 'noindex',
  },
  {
    path: '/profile',
    kind: 'private',
    includeInSitemap: false,
    allowInRobots: false,
    indexNowEligible: false,
    metadata: 'noindex',
  },
  {
    path: '/results/:path*',
    kind: 'private',
    includeInSitemap: false,
    allowInRobots: false,
    indexNowEligible: false,
    metadata: 'noindex',
  },
  {
    path: '/processing/:path*',
    kind: 'private',
    includeInSitemap: false,
    allowInRobots: false,
    indexNowEligible: false,
    metadata: 'noindex',
  },
  {
    path: '/unsubscribe',
    kind: 'utilityNoindex',
    includeInSitemap: false,
    allowInRobots: false,
    indexNowEligible: false,
    metadata: 'noindex',
  },
] as const satisfies readonly SeoRoutePolicy[]

export const SEO_ALIAS_REDIRECTS = [
  { source: '/feed', destination: '/feed.xml', permanent: true },
  { source: '/rss.xml', destination: '/feed.xml', permanent: true },
  { source: '/sitemap', destination: '/sitemap.xml', permanent: true },
] as const

function toRobotsPath(path: string): string {
  return path.replace('/:path*', '')
}

function getPolicyForPath(path: string): SeoRoutePolicy | undefined {
  return SEO_ROUTE_POLICIES.find((policy) => {
    const basePath = toRobotsPath(policy.path)
    return path === basePath || path.startsWith(`${basePath}/`)
  })
}

export function getRoutesBySeoPolicy(kind: SeoRoutePolicyKind): string[] {
  return SEO_ROUTE_POLICIES.filter((policy) => policy.kind === kind).map(
    (policy) => policy.path,
  )
}

export function getRobotsDisallowPaths(): string[] {
  const disallowPaths = new Set(['/api', '/api/'])
  for (const policy of SEO_ROUTE_POLICIES.filter((route) => !route.allowInRobots)) {
    const robotsPath = toRobotsPath(policy.path)
    disallowPaths.add(robotsPath)
    disallowPaths.add(`${robotsPath}/`)
  }
  return Array.from(disallowPaths)
}

export function getNoindexHeaderSources(): string[] {
  const sources = new Set<string>()
  for (const policy of SEO_ROUTE_POLICIES.filter((route) => route.metadata === 'noindex')) {
    sources.add(policy.path)
    const basePath = toRobotsPath(policy.path)
    if (basePath !== policy.path) {
      sources.add(basePath)
    } else {
      sources.add(`${policy.path}/:path*`)
    }
  }
  return Array.from(sources)
}

export function isSitemapPath(path: string): boolean {
  if (path === '/api' || path.startsWith('/api/')) {
    return false
  }

  return getPolicyForPath(path)?.includeInSitemap ?? true
}

export function isIndexNowEligiblePath(path: string): boolean {
  if (path === '/api' || path.startsWith('/api/')) {
    return false
  }

  return getPolicyForPath(path)?.indexNowEligible ?? isSitemapPath(path)
}
