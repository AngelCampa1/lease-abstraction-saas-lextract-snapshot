/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { VERTICAL_FUNNEL_MAP, getNextStage } from '@/lib/funnel-config'
import type { FunnelStage } from '@/lib/content-types'

describe('VERTICAL_FUNNEL_MAP', () => {
  it('covers all 15 pSEO verticals', () => {
    const expectedVerticals = [
      'glossary', 'clauses', 'lease-types', 'property-types', 'industries',
      'fields', 'red-flags', 'workflows', 'templates', 'use-cases', 'states', 'locations',
      'integrations', 'comparisons', 'personas',
    ]
    for (const vertical of expectedVerticals) {
      expect(VERTICAL_FUNNEL_MAP).toHaveProperty(vertical)
    }
  })

  it('assigns TOFU to awareness/educational verticals', () => {
    const tofuVerticals: string[] = ['glossary', 'clauses', 'lease-types', 'property-types', 'industries']
    for (const v of tofuVerticals) {
      expect(VERTICAL_FUNNEL_MAP[v]).toBe('tofu')
    }
  })

  it('assigns MOFU to evaluation/process verticals', () => {
    const mofuVerticals: string[] = ['fields', 'red-flags', 'workflows', 'templates', 'use-cases', 'states', 'locations']
    for (const v of mofuVerticals) {
      expect(VERTICAL_FUNNEL_MAP[v]).toBe('mofu')
    }
  })

  it('assigns BOFU to decision/comparison verticals', () => {
    const bofuVerticals: string[] = ['integrations', 'comparisons', 'personas']
    for (const v of bofuVerticals) {
      expect(VERTICAL_FUNNEL_MAP[v]).toBe('bofu')
    }
  })

  it('only uses valid FunnelStage values', () => {
    const validStages: FunnelStage[] = ['tofu', 'mofu', 'bofu']
    for (const stage of Object.values(VERTICAL_FUNNEL_MAP)) {
      expect(validStages).toContain(stage)
    }
  })
})

describe('getNextStage', () => {
  it('tofu → mofu', () => {
    expect(getNextStage('tofu')).toBe('mofu')
  })

  it('mofu → bofu', () => {
    expect(getNextStage('mofu')).toBe('bofu')
  })

  it('bofu → null (no next stage)', () => {
    expect(getNextStage('bofu')).toBeNull()
  })
})

