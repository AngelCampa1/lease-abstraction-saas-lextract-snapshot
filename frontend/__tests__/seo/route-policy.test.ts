/** @vitest-environment node */
import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'
import sitemap from '@/app/sitemap'
import robots from '@/app/robots'
import { getAllIndexableUrls } from '@/lib/indexnow'
import {
  getRobotsDisallowPaths,
  getRoutesBySeoPolicy,
  isIndexNowEligiblePath,
  isSitemapPath,
  SEO_ROUTE_POLICIES,
} from '@/lib/seo-route-policy'

describe('SEO route policy registry', () => {
  it('centralizes private and utility noindex route decisions', () => {
    const noindexRoutes = getRoutesBySeoPolicy('private').concat(
      getRoutesBySeoPolicy('utilityNoindex'),
    )

    expect(noindexRoutes).toEqual(
      expect.arrayContaining([
        '/login',
        '/signup',
        '/dashboard',
        '/profile',
        '/results/:path*',
        '/processing/:path*',
        '/unsubscribe',
      ]),
    )
  })

  it('drives robots disallow paths from the same private route policy', () => {
    const config = robots()
    const rules = config.rules as Array<{ userAgent: string | string[]; disallow?: string[] }>
    const wildcardRule = rules.find((rule) => rule.userAgent === '*')

    expect(wildcardRule?.disallow).toEqual(getRobotsDisallowPaths())
    expect(wildcardRule?.disallow).not.toContain('/login')
    expect(wildcardRule?.disallow).not.toContain('/signup')
    expect(wildcardRule?.disallow).toEqual(
      expect.arrayContaining(['/dashboard', '/profile', '/results', '/processing']),
    )
  })

  it('adds X-Robots-Tag headers for all private and utility noindex routes', async () => {
    const headers = (await nextConfig.headers?.()) ?? []
    const noindexSources = headers
      .filter((entry) =>
        entry.headers.some(
          (header) =>
            header.key === 'X-Robots-Tag' && header.value === 'noindex, nofollow',
        ),
      )
      .map((entry) => entry.source)

    for (const route of SEO_ROUTE_POLICIES.filter(
      (policy) => policy.kind === 'private' || policy.kind === 'utilityNoindex',
    )) {
      expect(noindexSources).toContain(route.path)
    }
    expect(noindexSources).toContain('/dashboard/:path*')
    expect(noindexSources).toContain('/profile/:path*')
    expect(noindexSources).toContain('/results')
    expect(noindexSources).toContain('/results/:path*')
    expect(noindexSources).toContain('/processing')
    expect(noindexSources).toContain('/processing/:path*')
  })

  it('keeps sitemap and IndexNow URLs in parity through the route policy', async () => {
    const sitemapUrls = new Set((await sitemap()).map((entry) => entry.url))
    const indexNowUrls = new Set(await getAllIndexableUrls())

    expect(indexNowUrls).toEqual(sitemapUrls)
    for (const route of SEO_ROUTE_POLICIES.filter((policy) => !policy.includeInSitemap)) {
      const expectedPath = route.path.replace('/:path*', '')
      expect(sitemapUrls).not.toContain(`https://lextract.io${expectedPath}`)
    }
    for (const url of sitemapUrls) {
      const path = new URL(url).pathname
      expect(isSitemapPath(path)).toBe(true)
      expect(isIndexNowEligiblePath(path)).toBe(true)
    }
    expect(isSitemapPath('/api')).toBe(false)
    expect(isIndexNowEligiblePath('/api')).toBe(false)
    expect(isSitemapPath('/results')).toBe(false)
    expect(isSitemapPath('/results/demo')).toBe(false)
    expect(isIndexNowEligiblePath('/processing/demo')).toBe(false)
  })

  it('redirects feed and sitemap aliases to canonical machine-readable URLs', async () => {
    const redirects = (await nextConfig.redirects?.()) ?? []

    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: '/feed', destination: '/feed.xml', permanent: true },
        { source: '/rss.xml', destination: '/feed.xml', permanent: true },
        { source: '/sitemap', destination: '/sitemap.xml', permanent: true },
      ]),
    )
  })
})
