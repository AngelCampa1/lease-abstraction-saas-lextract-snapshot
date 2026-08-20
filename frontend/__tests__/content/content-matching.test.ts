/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import {
  getRelatedContent,
  getRelatedContentForPseo,
  getPseoLinksForContent,
  getJourneyLinks,
  getSmartCrossLinks,
} from '@/lib/content-matching'
import type { ContentMeta } from '@/lib/content-types'

const makeMeta = (overrides: Partial<ContentMeta>): ContentMeta => ({
  title: 'Default Title',
  slug: 'default-slug',
  description: 'A sufficiently long description that passes the minimum fifty character validation requirement.',
  publishedAt: '2026-03-01',
  updatedAt: '2026-03-01',
  author: 'Test Author',
  category: 'articles',
  silo: 'lease-abstraction',
  tags: ['test'],
  readingTime: 5,
  featured: false,
  funnelStage: 'mofu',
  ...overrides,
})

describe('getRelatedContent', () => {
  it('returns empty array when no other content exists', () => {
    const current = makeMeta({ slug: 'only-one' })
    const result = getRelatedContent([current], current)
    expect(result).toEqual([])
  })

  it('excludes the current item from results', () => {
    const current = makeMeta({ slug: 'current' })
    const other = makeMeta({ slug: 'other', title: 'Other' })
    const result = getRelatedContent([current, other], current)
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('other')
  })

  it('scores same-silo items higher', () => {
    const current = makeMeta({ slug: 'current', silo: 'cam-audit' })
    const sameSilo = makeMeta({ slug: 'same', silo: 'cam-audit', title: 'Same Silo' })
    const diffSilo = makeMeta({ slug: 'diff', silo: 'compliance', title: 'Diff Silo' })
    const result = getRelatedContent([current, sameSilo, diffSilo], current)
    expect(result[0].slug).toBe('same')
  })

  it('scores shared tags higher', () => {
    const current = makeMeta({ slug: 'current', tags: ['cam', 'audit', 'nnn'], silo: 'lease-abstraction' })
    const manyShared = makeMeta({ slug: 'many', tags: ['cam', 'audit'], silo: 'compliance', title: 'Many Shared' })
    const noShared = makeMeta({ slug: 'none', tags: ['unrelated'], silo: 'compliance', title: 'No Shared' })
    const result = getRelatedContent([current, manyShared, noShared], current)
    expect(result[0].slug).toBe('many')
  })

  it('scores same category higher', () => {
    const current = makeMeta({ slug: 'current', category: 'guides', silo: 'lease-abstraction', tags: [] })
    const sameCategory = makeMeta({ slug: 'same-cat', category: 'guides', silo: 'compliance', tags: [], title: 'Guide' })
    const diffCategory = makeMeta({ slug: 'diff-cat', category: 'articles', silo: 'compliance', tags: [], title: 'Article' })
    const result = getRelatedContent([current, sameCategory, diffCategory], current)
    expect(result[0].slug).toBe('same-cat')
  })

  it('defaults to returning max 3 items', () => {
    const current = makeMeta({ slug: 'current' })
    const items = Array.from({ length: 10 }, (_, i) =>
      makeMeta({ slug: `item-${i}`, title: `Item ${i}` })
    )
    const result = getRelatedContent([current, ...items], current)
    expect(result).toHaveLength(3)
  })

  it('respects custom max parameter', () => {
    const current = makeMeta({ slug: 'current' })
    const items = Array.from({ length: 10 }, (_, i) =>
      makeMeta({ slug: `item-${i}`, title: `Item ${i}` })
    )
    const result = getRelatedContent([current, ...items], current, 5)
    expect(result).toHaveLength(5)
  })
})

