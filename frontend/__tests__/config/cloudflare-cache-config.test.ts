/** @vitest-environment node */
import fs from 'fs'
import path from 'path'

import { describe, expect, it } from 'vitest'

const frontendRoot = path.resolve(__dirname, '../..')

function readFrontendFile(relativePath: string): string {
  return fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8')
}

function parseHeadersBlocks(headersFile: string): Map<string, string[]> {
  const blocks = new Map<string, string[]>()
  let currentPath: string | null = null

  for (const line of headersFile.split(/\r?\n/)) {
    if (line.length === 0) {
      currentPath = null
    } else if (!line.startsWith(' ')) {
      currentPath = line
      blocks.set(currentPath, [])
    } else if (currentPath) {
      blocks.get(currentPath)?.push(line.trim())
    }
  }

  return blocks
}

describe('Cloudflare cache configuration', () => {
  it('uses static-assets incremental cache instead of KV-backed overrides', () => {
    const config = readFrontendFile('open-next.config.ts')

    expect(config).toContain('static-assets-incremental-cache')
    expect(config).toContain('enableCacheInterception: true')
    expect(config).not.toContain('kv-incremental-cache')
    expect(config).not.toContain('kv-next-tag-cache')
    expect(config).not.toMatch(/\btagCache\b/)
  })

  it('does not bind Next cache namespaces in wrangler', () => {
    const wranglerConfig = readFrontendFile('wrangler.jsonc')

    expect(wranglerConfig).not.toContain('kv_namespaces')
    expect(wranglerConfig).not.toContain('NEXT_INC_CACHE_KV')
    expect(wranglerConfig).not.toContain('NEXT_TAG_CACHE_KV')
  })

  it('does not give marketing HTML routes deploy-crossing edge cache TTLs', () => {
    const nextConfig = readFrontendFile('next.config.ts')

    expect(nextConfig).toContain("source: '/'")
    expect(nextConfig).toContain("source: '/(pricing|sample-report|upload)'")
    expect(nextConfig).toContain("source: '/resources/:path*'")
    expect(nextConfig).toContain(
      "/(glossary|fields|red-flags|for|use-cases|lease-types|industries|locations|clauses|property-types|templates|integrations|workflows|case-studies)/:slug*",
    )
    expect(nextConfig).toContain("value: 'public, max-age=0, must-revalidate'")

    const marketingSection = nextConfig.match(
      /source: '\/'[\s\S]*?source: '\/resources\/:path\*'[\s\S]*?value: 'public, max-age=0, must-revalidate'/,
    )
    expect(marketingSection).not.toBeNull()
    expect(nextConfig).not.toMatch(
      /source: '\/(?:'|\(pricing\|sample-report\|upload\)|resources\/:path\*|\(glossary\|fields\|red-flags\|for\|use-cases\|lease-types\|industries\|locations\|clauses\|property-types\|templates\|integrations\|workflows\|case-studies\)\/:slug\*')[\s\S]*s-maxage=/,
    )
  })

  it('marks content-hashed Next static assets as immutable while HTML revalidates', () => {
    const nextConfig = readFrontendFile('next.config.ts')

    expect(nextConfig).toContain("source: '/_next/static/:path*'")
    expect(nextConfig).toContain("value: 'public, max-age=31536000, immutable'")
    expect(nextConfig).toContain("value: 'public, max-age=0, must-revalidate'")
  })

  it('applies immutable cache headers through Cloudflare static asset headers', () => {
    const headerBlocks = parseHeadersBlocks(readFrontendFile('public/_headers'))
    const immutableHeader = 'Cache-Control: public, max-age=31536000, immutable'

    expect(headerBlocks.get('/_next/static/*')).toContain(immutableHeader)
    expect(headerBlocks.get('/_next/static/chunks/*.css')).toContain(
      'Content-Type: text/css; charset=utf-8',
    )
    expect(headerBlocks.get('/_next/static/css/*.css')).toContain(
      'Content-Type: text/css; charset=utf-8',
    )
    expect(headerBlocks.get('/_next/static/chunks/*.js')).toContain(
      'Content-Type: application/javascript; charset=utf-8',
    )
  })

  it('does not preconnect to the old PDF.js worker CDN', () => {
    const publicAppLayout = readFrontendFile('app/(public-app)/layout.tsx')

    expect(publicAppLayout).not.toContain('https://unpkg.com')
  })

  it('allows signed Cloudflare R2 document fetches in the enforced CSP', () => {
    const nextConfig = readFrontendFile('next.config.ts')

    expect(nextConfig).toContain("connect-src 'self'")
    expect(nextConfig).toContain('https://downloads.lextract.io')
    expect(nextConfig).toContain('https://*.cloudflarestorage.com')
  })
})
