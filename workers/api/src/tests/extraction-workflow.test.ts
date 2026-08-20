import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ExtractionWorkflow,
  defaultExtractionWorkflowDependencies,
  runExtractionWorkflow,
} from '../workflows/extraction-workflow'
import type {
  ExtractionWorkflowDependencies,
  ExtractionWorkflowStep,
} from '../workflows/extraction-workflow'
import type { Env } from '../types'
import {
  configureExtractionsRepositoryDb,
} from '../repositories/extractions'
import type { DbPoolLike, DbQueryResult } from '../repositories/db'
import { routeTestEnv } from './route-test-helpers'

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

class RecordingStep implements ExtractionWorkflowStep {
  readonly names: string[] = []

  async do<T>(name: string, callback: () => Promise<T>): Promise<T> {
    this.names.push(name)
    return callback()
  }
}

class SerializingStep extends RecordingStep {
  override async do<T>(name: string, callback: () => Promise<T>): Promise<T> {
    const result = await super.do(name, callback)
    if (result === undefined) {
      return result
    }
    return JSON.parse(JSON.stringify(result)) as T
  }
}

const env: Env = {
  ...routeTestEnv,
}

describe('runExtractionWorkflow', () => {
  afterEach(() => {
    configureExtractionsRepositoryDb(null)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('runs ordered steps and writes uploading -> extracting -> scoring -> complete', async () => {
    const transitions: string[] = []
    const persisted: string[] = []
    const step = new RecordingStep()
    const dependencies: ExtractionWorkflowDependencies = {
      completeExtraction: (input) => {
        transitions.push(`complete:${input.extractionId}`)
        return Promise.resolve(true)
      },
      detectRedFlags: () =>
        Promise.resolve({
          redFlags: [
            {
              description: 'No CAM cap found',
              name: 'Missing CAM cap',
              ruleId: 'RF-002',
              severity: 'high',
              triggeredValue: 'missing',
            },
          ],
          showCamAudit: true,
        }),
      loadExtractionAndPdf: (input) => {
        expect(input.extractionId).toBe('extraction-id')
        transitions.push('extracting')
        return Promise.resolve({
          documentFilename: 'lease.pdf',
          ownerId: 'user-id',
          pdfBytes: new ArrayBuffer(4),
        })
      },
      markFailed: () => Promise.reject(new Error('unused')),
      markScoring: (input) => {
        transitions.push(`scoring:${input.extractionId}`)
        return Promise.resolve(true)
      },
      persistConfidence: (input) => {
        persisted.push(`confidence:${Object.keys(input.confidenceScores).length}`)
        return Promise.resolve()
      },
      persistExtractionResult: (input) => {
        persisted.push(`fields:${Object.keys(input.extractedData).length}`)
        return Promise.resolve()
      },
      persistRedFlags: (input) => {
        persisted.push(`red-flags:${input.redFlags.length}:${input.showCamAudit}`)
        return Promise.resolve()
      },
      runExtraction: () =>
        Promise.resolve({
          extraction: {
            fields: {
              landlord_legal_name: {
                confidence: 0.9,
                sourceText: 'Landlord is ACME',
                value: 'ACME LLC',
              },
            },
          },
          extractionCostCents: 4,
          costCeilingHit: false,
          passRecords: [],
          rawResponses: [],
          totalTokens: 100,
        }),
      scoreConfidence: () =>
        Promise.resolve({
          confidenceScores: {
            landlord_legal_name: {
              llmConfidence: 0.9,
              score: 0.9,
              tier: 'high',
            },
          },
          overallConfidence: 0.9,
        }),
    }

    await expect(
      runExtractionWorkflow(
        { extractionId: 'extraction-id' },
        step,
        env,
        dependencies,
      ),
    ).resolves.toEqual({ extractionId: 'extraction-id', status: 'complete' })

    expect(step.names).toEqual([
      'load PDF and run OpenRouter extraction',
      'persist extraction result',
      'mark extraction scoring',
      'score confidence',
      'persist confidence',
      'detect red flags',
      'persist red flags',
      'mark complete and enqueue emails',
    ])
    expect(transitions).toEqual([
      'extracting',
      'scoring:extraction-id',
      'complete:extraction-id',
    ])
    expect(persisted).toEqual(['fields:1', 'confidence:1', 'red-flags:1:true'])
  })

  it('marks failed with a safe message when a workflow step throws', async () => {
    const failures: string[] = []
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const step = new RecordingStep()
    const dependencies: ExtractionWorkflowDependencies = {
      completeExtraction: () => Promise.reject(new Error('unused')),
      detectRedFlags: () => Promise.reject(new Error('unused')),
      loadExtractionAndPdf: () => Promise.resolve({
        documentFilename: 'lease.pdf',
        ownerId: 'user-id',
        pdfBytes: new ArrayBuffer(4),
      }),
      markFailed: (input) => {
        failures.push(input.errorMessage)
        return Promise.resolve()
      },
      markScoring: () => Promise.reject(new Error('unused')),
      persistConfidence: () => Promise.reject(new Error('unused')),
      persistExtractionResult: () => Promise.reject(new Error('unused')),
      persistRedFlags: () => Promise.reject(new Error('unused')),
      runExtraction: () => Promise.reject(new Error('provider leaked stack')),
      scoreConfidence: () => Promise.reject(new Error('unused')),
    }

    await expect(
      runExtractionWorkflow(
        { extractionId: 'extraction-id' },
        step,
        env,
        dependencies,
      ),
    ).rejects.toThrow('Extraction workflow failed')

    expect(failures).toEqual([
      'We were unable to extract data from your document. Please try uploading again.',
    ])
    expect(consoleError).toHaveBeenCalledWith('Extraction workflow failed', {
      errorCode: 'dependency_failed',
      errorMessage: 'Workflow dependency failed',
      errorName: 'Error',
      extractionId: 'extraction-id',
    })
  })

  it('redacts and bounds internal workflow failure messages before logging', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sensitiveMessage =
      'OpenRouter request failed Authorization: Bearer sk-live-secret\n' +
      'data:application/pdf;base64,JVBERi0xLjcg'.repeat(20) +
      ' {"raw_response":"tenant source text"}'
    const dependencies: ExtractionWorkflowDependencies = {
      completeExtraction: () => Promise.reject(new Error('unused')),
      detectRedFlags: () => Promise.reject(new Error('unused')),
      loadExtractionAndPdf: () =>
        Promise.resolve({
          documentFilename: 'lease.pdf',
          ownerId: 'user-id',
          pdfBytes: new ArrayBuffer(4),
        }),
      markFailed: () => Promise.resolve(),
      markScoring: () => Promise.reject(new Error('unused')),
      persistConfidence: () => Promise.reject(new Error('unused')),
      persistExtractionResult: () => Promise.reject(new Error('unused')),
      persistRedFlags: () => Promise.reject(new Error('unused')),
      runExtraction: () => Promise.reject(new Error(sensitiveMessage)),
      scoreConfidence: () => Promise.reject(new Error('unused')),
    }

    await expect(
      runExtractionWorkflow(
        { extractionId: 'extraction-id' },
        new RecordingStep(),
        env,
        dependencies,
      ),
    ).rejects.toThrow('Extraction workflow failed')

    expect(consoleError).toHaveBeenCalledOnce()
    const payload = consoleError.mock.calls[0]?.[1]
    expect(payload).toMatchObject({
      errorCode: 'dependency_failed',
      errorName: 'Error',
      extractionId: 'extraction-id',
    })
    const loggedMessage = (payload as { errorMessage: string }).errorMessage
    expect(loggedMessage).toContain('[redacted-bearer]')
    expect(loggedMessage).toContain('[redacted-pdf-data-url]')
    expect(loggedMessage).not.toContain('sk-live-secret')
    expect(loggedMessage).not.toContain('JVBERi0x')
    expect(loggedMessage).not.toContain('tenant source text')
    expect(loggedMessage).not.toContain('raw_response')
    expect(loggedMessage).not.toContain('\n')
    expect(loggedMessage.length).toBeLessThanOrEqual(240)
  })

  it('does not log mutable unsafe error names', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const unsafeError = new Error('provider failed')
    unsafeError.name = 'ProviderError {"raw_response":"secret"} sk_live_secret'
    const dependencies: ExtractionWorkflowDependencies = {
      completeExtraction: () => Promise.reject(new Error('unused')),
      detectRedFlags: () => Promise.reject(new Error('unused')),
      loadExtractionAndPdf: () =>
        Promise.resolve({
          documentFilename: 'lease.pdf',
          ownerId: 'user-id',
          pdfBytes: new ArrayBuffer(4),
        }),
      markFailed: () => Promise.resolve(),
      markScoring: () => Promise.reject(new Error('unused')),
      persistConfidence: () => Promise.reject(new Error('unused')),
      persistExtractionResult: () => Promise.reject(new Error('unused')),
      persistRedFlags: () => Promise.reject(new Error('unused')),
      runExtraction: () => Promise.reject(unsafeError),
      scoreConfidence: () => Promise.reject(new Error('unused')),
    }

    await expect(
      runExtractionWorkflow(
        { extractionId: 'extraction-id' },
        new RecordingStep(),
        env,
        dependencies,
      ),
    ).rejects.toThrow('Extraction workflow failed')

    expect(consoleError).toHaveBeenCalledOnce()
    expect(consoleError.mock.calls[0]?.[1]).toMatchObject({
      errorCode: 'dependency_failed',
      errorName: 'Error',
      extractionId: 'extraction-id',
    })
  })

  it('logs safe error codes for known extraction failure classes', async () => {
    const cases = [
      {
        code: 'openrouter_status_413',
        message: 'OpenRouter request failed with status 413',
      },
      {
        code: 'openrouter_no_content',
        loggedMessage:
          'OpenRouter response did not include message content choices=1 finish_reason=length content_type=undefined',
        message:
          'OpenRouter response did not include message content (choices=1; finish_reason=length; content_type=undefined)',
      },
      {
        code: 'openrouter_no_content',
        loggedMessage:
          'OpenRouter response did not include message content choices=non_array finish_reason=undefined content_type=undefined',
        message:
          'OpenRouter response did not include message content (choices=non_array; finish_reason=undefined; content_type=undefined)',
      },
      {
        code: 'openrouter_no_content',
        loggedMessage:
          'OpenRouter response did not include message content body_type=object has_error=true choices=non_array finish_reason=undefined content_type=undefined',
        message:
          'OpenRouter response did not include message content (body_type=object; has_error=true; choices=non_array; finish_reason=undefined; content_type=undefined)',
      },
      {
        code: 'openrouter_no_content',
        loggedMessage:
          'OpenRouter response did not include message content body_type=object has_error=true error_status=413 error_code=context_length_exceeded choices=non_array finish_reason=undefined content_type=undefined',
        message:
          'OpenRouter response did not include message content (body_type=object; has_error=true; error_status=413; error_code=context_length_exceeded; choices=non_array; finish_reason=undefined; content_type=undefined)',
      },
      {
        code: 'openrouter_no_content',
        loggedMessage:
          'OpenRouter response did not include message content body_type=object has_error=true error_status=undefined error_code=413 choices=non_array finish_reason=undefined content_type=undefined',
        message:
          'OpenRouter response did not include message content (body_type=object; has_error=true; error_status=undefined; error_code=413; choices=non_array; finish_reason=undefined; content_type=undefined)',
      },
      {
        code: 'openrouter_no_content',
        loggedMessage: 'Workflow dependency failed',
        message:
          'OpenRouter response did not include message content (body_type=object; has_error=true; error_status=413; error_code=tenant_source_text; choices=non_array; finish_reason=undefined; content_type=undefined)',
      },
      {
        code: 'extraction_response_parse_failed',
        message: 'Model response did not contain valid JSON: Unexpected token',
      },
      {
        code: 'extraction_response_parse_failed',
        message: 'Model response is not a JSON object',
      },
      {
        code: 'dependency_timeout',
        message: 'The operation timed out while waiting for provider response',
      },
    ] as const

    for (const testCase of cases) {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const dependencies: ExtractionWorkflowDependencies = {
        completeExtraction: () => Promise.reject(new Error('unused')),
        detectRedFlags: () => Promise.reject(new Error('unused')),
        loadExtractionAndPdf: () =>
          Promise.resolve({
            documentFilename: 'lease.pdf',
            ownerId: 'user-id',
            pdfBytes: new ArrayBuffer(4),
          }),
        markFailed: () => Promise.resolve(),
        markScoring: () => Promise.reject(new Error('unused')),
        persistConfidence: () => Promise.reject(new Error('unused')),
        persistExtractionResult: () => Promise.reject(new Error('unused')),
        persistRedFlags: () => Promise.reject(new Error('unused')),
        runExtraction: () => Promise.reject(new Error(testCase.message)),
        scoreConfidence: () => Promise.reject(new Error('unused')),
      }

      await expect(
        runExtractionWorkflow(
          { extractionId: 'extraction-id' },
          new RecordingStep(),
          env,
          dependencies,
        ),
      ).rejects.toThrow('Extraction workflow failed')

      expect(consoleError.mock.calls[0]?.[1]).toMatchObject({
        errorCode: testCase.code,
        extractionId: 'extraction-id',
      })
      if ('loggedMessage' in testCase) {
        expect(consoleError.mock.calls[0]?.[1]).toMatchObject({
          errorMessage: testCase.loggedMessage,
        })
      }
      consoleError.mockRestore()
    }
  })

  it('does not pass PDF bytes across serialized workflow step outputs', async () => {
    const step = new SerializingStep()
    const dependencies: ExtractionWorkflowDependencies = {
      completeExtraction: () => Promise.resolve(true),
      detectRedFlags: () => Promise.resolve({ redFlags: [], showCamAudit: false }),
      loadExtractionAndPdf: () =>
        Promise.resolve({
          documentFilename: 'lease.pdf',
          ownerId: 'user-id',
          pdfBytes: new ArrayBuffer(4),
        }),
      markFailed: () => Promise.resolve(),
      markScoring: () => Promise.resolve(true),
      persistConfidence: () => Promise.resolve(),
      persistExtractionResult: () => Promise.resolve(),
      persistRedFlags: () => Promise.resolve(),
      runExtraction: (input) => {
        if (!(input.pdfBytes instanceof ArrayBuffer)) {
          throw new Error('PDF bytes crossed a serialized step boundary')
        }
        return Promise.resolve({
          extraction: {
            fields: {
              landlord_legal_name: {
                confidence: 0.9,
                sourceText: 'Landlord is ACME',
                value: 'ACME LLC',
              },
            },
          },
          extractionCostCents: 4,
          costCeilingHit: false,
          passRecords: [],
          rawResponses: [],
          totalTokens: 100,
        })
      },
      scoreConfidence: () =>
        Promise.resolve({
          confidenceScores: {},
          overallConfidence: 0.9,
        }),
    }

    await expect(
      runExtractionWorkflow(
        { extractionId: 'extraction-id' },
        step,
        env,
        dependencies,
      ),
    ).resolves.toEqual({ extractionId: 'extraction-id', status: 'complete' })
  })

  it('runs default dependencies through DB, R2, OpenRouter, scoring, red flags, and completion', async () => {
    const pools = [
      new SequencePool([
        [
          {
            deleted_at: null,
            document_filename: 'lease.pdf',
            document_object_key: 'object-key',
            id: 'extraction-id',
            anonymous_session_id: null,
            status: 'uploading',
            user_id: 'user-id',
          },
        ],
      ]),
      new SequencePool([[{ status: 'uploading', deleted_at: null }], [{ id: 'extraction-id' }]]),
      new SequencePool([[{ id: 'extraction-id' }]]),
      new SequencePool([[{ status: 'extracting', deleted_at: null }], [{ id: 'extraction-id' }]]),
      new SequencePool([[{ id: 'extraction-id' }]]),
      new SequencePool([[{ id: 'extraction-id' }]]),
      new SequencePool([[{ status: 'scoring', deleted_at: null }], [{ id: 'extraction-id' }]]),
    ]
    let poolIndex = 0
    configureExtractionsRepositoryDb(() => {
      const pool = pools[poolIndex]
      poolIndex += 1
      if (!pool) {
        throw new Error('No test pool configured')
      }
      return pool
    })
    const fetchCalls: string[] = []
    vi.stubGlobal('fetch', (request: Request) => {
      fetchCalls.push(String(request.url))
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    fields: {
                      audit_rights: {
                        confidence: 0.9,
                        source_text: 'Tenant has audit rights',
                        value: true,
                      },
                      landlord_legal_name: {
                        confidence: 0.9,
                        source_text: 'Landlord is ACME',
                        value: 'ACME LLC',
                      },
                    },
                  }),
                },
              },
            ],
            usage: {
              completion_tokens: 20,
              cost: 0.01,
              prompt_tokens: 10,
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      )
    })
    const workflowEnv: Env = {
      ...routeTestEnv,
      DOCUMENTS_BUCKET: {
        delete: () => Promise.resolve(),
        get: () =>
          Promise.resolve({
            arrayBuffer: () => Promise.resolve(new TextEncoder().encode('%PDF').buffer),
          }),
        list: () =>
          Promise.resolve({ cursor: undefined, objects: [], truncated: false }),
        put: () => Promise.resolve(null),
      } as unknown as R2Bucket,
      HYPERDRIVE: {
        connectionString: 'postgres://user:pass@example.com:5432/lextract',
      } as Hyperdrive,
      OPENROUTER_API_KEY: 'sk-test',
      PASS1_MODEL: 'pass1-model',
      PASS2_MODEL: 'pass2-model',
      PASS3_MODEL: 'pass3-model',
    }
    const step = new RecordingStep()

    await expect(
      runExtractionWorkflow(
        { extractionId: 'extraction-id' },
        step,
        workflowEnv,
        defaultExtractionWorkflowDependencies(),
      ),
    ).resolves.toEqual({ extractionId: 'extraction-id', status: 'complete' })

    expect(fetchCalls).toHaveLength(2)
    expect(pools[2]?.queries[0]?.text).toContain('extracted_data')
    expect(pools[4]?.queries[0]?.text).toContain('confidence_scores')
    expect(pools[5]?.queries[0]?.text).toContain('red_flags')
    expect(pools[6]?.queries[1]?.text).toContain('processing_completed_at')
  })

  it('enqueues ID-only email messages after the default completion transition', async () => {
    const pool = new SequencePool([
      [{ deleted_at: null, status: 'scoring' }],
      [{ id: 'extraction-id' }],
    ])
    const sent: { body: unknown; options?: QueueSendOptions }[] = []
    configureExtractionsRepositoryDb(() => pool)
    const queue = {
      send(body: unknown, options?: QueueSendOptions) {
        sent.push(options === undefined ? { body } : { body, options })
        return Promise.resolve({
          metadata: {
            metrics: {
              backlogBytes: 0,
              backlogCount: 0,
            },
          },
        })
      },
    }
    const dependencies = defaultExtractionWorkflowDependencies()

    await expect(
      dependencies.completeExtraction(
        { extractionId: 'extraction-id' },
        {
          ...routeTestEnv,
          // Safe test double: this test only exercises Queue.send.
          EMAIL_QUEUE: queue as unknown as Queue,
        },
      ),
    ).resolves.toBe(true)

    expect(sent).toEqual([
      { body: { extractionId: 'extraction-id', kind: 'extraction-complete' } },
      {
        body: { extractionId: 'extraction-id', kind: 'cam-flags' },
        options: { delaySeconds: 1800 },
      },
      { body: { extractionId: 'extraction-id', kind: 'anonymous-notify' } },
    ])
  })

  it('keeps completion successful when email queue dispatch fails', async () => {
    const pool = new SequencePool([
      [{ deleted_at: null, status: 'scoring' }],
      [{ id: 'extraction-id' }],
    ])
    configureExtractionsRepositoryDb(() => pool)
    const queue = {
      send() {
        return Promise.reject(new Error('queue unavailable'))
      },
    }
    const dependencies = defaultExtractionWorkflowDependencies()

    await expect(
      dependencies.completeExtraction(
        { extractionId: 'extraction-id' },
        {
          ...routeTestEnv,
          // Safe test double: this test only exercises Queue.send failure handling.
          EMAIL_QUEUE: queue as unknown as Queue,
        },
      ),
    ).resolves.toBe(true)

    expect(pool.queries[1]?.text).toContain('processing_completed_at')
  })

  it('stores raw model responses in R2 and persists only object keys', async () => {
    const persistedRawKeys: unknown[] = []
    const putCalls: { key: string; value: string; contentType?: string }[] = []
    const step = new RecordingStep()
    const dependencies: ExtractionWorkflowDependencies = {
      completeExtraction: () => Promise.resolve(true),
      detectRedFlags: () => Promise.resolve({ redFlags: [], showCamAudit: false }),
      loadExtractionAndPdf: () =>
        Promise.resolve({
          documentFilename: 'lease.pdf',
          ownerId: 'user-id',
          pdfBytes: new ArrayBuffer(4),
        }),
      markFailed: () => Promise.reject(new Error('unused')),
      markScoring: () => Promise.resolve(true),
      persistConfidence: () => Promise.resolve(),
      persistExtractionResult: (input) => {
        persistedRawKeys.push(...input.rawResponseObjectKeys)
        return Promise.resolve()
      },
      persistRedFlags: () => Promise.resolve(),
      runExtraction: () =>
        Promise.resolve({
          costCeilingHit: false,
          extraction: {
            fields: {
              landlord_legal_name: {
                confidence: 0.9,
                sourceText: 'Landlord is ACME',
                value: 'ACME LLC',
              },
            },
          },
          extractionCostCents: 4,
          passRecords: [
            {
              costCents: 0,
              errorMessage: 'primary timed out',
              inputTokens: 0,
              model: 'provider/failed:v1',
              outputTokens: 0,
              passKind: 'pass1',
              passNumber: 1,
              succeeded: false,
            },
            {
              costCents: 4,
              inputTokens: 10,
              model: 'provider/model:v1',
              outputTokens: 20,
              passKind: 'pass1',
              passNumber: 2,
              succeeded: true,
            },
          ],
          rawResponses: ['{"raw":true}'],
          totalTokens: 30,
        }),
      scoreConfidence: () =>
        Promise.resolve({
          confidenceScores: {},
          overallConfidence: 0.9,
        }),
    }
    const workflowEnv: Env = {
      ...env,
      DOCUMENTS_BUCKET: {
        delete: () => Promise.resolve(),
        get: () => Promise.resolve(null),
        list: () =>
          Promise.resolve({ cursor: undefined, objects: [], truncated: false }),
        put: (
          key: string,
          value: Uint8Array,
          options?: { httpMetadata?: { contentType?: string } },
        ) => {
          if (!(value instanceof Uint8Array)) {
            throw new Error('Expected raw response payload to be encoded bytes')
          }
          const contentType =
            options?.httpMetadata instanceof Headers
              ? undefined
              : options?.httpMetadata?.contentType
          const call = {
            key,
            value: new TextDecoder().decode(value),
          }
          putCalls.push(
            contentType === undefined ? call : { ...call, contentType },
          )
          return Promise.resolve(null)
        },
      } as unknown as R2Bucket,
    }

    await runExtractionWorkflow(
      { extractionId: 'extraction-id' },
      step,
      workflowEnv,
      dependencies,
    )

    expect(putCalls).toEqual([
      {
        contentType: 'application/json',
        key: 'lextract-documents/user-id/extraction-id/raw/pass1-provider_model_v1.json',
        value: '{"raw":true}',
      },
    ])
    expect(persistedRawKeys).toEqual([
      'lextract-documents/user-id/extraction-id/raw/pass1-provider_model_v1.json',
    ])
  })

  it('marks failed when default dependencies cannot find the stored PDF', async () => {
    const pools = [
      new SequencePool([
        [
          {
            anonymous_session_id: null,
            deleted_at: null,
            document_filename: 'lease.pdf',
            document_object_key: 'object-key',
            id: 'extraction-id',
            status: 'uploading',
            user_id: 'user-id',
          },
        ],
      ]),
      new SequencePool([[{ status: 'uploading', deleted_at: null }], [{ id: 'extraction-id' }]]),
      new SequencePool([[{ id: 'extraction-id' }]]),
    ]
    let poolIndex = 0
    configureExtractionsRepositoryDb(() => {
      const pool = pools[poolIndex]
      poolIndex += 1
      if (!pool) {
        throw new Error('No test pool configured')
      }
      return pool
    })
    const workflowEnv: Env = {
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

    await expect(
      runExtractionWorkflow(
        { extractionId: 'extraction-id' },
        new RecordingStep(),
        workflowEnv,
        defaultExtractionWorkflowDependencies(),
      ),
    ).rejects.toThrow('Extraction workflow failed')

    expect(pools[2]?.queries[0]?.text).toContain("status = 'failed'")
  })

  it('marks failed when OpenRouter is not configured', async () => {
    const pools = [
      new SequencePool([
        [
          {
            anonymous_session_id: null,
            deleted_at: null,
            document_filename: 'lease.pdf',
            document_object_key: 'object-key',
            id: 'extraction-id',
            status: 'uploading',
            user_id: 'user-id',
          },
        ],
      ]),
      new SequencePool([[{ status: 'uploading', deleted_at: null }], [{ id: 'extraction-id' }]]),
      new SequencePool([[{ id: 'extraction-id' }]]),
    ]
    let poolIndex = 0
    configureExtractionsRepositoryDb(() => {
      const pool = pools[poolIndex]
      poolIndex += 1
      if (!pool) {
        throw new Error('No test pool configured')
      }
      return pool
    })
    const workflowEnv: Env = {
      ...routeTestEnv,
      DOCUMENTS_BUCKET: {
        delete: () => Promise.resolve(),
        get: () =>
          Promise.resolve({
            arrayBuffer: () => Promise.resolve(new TextEncoder().encode('%PDF').buffer),
          }),
        list: () =>
          Promise.resolve({ cursor: undefined, objects: [], truncated: false }),
        put: () => Promise.resolve(null),
      } as unknown as R2Bucket,
      HYPERDRIVE: {
        connectionString: 'postgres://user:pass@example.com:5432/lextract',
      } as Hyperdrive,
    }

    await expect(
      runExtractionWorkflow(
        { extractionId: 'extraction-id' },
        new RecordingStep(),
        workflowEnv,
        defaultExtractionWorkflowDependencies(),
      ),
    ).rejects.toThrow('Extraction workflow failed')

    expect(pools[2]?.queries[0]?.values).toEqual([
      'extraction-id',
      'We were unable to extract data from your document. Please try uploading again.',
    ])
  })

  it('delegates the platform WorkflowEntrypoint run method', async () => {
    const workflow = Object.create(ExtractionWorkflow.prototype) as ExtractionWorkflow & {
      env: Env
    }
    workflow.env = env
    const step = new RecordingStep()
    // The wrapper only calls step.do; this test double intentionally omits
    // WorkflowStep's timer/event helpers.
    const platformStep = step as unknown as Parameters<ExtractionWorkflow['run']>[1]
    const dependencies = defaultExtractionWorkflowDependencies()
    const originalLoad = dependencies.loadExtractionAndPdf

    await expect(
      workflow.run(
        {
          instanceId: 'instance-id',
          payload: { extractionId: 'extraction-id' },
          timestamp: new Date('2026-06-12T00:00:00.000Z'),
          workflowName: 'lextract-extraction-workflow',
        },
        platformStep,
      ),
    ).rejects.toThrow()
    expect(originalLoad).toBeTypeOf('function')
  })
})