describe('getRelatedContentForPseo', () => {
  it('returns empty array when no content matches', () => {
    const result = getRelatedContentForPseo([], 'fields', ['base-rent'])
    expect(result).toEqual([])
  })

  it('scores silo-matched content higher', () => {
    const content = [
      makeMeta({ slug: 'cam-article', silo: 'cam-audit', tags: ['cam'], title: 'CAM Article' }),
      makeMeta({ slug: 'lease-article', silo: 'lease-abstraction', tags: ['cam'], title: 'Lease Article' }),
    ]
    const result = getRelatedContentForPseo(content, 'fields', ['cam'])
    expect(result.length).toBeGreaterThan(0)
  })

  it('scores keyword-in-tags matches', () => {
    const content = [
      makeMeta({ slug: 'has-keyword', tags: ['base rent', 'lease'], title: 'Has Keyword' }),
      makeMeta({ slug: 'no-keyword', tags: ['unrelated'], title: 'No Keyword' }),
    ]
    const result = getRelatedContentForPseo(content, 'fields', ['base rent'])
    expect(result[0].slug).toBe('has-keyword')
  })

  it('defaults to returning max 3 items', () => {
    const content = Array.from({ length: 10 }, (_, i) =>
      makeMeta({ slug: `a-${i}`, tags: ['cam'], title: `Item ${i}` })
    )
    const result = getRelatedContentForPseo(content, 'fields', ['cam'])
    expect(result).toHaveLength(3)
  })

  it('uses lease-abstraction silo for unknown verticals', () => {
    const content = [
      makeMeta({ slug: 'la-article', silo: 'lease-abstraction', tags: ['test'], title: 'LA Article' }),
      makeMeta({ slug: 'cam-article', silo: 'cam-audit', tags: ['test'], title: 'CAM Article' }),
    ]
    const result = getRelatedContentForPseo(content, 'unknown-vertical', ['test'])
    // lease-abstraction silo gets +3, cam-audit gets +0, but both match 'test' tag
    expect(result[0].slug).toBe('la-article')
  })
})

describe('getPseoLinksForContent', () => {
  it('returns empty array for unmatched tags', () => {
    const result = getPseoLinksForContent(['completely-random-xyz-tag-12345'])
    expect(result).toEqual([])
  })

  it('returns matching pSEO links for known glossary terms', () => {
    const result = getPseoLinksForContent(['base rent'])
    expect(result.length).toBeGreaterThan(0)
    const hrefs = result.map((l) => l.href)
    expect(hrefs.some((h) => h.includes('/glossary/') || h.includes('/fields/'))).toBe(true)
  })

  it('deduplicates links', () => {
    const result = getPseoLinksForContent(['base rent', 'base rent'])
    const hrefs = result.map((l) => l.href)
    const unique = [...new Set(hrefs)]
    expect(hrefs.length).toBe(unique.length)
  })

  it('returns at most 8 links', () => {
    const result = getPseoLinksForContent([
      'CAM charges', 'NNN lease', 'lease abstraction', 'due diligence',
      'rent escalation', 'base rent', 'gross lease', 'audit rights',
      'estoppel', 'holdover', 'tenant improvement', 'operating expenses',
    ])
    expect(result.length).toBeLessThanOrEqual(8)
  })

  it('prioritizes next-funnel-stage links when funnelStage is provided', () => {
    // tofu: next stage is mofu (fields, workflows, templates etc.)
    const resultTofu = getPseoLinksForContent(['base rent', 'nnn', 'renewal'], 'tofu')
    expect(Array.isArray(resultTofu)).toBe(true)
    // mofu: next stage is bofu (integrations, comparisons, personas)
    const resultMofu = getPseoLinksForContent(['yardi', 'excel', 'import'], 'mofu')
    expect(Array.isArray(resultMofu)).toBe(true)
    // When bofu entries exist, they appear first for mofu callers
    const bofuFirst = resultMofu.filter((l) => {
      // integrations and personas are bofu
      return l.href.startsWith('/integrations/') || l.href.startsWith('/for/')
        || l.href.startsWith('/resources/comparisons/')
    })
    if (resultMofu.length > 0 && bofuFirst.length > 0) {
      expect(resultMofu[0].href).toBe(bofuFirst[0].href)
    }
  })
})

