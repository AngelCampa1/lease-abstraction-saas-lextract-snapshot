import { describe, expect, it } from 'vitest'

import { createExtractionsRoutes } from '../routes/extractions'
import type { ExtractionRouteDependencies } from '../routes/extractions'
import type { ExtractionRecord } from '../repositories/extractions'
import { buildCamAuditPayload } from '../services/camaudit'
import { routeTestEnv } from './route-test-helpers'
import { testApp, userAuthDependencies } from './task9-helpers'

const record: ExtractionRecord = {
  anonymousSessionId: null,
  confidenceScores: { audit_rights: { score: 0.8, tier: 'high' } },
  createdAt: '2026-06-12T00:00:00.000Z',
  deletedAt: null,
  documentFilename: 'lease.pdf',
  documentObjectKey: 'object-key',
  documentPageCount: 4,
  errorMessage: null,
  extractedData: {
    audit_rights: { confidence: 0.8, source_text: 'Audit rights', value: true },
    landlord_legal_name: { confidence: 0.9, source_text: 'ACME', value: 'ACME' },
  },
  id: '11111111-1111-4111-8111-111111111111',
  overallConfidence: 0.9,
  paymentStatus: 'paid',
  propertyType: 'retail',
  redFlags: [],
  showCamAudit: true,
  status: 'complete',
  updatedAt: '2026-06-12T00:00:00.000Z',
  userId: 'user-id',
}

function dependencies(
  getExtraction: () => Promise<ExtractionRecord | null> = () => Promise.resolve(record),
): ExtractionRouteDependencies {
  return {
    authDependencies: userAuthDependencies,
    deleteExtraction: () => Promise.resolve({ alreadyDeleted: false }),
    getExtraction,
    insertUpload: () => Promise.resolve(),
    listExtractions: () => Promise.resolve({ items: [], limit: 20, offset: 0, total: 0 }),
    putDocument: () => Promise.resolve('object-key'),
    startWorkflow: () => Promise.resolve(),
    validatePdf: () => Promise.resolve({ pageCount: 1 }),
  }
}

describe('CamAudit handoff', () => {
  it('builds a payload with only CAM-relevant fields', () => {
    const payload = buildCamAuditPayload({
      confidenceScores: record.confidenceScores ?? {},
      extractedData: record.extractedData ?? {},
      extractionId: record.id,
      timestamp: '2026-06-12T00:00:00.000Z',
    })

    expect(payload.fields).toEqual({
      audit_rights: { confidence: 0.8, source_text: 'Audit rights', value: true },
    })
    expect(payload.confidence_scores).toEqual({
      audit_rights: { score: 0.8, tier: 'high' },
    })
    expect(payload.fields).not.toHaveProperty('landlord_legal_name')
  })

  it('returns a signed CamAudit redirect URL for eligible paid extractions', async () => {
    const app = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(dependencies()),
      {
        ...routeTestEnv,
        CAMAUDIT_BASE_URL: 'https://www.camaudit.io',
        CAMAUDIT_SHARED_KEY: 'cam-secret',
      },
    )

    const response = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/camaudit-payload',
    )
    const body = (await response.json()) as { redirect_url: string; extraction_id: string }
    const redirectUrl = new URL(body.redirect_url)

    expect(response.status).toBe(200)
    expect(body.extraction_id).toBe(record.id)
    expect(redirectUrl.origin).toBe('https://www.camaudit.io')
    expect(redirectUrl.pathname).toBe('/scan')
    expect(redirectUrl.searchParams.get('payload')).toBeTruthy()
    expect(redirectUrl.searchParams.get('utm_source')).toBe('lextract')
  })

  it('rejects ineligible or unconfigured CamAudit handoffs', async () => {
    const unpaid = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(
        dependencies(() => Promise.resolve({ ...record, paymentStatus: 'unpaid' })),
      ),
      { ...routeTestEnv, CAMAUDIT_SHARED_KEY: 'cam-secret' },
    )
    const ineligible = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(
        dependencies(() => Promise.resolve({ ...record, showCamAudit: false })),
      ),
      { ...routeTestEnv, CAMAUDIT_SHARED_KEY: 'cam-secret' },
    )
    const unconfigured = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(dependencies()),
      routeTestEnv,
    )

    expect(
      await unpaid.fetch(
        '/api/v1/extractions/11111111-1111-4111-8111-111111111111/camaudit-payload',
      ),
    ).toHaveProperty('status', 403)
    expect(
      await (
        await ineligible.fetch(
          '/api/v1/extractions/11111111-1111-4111-8111-111111111111/camaudit-payload',
        )
      ).json(),
    ).toEqual({ detail: 'This extraction is not eligible for CamAudit handoff' })
    expect(
      await unconfigured.fetch(
        '/api/v1/extractions/11111111-1111-4111-8111-111111111111/camaudit-payload',
      ),
    ).toHaveProperty('status', 503)
  })
})
