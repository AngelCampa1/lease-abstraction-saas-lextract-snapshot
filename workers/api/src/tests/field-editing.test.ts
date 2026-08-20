import { describe, expect, it } from 'vitest'

import { createExtractionsRoutes } from '../routes/extractions'
import type { ExtractionRouteDependencies } from '../routes/extractions'
import type { ExtractionRecord } from '../repositories/extractions'
import { anonymousAuthDependencies, testApp, userAuthDependencies } from './task9-helpers'

const paidRecord: ExtractionRecord = {
  anonymousSessionId: null,
  confidenceScores: {},
  createdAt: '2026-06-12T00:00:00.000Z',
  deletedAt: null,
  documentFilename: 'lease.pdf',
  documentObjectKey: 'object-key',
  documentPageCount: 4,
  errorMessage: null,
  extractedData: {
    audit_rights: { confidence: 0.8, source_text: 'Tenant may audit CAM', value: true },
    landlord_legal_name: { confidence: 0.9, source_text: 'Landlord is ACME', value: 'ACME' },
  },
  id: '11111111-1111-4111-8111-111111111111',
  overallConfidence: 0.9,
  paymentStatus: 'paid',
  propertyType: 'retail',
  redFlags: [],
  showCamAudit: false,
  status: 'complete',
  updatedAt: '2026-06-12T00:00:00.000Z',
  userId: 'user-id',
}

function dependencies(
  overrides: Partial<ExtractionRouteDependencies> = {},
): ExtractionRouteDependencies {
  return {
    authDependencies: userAuthDependencies,
    deleteExtraction: () => Promise.resolve({ alreadyDeleted: false }),
    editField: () =>
      Promise.resolve({
        editedValue: 'ACME Properties',
        extractionId: paidRecord.id,
        fieldName: 'landlord_legal_name',
        originalValue: 'ACME',
        redFlags: [],
      }),
    getEditHistory: () =>
      Promise.resolve({
        edits: [
          {
            editedAt: '2026-06-12T01:00:00.000Z',
            editedBy: 'user-id',
            editedValue: 'ACME Properties',
            fieldName: 'landlord_legal_name',
            id: 'edit-id',
            originalValue: 'ACME',
          },
        ],
        total: 1,
      }),
    getExtraction: () => Promise.resolve(paidRecord),
    insertUpload: () => Promise.resolve(),
    listExtractions: () => Promise.resolve({ items: [], limit: 20, offset: 0, total: 0 }),
    putDocument: () => Promise.resolve('object-key'),
    startWorkflow: () => Promise.resolve(),
    validatePdf: () => Promise.resolve({ pageCount: 1 }),
    ...overrides,
  }
}

describe('field editing routes', () => {
  it('edits a paid user extraction and returns refreshed red flags', async () => {
    const calls: unknown[] = []
    const app = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(
        dependencies({
          editField: (input) => {
            calls.push(input)
            return Promise.resolve({
              editedValue: input.value,
              extractionId: input.extractionId,
              fieldName: input.fieldName,
              originalValue: 'ACME',
              redFlags: [{ name: 'Missing CAM cap', severity: 'high' }],
            })
          },
        }),
      ),
    )

    const response = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/fields',
      {
        body: JSON.stringify({
          field_name: 'landlord_legal_name',
          value: 'ACME Properties',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      },
    )

    await expect(response.json()).resolves.toEqual({
      edited_value: 'ACME Properties',
      extraction_id: paidRecord.id,
      field_name: 'landlord_legal_name',
      original_value: 'ACME',
      red_flags: [{ name: 'Missing CAM cap', severity: 'high' }],
    })
    expect(response.status).toBe(200)
    expect(calls).toEqual([
      {
        extractionId: paidRecord.id,
        fieldName: 'landlord_legal_name',
        userId: 'user-id',
        value: 'ACME Properties',
      },
    ])
  })

  it('rejects anonymous and unpaid field edits', async () => {
    const anonymousApp = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(
        dependencies({ authDependencies: anonymousAuthDependencies }),
      ),
    )
    const unpaidApp = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(
        dependencies({
          getExtraction: () =>
            Promise.resolve({ ...paidRecord, paymentStatus: 'unpaid' }),
        }),
      ),
    )

    const anonymousResponse = await anonymousApp.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/fields',
      {
        body: JSON.stringify({ field_name: 'landlord_legal_name', value: 'ACME' }),
        headers: {
          Authorization: '',
          'Content-Type': 'application/json',
          'X-Session-Token': 'valid-session',
        },
        method: 'PATCH',
      },
    )
    const unpaidResponse = await unpaidApp.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/fields',
      {
        body: JSON.stringify({ field_name: 'landlord_legal_name', value: 'ACME' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      },
    )

    expect(anonymousResponse.status).toBe(403)
    expect(unpaidResponse.status).toBe(403)
  })

  it('rejects field edits whose values do not match the Lextract schema', async () => {
    const calls: unknown[] = []
    const app = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(
        dependencies({
          editField: (input) => {
            calls.push(input)
            return Promise.resolve({
              editedValue: input.value,
              extractionId: input.extractionId,
              fieldName: input.fieldName,
              originalValue: null,
              redFlags: [],
            })
          },
        }),
      ),
    )

    const response = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/fields',
      {
        body: JSON.stringify({ field_name: 'audit_rights', value: { enabled: true } }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      },
    )
    const body = (await response.json()) as { detail: string }

    expect(response.status).toBe(422)
    expect(body.detail).toContain('audit_rights must be boolean')
    expect(calls).toEqual([])
  })

  it('returns paginated immutable edit history', async () => {
    const app = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(dependencies()),
    )

    const response = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/edits?limit=10&offset=0',
    )

    await expect(response.json()).resolves.toEqual({
      edits: [
        {
          edited_at: '2026-06-12T01:00:00.000Z',
          edited_by: 'user-id',
          edited_value: 'ACME Properties',
          field_name: 'landlord_legal_name',
          id: 'edit-id',
          original_value: 'ACME',
        },
      ],
      extraction_id: paidRecord.id,
      total: 1,
    })
  })

  it('handles invalid edit requests and unconfigured edit dependencies', async () => {
    const unconfiguredDependencies = dependencies()
    delete unconfiguredDependencies.editField
    delete unconfiguredDependencies.getEditHistory
    const app = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(unconfiguredDependencies),
    )

    const invalidEdit = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/fields',
      {
        body: JSON.stringify({ field_name: '' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      },
    )
    const unconfiguredEdit = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/fields',
      {
        body: JSON.stringify({ field_name: 'landlord_legal_name', value: 'ACME' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      },
    )
    const invalidHistory = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/edits?limit=999',
    )
    const unconfiguredHistory = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/edits',
    )

    expect(invalidEdit.status).toBe(400)
    expect(unconfiguredEdit.status).toBe(503)
    expect(invalidHistory.status).toBe(400)
    expect(unconfiguredHistory.status).toBe(503)
  })
})