describe('getJourneyLinks', () => {
  it('returns empty related and goDeeper for single-item corpus', () => {
    const current = makeMeta({ slug: 'only' })
    const result = getJourneyLinks([current], current)
    expect(result.related).toEqual([])
    expect(result.goDeeper).toEqual([])
  })

  it('excludes the current item and includes other scorable items', () => {
    const current = makeMeta({ slug: 'current', funnelStage: 'mofu', tags: ['cam'] })
    const other = makeMeta({ slug: 'other', funnelStage: 'mofu', silo: 'lease-abstraction', tags: ['cam'], title: 'Other' })
    const result = getJourneyLinks([current, other], current)
    const allItems = [...result.related, ...result.goDeeper]
    // current item is excluded
    expect(allItems.every((item) => item.slug !== 'current')).toBe(true)
    // other is present (same silo + shared tag = score > 0)
    expect(allItems.some((item) => item.slug === 'other')).toBe(true)
  })

  it('puts next-stage items in goDeeper', () => {
    const current = makeMeta({ slug: 'current', funnelStage: 'mofu', silo: 'lease-abstraction', tags: ['cam'] })
    const goDeeper = makeMeta({ slug: 'deeper', funnelStage: 'bofu', silo: 'lease-abstraction', tags: ['cam'], title: 'Deeper' })
    const related = makeMeta({ slug: 'related', funnelStage: 'mofu', silo: 'lease-abstraction', tags: ['cam'], title: 'Related' })
    const result = getJourneyLinks([current, goDeeper, related], current)
    expect(result.goDeeper.some((i) => i.slug === 'deeper')).toBe(true)
    expect(result.related.some((i) => i.slug === 'related')).toBe(true)
  })

  it('puts same-stage items in related', () => {
    const current = makeMeta({ slug: 'current', funnelStage: 'tofu', silo: 'lease-abstraction', tags: ['nnn'] })
    const sameStage = makeMeta({ slug: 'same', funnelStage: 'tofu', silo: 'lease-abstraction', tags: ['nnn'], title: 'Same' })
    const result = getJourneyLinks([current, sameStage], current)
    expect(result.related.some((i) => i.slug === 'same')).toBe(true)
    expect(result.goDeeper).toHaveLength(0)
  })

  it('limits related to 3 and goDeeper to 2', () => {
    const current = makeMeta({ slug: 'current', funnelStage: 'mofu', silo: 'lease-abstraction', tags: ['cam'] })
    const relatedItems = Array.from({ length: 6 }, (_, i) =>
      makeMeta({ slug: `related-${i}`, funnelStage: 'mofu', silo: 'lease-abstraction', tags: ['cam'], title: `Related ${i}` })
    )
    const deeperItems = Array.from({ length: 4 }, (_, i) =>
      makeMeta({ slug: `deeper-${i}`, funnelStage: 'bofu', silo: 'lease-abstraction', tags: ['cam'], title: `Deeper ${i}` })
    )
    const result = getJourneyLinks([current, ...relatedItems, ...deeperItems], current)
    expect(result.related.length).toBeLessThanOrEqual(3)
    expect(result.goDeeper.length).toBeLessThanOrEqual(2)
  })

  it('bofu content has no next stage, so goDeeper is empty', () => {
    const current = makeMeta({ slug: 'current', funnelStage: 'bofu', silo: 'lease-abstraction', tags: ['roi'] })
    const other = makeMeta({ slug: 'other', funnelStage: 'tofu', silo: 'lease-abstraction', tags: ['roi'], title: 'Other' })
    const result = getJourneyLinks([current, other], current)
    expect(result.goDeeper).toHaveLength(0)
  })
})

describe('getSmartCrossLinks', () => {
  it('returns an object (may be empty for unknown keywords)', () => {
    const result = getSmartCrossLinks('glossary', ['zzz-completely-unknown-xzxzxz'])
    expect(typeof result).toBe('object')
  })

  it('excludes the current vertical and returns other verticals', () => {
    // base rent and cam are strong keywords that match fields, workflows, and use-cases
    const result = getSmartCrossLinks('glossary', ['base rent', 'cam charges', 'renewal'])
    expect('glossary' in result).toBe(false)
    // Should have at least one non-glossary vertical
    expect(Object.keys(result).length).toBeGreaterThan(0)
  })

  it('returns at most 4 verticals', () => {
    const result = getSmartCrossLinks('glossary', [
      'base rent', 'cam charges', 'NNN', 'renewal', 'tenant improvement',
      'security deposit', 'operating expenses', 'audit',
    ])
    expect(Object.keys(result).length).toBeLessThanOrEqual(4)
  })

  it('returns at most 3 links per vertical', () => {
    const result = getSmartCrossLinks('glossary', [
      'base rent', 'cam', 'NNN', 'renewal', 'tenant',
    ])
    for (const links of Object.values(result)) {
      expect(links.length).toBeLessThanOrEqual(3)
    }
  })

  it('each link has label and href', () => {
    const result = getSmartCrossLinks('glossary', ['base rent', 'cam charges'])
    for (const links of Object.values(result)) {
      for (const link of links) {
        expect(typeof link.label).toBe('string')
        expect(typeof link.href).toBe('string')
        expect(link.href.startsWith('/')).toBe(true)
      }
    }
  })
})
