/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import {
  COMPARISONS,
  getComparisonBySlug,
  getAllComparisonSlugs,
} from '@/data/comparisons'

describe('COMPARISONS', () => {
  it('contains at least 2 comparisons', () => {
    expect(COMPARISONS.length).toBeGreaterThanOrEqual(2)
  })

  it('every comparison has required fields', () => {
    for (const comp of COMPARISONS) {
      expect(comp.competitor.length).toBeGreaterThan(0)
      expect(comp.competitorSlug.length).toBeGreaterThan(0)
      expect(comp.competitorDescription.length).toBeGreaterThan(0)
      expect(comp.metaTitle.length).toBeGreaterThan(0)
      expect(comp.metaDescription.length).toBeGreaterThan(0)
      expect(comp.introduction.length).toBeGreaterThan(0)
      expect(comp.features.length).toBeGreaterThan(0)
      expect(comp.pricing.lextract.length).toBeGreaterThan(0)
      expect(comp.pricing.competitor.length).toBeGreaterThan(0)
      expect(comp.pricing.analysis.length).toBeGreaterThan(0)
      expect(comp.strengths.lextract.length).toBeGreaterThan(0)
      expect(comp.strengths.competitor.length).toBeGreaterThan(0)
      expect(comp.weaknesses.lextract.length).toBeGreaterThan(0)
      expect(comp.weaknesses.competitor.length).toBeGreaterThan(0)
      expect(comp.bestFor.lextract.length).toBeGreaterThan(0)
      expect(comp.bestFor.competitor.length).toBeGreaterThan(0)
      expect(comp.verdict.length).toBeGreaterThan(0)
    }
  })

  it('every slug is unique', () => {
    const slugs = COMPARISONS.map((c) => c.competitorSlug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every feature has a valid advantage value', () => {
    for (const comp of COMPARISONS) {
      for (const feature of comp.features) {
        expect(['lextract', 'competitor', 'tie']).toContain(feature.advantage)
      }
    }
  })

  it('every feature has non-empty feature name and values', () => {
    for (const comp of COMPARISONS) {
      for (const feature of comp.features) {
        expect(feature.feature.length).toBeGreaterThan(0)
        expect(feature.lextract.length).toBeGreaterThan(0)
        expect(feature.competitor.length).toBeGreaterThan(0)
      }
    }
  })

  it('includes LeaseLens and outsourced services comparisons', () => {
    const slugs = COMPARISONS.map((c) => c.competitorSlug)
    expect(slugs).toContain('leaselens')
    expect(slugs).toContain('outsourced-services')
  })

  it('no comparison contains em dashes', () => {
    for (const comp of COMPARISONS) {
      expect(comp.introduction).not.toContain('\u2014')
      expect(comp.verdict).not.toContain('\u2014')
      expect(comp.pricing.analysis).not.toContain('\u2014')
    }
  })

  it('meta descriptions are reasonable SEO length (under 200 chars)', () => {
    for (const comp of COMPARISONS) {
      expect(comp.metaDescription.length).toBeLessThanOrEqual(200)
    }
  })

  it('includes specific pricing numbers in lextract pricing', () => {
    for (const comp of COMPARISONS) {
      expect(comp.pricing.lextract).toContain('$15')
    }
  })

  it('strengths include competitor strengths (not just sales pitch)', () => {
    for (const comp of COMPARISONS) {
      expect(comp.strengths.competitor.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('weaknesses include lextract weaknesses (honest comparison)', () => {
    for (const comp of COMPARISONS) {
      expect(comp.weaknesses.lextract.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('Lextract wins more feature categories than competitor in every comparison', () => {
    for (const comp of COMPARISONS) {
      const lextractWins = comp.features.filter((f) => f.advantage === 'lextract').length
      const competitorWins = comp.features.filter((f) => f.advantage === 'competitor').length
      expect(lextractWins).toBeGreaterThan(competitorWins)
    }
  })

  it('no verdict or introduction contains raw HTML anchor tags', () => {
    for (const comp of COMPARISONS) {
      expect(comp.verdict).not.toMatch(/<a\s/i)
      expect(comp.introduction).not.toMatch(/<a\s/i)
      for (const s of comp.strengths.lextract) {
        expect(s).not.toMatch(/<a\s/i)
      }
      for (const s of comp.strengths.competitor) {
        expect(s).not.toMatch(/<a\s/i)
      }
    }
  })
})

describe('getComparisonBySlug', () => {
  it('returns a comparison when slug exists', () => {
    const comp = getComparisonBySlug('leaselens')
    expect(comp).toBeDefined()
    expect(comp?.competitor).toBe('LeaseLens')
  })

  it('returns undefined for non-existent slug', () => {
    const comp = getComparisonBySlug('nonexistent')
    expect(comp).toBeUndefined()
  })
})

describe('getAllComparisonSlugs', () => {
  it('returns an array of slugs matching all comparisons', () => {
    const slugs = getAllComparisonSlugs()
    expect(slugs.length).toBe(COMPARISONS.length)
    for (const comp of COMPARISONS) {
      expect(slugs).toContain(comp.competitorSlug)
    }
  })
})
