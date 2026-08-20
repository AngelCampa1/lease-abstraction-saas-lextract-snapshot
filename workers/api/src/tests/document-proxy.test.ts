import { describe, expect, it } from 'vitest'

import { createExtractionsRoutes } from '../routes/extractions'
import type { ExtractionRouteDependencies } from '../routes/extractions'
import type { ExtractionRecord } from '../repositories/extractions'
import { testApp, userAuthDependencies } from './task9-helpers'
import { routeTestEnv } from './route-test-helpers'

const record: ExtractionRecord = {
  anonymousSessionId: null,
  confidenceScores: {},
  createdAt: '2026-06-12T00:00:00.000Z',
  deletedAt: null,
  documentFilename: 'lease.pdf',
  documentObjectKey: 'object-key',
  documentPageCount: 4,
  errorMessage: null,
  extractedData: {},
  id: '11111111-1111-4111-8111-111111111111',
  overallConfidence: null,
  paymentStatus: 'paid',
  propertyType: null,
  redFlags: [],
  showCamAudit: false,
  status: 'complete',
  updatedAt: '2026-06-12T00:00:00.000Z',
  userId: 'user-id',
}

function dependencies(): ExtractionRouteDependencies {
  return {
    authDependencies: userAuthDependencies,
    deleteExtraction: () => Promise.resolve({ alreadyDeleted: false }),
    getDocumentObject: () =>
      Promise.resolve({
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('%PDF-body'))
            controller.close()
          },
        }),
        contentType: 'application/pdf',
      }),
    getExtraction: () => Promise.resolve(record),
    getExtractionById: () => Promise.resolve(record),
    insertUpload: () => Promise.resolve(),
    listExtractions: () => Promise.resolve({ items: [], limit: 20, offset: 0, total: 0 }),
    putDocument: () => Promise.resolve('object-key'),
    startWorkflow: () => Promise.resolve(),
    validatePdf: () => Promise.resolve({ pageCount: 1 }),
  }
}

describe('document proxy routes', () => {
  it('returns a signed Worker document URL and streams the PDF through the API', async () => {
    const app = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(dependencies()),
      {
        ...routeTestEnv,
        DOCUMENT_PROXY_SECRET: 'document-secret',
      },
    )

    const urlResponse = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/document-url',
      { headers: { 'X-Forwarded-Host': 'api.lextract.io', 'X-Forwarded-Proto': 'https' } },
    )
    const urlBody = (await urlResponse.json()) as { url: string; expires_in: number }
    const documentUrl = new URL(urlBody.url)
    const streamResponse = await app.fetch(
      `${documentUrl.pathname}${documentUrl.search}`,
      { headers: {} },
    )

    expect(urlResponse.status).toBe(200)
    expect(urlBody.expires_in).toBe(3600)
    expect(urlBody.url).toContain('/api/v1/extractions/11111111-1111-4111-8111-111111111111/document?token=')
    expect(streamResponse.status).toBe(200)
    expect(streamResponse.headers.get('Content-Type')).toContain('application/pdf')
    expect(streamResponse.headers.get('Content-Disposition')).toContain('inline')
    await expect(streamResponse.text()).resolves.toBe('%PDF-body')
  })

  it('does not trust forwarded headers when building signed document URLs', async () => {
    const app = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(dependencies()),
      {
        ...routeTestEnv,
        DOCUMENT_PROXY_SECRET: 'document-secret',
        PUBLIC_API_ORIGIN: 'https://api.lextract.io',
      },
    )

    const response = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/document-url',
      {
        headers: {
          'X-Forwarded-Host': 'attacker.example',
          'X-Forwarded-Proto': 'https',
        },
      },
    )
    const body = (await response.json()) as { url: string }

    expect(response.status).toBe(200)
    expect(new URL(body.url).origin).toBe('https://api.lextract.io')
  })

  it('rejects invalid document tokens and unpaid documents', async () => {
    const app = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(dependencies()),
      { ...routeTestEnv, DOCUMENT_PROXY_SECRET: 'document-secret' },
    )
    const unpaidApp = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes({
        ...dependencies(),
        getExtraction: () => Promise.resolve({ ...record, paymentStatus: 'unpaid' }),
      }),
      { ...routeTestEnv, DOCUMENT_PROXY_SECRET: 'document-secret' },
    )

    const invalid = await app.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/document?token=bad',
      { headers: {} },
    )
    const unpaid = await unpaidApp.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/document-url',
    )

    expect(invalid.status).toBe(403)
    expect(unpaid.status).toBe(403)
  })

  it('handles missing proxy config, missing document keys, and missing R2 objects', async () => {
    const noSecret = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(dependencies()),
      routeTestEnv,
    )
    const noKey = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes({
        ...dependencies(),
        getExtraction: () => Promise.resolve({ ...record, documentObjectKey: null }),
      }),
      { ...routeTestEnv, DOCUMENT_PROXY_SECRET: 'document-secret' },
    )
    const missingObject = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes({
        ...dependencies(),
        getDocumentObject: () => Promise.resolve(null),
      }),
      { ...routeTestEnv, DOCUMENT_PROXY_SECRET: 'document-secret' },
    )
    const noLookupDependencies = dependencies()
    delete noLookupDependencies.getExtractionById
    const noLookup = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes(noLookupDependencies),
      { ...routeTestEnv, DOCUMENT_PROXY_SECRET: 'document-secret' },
    )

    expect(
      (
        await noSecret.fetch(
          '/api/v1/extractions/11111111-1111-4111-8111-111111111111/document-url',
        )
      ).status,
    ).toBe(503)
    expect(
      (
        await noKey.fetch(
          '/api/v1/extractions/11111111-1111-4111-8111-111111111111/document-url',
        )
      ).status,
    ).toBe(404)

    const tokenResponse = await missingObject.fetch(
      '/api/v1/extractions/11111111-1111-4111-8111-111111111111/document-url',
    )
    const tokenBody = (await tokenResponse.json()) as { url: string }
    const tokenUrl = new URL(tokenBody.url)
    expect(
      (await missingObject.fetch(`${tokenUrl.pathname}${tokenUrl.search}`)).status,
    ).toBe(404)
    expect(
      (
        await noLookup.fetch(
          '/api/v1/extractions/11111111-1111-4111-8111-111111111111/document?token=anything',
        )
      ).status,
    ).toBe(404)
  })
})
