import { afterEach, describe, expect, it } from 'vitest'

import {
  createExtractionsRoutes,
  defaultExtractionRouteDependencies,
} from '../routes/extractions'
import { configureExtractionsRepositoryDb } from '../repositories/extractions'
import type { ExtractionRecord } from '../repositories/extractions'
import type { DbPoolLike, DbQueryResult } from '../repositories/db'
import type { Env } from '../types'
import { routeTestEnv } from './route-test-helpers'
import { testApp, userAuthDependencies } from './task9-helpers'

const record: ExtractionRecord = {
  anonymousSessionId: null,
  confidenceScores: null,
  createdAt: '2026-06-12T00:00:00.000Z',
  deletedAt: null,
  documentFilename: 'lease.pdf',
  documentObjectKey: 'object-key',
  documentPageCount: null,
  errorMessage: null,
  extractedData: null,
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

class SequencePool implements DbPoolLike {
  ended = false
  readonly queries: { text: string; values?: readonly unknown[] }[] = []

  constructor(private readonly results: readonly (readonly unknown[])[]) {}

  async end(): Promise<void> {
    this.ended = true
  }

  async query<Row>(
    text: string,
    values?: readonly unknown[],
  ): Promise<DbQueryResult<Row>> {
    this.queries.push(values === undefined ? { text } : { text, values })
    const next = this.results[this.queries.length - 1] ?? []
    return { rows: next as Row[] }
  }
}

describe('extraction route Task 9 branches', () => {
  afterEach(() => {
    configureExtractionsRepositoryDb(null)
  })

  it('exercises default storage and workflow adapters', async () => {
    const calls: string[] = []
    const env: Env = {
      ...routeTestEnv,
      DOCUMENTS_BUCKET: {
        delete: (key: string) => {
          calls.push(`delete:${key}`)
          return Promise.resolve()
        },
        get: (key: string) =>
          Promise.resolve(
            key === 'missing'
              ? null
              : {
                  body: new ReadableStream(),
                  httpMetadata:
                    key === 'typed'
                      ? { contentType: 'application/pdf' }
                      : undefined,
                },
          ),
        list: () => Promise.resolve({ objects: [], truncated: false }),
        put: () => Promise.resolve(null),
      } as unknown as R2Bucket,
      EXPORT_WORKFLOW: {
        create: ({ params }: { params: unknown }) => {
          calls.push(`export:${JSON.stringify(params)}`)
          return Promise.resolve({ id: 'workflow-id' })
        },
      } as unknown as Workflow,
      EXTRACTION_WORKFLOW: {
        create: ({ params }: { params: unknown }) => {
          calls.push(`extract:${JSON.stringify(params)}`)
          return Promise.resolve({ id: 'workflow-id' })
        },
      } as unknown as Workflow,
    }
    const deps = defaultExtractionRouteDependencies()

    await deps.deleteDocument?.('object-key', env)
    await expect(deps.getDocumentObject?.('missing', env)).resolves.toBeNull()
    await expect(deps.getDocumentObject?.('typed', env)).resolves.toMatchObject({
      contentType: 'application/pdf',
    })
    await expect(deps.getExportObject?.('untyped', env)).resolves.toHaveProperty('body')
    await expect(deps.exportObjectExists?.('missing', env)).resolves.toBe(false)
    await expect(deps.exportObjectExists?.('typed', env)).resolves.toBe(true)
    await deps.startWorkflow({ extractionId: record.id }, env)
    await deps.startExportWorkflow?.(
      {
        extractionId: record.id,
        format: 'docx',
        owner: { kind: 'user', userId: 'user-id' },
        taskId: 'task-id',
        template: 'commercial',
        version: 'v1',
      },
      env,
    )

    expect(calls).toContain('delete:object-key')
    expect(calls.some((call) => call.startsWith('extract:'))).toBe(true)
    expect(calls.some((call) => call.startsWith('export:'))).toBe(true)
  })

  it('deletes explicit legacy document and raw extraction objects before soft delete', async () => {
    const extractionId = '11111111-1111-4111-8111-111111111111'
    const row = {
      anonymous_session_id: null,
      confidence_scores: null,
      created_at: record.createdAt,
      deleted_at: null,
      document_filename: record.documentFilename,
      document_object_key: `lextract-documents/user-id/${extractionId}/original.pdf`,
      document_s3_key: 'legacy/user-id/extraction/original.pdf',
      document_page_count: null,
      error_message: null,
      extracted_data: null,
      id: extractionId,
      overall_confidence: null,
      payment_status: 'paid',
      property_type: null,
      raw_extraction_object_keys: ['legacy/user-id/extraction/raw/pass-1.json'],
      red_flags: [],
      show_camaudit: false,
      status: 'complete',
      updated_at: record.updatedAt,
      user_id: 'user-id',
    }
    const getPool = new SequencePool([[row]])
    const deletePool = new SequencePool([[{ id: extractionId }]])
    const pools = [getPool, deletePool]
    configureExtractionsRepositoryDb(() => {
      const pool = pools.shift()
      if (!pool) {
        throw new Error('No test pool configured')
      }
      return pool
    })
    const deletedKeys: string[] = []
    const env: Env = {
      ...routeTestEnv,
      DOCUMENTS_BUCKET: {
        delete: (key: string) => {
          deletedKeys.push(key)
          return Promise.resolve()
        },
        get: () => Promise.resolve(null),
        list: () =>
          Promise.resolve({
            objects: [
              {
                key: `lextract-documents/user-id/${extractionId}/original.pdf`,
              },
            ],
            truncated: false,
          }),
        put: () => Promise.resolve(null),
      } as unknown as R2Bucket,
      HYPERDRIVE: {
        connectionString: 'postgres://user:pass@example.com:5432/lextract',
      } as Hyperdrive,
    }
    const deps = defaultExtractionRouteDependencies()

    await expect(
      deps.deleteExtraction({ extractionId, owner: { kind: 'user', userId: 'user-id' } }, env),
    ).resolves.toEqual({ alreadyDeleted: false })

    expect(deletedKeys).toEqual([
      'legacy/user-id/extraction/original.pdf',
      'legacy/user-id/extraction/raw/pass-1.json',
      `lextract-documents/user-id/${extractionId}/original.pdf`,
    ])
    expect(deletePool.queries[0]?.text).toContain('UPDATE extractions')
  })

  it('returns auth and not-found responses across Task 9 routes', async () => {
    const app = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes({
        authDependencies: {
          findAnonymousSession: () => Promise.resolve(null),
          findUserByAuthSubject: () => Promise.resolve(null),
          verifyBearerToken: () => Promise.resolve({ email: null, subject: 'user-id' }),
        },
        deleteExtraction: () => Promise.resolve({ alreadyDeleted: false }),
        getExtraction: () => Promise.resolve(null),
        getExtractionById: () => Promise.resolve({ ...record, deletedAt: '2026-06-12T01:00:00.000Z' }),
        insertUpload: () => Promise.resolve(),
        listExtractions: () => Promise.resolve({ items: [], limit: 20, offset: 0, total: 0 }),
        putDocument: () => Promise.resolve('object-key'),
        startWorkflow: () => Promise.resolve(),
        validatePdf: () => Promise.resolve({ pageCount: 1 }),
      }),
    )
    const authedApp = testApp(
      '/api/v1/extractions',
      createExtractionsRoutes({
        authDependencies: userAuthDependencies,
        deleteExtraction: () => Promise.resolve({ alreadyDeleted: false, notFound: true }),
        getExtraction: () => Promise.resolve(null),
        getExtractionById: () => Promise.resolve({ ...record, paymentStatus: 'unpaid' }),
        insertUpload: () => Promise.resolve(),
        listExtractions: () => Promise.resolve({ items: [], limit: 20, offset: 0, total: 0 }),
        putDocument: () => Promise.resolve('object-key'),
        startWorkflow: () => Promise.resolve(),
        validatePdf: () => Promise.resolve({ pageCount: 1 }),
      }),
    )

    expect((await app.fetch('/api/v1/extractions/abc/status', { headers: { Authorization: '' } })).status).toBe(401)
    expect((await authedApp.fetch('/api/v1/extractions/abc/fields', { method: 'PATCH', body: '{}', headers: { 'Content-Type': 'application/json' } })).status).toBe(404)
    expect((await authedApp.fetch('/api/v1/extractions/abc/edits')).status).toBe(404)
    expect((await authedApp.fetch('/api/v1/extractions/abc/camaudit-payload')).status).toBe(404)
    expect((await authedApp.fetch('/api/v1/extractions/abc/export/docx', { method: 'POST' })).status).toBe(404)
    expect((await authedApp.fetch('/api/v1/extractions/abc/export/docx/download')).status).toBe(404)
    expect((await authedApp.fetch('/api/v1/extractions/abc/document?token=bad')).status).toBe(403)
    expect((await authedApp.fetch('/api/v1/extractions/abc', { method: 'DELETE' })).status).toBe(404)
  })
})
