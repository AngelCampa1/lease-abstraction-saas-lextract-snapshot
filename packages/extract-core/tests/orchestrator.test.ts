import { describe, expect, it } from 'vitest'

import {
  buildLextractRegistry,
  runMultiPassExtraction,
} from '../src/index.js'
import type {
  ModelClient,
  MultiPassExtractionConfig,
} from '../src/index.js'

function response(fields: Record<string, unknown>): string {
  return JSON.stringify({ fields })
}

describe('runMultiPassExtraction', () => {
  it('runs pass 1 and pass 2 model lists and preserves parsed field shape', async () => {
    const calls: string[] = []
    const client: ModelClient = {
      complete: (input) => {
        calls.push(input.passKind)
        return Promise.resolve({
          content:
            input.passKind === 'pass1'
              ? response({
                  landlord_legal_name: {
                    confidence: 0.93,
                    source_text: 'Landlord is ACME',
                    value: 'ACME LLC',
                  },
                })
              : response({
                  landlord_legal_name: {
                    confidence: 0.88,
                    source_text: 'Confirmed landlord is ACME',
                    value: 'ACME LLC',
                  },
                }),
          costCents: 2,
          inputTokens: 100,
          model: input.model,
          outputTokens: 50,
        })
      },
    }

    const result = await runMultiPassExtraction({
      client,
      config: config(),
      fileName: 'lease.pdf',
      pdfBytes: new ArrayBuffer(4),
      prompt: 'extract',
      registry: buildLextractRegistry(),
    })

    expect(calls).toEqual(['pass1', 'pass2'])
    expect(result.extraction.fields.landlord_legal_name).toEqual({
      confidence: 0.88,
      sourceText: 'Confirmed landlord is ACME',
      value: 'ACME LLC',
    })
    expect(result.passRecords).toEqual([
      {
        costCents: 2,
        inputTokens: 100,
        model: 'pass1-model',
        outputTokens: 50,
        passKind: 'pass1',
        passNumber: 1,
        succeeded: true,
      },
      {
        costCents: 2,
        inputTokens: 100,
        model: 'pass2-model',
        outputTokens: 50,
        passKind: 'pass2',
        passNumber: 2,
        succeeded: true,
      },
    ])
    expect(result.rawResponses).toHaveLength(2)
    expect(result.totalTokens).toBe(300)
    expect(result.extractionCostCents).toBe(4)
  })

  it('falls back across models, escalates low-confidence fields, and stops on cost ceiling', async () => {
    const client: ModelClient = {
      complete: (input) => {
        if (input.model === 'pass1-model') {
          return Promise.reject(new Error('provider timeout'))
        }
        if (input.passKind === 'pass1') {
          return Promise.resolve({
            content: response({
              base_rent_annual: {
                confidence: 0.4,
                source_text: 'rent unclear',
                value: '$100,000',
              },
            }),
            costCents: 3,
            inputTokens: 40,
            model: input.model,
            outputTokens: 10,
          })
        }
        if (input.passKind === 'pass2') {
          return Promise.resolve({
            content: response({
              base_rent_annual: {
                confidence: 0.45,
                source_text: 'rent still unclear',
                value: '$100,000',
              },
            }),
            costCents: 3,
            inputTokens: 40,
            model: input.model,
            outputTokens: 10,
          })
        }
        return Promise.resolve({
          content: response({
            base_rent_annual: {
              confidence: 0.9,
              source_text: 'annual rent is $120,000',
              value: '$120,000',
            },
          }),
          costCents: 10,
          inputTokens: 80,
          model: input.model,
          outputTokens: 20,
        })
      },
    }

    const result = await runMultiPassExtraction({
      client,
      config: {
        ...config(),
        costCeilingCents: 12,
        pass1Models: ['pass1-model', 'pass1-fallback'],
      },
      fileName: 'lease.pdf',
      pdfBytes: new ArrayBuffer(4),
      prompt: 'extract',
      registry: buildLextractRegistry(),
    })

    expect(result.extraction.fields.base_rent_annual).toMatchObject({
      confidence: 0.9,
      value: 120000,
    })
    expect(result.passRecords.map((record) => record.passKind)).toEqual([
      'pass1',
      'pass1',
      'pass2',
      'pass3',
    ])
    expect(result.passRecords[0]).toMatchObject({
      errorMessage: 'provider timeout',
      model: 'pass1-model',
      succeeded: false,
    })
    expect(result.costCeilingHit).toBe(true)
  })
})

function config(): MultiPassExtractionConfig {
  return {
    costCeilingCents: 100,
    escalationThreshold: 0.6,
    pass1Models: ['pass1-model'],
    pass2Models: ['pass2-model'],
    pass3Models: ['pass3-model'],
  }
}
