import { describe, expect, it } from 'vitest'
import {
  assignConfidenceTier,
  buildLextractRegistry,
  lextractSchema,
  scoreConfidence,
  scoreOverallConfidence,
} from '../src/index.js'
import type { FieldDefinition, LextractRegistry } from '../src/index.js'

describe('assignConfidenceTier', () => {
  it.each([
    [1, 'high'],
    [0.85, 'high'],
    [0.84, 'medium'],
    [0.6, 'medium'],
    [0.59, 'low'],
    [0, 'low'],
  ])('assigns %s to %s', (score, tier) => {
    expect(assignConfidenceTier(score)).toBe(tier)
  })
})

describe('scoreConfidence', () => {
  it('scores known fields from LLM confidence and marks null values as not_found', () => {
    const scores = scoreConfidence(
      {
        fields: {
          base_rent_annual: { value: 150000, confidence: 0.9, sourceText: '$150k' },
          pro_rata_share: { value: null, confidence: 0.4, sourceText: '' },
          unknown_field: { value: 'ignored', confidence: 1, sourceText: 'ignored' },
        },
      },
      buildLextractRegistry(),
    )

    expect(scores.base_rent_annual).toEqual({
      score: 0.9,
      tier: 'high',
      llmConfidence: 0.9,
    })
    expect(scores.pro_rata_share).toEqual({
      score: 0,
      tier: 'not_found',
      llmConfidence: 0,
    })
    expect(scores).not.toHaveProperty('unknown_field')
  })

  it('applies cross-field penalties for inconsistent pro rata, dates, and lease term', () => {
    const scores = scoreConfidence(
      {
        fields: {
          pro_rata_share: { value: 50, confidence: 0.9, sourceText: '50%' },
          rentable_square_footage: { value: 10000, confidence: 0.95, sourceText: '' },
          building_total_rsf: { value: 200000, confidence: 0.95, sourceText: '' },
          commencement_date: { value: '2029-01-15', confidence: 0.95, sourceText: '' },
          expiration_date: { value: '2024-01-14', confidence: 0.95, sourceText: '' },
          lease_term_months: { value: 120, confidence: 0.95, sourceText: '' },
        },
      },
      buildLextractRegistry(),
    )

    expect(scores.pro_rata_share?.score).toBe(0.63)
    expect(scores.commencement_date?.score).toBe(0.665)
    expect(scores.expiration_date?.score).toBe(0.665)
    expect(scores.lease_term_months?.score).toBe(0.95)
  })

  it('applies lease term penalties when valid dates disagree with the stated term', () => {
    const scores = scoreConfidence(
      {
        fields: {
          commencement_date: { value: '2024-01-15', confidence: 0.95, sourceText: '' },
          expiration_date: { value: '2029-01-14', confidence: 0.95, sourceText: '' },
          lease_term_months: { value: 120, confidence: 0.95, sourceText: '120 months' },
        },
      },
      buildLextractRegistry(),
    )

    expect(scores.lease_term_months?.score).toBe(0.665)
  })

  it('skips cross-field penalties when related values are missing, unparseable, or consistent', () => {
    const scores = scoreConfidence(
      {
        fields: {
          pro_rata_share: { value: 0.05, confidence: 0.9, sourceText: '5%' },
          rentable_square_footage: { value: 10000, confidence: 0.95, sourceText: '' },
          building_total_rsf: { value: 200000, confidence: 0.95, sourceText: '' },
          commencement_date: { value: '2024-01-15', confidence: 0.95, sourceText: '' },
          expiration_date: { value: '2029-01-14', confidence: 0.95, sourceText: '' },
          rent_commencement_date: { value: '2024-03-01', confidence: 0.9, sourceText: '' },
          lease_term_months: { value: 60, confidence: 0.95, sourceText: '' },
        },
      },
      buildLextractRegistry(),
    )

    expect(scores.pro_rata_share?.score).toBe(0.9)
    expect(scores.rent_commencement_date?.score).toBe(0.9)
    expect(scores.lease_term_months?.score).toBe(0.95)
  })

  it('skips validators for zero or unparseable numeric inputs', () => {
    const scores = scoreConfidence(
      {
        fields: {
          pro_rata_share: { value: 'not-a-number', confidence: 0.9, sourceText: '' },
          rentable_square_footage: { value: 0, confidence: 0.95, sourceText: '' },
          building_total_rsf: { value: 200000, confidence: 0.95, sourceText: '' },
          commencement_date: { value: 'bad-date', confidence: 0.95, sourceText: '' },
          expiration_date: { value: '2029-01-14', confidence: 0.95, sourceText: '' },
          lease_term_months: { value: 'sixty', confidence: 0.95, sourceText: '' },
        },
      },
      buildLextractRegistry(),
    )

    expect(scores.pro_rata_share?.score).toBe(0.9)
    expect(scores.lease_term_months?.score).toBe(0.95)
  })

  it('penalizes rent commencement dates outside the lease period', () => {
    const scores = scoreConfidence(
      {
        fields: {
          commencement_date: { value: '2024-01-15', confidence: 0.95, sourceText: '' },
          expiration_date: { value: '2029-01-14', confidence: 0.95, sourceText: '' },
          rent_commencement_date: { value: '2030-01-01', confidence: 0.9, sourceText: '' },
        },
      },
      buildLextractRegistry(),
    )

    expect(scores.rent_commencement_date?.score).toBe(0.63)
  })
})

