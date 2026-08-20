import { describe, expect, it } from 'vitest'
import { buildLextractRegistry, parseExtractionResponse, parseModelJson } from '../src/index.js'

describe('parseModelJson', () => {
  it('strips thinking tags and parses fenced json', () => {
    const parsed = parseModelJson('<think>notes</think>```json\n{"a":1}\n```')

    expect(parsed).toEqual({ a: 1 })
  })

  it('throws a helpful error for invalid json', () => {
    expect(() => parseModelJson('not json')).toThrow(/model response/i)
  })

  it('throws when the model response is not an object', () => {
    expect(() => parseExtractionResponse('[1, 2, 3]')).toThrow(/not a JSON object/)
  })
})

describe('parseExtractionResponse', () => {
  it('parses wrapped field envelopes and normalizes confidence percentages', () => {
    const parsed = parseExtractionResponse(
      JSON.stringify({
        fields: {
          base_rent_annual: {
            value: '$150,000.00',
            confidence: 95,
            source_text: 'Annual base rent is $150,000.00',
          },
        },
      }),
      buildLextractRegistry(),
    )

    expect(parsed.fields.base_rent_annual).toEqual({
      value: 150000,
      confidence: 0.95,
      sourceText: 'Annual base rent is $150,000.00',
    })
  })

  it('supports flat model responses and skips metadata entries', () => {
    const parsed = parseExtractionResponse(
      JSON.stringify({
        has_renewal_option: { value: 'yes', confidence: 0.8 },
        metadata: 'not a field envelope',
      }),
      buildLextractRegistry(),
    )

    expect(parsed.fields.has_renewal_option).toEqual({
      value: true,
      confidence: 0.8,
      sourceText: '',
    })
    expect(parsed.fields).not.toHaveProperty('metadata')
  })

  it('coerces registry field types without Worker dependencies', () => {
    const parsed = parseExtractionResponse(
      JSON.stringify({
        fields: {
          pro_rata_share: { value: '5.25%', confidence: Number.NaN, source_text: '  ' },
          cam_cap_percentage: { value: 5.25, confidence: 0.7, source_text: '5.25' },
          holdover_rate: { value: '%', confidence: -1, source_text: null },
          has_purchase_option: { value: 1, confidence: 200, source_text: 'option exists' },
          cam_exclusions: { value: 'capital, reserves', confidence: 0.6, source_text: 'capital, reserves' },
          guarantor_name: { value: '', confidence: 0.6, source_text: '' },
          permitted_use_description: { value: { nested: true }, confidence: 0.5, source_text: 'office' },
        },
      }),
      buildLextractRegistry(),
    )

    expect(parsed.fields.pro_rata_share?.value).toBe(0.0525)
    expect(parsed.fields.pro_rata_share?.confidence).toBe(0)
    expect(parsed.fields.cam_cap_percentage?.value).toBe(0.0525)
    expect(parsed.fields.holdover_rate?.value).toBeNull()
    expect(parsed.fields.holdover_rate?.confidence).toBe(0)
    expect(parsed.fields.has_purchase_option?.value).toBe(true)
    expect(parsed.fields.has_purchase_option?.confidence).toBe(1)
    expect(parsed.fields.cam_exclusions?.value).toEqual(['capital', 'reserves'])
    expect(parsed.fields.guarantor_name?.value).toEqual([])
    expect(parsed.fields.permitted_use_description?.value).toBe('[object Object]')
  })

  it('handles list and single-value array fields plus numeric strings', () => {
    const parsed = parseExtractionResponse(
      JSON.stringify({
        fields: {
          cam_exclusions: { value: ['capital'], confidence: 0.8 },
          permitted_transferees: { value: 42, confidence: 0.8 },
          lease_term_months: { value: { months: 60 }, confidence: 0.8 },
          rentable_square_footage: { value: 'not a number', confidence: 0.8 },
          base_rent_annual: { value: { amount: 10 }, confidence: 0.8 },
          commencement_date: { value: 20240115, confidence: 0.8 },
        },
      }),
      buildLextractRegistry(),
    )

    expect(parsed.fields.cam_exclusions?.value).toEqual(['capital'])
    expect(parsed.fields.permitted_transferees?.value).toEqual([42])
    expect(parsed.fields.lease_term_months?.value).toEqual({ months: 60 })
    expect(parsed.fields.rentable_square_footage?.value).toBe('not a number')
    expect(parsed.fields.base_rent_annual?.value).toEqual({ amount: 10 })
    expect(parsed.fields.commencement_date?.value).toBe('20240115')
  })

  it('keeps numeric and null coercion boundaries stable', () => {
    const parsed = parseExtractionResponse(
      JSON.stringify({
        fields: {
          lease_term_months: { value: 60, confidence: 0.8 },
          pro_rata_share: { value: null, confidence: 0.8 },
          has_renewal_option: { value: true, confidence: 0.8 },
        },
      }),
      buildLextractRegistry(),
    )

    expect(parsed.fields.lease_term_months?.value).toBe(60)
    expect(parsed.fields.pro_rata_share?.value).toBeNull()
    expect(parsed.fields.has_renewal_option?.value).toBe(true)
  })

  it('coerces only known boolean strings and preserves uncertain boolean text as null', () => {
    const parsed = parseExtractionResponse(
      JSON.stringify({
        fields: {
          has_renewal_option: { value: 'false', confidence: 0.8 },
          has_termination_option: { value: 'no', confidence: 0.8 },
          audit_rights: { value: 'unknown', confidence: 0.8 },
          has_purchase_option: { value: 'n/a', confidence: 0.8 },
        },
      }),
      buildLextractRegistry(),
    )

    expect(parsed.fields.has_renewal_option?.value).toBe(false)
    expect(parsed.fields.has_termination_option?.value).toBe(false)
    expect(parsed.fields.audit_rights?.value).toBeNull()
    expect(parsed.fields.has_purchase_option?.value).toBeNull()
  })

  it('preserves safe values for unknown fields', () => {
    const parsed = parseExtractionResponse(
      JSON.stringify({
        unknown_object: { value: { amount: 10 }, confidence: 0.4 },
        unknown_function: { confidence: 0.4 },
      }),
    )

    expect(parsed.fields.unknown_object?.value).toEqual({ amount: 10 })
    expect(parsed.fields.unknown_function?.value).toBeNull()
  })
})
