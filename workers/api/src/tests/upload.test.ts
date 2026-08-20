import { Hono } from 'hono'
import { afterEach, describe, expect, it } from 'vitest'

import { createExtractionsRoutes } from '../routes/extractions'
import type {
  ExtractionRouteDependencies,
  InsertUploadInput,
  StartExtractionWorkflowInput,
} from '../routes/extractions'
import { defaultExtractionRouteDependencies } from '../routes/extractions'
import {
  configureExtractionsRepositoryDb,
} from '../repositories/extractions'
import type { DbPoolLike, DbQueryResult } from '../repositories/db'
import type { AuthDependencies } from '../services/neon-auth'
import type { AppBindings, Env } from '../types'
import { bearerRequest, jsonBody, routeTestEnv } from './route-test-helpers'

function pdfBytes(pageCount = 1): ArrayBuffer {
  const pages = Array.from({ length: pageCount }, (_, index) => `${index} 0 obj
<</Type /Page>>
endobj`).join('\n')
  const bytes = new TextEncoder().encode(`%PDF-1.7
${pages}
%%EOF`)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
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

function anonymousAuthDependencies(): AuthDependencies {
  return {
    findAnonymousSession: () =>
      Promise.resolve({
        email: null,
        expiresAt: new Date(Date.now() + 60_000),
        id: 'session-id',
        linkedUserId: null,
        sessionToken: 'session-token',
      }),
    findUserByAuthSubject: () => Promise.resolve(null),
    verifyBearerToken: () => Promise.reject(new Error('unused')),
  }
}

function route(
  overrides: Partial<ExtractionRouteDependencies> = {},
): Hono<AppBindings> {
  const app = new Hono<AppBindings>()
  const dependencies: ExtractionRouteDependencies = {
    authDependencies: authDependencies(),
    deleteExtraction: () => Promise.reject(new Error('unused')),
    getExtraction: () => Promise.reject(new Error('unused')),
    insertUpload: () => Promise.resolve(),
    listExtractions: () => Promise.reject(new Error('unused')),
    putDocument: () =>
      Promise.resolve('lextract-documents/user-id/extraction-id/original.pdf'),
    startWorkflow: () => Promise.resolve(),
    validatePdf: () => Promise.resolve({ pageCount: 1 }),
    ...overrides,
  }
  app.route('/api/v1/extractions', createExtractionsRoutes(dependencies))
  return app
}

function uploadRequest(
  file: File,
  headers: Record<string, string> = { Authorization: 'Bearer valid-jwt' },
): Request {
  const form = new FormData()
  form.append('file', file)
  return new Request('https://api.lextract.io/api/v1/extractions/upload', {
    body: form,
    headers,
    method: 'POST',
  })
}

describe('extraction upload route', () => {
  afterEach(() => {
    configureExtractionsRepositoryDb(null)
  })

  it('validates, stores, inserts, and starts workflow for user PDF uploads', async () => {
    let inserted: InsertUploadInput | undefined
    let workflow: StartExtractionWorkflowInput | undefined
    let storedBytes: ArrayBuffer | undefined
    const file = new File([pdfBytes()], 'lease.pdf', { type: 'application/pdf' })
    const app = route({
      insertUpload: (input) => {
        inserted = input
        return Promise.resolve()
      },
      putDocument: (_input, body) => {
        storedBytes = body
        return Promise.resolve('lextract-documents/user-id/new-id/original.pdf')
      },
      startWorkflow: (input) => {
        workflow = input
        return Promise.resolve()
      },
    })

    const response = await app.fetch(uploadRequest(file), routeTestEnv)

    expect(response.status).toBe(201)
    const body = await jsonBody<Record<string, unknown>>(response)
    expect(body.extraction_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(body.status).toBe('uploading')
    expect(inserted).toMatchObject({
      documentFilename: 'lease.pdf',
      documentObjectKey: 'lextract-documents/user-id/new-id/original.pdf',
      documentPageCount: 1,
      owner: { kind: 'user', userId: 'user-id' },
    })
    expect(workflow).toMatchObject({
      extractionId: inserted?.extractionId,
    })
    expect(storedBytes?.byteLength).toBe(file.size)
  })

  it('uses anonymous session ownership and storage keys for guest uploads', async () => {
    let inserted: InsertUploadInput | undefined
    const app = route({
      authDependencies: anonymousAuthDependencies(),
      insertUpload: (input) => {
        inserted = input
        return Promise.resolve()
      },
      putDocument: (_input) =>
        Promise.resolve('lextract-documents/anon/session-id/new-id/original.pdf'),
    })
    const file = new File([pdfBytes()], 'guest.pdf', { type: 'application/pdf' })

    const response = await app.fetch(
      uploadRequest(file, { 'X-Session-Token': 'session-token' }),
      routeTestEnv,
    )

    expect(response.status).toBe(201)
    expect(inserted).toMatchObject({
      documentFilename: 'guest.pdf',
      documentObjectKey: 'lextract-documents/anon/session-id/new-id/original.pdf',
      owner: { kind: 'anonymous', sessionId: 'session-id' },
    })
  })

  it('rejects uploads without bearer or anonymous session auth', async () => {
    const file = new File([pdfBytes()], 'lease.pdf', { type: 'application/pdf' })

    const response = await route().fetch(uploadRequest(file, {}), routeTestEnv)

    expect(response.status).toBe(401)
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      detail: 'Authentication required: Bearer token or X-Session-Token',
    })
  })

  it('rejects missing files, non-PDF content types, bad magic bytes, large files, and too many pages', async () => {
    const app = route({
      validatePdf: (input) => {
        if (input.bytes.byteLength > 50 * 1024 * 1024) {
          return Promise.reject(new Error('File exceeds the maximum size limit of 50 MB.'))
        }
        if (!new TextDecoder().decode(input.bytes.slice(0, 5)).startsWith('%PDF-')) {
          return Promise.reject(new Error('Invalid file: not a valid PDF document.'))
        }
        if (input.bytes.byteLength > 100) {
          return Promise.reject(
            new Error(
              'PDF has 501 pages, which exceeds the 500-page limit. Please split the document and upload each section separately.',
            ),
          )
        }
        return Promise.resolve({ pageCount: 1 })
      },
    })
    const missingForm = new FormData()

    const missing = await app.fetch(
      bearerRequest('/api/v1/extractions/upload', {
        body: missingForm,
        method: 'POST',
      }),
      routeTestEnv,
    )
    const wrongType = await app.fetch(
      uploadRequest(new File([pdfBytes()], 'lease.txt', { type: 'text/plain' })),
      routeTestEnv,
    )
    const badMagic = await app.fetch(
      uploadRequest(new File(['not-pdf'], 'lease.pdf', { type: 'application/pdf' })),
      routeTestEnv,
    )
    const tooLarge = await app.fetch(
      uploadRequest(
        new File([new Uint8Array(50 * 1024 * 1024 + 1)], 'big.pdf', {
          type: 'application/pdf',
        }),
      ),
      routeTestEnv,
    )
    const tooManyPages = await app.fetch(
      uploadRequest(new File([pdfBytes(10)], 'long.pdf', { type: 'application/pdf' })),
      routeTestEnv,
    )

    expect(missing.status).toBe(400)
    expect(wrongType.status).toBe(400)
    expect(badMagic.status).toBe(400)
    expect(tooLarge.status).toBe(400)
    expect(tooManyPages.status).toBe(422)
  })

  it('marks upload failed when workflow dispatch fails after insert', async () => {
    let failedId: string | undefined
    const app = route({
      markUploadFailed: (extractionId) => {
        failedId = extractionId
        return Promise.resolve()
      },
      startWorkflow: () => Promise.reject(new Error('workflow offline')),
    })
    const file = new File([pdfBytes()], 'lease.pdf', { type: 'application/pdf' })

    const response = await app.fetch(uploadRequest(file), routeTestEnv)

    expect(response.status).toBe(503)
    expect(failedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    await expect(jsonBody<unknown>(response)).resolves.toEqual({
      detail: 'Extraction service temporarily unavailable - please try again',
    })
  })

  it('cleans up the uploaded R2 object when DB insert fails', async () => {
    const deletedKeys: string[] = []
    const app = route({
      deleteDocument: (key) => {
        deletedKeys.push(key)
        return Promise.resolve()
      },
      insertUpload: () => Promise.reject(new Error('database offline')),
      putDocument: () =>
        Promise.resolve('lextract-documents/user-id/new-id/original.pdf'),
    })
    const file = new File([pdfBytes()], 'lease.pdf', { type: 'application/pdf' })

    const response = await app.fetch(uploadRequest(file), routeTestEnv)

    expect(response.status).toBe(500)
    expect(deletedKeys).toEqual([
      'lextract-documents/user-id/new-id/original.pdf',
    ])
  })

  it('propagates unexpected validator exceptions to the error middleware', async () => {
    const app = route({
      validatePdf: () => Promise.reject(new Error('validator bug')),
    })
    const file = new File([pdfBytes()], 'lease.pdf', { type: 'application/pdf' })

    const response = await app.fetch(uploadRequest(file), routeTestEnv)

    expect(response.status).toBe(500)
  })

  it('runs default storage, repository, and workflow dependencies for uploads', async () => {
    const pool = new SequencePool([[]])
    configureExtractionsRepositoryDb(() => pool)
    const stored: { key: string; bytes: number }[] = []
    const workflowCreates: unknown[] = []
    const env: Env = {
      ...routeTestEnv,
      DOCUMENTS_BUCKET: {
        delete: () => Promise.resolve(),
        get: () => Promise.resolve(null),
        list: () =>
          Promise.resolve({ cursor: undefined, objects: [], truncated: false }),
        put: (
          key: string,
          value:
            | ArrayBuffer
            | ArrayBufferView
            | Blob
            | ReadableStream
            | string
            | null,
        ) => {
          const bytes =
            value instanceof ArrayBuffer
              ? value.byteLength
              : value instanceof ReadableStream
                ? 0
                : typeof value === 'string' || value === null
                  ? 0
                  : value instanceof Blob
                    ? value.size
                    : value.byteLength
          stored.push({ bytes, key })
          return Promise.resolve(null)
        },
      // The route only calls put/list/delete/get, so the test fake omits multipart methods.
      } as unknown as R2Bucket,
      EXTRACTION_WORKFLOW: {
        create: (options: unknown) => {
          workflowCreates.push(options)
          return Promise.resolve({ id: 'workflow-id' })
        },
      } as Workflow,
      HYPERDRIVE: {
        connectionString: 'postgres://user:pass@example.com:5432/lextract',
      } as Hyperdrive,
    }
    const dependencies = defaultExtractionRouteDependencies()
    dependencies.authDependencies = authDependencies()
    const app = new Hono<AppBindings>()
    app.route('/api/v1/extractions', createExtractionsRoutes(dependencies))

    const response = await app.fetch(
      uploadRequest(
        new File([pdfBytes()], 'lease.pdf', { type: 'application/pdf' }),
      ),
      env,
    )

    expect(response.status).toBe(201)
    expect(stored[0]?.key).toMatch(
      /^lextract-documents\/user-id\/[0-9a-f-]+\/original\.pdf$/,
    )
    expect(pool.queries[0]?.text).toContain('INSERT INTO extractions')
    expect(workflowCreates).toHaveLength(1)
  })

  it('marks default uploads failed when the workflow binding is missing', async () => {
    const insertPool = new SequencePool([[]])
    const failPool = new SequencePool([[]])
    configureExtractionsRepositoryDb(() =>
      insertPool.queries.length === 0 ? insertPool : failPool,
    )
    const env: Env = {
      ...routeTestEnv,
      DOCUMENTS_BUCKET: {
        delete: () => Promise.resolve(),
        get: () => Promise.resolve(null),
        list: () =>
          Promise.resolve({ cursor: undefined, objects: [], truncated: false }),
        put: () => Promise.resolve(null),
      } as unknown as R2Bucket,
      HYPERDRIVE: {
        connectionString: 'postgres://user:pass@example.com:5432/lextract',
      } as Hyperdrive,
    }
    const dependencies = defaultExtractionRouteDependencies()
    dependencies.authDependencies = authDependencies()
    const app = new Hono<AppBindings>()
    app.route('/api/v1/extractions', createExtractionsRoutes(dependencies))

    const response = await app.fetch(
      uploadRequest(
        new File([pdfBytes()], 'lease.pdf', { type: 'application/pdf' }),
      ),
      env,
    )

    expect(response.status).toBe(503)
    expect(failPool.queries[0]?.text).toContain("status = 'failed'")
  })

  it('runs default storage cleanup and soft delete dependencies for owned deletions', async () => {
    const extractionId = '11111111-1111-4111-8111-111111111111'
    const loadPool = new SequencePool([
      [
        {
          anonymous_session_id: null,
          confidence_scores: null,
          created_at: '2026-06-10T12:00:00.000Z',
          deleted_at: null,
          document_filename: 'lease.pdf',
          document_object_key:
            'lextract-documents/user-id/11111111-1111-4111-8111-111111111111/original.pdf',
          document_page_count: 1,
          document_s3_key: null,
          error_message: null,
          extracted_data: null,
          id: extractionId,
          overall_confidence: null,
          payment_status: 'unpaid',
          property_type: null,
          red_flags: [],
          show_camaudit: false,
          status: 'uploading',
          updated_at: '2026-06-10T12:00:00.000Z',
          user_id: 'user-id',
        },
      ],
    ])
    const deletePool = new SequencePool([[{ id: extractionId }]])
    configureExtractionsRepositoryDb((env) => {
      if (env === routeTestEnv) {
        throw new Error('test env without bucket should not be used')
      }
      return loadPool.queries.length === 0 ? loadPool : deletePool
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
            cursor: undefined,
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
    const dependencies = defaultExtractionRouteDependencies()
    dependencies.authDependencies = authDependencies()
    const app = new Hono<AppBindings>()
    app.route('/api/v1/extractions', createExtractionsRoutes(dependencies))

    const response = await app.fetch(
      bearerRequest(`/api/v1/extractions/${extractionId}`, { method: 'DELETE' }),
      env,
    )

    expect(response.status).toBe(204)
    expect(deletedKeys).toEqual([
      `lextract-documents/user-id/${extractionId}/original.pdf`,
    ])
    expect(deletePool.queries[0]?.text).toContain('UPDATE extractions')
  })

  it('returns default delete 404s and treats already-deleted rows as idempotent', async () => {
    const missingPool = new SequencePool([[]])
    configureExtractionsRepositoryDb(() => missingPool)
    const dependencies = defaultExtractionRouteDependencies()
    dependencies.authDependencies = authDependencies()
    const missingApp = new Hono<AppBindings>()
    missingApp.route('/api/v1/extractions', createExtractionsRoutes(dependencies))
    const env: Env = {
      ...routeTestEnv,
      HYPERDRIVE: {
        connectionString: 'postgres://user:pass@example.com:5432/lextract',
      } as Hyperdrive,
    }

    const missing = await missingApp.fetch(
      bearerRequest('/api/v1/extractions/11111111-1111-4111-8111-111111111111', {
        method: 'DELETE',
      }),
      env,
    )
    expect(missing.status).toBe(404)

    const deletedPool = new SequencePool([
      [
        {
          anonymous_session_id: null,
          confidence_scores: null,
          created_at: '2026-06-10T12:00:00.000Z',
          deleted_at: '2026-06-10T12:01:00.000Z',
          document_filename: 'lease.pdf',
          document_object_key: 'key',
          document_page_count: 1,
          document_s3_key: null,
          error_message: null,
          extracted_data: null,
          id: '11111111-1111-4111-8111-111111111111',
          overall_confidence: null,
          payment_status: 'unpaid',
          property_type: null,
          red_flags: [],
          show_camaudit: false,
          status: 'uploading',
          updated_at: '2026-06-10T12:00:00.000Z',
          user_id: 'user-id',
        },
      ],
    ])
    configureExtractionsRepositoryDb(() => deletedPool)
    const deletedApp = new Hono<AppBindings>()
    const deletedDependencies = defaultExtractionRouteDependencies()
    deletedDependencies.authDependencies = authDependencies()
    deletedApp.route('/api/v1/extractions', createExtractionsRoutes(deletedDependencies))

    const deleted = await deletedApp.fetch(
      bearerRequest('/api/v1/extractions/11111111-1111-4111-8111-111111111111', {
        method: 'DELETE',
      }),
      env,
    )
    expect(deleted.status).toBe(204)
  })
})
