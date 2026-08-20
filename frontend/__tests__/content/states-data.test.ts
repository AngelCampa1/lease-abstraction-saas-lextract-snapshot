/** @vitest-environment node */
import {
  stateData,
  getStateBySlug,
  getAllStateSlugs,
  getStateExcerpt,
} from '@/data/states'
import type { StateLandlordTenantData } from '@/data/states'

describe('stateData', () => {
  it('contains exactly 10 states', () => {
    expect(stateData).toHaveLength(50)
  })

  it('includes all required state codes', () => {
    const codes = stateData.map((s) => s.stateCode)
    expect(codes).toEqual(
      expect.arrayContaining(['CA', 'TX', 'NY', 'FL', 'IL', 'PA', 'OH', 'GA', 'NJ', 'VA'])
    )
  })

  it('has unique slugs for every state', () => {
    const slugs = stateData.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('has unique state codes for every state', () => {
    const codes = stateData.map((s) => s.stateCode)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it.each(stateData.map((s) => [s.state, s]))(
    '%s has all required fields',
    (_name: string, state: StateLandlordTenantData) => {
      expect(state.state).toBeTruthy()
      expect(state.stateCode).toHaveLength(2)
      expect(state.slug).toBeTruthy()
      expect(state.overview.length).toBeGreaterThan(100)
      expect(state.keyStatutes.length).toBeGreaterThanOrEqual(1)
      expect(state.keyFacts.length).toBeGreaterThanOrEqual(3)
      expect(state.noticePeriods.length).toBeGreaterThanOrEqual(2)
      expect(state.auditRights.summary).toBeTruthy()
      expect(state.auditRights.details).toBeTruthy()
      expect(state.faqs.length).toBeGreaterThanOrEqual(3)
      expect(state.metaDescription.length).toBeGreaterThan(50)
      expect(state.metaDescription.length).toBeLessThanOrEqual(200)
    }
  )

  it.each(stateData.map((s) => [s.state, s]))(
    '%s key statutes have name and description',
    (_name: string, state: StateLandlordTenantData) => {
      for (const statute of state.keyStatutes) {
        expect(statute.name).toBeTruthy()
        expect(statute.description).toBeTruthy()
      }
    }
  )

  it.each(stateData.map((s) => [s.state, s]))(
    '%s key facts have label and value',
    (_name: string, state: StateLandlordTenantData) => {
      for (const fact of state.keyFacts) {
        expect(fact.label).toBeTruthy()
        expect(fact.value).toBeTruthy()
      }
    }
  )

  it.each(stateData.map((s) => [s.state, s]))(
    '%s notice periods have type, period, and details',
    (_name: string, state: StateLandlordTenantData) => {
      for (const np of state.noticePeriods) {
        expect(np.type).toBeTruthy()
        expect(np.period).toBeTruthy()
        expect(np.details).toBeTruthy()
      }
    }
  )

  it.each(stateData.map((s) => [s.state, s]))(
    '%s FAQs have question and answer',
    (_name: string, state: StateLandlordTenantData) => {
      for (const faq of state.faqs) {
        expect(faq.question).toBeTruthy()
        expect(faq.answer).toBeTruthy()
      }
    }
  )

  it('all content fields are non-empty strings', () => {
    for (const state of stateData) {
      expect(typeof state.overview).toBe('string')
      expect(state.overview.length).toBeGreaterThan(0)
      expect(typeof state.auditRights.summary).toBe('string')
      expect(state.auditRights.summary.length).toBeGreaterThan(0)
      expect(typeof state.metaDescription).toBe('string')
      expect(state.metaDescription.length).toBeGreaterThan(0)
    }
  })
})

describe('getStateBySlug', () => {
  it('returns the correct state for a valid slug', () => {
    const result = getStateBySlug('california')
    expect(result).toBeDefined()
    expect(result?.state).toBe('California')
    expect(result?.stateCode).toBe('CA')
  })

  it('returns undefined for an invalid slug', () => {
    const result = getStateBySlug('not-a-state')
    expect(result).toBeUndefined()
  })

  it('returns the correct state for each slug', () => {
    for (const state of stateData) {
      const result = getStateBySlug(state.slug)
      expect(result).toBe(state)
    }
  })
})

describe('getAllStateSlugs', () => {
  it('returns an array of 10 slugs', () => {
    const slugs = getAllStateSlugs()
    expect(slugs).toHaveLength(50)
  })

  it('returns all state slugs in order', () => {
    const slugs = getAllStateSlugs()
    expect(slugs).toEqual(stateData.map((s) => s.slug))
  })
})

describe('getStateExcerpt', () => {
  it('returns the first sentence of the overview', () => {
    const state = stateData[0]
    const excerpt = getStateExcerpt(state)
    expect(excerpt).toBeTruthy()
    expect(excerpt.endsWith('.')).toBe(true)
  })

  it('adds a period if the first sentence does not end with one', () => {
    const mockState = {
      ...stateData[0],
      overview: 'This is a test sentence without period. More text here.',
    }
    const excerpt = getStateExcerpt(mockState)
    expect(excerpt).toBe('This is a test sentence without period.')
  })

  it('does not double-add a period when first segment already ends with one', () => {
    const mockState = {
      ...stateData[0],
      overview: 'Only one sentence.',
    }
    const excerpt = getStateExcerpt(mockState)
    expect(excerpt).toBe('Only one sentence.')
  })

  it('handles overview with period at end of first segment', () => {
    const mockState = {
      ...stateData[0],
      overview: 'This sentence ends with a period. More text here.',
    }
    const excerpt = getStateExcerpt(mockState)
    expect(excerpt).toBe('This sentence ends with a period.')
  })

  it('returns an excerpt for each state', () => {
    for (const state of stateData) {
      const excerpt = getStateExcerpt(state)
      expect(excerpt.length).toBeGreaterThan(10)
      expect(excerpt.endsWith('.')).toBe(true)
    }
  })
})
