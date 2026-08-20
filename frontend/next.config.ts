import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import { getNoindexHeaderSources, SEO_ALIAS_REDIRECTS } from './lib/seo-route-policy'
import { AI_CS_STUB_PATH, AI_CS_VENDOR_SPECIFIER, hasAiCsVendor } from './lib/vendor-modules'

const projectRoot = process.cwd()

// `@ventora/ai-cs` is an optional dependency on a private registry. When it is
// not installed, point the specifier at a local no-op so the build still runs.
const aiCsResolveAlias: Record<string, string> = hasAiCsVendor(projectRoot)
  ? {}
  : { [AI_CS_VENDOR_SPECIFIER]: AI_CS_STUB_PATH }

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
    resolveAlias: aiCsResolveAlias,
  },


  async redirects() {
    return [
      // Canonicalize bare www root explicitly so it never emits a literal :path* target.
      {
        source: '/',
        has: [{ type: 'host', value: 'www.lextract.io' }],
        destination: 'https://lextract.io',
        permanent: true,
      },
      // Canonicalize www to non-www — prevents duplicate indexing / link equity split
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.lextract.io' }],
        destination: 'https://lextract.io/:path*',
        permanent: true,
      },
      // /blog → /resources — common natural path that hits 404; preserves link equity from external posts
      {
        source: '/blog',
        destination: '/resources',
        permanent: true,
      },
      // /articles → /resources/articles — short form of the canonical URL used in social posts
      {
        source: '/articles',
        destination: '/resources/articles',
        permanent: true,
      },
      // /guides → /resources/guides — short form of the canonical URL used in social posts
      {
        source: '/guides',
        destination: '/resources/guides',
        permanent: true,
      },
      // /comparisons → /resources/comparisons — short form of the canonical URL used in social posts
      {
        source: '/comparisons',
        destination: '/resources/comparisons',
        permanent: true,
      },
      // "Lextract vs X" URL pattern should consolidate immediately to the canonical comparison URL.
      {
        source: '/resources/comparisons/lextract-vs-:slug',
        destination: '/resources/comparisons/:slug',
        permanent: true,
      },
      ...SEO_ALIAS_REDIRECTS,
    ]
  },

  async rewrites() {
    return [
      // Serve llms.txt at the alternate .well-known path for AI crawlers that check both locations
      {
        source: '/.well-known/llms.txt',
        destination: '/llms.txt',
      },
      {
        source: '/.well-known/llms-full.txt',
        destination: '/llms-full.txt',
      },
      {
        source: '/.well-known/pricing.md',
        destination: '/pricing.md',
      },
      {
        source: '/resources/articles/:slug.md',
        destination: '/resources/article-markdown/:slug',
      },
    ]
  },

  images: {
    unoptimized: true, // Next.js image optimization is not available on Cloudflare Workers
    remotePatterns: [],
  },

  async headers() {
    return [
      ...getNoindexHeaderSources().map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
      // llms.txt — force UTF-8 encoding so em dashes render correctly in LLM crawlers
      {
        source: '/llms.txt',
        headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
      },
      {
        source: '/llms-full.txt',
        headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
      },
      {
        source: '/pricing.md',
        headers: [{ key: 'Content-Type', value: 'text/markdown; charset=utf-8' }],
      },
      {
        source: '/resources/articles/:slug.md',
        headers: [{ key: 'Content-Type', value: 'text/markdown; charset=utf-8' }],
      },
      // Also apply charset header for the .well-known alias (headers match request path, not rewrite destination)
      {
        source: '/.well-known/llms.txt',
        headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
      },
      {
        source: '/.well-known/llms-full.txt',
        headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }],
      },
      {
        source: '/.well-known/pricing.md',
        headers: [{ key: 'Content-Type', value: 'text/markdown; charset=utf-8' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Marketing/document HTML must not outlive a deploy or it can reference stale chunk hashes.
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/(pricing|sample-report|upload)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      // pSEO slug pages are HTML and can embed deploy-specific chunk hashes.
      {
        source:
          '/(glossary|fields|red-flags|for|use-cases|lease-types|industries|locations|clauses|property-types|templates|integrations|workflows|case-studies)/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      // Resource content is also HTML and must not advertise deploy-crossing edge TTLs.
      {
        source: '/resources/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // Enforced CSP — switched from Report-Only to enforce actual policy.
            // 'unsafe-inline' and 'unsafe-eval' are required by Next.js App Router
            // (inline script for hydration, eval for webpack dev mode), and
            // https: is required for OG image generation via external services.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.googletagmanager.com https://*.i.posthog.com https://browser.sentry-cdn.com https://widgets.ventoralabs.com https://ventora-ai-sdr-worker.REPLACE_WITH_ACCOUNT_SUBDOMAIN.workers.dev https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // Cloudflare Turnstile renders its bot-check widget inside an iframe
              // served from challenges.cloudflare.com; without an explicit
              // frame-src it falls back to default-src 'self' and is blocked.
              "frame-src 'self' https://challenges.cloudflare.com",
              // In development, allow the local backend + HMR websocket so the
              // app can reach a locally-running API. Production CSP is unchanged.
              `connect-src 'self' https://api.lextract.io https://*.neon.tech https://*.posthog.com https://*.i.posthog.com https://*.sentry.io https://*.ingest.sentry.io https://cloudflareinsights.com https://downloads.lextract.io https://*.cloudflarestorage.com https://widgets.ventoralabs.com https://challenges.cloudflare.com${
                process.env.NODE_ENV !== 'production'
                  ? ' http://localhost:8000 http://localhost:8001 ws://localhost:3000'
                  : ''
              }`,
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

const hasSentrySourceMapUploadConfig = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT,
)

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !hasSentrySourceMapUploadConfig,
    deleteSourcemapsAfterUpload: true,
  },
})
