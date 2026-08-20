import { afterEach, describe, expect, it } from 'vitest'

import {
  coerceEditedFieldValue,
  configureExtractionsRepositoryDb,
  editExtractionField,
  extractionOwnerStorageId,
  getExtraction,
  getExtractionById,
  getExtractionEditHistory,
  insertUpload,
  listExtractions,
  loadWorkflowExtractionDocument,
  markExtractionFailed,
  markUploadFailed,
  persistConfidence,
  persistExtractionOutput,
  persistRedFlags,
  transitionExtractionStatus,
  softDeleteExtraction,
} from '../repositories/extractions'
import type { DbPoolLike, DbQueryResult } from '../repositories/db'
import type { Env } from '../types'
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

class EndOnlyPool implements DbPoolLike {
  ended = false

  async end(): Promise<void> {
    this.ended = true
  }
}

const env: Env = {
  ...routeTestEnv,
  HYPERDRIVE: {
    connectionString: 'postgres://user:pass@example.com:5432/lextract',
  } as Hyperdrive,
}

function configurePools(pools: SequencePool[]): void {
  let index = 0
  configureExtractionsRepositoryDb(() => {
    const pool = pools[index]
    index += 1
    if (!pool) {
      throw new Error('No test pool configured for repository call')
    }
    return pool
  })
}

afterEach(() => {
  configureExtractionsRepositoryDb(null)
})

