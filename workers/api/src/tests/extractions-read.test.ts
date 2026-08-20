import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import { createExtractionsRoutes } from '../routes/extractions'
import type {
  ExtractionListInput,
  ExtractionListResult,
  ExtractionRecord,
  ExtractionRouteDependencies,
} from '../routes/extractions'
import type { AuthDependencies } from '../services/neon-auth'
import type { AppBindings } from '../types'
import { bearerRequest, jsonBody, routeTestEnv } from './route-test-helpers'

const baseRecord = {
  confidenceScores: {
    commencement_date: { score: 0.9, tier: 'high' },
    landlord_legal_name: { score: 0.94, tier: 'high' },
    tenant_legal_name: { score: 0.72, tier: 'medium' },
  },
  createdAt: '2026-06-10T12:00:00.000Z',
  deletedAt: null,
  documentFilename: 'lease.pdf',
  documentObjectKey: 'lextract-documents/user-id/extraction-id/original.pdf',
  documentPageCount: 12,
  errorMessage: null,
  extractedData: {
    base_rent_annual: { value: '$120,000' },
    commencement_date: { value: '2026-01-01' },
    landlord_legal_name: { value: 'ACME Landlord LLC' },
    tenant_legal_name: { value: 'Beta Tenant Inc.' },
  },
  id: 'extraction-id',
  anonymousSessionId: null,
  overallConfidence: 0.82,
  paymentStatus: 'paid',
  propertyType: 'retail',
  redFlags: [
    {
      category: 'CAM',
      description: 'No CAM cap found',
      name: 'Missing CAM cap',
      severity: 'HIGH',
    },
  ],
  showCamAudit: true,
  status: 'complete',
  updatedAt: '2026-06-10T12:05:00.000Z',
  userId: 'user-id',
} satisfies ExtractionRecord

function authDependencies(): AuthDependencies {
  return {
    findAnonymousSession: () => Promise.resolve(null),
    findUserByAuthSubject: () =>
      Promise.resolve({
        authSubject: 'user-id',
        email: 'owner@example.com',
        id: 'user-id',
      }),
    verifyBearerToken: () =>
      Promise.resolve({ email: 'owner@example.com', subject: 'user-id' }),
  }
}