describe('scoreOverallConfidence', () => {
  it('loads weight and critical metadata from docs/lextract_field_schema.json', () => {
    const baseRent = lextractSchema.find((field) => field.field_name === 'base_rent_annual')
    const landlord = lextractSchema.find((field) => field.field_name === 'landlord_legal_name')

    expect(baseRent).toMatchObject({ weight: 2, critical: true })
    expect(landlord).toMatchObject({ weight: 1, critical: false })
  })

  it('reads confidence weights from registry field metadata', () => {
    const registry = buildLextractRegistry()

    expect(registry.getField('base_rent_annual')?.weight).toBe(2)
    expect(registry.getField('pro_rata_share')?.weight).toBe(2)
    expect(registry.getField('lease_term_months')?.weight).toBe(1.5)
    expect(registry.getField('security_deposit_amount')?.weight).toBe(1.5)
    expect(registry.getField('landlord_legal_name')?.weight).toBe(1)
  })

  it('uses registry weights instead of a private confidence-module duplicate', () => {
    const heavyField: FieldDefinition = {
      fieldName: 'custom_heavy',
      displayLabel: 'Custom Heavy',
      category: 'Custom',
      description: 'A custom weighted field.',
      aliases: [],
      dataType: 'number',
      required: false,
      camRelevant: false,
      weight: 10,
      critical: false,
    }
    const lightField: FieldDefinition = {
      fieldName: 'custom_light',
      displayLabel: 'Custom Light',
      category: 'Custom',
      description: 'A custom unweighted field.',
      aliases: [],
      dataType: 'number',
      required: false,
      camRelevant: false,
      weight: 1,
      critical: false,
    }
    const fields = [heavyField, lightField]
    const registry: LextractRegistry = {
      fields,
      categories: ['Custom'],
      getField(fieldName) {
        return fields.find((field) => field.fieldName === fieldName)
      },
      getFieldsByCategory(category) {
        return fields.filter((field) => field.category === category)
      },
    }

    const overall = scoreOverallConfidence(
      {
        custom_heavy: { score: 1, tier: 'high', llmConfidence: 1 },
        custom_light: { score: 0, tier: 'low', llmConfidence: 0 },
      },
      registry,
    )

    expect(overall.overallScore).toBe(0.9091)
  })

  it('uses weighted known fields and excludes not_found fields from the average', () => {
    const overall = scoreOverallConfidence(
      {
        base_rent_annual: { score: 0.9, tier: 'high', llmConfidence: 0.9 },
        landlord_legal_name: { score: 0.8, tier: 'medium', llmConfidence: 0.8 },
        pro_rata_share: { score: 0, tier: 'not_found', llmConfidence: 0 },
      },
      buildLextractRegistry(),
    )

    expect(overall).toEqual({
      overallScore: 0.8667,
      tier: 'high',
      needsReview: false,
      lowConfidenceFields: [],
    })
  })

  it('returns review-needed low confidence output for empty or weak scores', () => {
    expect(scoreOverallConfidence({}, buildLextractRegistry())).toEqual({
      overallScore: 0,
      tier: 'low',
      needsReview: true,
      lowConfidenceFields: [],
    })

    expect(
      scoreOverallConfidence(
        {
          base_rent_annual: { score: 0.4, tier: 'low', llmConfidence: 0.4 },
          nonexistent_field: { score: 1, tier: 'high', llmConfidence: 1 },
        },
        buildLextractRegistry(),
      ),
    ).toEqual({
      overallScore: 0.4,
      tier: 'low',
      needsReview: true,
      lowConfidenceFields: ['base_rent_annual'],
    })
  })
})
