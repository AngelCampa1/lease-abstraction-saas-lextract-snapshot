/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { lookupPseoLinks, getPseoIndexSize } from '@/lib/pseo-link-index'

describe('pseo-link-index', () => {
  describe('getPseoIndexSize', () => {
    it('builds a large index covering all 15 verticals at module load', () => {
      const size = getPseoIndexSize()
      // 15 verticals × many entries = hundreds of unique keyword tokens expected
      expect(size).toBeGreaterThan(300)
    })
  })

  describe('lookupPseoLinks', () => {
    it('returns empty array for unknown keywords', () => {
      const result = lookupPseoLinks(['zzzunknownkeywordxxx'])
      expect(result).toEqual([])
    })

    it('returns links for known glossary terms', () => {
      const result = lookupPseoLinks(['rent'])
      expect(result.length).toBeGreaterThan(0)
    })

    it('deduplicates results by href', () => {
      const result = lookupPseoLinks(['rent', 'rent', 'base rent'])
      const hrefs = result.map((e) => e.href)
      const unique = [...new Set(hrefs)]
      expect(hrefs.length).toBe(unique.length)
    })

    it('respects the max option', () => {
      const result = lookupPseoLinks(
        ['rent', 'cam', 'nnn', 'gross', 'sublease', 'estoppel', 'holdover', 'snda'],
        { max: 3 }
      )
      expect(result.length).toBeLessThanOrEqual(3)
    })

    it('defaults to max 8', () => {
      const result = lookupPseoLinks(
        ['rent', 'cam', 'nnn', 'gross', 'sublease', 'estoppel', 'holdover', 'snda',
         'tenant', 'landlord', 'renewal', 'security', 'deposit'],
      )
      expect(result.length).toBeLessThanOrEqual(8)
    })

    it('each entry has label, href, vertical, and funnelStage', () => {
      const result = lookupPseoLinks(['base rent'])
      expect(result.length).toBeGreaterThan(0)
      for (const entry of result) {
        expect(typeof entry.label).toBe('string')
        expect(entry.label.length).toBeGreaterThan(0)
        expect(typeof entry.href).toBe('string')
        expect(entry.href.startsWith('/')).toBe(true)
        expect(typeof entry.vertical).toBe('string')
        expect(['tofu', 'mofu', 'bofu']).toContain(entry.funnelStage)
      }
    })

    it('excludes specified verticals', () => {
      const result = lookupPseoLinks(['base rent', 'cam', 'nnn'], {
        excludeVerticals: ['glossary'],
        max: 20,
      })
      expect(result.every((e) => e.vertical !== 'glossary')).toBe(true)
    })

    it('prioritizes preferred funnel stage when specified', () => {
      // Use keywords known to produce results across multiple funnel stages
      const resultBofu = lookupPseoLinks(['yardi', 'excel', 'import'], {
        preferFunnelStage: 'bofu',
        max: 10,
      })
      const resultTofu = lookupPseoLinks(['yardi', 'excel', 'import'], {
        preferFunnelStage: 'tofu',
        max: 10,
      })
      // Both should return results (yardi/excel/import match workflows + integrations)
      expect(resultBofu.length).toBeGreaterThan(0)
      expect(resultTofu.length).toBeGreaterThan(0)
      // When bofu is preferred, bofu entries should appear first if any exist
      const bofuEntries = resultBofu.filter((e) => e.funnelStage === 'bofu')
      if (bofuEntries.length > 0) {
        expect(resultBofu[0].funnelStage).toBe('bofu')
      }
    })

    it('finds workflow links for software tools', () => {
      const result = lookupPseoLinks(['excel'], { max: 20 })
      const hasWorkflow = result.some((e) => e.vertical === 'workflows' || e.vertical === 'integrations')
      expect(hasWorkflow).toBe(true)
    })

    it('finds field links for field-related keywords', () => {
      const result = lookupPseoLinks(['base rent'], { max: 20 })
      const hasField = result.some((e) => e.vertical === 'fields')
      expect(hasField).toBe(true)
    })
  })
})