function route(
  overrides: Partial<ExtractionRouteDependencies> = {},
): Hono<AppBindings> {
  const app = new Hono<AppBindings>()
  const dependencies: ExtractionRouteDependencies = {
    authDependencies: authDependencies(),
    deleteExtraction: () => Promise.resolve({ alreadyDeleted: false }),
    getExtraction: () => Promise.resolve(baseRecord),
    insertUpload: () => Promise.reject(new Error('unused')),
    listExtractions: () =>
      Promise.resolve({
        items: [
          {
            createdAt: '2026-06-10T12:00:00.000Z',
            documentFilename: 'lease.pdf',
            id: 'extraction-id',
            paymentStatus: 'paid',
            propertyType: 'retail',
            status: 'complete',
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
      } satisfies ExtractionListResult),
    putDocument: () => Promise.reject(new Error('unused')),
    startWorkflow: () => Promise.reject(new Error('unused')),
    validatePdf: () => Promise.reject(new Error('unused')),
    ...overrides,
  }
  app.route('/api/v1/extractions', createExtractionsRoutes(dependencies))
  return app
}

describe('extraction read routes', () => {
  it('returns status without requiring payment', async () => {
    const response = await route().fetch(
      bearerRequest('/api/v1/extractions/extraction-id/status'),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      document_filename: 'lease.pdf',
      document_page_count: 12,
      error_message: null,
      id: 'extraction-id',
      payment_status: 'paid',
      status: 'complete',
    })
  })

  it('returns teaser fields, confidence distribution, red flag metadata, and locked categories', async () => {
    const response = await route().fetch(
      bearerRequest('/api/v1/extractions/extraction-id/teaser'),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    const body = await jsonBody<Record<string, unknown>>(response)
    expect(body).toMatchObject({
      category_count: 16,
      document_filename: 'lease.pdf',
      document_page_count: 12,
      error_message: null,
      id: 'extraction-id',
      payment_status: 'paid',
      red_flag_categories: ['CAM'],
      red_flag_count: 1,
      red_flag_severity_high: 1,
      status: 'complete',
      total_field_count: 126,
    })
    expect(body.visible_fields).toEqual([
      {
        field_name: 'landlord_legal_name',
        label: 'Landlord Name',
        value: 'ACME Landlord LLC',
      },
      {
        field_name: 'tenant_legal_name',
        label: 'Tenant Name',
        value: 'Beta Tenant Inc.',
      },
      {
        field_name: 'commencement_date',
        label: 'Commencement Date',
        value: '2026-01-01',
      },
      {
        field_name: 'base_rent_annual',
        label: 'Annual Base Rent',
        value: '$120,000',
      },
    ])
    expect(body.confidence_distribution).toEqual({
      high: 2,
      low: 0,
      medium: 1,
      not_found: 123,
    })
    expect(body.locked_categories).toEqual(
      expect.arrayContaining([
        { field_count: 6, name: 'Key Dates & Term' },
      ]),
    )
  })

  it('normalizes teaser fallback values and empty metadata', async () => {
    const response = await route({
      getExtraction: () =>
        Promise.resolve({
          ...baseRecord,
          confidenceScores: {
            _overall: { score: 0.7, tier: 'medium' },
            absent_field: { score: 0, tier: 'not_found' },
            raw_score_without_tier: { score: 0.4 },
          },
          extractedData: {
            array_field: { value: ['gross_lease', '', '{TENANT}', 'insert name'] },
            blank_field: { value: '' },
            boolean_field: { value: true },
            custom_enum: 'pro_rata_allocation',
            direct_boolean: false,
            direct_null: null,
            placeholder: '{LANDLORD}',
          },
          redFlags: [],
        }),
    }).fetch(
      bearerRequest('/api/v1/extractions/extraction-id/teaser'),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    const body = await jsonBody<Record<string, unknown>>(response)
    expect(body).not.toHaveProperty('red_flag_categories')
    expect(body).not.toHaveProperty('red_flag_severity_high')
    expect(body).toMatchObject({
      confidence_distribution: {
        high: 0,
        low: 1,
        medium: 0,
        not_found: 125,
      },
      visible_fields: [
        {
          field_name: 'array_field',
          label: 'Array Field',
          value: 'Gross Lease',
        },
        {
          field_name: 'custom_enum',
          label: 'Custom Enum',
          value: 'Pro Rata Allocation',
        },
        {
          field_name: 'boolean_field',
          label: 'Boolean Field',
          value: 'Yes',
        },
        {
          field_name: 'direct_boolean',
          label: 'Direct Boolean',
          value: 'No',
        },
      ],
    })
  })

  it('returns full paid results in the frontend response shape', async () => {
    const response = await route().fetch(
      bearerRequest('/api/v1/extractions/extraction-id'),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      confidence_scores: baseRecord.confidenceScores,
      created_at: '2026-06-10T12:00:00.000Z',
      document_filename: 'lease.pdf',
      document_page_count: 12,
      extracted_data: baseRecord.extractedData,
      id: 'extraction-id',
      overall_confidence: 0.82,
      payment_status: 'paid',
      property_type: 'retail',
      red_flags: baseRecord.redFlags,
      show_camaudit: true,
      status: 'complete',
      updated_at: '2026-06-10T12:05:00.000Z',
    })
  })

  it('computes overall confidence when the row does not store an aggregate', async () => {
    const response = await route({
      getExtraction: () =>
        Promise.resolve({
          ...baseRecord,
          confidenceScores: {
            _overall: { score: 0.1, tier: 'low' },
            not_found_field: { score: 0, tier: 'not_found' },
            scoreless_field: { score: '0.8', tier: 'high' },
            usable_one: { score: 0.8, tier: 'medium' },
            usable_two: { score: 1, tier: 'high' },
          },
          overallConfidence: null,
        }),
    }).fetch(bearerRequest('/api/v1/extractions/extraction-id'), routeTestEnv)

    expect(response.status).toBe(200)
    await expect(jsonBody<Record<string, unknown>>(response)).resolves.toMatchObject({
      overall_confidence: 0.9,
    })
  })

  it('returns 403 for unpaid full results', async () => {
    const response = await route({
      getExtraction: () =>
        Promise.resolve({
          ...baseRecord,
          paymentStatus: 'unpaid',
        }),
    }).fetch(bearerRequest('/api/v1/extractions/extraction-id'), routeTestEnv)

    expect(response.status).toBe(403)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      detail: 'Payment required to access full results',
    })
  })

  it('returns 404 for missing, foreign-owned, or deleted extractions', async () => {
    const app = route({ getExtraction: () => Promise.resolve(null) })

    const response = await app.fetch(
      bearerRequest('/api/v1/extractions/missing/status'),
      routeTestEnv,
    )

    expect(response.status).toBe(404)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      detail: 'Extraction not found',
    })
  })

  it('lists extractions with filters and pagination', async () => {
    let seen: ExtractionListInput | undefined
    const app = route({
      listExtractions: (input) => {
        seen = input
        return Promise.resolve({
          items: [
            {
              createdAt: '2026-06-10T12:00:00.000Z',
              documentFilename: 'lease.pdf',
              id: 'extraction-id',
              paymentStatus: 'paid',
              propertyType: 'retail',
              status: 'complete',
            },
          ],
          limit: 10,
          offset: 5,
          total: 1,
        })
      },
    })

    const response = await app.fetch(
      bearerRequest(
        '/api/v1/extractions?limit=10&offset=5&status=complete&date_from=2026-06-01&date_to=2026-06-12&sort=asc',
      ),
      routeTestEnv,
    )

    expect(response.status).toBe(200)
    expect(seen).toEqual({
      dateFrom: '2026-06-01',
      dateTo: '2026-06-12',
      limit: 10,
      offset: 5,
      owner: { kind: 'user', userId: 'user-id' },
      sort: 'asc',
      status: 'complete',
    })
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      items: [
        {
          created_at: '2026-06-10T12:00:00.000Z',
          document_filename: 'lease.pdf',
          id: 'extraction-id',
          payment_status: 'paid',
          property_type: 'retail',
          status: 'complete',
        },
      ],
      limit: 10,
      offset: 5,
      total: 1,
    })
  })

  it('rejects invalid list filters', async () => {
    const app = route()
    const badStatus = await app.fetch(
      bearerRequest('/api/v1/extractions?status=bogus'),
      routeTestEnv,
    )
    const badDate = await app.fetch(
      bearerRequest('/api/v1/extractions?date_from=not-a-date'),
      routeTestEnv,
    )

    expect(badStatus.status).toBe(400)
    expect(badDate.status).toBe(400)
  })

  it('deletes owned extraction storage objects and soft deletes the row', async () => {
    let deletedId: string | undefined
    const response = await route({
      deleteExtraction: (input) => {
        deletedId = input.extractionId
        expect(input.owner).toEqual({ kind: 'user', userId: 'user-id' })
        return Promise.resolve({ alreadyDeleted: false })
      },
    }).fetch(
      bearerRequest('/api/v1/extractions/extraction-id', { method: 'DELETE' }),
      routeTestEnv,
    )

    expect(response.status).toBe(204)
    expect(deletedId).toBe('extraction-id')
    expect(await response.text()).toBe('')
  })

  it('requires authentication for extraction endpoints', async () => {
    const response = await route().fetch(
      new Request('https://api.lextract.io/api/v1/extractions/extraction-id/status'),
      routeTestEnv,
    )

    expect(response.status).toBe(401)
  })

  it('requires authentication for list and delete endpoints', async () => {
    const app = route()
    const list = await app.fetch(
      new Request('https://api.lextract.io/api/v1/extractions'),
      routeTestEnv,
    )
    const deletion = await app.fetch(
      new Request('https://api.lextract.io/api/v1/extractions/extraction-id', {
        method: 'DELETE',
      }),
      routeTestEnv,
    )

    expect(list.status).toBe(401)
    expect(deletion.status).toBe(401)
  })
})