describe('extractions repository', () => {
  it('maps owners to stable storage ids', () => {
    expect(extractionOwnerStorageId({ kind: 'user', userId: 'user-id' })).toBe(
      'user-id',
    )
    expect(
      extractionOwnerStorageId({ kind: 'anonymous', sessionId: 'session-id' }),
    ).toBe('anon/session-id')
  })

  it('returns null for invalid ids before querying', async () => {
    configurePools([])

    await expect(
      getExtraction('not-a-uuid', { kind: 'user', userId: 'user-id' }, env),
    ).resolves.toBeNull()
    await expect(
      softDeleteExtraction('not-a-uuid', { kind: 'user', userId: 'user-id' }, env),
    ).resolves.toBe(false)
  })

  it('loads owned extraction records and maps legacy storage keys', async () => {
    const pool = new SequencePool([
      [
        {
          anonymous_session_id: null,
          confidence_scores: { landlord_legal_name: { score: 0.9, tier: 'high' } },
          created_at: new Date('2026-06-10T12:00:00.000Z'),
          deleted_at: null,
          document_filename: 'lease.pdf',
          document_object_key: null,
          document_page_count: 4,
          document_s3_key: 'legacy/key.pdf',
          error_message: null,
          extracted_data: { landlord_legal_name: { value: 'ACME' } },
          id: '11111111-1111-4111-8111-111111111111',
          overall_confidence: '0.91',
          payment_status: 'paid',
          property_type: 'retail',
          red_flags: null,
          show_camaudit: null,
          status: 'complete',
          updated_at: '2026-06-10T12:05:00.000Z',
          user_id: 'user-id',
        },
      ],
    ])
    configurePools([pool])

    await expect(
      getExtraction(
        '11111111-1111-4111-8111-111111111111',
        { kind: 'user', userId: 'user-id' },
        env,
      ),
    ).resolves.toMatchObject({
      documentObjectKey: 'legacy/key.pdf',
      overallConfidence: 0.91,
      redFlags: [],
      showCamAudit: false,
    })
    expect(pool.queries[0]?.text).toContain('user_id = $2')
    expect(pool.ended).toBe(true)
  })

  it('loads extraction records by id for signed document proxy validation', async () => {
    const pool = new SequencePool([
      [
        {
          anonymous_session_id: null,
          confidence_scores: null,
          created_at: '2026-06-10T12:00:00.000Z',
          deleted_at: null,
          document_filename: 'lease.pdf',
          document_object_key: 'object-key',
          document_page_count: 4,
          document_s3_key: null,
          error_message: null,
          extracted_data: null,
          id: '11111111-1111-4111-8111-111111111111',
          overall_confidence: null,
          payment_status: 'paid',
          property_type: null,
          red_flags: null,
          show_camaudit: null,
          status: 'complete',
          updated_at: '2026-06-10T12:05:00.000Z',
          user_id: 'user-id',
        },
      ],
    ])
    configurePools([pool])

    await expect(
      getExtractionById('11111111-1111-4111-8111-111111111111', env),
    ).resolves.toMatchObject({
      documentObjectKey: 'object-key',
      id: '11111111-1111-4111-8111-111111111111',
      userId: 'user-id',
    })
    expect(pool.queries[0]?.text).not.toContain('user_id =')
    await expect(getExtractionById('not-a-uuid', env)).resolves.toBeNull()
  })

  it('lists anonymous extractions with filters and total count', async () => {
    const pool = new SequencePool([
      [{ count: '1' }],
      [
        {
          created_at: '2026-06-10T12:00:00.000Z',
          document_filename: 'lease.pdf',
          id: 'extraction-id',
          payment_status: 'unpaid',
          property_type: null,
          status: 'uploading',
        },
      ],
    ])
    configurePools([pool])

    await expect(
      listExtractions(
        {
          dateFrom: '2026-06-01',
          dateTo: '2026-06-12',
          limit: 10,
          offset: 5,
          owner: { kind: 'anonymous', sessionId: 'session-id' },
          sort: 'asc',
          status: 'uploading',
        },
        env,
      ),
    ).resolves.toEqual({
      items: [
        {
          createdAt: '2026-06-10T12:00:00.000Z',
          documentFilename: 'lease.pdf',
          id: 'extraction-id',
          paymentStatus: 'unpaid',
          propertyType: null,
          status: 'uploading',
        },
      ],
      limit: 10,
      offset: 5,
      total: 1,
    })
    expect(pool.queries[0]?.text).toContain('anonymous_session_id = $1')
    expect(pool.queries[1]?.text).toContain('ORDER BY created_at ASC')
    expect(pool.queries[1]?.values).toEqual([
      'session-id',
      'uploading',
      '2026-06-01',
      '2026-06-13',
      10,
      5,
    ])
  })

  it('inserts uploads, marks upload failures, and soft deletes rows', async () => {
    const insertPool = new SequencePool([[]])
    const failPool = new SequencePool([[]])
    const deletePool = new SequencePool([[{ id: 'extraction-id' }]])
    configurePools([insertPool, failPool, deletePool])

    await insertUpload(
      {
        documentFilename: 'lease.pdf',
        documentObjectKey: 'object-key',
        documentPageCount: 8,
        extractionId: 'extraction-id',
        owner: { kind: 'anonymous', sessionId: 'session-id' },
      },
      env,
    )
    await markUploadFailed('extraction-id', 'failed to start', env)
    await expect(
      softDeleteExtraction(
        '11111111-1111-4111-8111-111111111111',
        { kind: 'user', userId: 'user-id' },
        env,
      ),
    ).resolves.toBe(true)

    expect(insertPool.queries[0]?.values).toEqual([
      'extraction-id',
      null,
      'session-id',
      'lease.pdf',
      8,
      'object-key',
    ])
    expect(failPool.queries[0]?.text).toContain("status = 'failed'")
    expect(deletePool.queries[0]?.text).toContain('RETURNING id')
  })

  it('rejects repository calls when a configured pool cannot query', async () => {
    const pool = new EndOnlyPool()
    configureExtractionsRepositoryDb(() => pool)

    await expect(
      loadWorkflowExtractionDocument('extraction-id', env),
    ).rejects.toThrow('Database pool does not support query')
    expect(pool.ended).toBe(true)
  })

  it('loads workflow documents and rejects missing or unusable rows', async () => {
    const successPool = new SequencePool([
      [
        {
          anonymous_session_id: null,
          deleted_at: null,
          document_filename: null,
          document_object_key: 'object-key',
          id: 'extraction-id',
          status: 'uploading',
          user_id: 'user-id',
        },
      ],
    ])
    const missingPool = new SequencePool([[]])
    configurePools([successPool, missingPool])

    await expect(
      loadWorkflowExtractionDocument('extraction-id', env),
    ).resolves.toEqual({
      documentFilename: 'upload.pdf',
      documentObjectKey: 'object-key',
      id: 'extraction-id',
      ownerId: 'user-id',
      status: 'uploading',
    })
    await expect(
      loadWorkflowExtractionDocument('missing-id', env),
    ).rejects.toThrow('Extraction not found')
  })

  it('guards workflow status transitions with current status checks', async () => {
    const alreadyPool = new SequencePool([
      [{ deleted_at: null, status: 'extracting' }],
    ])
    const conflictPool = new SequencePool([
      [{ deleted_at: null, status: 'uploading' }],
      [],
    ])
    const missingPool = new SequencePool([[]])
    configurePools([alreadyPool, conflictPool, missingPool])

    await expect(
      transitionExtractionStatus(
        { extractionId: 'extraction-id', targetStatus: 'extracting' },
        env,
      ),
    ).resolves.toBe(false)
    await expect(
      transitionExtractionStatus(
        { extractionId: 'extraction-id', targetStatus: 'extracting' },
        env,
      ),
    ).rejects.toThrow('Status update conflict')
    await expect(
      transitionExtractionStatus(
        { extractionId: 'missing-id', targetStatus: 'extracting' },
        env,
      ),
    ).rejects.toThrow('Extraction not found')
  })

  it('marks active workflow extractions failed with a safe message', async () => {
    const pool = new SequencePool([[{ id: 'extraction-id' }]])
    configurePools([pool])

    await markExtractionFailed(
      { errorMessage: 'safe failure', extractionId: 'extraction-id' },
      env,
    )

    expect(pool.queries[0]?.text).toContain("status = 'failed'")
    expect(pool.queries[0]?.text).toContain('processing_completed_at')
    expect(pool.queries[0]?.text).toContain('RETURNING id')
    expect(pool.queries[0]?.values).toEqual(['extraction-id', 'safe failure'])
  })

  it('serializes workflow JSONB payloads before persistence', async () => {
    const outputPool = new SequencePool([[{ id: 'extraction-id' }]])
    const confidencePool = new SequencePool([[{ id: 'extraction-id' }]])
    const redFlagsPool = new SequencePool([[{ id: 'extraction-id' }]])
    configurePools([outputPool, confidencePool, redFlagsPool])

    await persistExtractionOutput(
      {
        documentPageCount: null,
        extractedData: {
          landlord_legal_name: {
            confidence: 0.9,
            source_text: 'Landlord is ACME',
            value: 'ACME',
          },
        },
        extractionCostCents: 2,
        extractionId: 'extraction-id',
        passRecords: [{ model: 'google/gemini', succeeded: true }],
        rawResponseObjectKeys: ['raw/pass-1.json'],
        totalTokens: 42,
      },
      env,
    )
    await persistConfidence(
      {
        confidenceScores: {
          landlord_legal_name: { score: 0.9, tier: 'high' },
        },
        extractionId: 'extraction-id',
        overallConfidence: 0.9,
      },
      env,
    )
    await persistRedFlags(
      {
        extractionId: 'extraction-id',
        redFlags: [{ name: 'Missing CAM cap', severity: 'high' }],
        showCamAudit: true,
      },
      env,
    )

    const outputValues = outputPool.queries[0]?.values ?? []
    expect(outputPool.queries[0]?.text).toContain(
      'document_page_count = COALESCE($7, document_page_count)',
    )
    expect(outputValues[1]).toBe(
      JSON.stringify({
        landlord_legal_name: {
          confidence: 0.9,
          source_text: 'Landlord is ACME',
          value: 'ACME',
        },
      }),
    )
    expect(outputValues[2]).toBe(JSON.stringify({ total_tokens: 42 }))
    expect(outputValues[3]).toBe(
      JSON.stringify([{ model: 'google/gemini', succeeded: true }]),
    )
    expect(outputValues[4]).toBe(JSON.stringify(['raw/pass-1.json']))
    expect(confidencePool.queries[0]?.values?.[1]).toBe(
      JSON.stringify({
        landlord_legal_name: { score: 0.9, tier: 'high' },
      }),
    )
    expect(redFlagsPool.queries[0]?.values?.[1]).toBe(
      JSON.stringify([{ name: 'Missing CAM cap', severity: 'high' }]),
    )
  })

  it('edits extraction fields transactionally and returns edit history', async () => {
    const editPool = new SequencePool([
      [],
      [
        {
          extracted_data: {
            audit_rights: { confidence: 0.8, source_text: 'Audit rights', value: true },
            landlord_legal_name: { confidence: 0.9, source_text: 'ACME', value: 'ACME' },
          },
        },
      ],
      [{ id: 'extraction-id' }],
      [],
      [],
    ])
    const historyPool = new SequencePool([
      [{ count: '1' }],
      [
        {
          edited_at: '2026-06-12T01:00:00.000Z',
          edited_by: 'user-id',
          edited_value: 'ACME Properties',
          field_name: 'landlord_legal_name',
          id: 'edit-id',
          original_value: 'ACME',
        },
      ],
    ])
    configurePools([editPool, historyPool])

    await expect(
      editExtractionField(
        {
          extractionId: 'extraction-id',
          fieldName: 'landlord_legal_name',
          userId: 'user-id',
          value: 'ACME Properties',
        },
        env,
      ),
    ).resolves.toMatchObject({
      editedValue: 'ACME Properties',
      fieldName: 'landlord_legal_name',
      originalValue: 'ACME',
    })
    expect(editPool.queries.map((call) => call.text.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'SELECT',
      'UPDATE',
      'INSERT',
      'COMMIT',
    ])
    await expect(
      getExtractionEditHistory('extraction-id', 10, 0, env),
    ).resolves.toEqual({
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
    })
  })

  it('validates and coerces field edit values by schema data type', () => {
    expect(coerceEditedFieldValue('audit_rights', true)).toBe(true)
    expect(coerceEditedFieldValue('audit_rights', null)).toBeNull()
    expect(coerceEditedFieldValue('base_rent_annual', '1250')).toBe(1250)
    expect(coerceEditedFieldValue('commencement_date', '2026-06-12')).toBe(
      '2026-06-12',
    )
    expect(coerceEditedFieldValue('guarantor_name', ['Alice', null, 3])).toEqual([
      'Alice',
      null,
      3,
    ])
    expect(coerceEditedFieldValue('landlord_legal_name', 'ACME')).toBe('ACME')
    expect(() => coerceEditedFieldValue('base_rent_annual', true)).toThrow(
      'base_rent_annual must be currency',
    )
    expect(() => coerceEditedFieldValue('base_rent_annual', '$1,250')).toThrow(
      'base_rent_annual must be currency',
    )
    expect(() => coerceEditedFieldValue('base_rent_annual', '0x10')).toThrow(
      'base_rent_annual must be currency',
    )
    expect(() => coerceEditedFieldValue('base_rent_annual', '1e3')).toThrow(
      'base_rent_annual must be currency',
    )
    expect(() => coerceEditedFieldValue('audit_rights', 'yes')).toThrow(
      'audit_rights must be boolean',
    )
    expect(() => coerceEditedFieldValue('guarantor_name', { name: 'Alice' })).toThrow(
      'guarantor_name must be array',
    )
    expect(() => coerceEditedFieldValue('guarantor_name', 'Alice, Bob')).toThrow(
      'guarantor_name must be array',
    )
    expect(() => coerceEditedFieldValue('commencement_date', 'not-a-date')).toThrow(
      'commencement_date must be ISO 8601 date',
    )
    expect(() => coerceEditedFieldValue('commencement_date', 'June 12, 2026')).toThrow(
      'commencement_date must be ISO 8601 date',
    )
    expect(() => coerceEditedFieldValue('commencement_date', '2026-02-31')).toThrow(
      'commencement_date must be ISO 8601 date',
    )
    expect(() =>
      coerceEditedFieldValue('commencement_date', '2026-06-12T12:00:00+99:99'),
    ).toThrow('commencement_date must be ISO 8601 date')
    expect(() => coerceEditedFieldValue('landlord_legal_name', 42)).toThrow(
      'landlord_legal_name must be string',
    )
  })

  it('coerces valid field edit values before persistence', async () => {
    const editPool = new SequencePool([
      [],
      [
        {
          extracted_data: {
            pro_rata_share: { confidence: 0.8, source_text: '12.5%', value: 0.125 },
          },
        },
      ],
      [{ id: 'extraction-id' }],
      [],
      [],
    ])
    configurePools([editPool])

    await expect(
      editExtractionField(
        {
          extractionId: 'extraction-id',
          fieldName: 'pro_rata_share',
          userId: 'user-id',
          value: '0.15',
        },
        env,
      ),
    ).resolves.toMatchObject({
      editedValue: 0.15,
      fieldName: 'pro_rata_share',
      originalValue: 0.125,
    })
    expect(editPool.queries[2]?.values?.[1]).toMatchObject({
      pro_rata_share: { value: 0.15 },
    })
    expect(editPool.queries[3]?.values).toEqual([
      'extraction-id',
      'pro_rata_share',
      0.125,
      0.15,
      'user-id',
    ])
  })

  it('rolls back field edits for unknown fields or stale rows', async () => {
    configurePools([])
    await expect(
      editExtractionField(
        {
          extractionId: 'extraction-id',
          fieldName: 'not_a_real_field',
          userId: 'user-id',
          value: 'x',
        },
        env,
      ),
    ).rejects.toThrow('Unknown field')

    const pool = new SequencePool([[], []])
    configurePools([pool])
    await expect(
      editExtractionField(
        {
          extractionId: 'extraction-id',
          fieldName: 'landlord_legal_name',
          userId: 'user-id',
          value: 'x',
        },
        env,
      ),
    ).rejects.toThrow('Extraction not found')
    expect(pool.queries.at(-1)?.text).toBe('ROLLBACK')
  })

  it('rolls back field edits when the locked row is not updated', async () => {
    const pool = new SequencePool([
      [],
      [
        {
          extracted_data: {
            landlord_legal_name: { confidence: 0.9, source_text: 'ACME', value: 'ACME' },
          },
        },
      ],
      [],
    ])
    configurePools([pool])

    await expect(
      editExtractionField(
        {
          extractionId: 'extraction-id',
          fieldName: 'landlord_legal_name',
          userId: 'user-id',
          value: 'ACME Properties',
        },
        env,
      ),
    ).rejects.toThrow('Field edit persistence conflict')
    expect(pool.queries.map((call) => call.text.trim().split(/\s+/)[0])).toEqual([
      'BEGIN',
      'SELECT',
      'UPDATE',
      'ROLLBACK',
    ])
  })

  it('rejects schema-invalid field edit values before opening a transaction', async () => {
    configurePools([])

    await expect(
      editExtractionField(
        {
          extractionId: 'extraction-id',
          fieldName: 'audit_rights',
          userId: 'user-id',
          value: { enabled: true },
        },
        env,
      ),
    ).rejects.toThrow('audit_rights must be boolean')
  })

  it('rejects stale workflow persistence writes', async () => {
    const outputPool = new SequencePool([[]])
    const confidencePool = new SequencePool([[]])
    const redFlagsPool = new SequencePool([[]])
    const failedPool = new SequencePool([[]])
    configurePools([outputPool, confidencePool, redFlagsPool, failedPool])

    const module = await import('../repositories/extractions')
    await expect(
      module.persistExtractionOutput(
        {
          documentPageCount: null,
          extractedData: {},
          extractionCostCents: 1,
          extractionId: 'extraction-id',
          passRecords: [],
          rawResponseObjectKeys: [],
          totalTokens: 10,
        },
        env,
      ),
    ).rejects.toThrow('Extraction output persistence conflict')
    await expect(
      module.persistConfidence(
        {
          confidenceScores: {},
          extractionId: 'extraction-id',
          overallConfidence: 0.9,
        },
        env,
      ),
    ).rejects.toThrow('Confidence persistence conflict')
    await expect(
      module.persistRedFlags(
        {
          extractionId: 'extraction-id',
          redFlags: [],
          showCamAudit: false,
        },
        env,
      ),
    ).rejects.toThrow('Red flag persistence conflict')
    await expect(
      module.markExtractionFailed(
        {
          errorMessage: 'safe failure',
          extractionId: 'extraction-id',
        },
        env,
      ),
    ).rejects.toThrow('Failure status persistence conflict')
  })
})
