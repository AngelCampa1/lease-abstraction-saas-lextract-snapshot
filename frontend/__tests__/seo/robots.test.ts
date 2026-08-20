/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import robots from '@/app/robots'

describe('robots', () => {
  it('returns rules array with at least 2 rule sets', () => {
    const config = robots()
    expect(Array.isArray(config.rules)).toBe(true)
    const rules = config.rules as Array<{ userAgent: string | string[]; allow?: string[]; disallow?: string[] }>
    expect(rules.length).toBeGreaterThanOrEqual(2)
  })

  it('has a wildcard rule allowing root', () => {
    const config = robots()
    const rules = config.rules as Array<{ userAgent: string | string[]; allow?: string[]; disallow?: string[] }>
    const wildcardRule = rules.find((r) => r.userAgent === '*')
    expect(wildcardRule).toBeDefined()
    expect(wildcardRule?.allow).toContain('/')
  })

  it('disallows protected and sensitive utility paths for wildcard agent', () => {
    const config = robots()
    const rules = config.rules as Array<{ userAgent: string | string[]; allow?: string[]; disallow?: string[] }>
    const wildcardRule = rules.find((r) => r.userAgent === '*')
    expect(wildcardRule?.disallow).toEqual(
      expect.arrayContaining([
        '/api',
        '/api/',
        '/dashboard',
        '/dashboard/',
        '/profile',
        '/profile/',
        '/results',
        '/results/',
        '/processing',
        '/processing/',
      ])
    )
    expect(wildcardRule?.disallow).not.toContain('/login')
    expect(wildcardRule?.disallow).not.toContain('/signup')
  })

  it('has explicit AI search and citation crawler rules', () => {
    const config = robots()
    const rules = config.rules as Array<{ userAgent: string | string[]; allow?: string[]; disallow?: string[] }>
    const aiRule = rules.find(
      (r) => Array.isArray(r.userAgent) && r.userAgent.includes('GPTBot')
    )
    expect(aiRule).toBeDefined()
    expect(aiRule?.userAgent).toContain('ChatGPT-User')
    expect(aiRule?.userAgent).toContain('OAI-SearchBot')
    expect(aiRule?.userAgent).toContain('ClaudeBot')
    expect(aiRule?.userAgent).toContain('Claude-User')
    expect(aiRule?.userAgent).toContain('PerplexityBot')
    expect(aiRule?.userAgent).toContain('Perplexity-User')
    expect(aiRule?.userAgent).toContain('anthropic-ai')
    expect(aiRule?.userAgent).toContain('Google-Extended')
    expect(aiRule?.userAgent).toContain('GoogleOther')
    expect(aiRule?.userAgent).toContain('Bingbot')
  })

  it('includes sitemap reference', () => {
    const config = robots()
    expect(config.sitemap).toBe('https://lextract.io/sitemap.xml')
  })

  it('does not emit a nonstandard Host directive with a full URL', () => {
    const config = robots()
    expect('host' in config).toBe(false)
  })

  it('AI crawlers have same disallow rules as wildcard', () => {
    const config = robots()
    const rules = config.rules as Array<{ userAgent: string | string[]; allow?: string[]; disallow?: string[] }>
    const wildcardRule = rules.find((r) => r.userAgent === '*')
    const aiRule = rules.find(
      (r) => Array.isArray(r.userAgent) && r.userAgent.includes('GPTBot')
    )
    expect(aiRule?.disallow).toEqual(wildcardRule?.disallow)
  })
})
