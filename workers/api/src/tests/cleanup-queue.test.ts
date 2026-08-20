import { describe, expect, it } from 'vitest'

import { cleanupUserObjects, handleCleanupBatch } from '../queues/cleanup-consumer'
import type { DbPoolLike, DbQueryResult } from '../repositories/db'
import type { StorageBucket, StorageListOptions, StorageListResult } from '../services/storage'
import type { Env } from '../types'
import { routeTestEnv } from './route-test-helpers'

class SequencePool implements DbPoolLike {
  readonly queries: { text: string; values?: readonly unknown[] }[] = []

  constructor(private readonly results: readonly (readonly unknown[])[]) {}

  async end(): Promise<void> {}

  async query<Row>(
    text: string,
    values?: readonly unknown[],
  ): Promise<DbQueryResult<Row>> {
    this.queries.push(values === undefined ? { text } : { text, values })
    const next = this.results[this.queries.length - 1] ?? []
    return { rows: next as Row[] }
  }
}

class MemoryBucket implements StorageBucket {
  readonly deleted: string[] = []
  readonly listed: StorageListOptions[] = []

  constructor(private readonly failingKeys: readonly string[] = []) {}

  async delete(key: string): Promise<void> {
    if (this.failingKeys.includes(key)) {
      throw new Error(`delete failed for ${key}`)
    }
    this.deleted.push(key)
  }

  async get(): Promise<unknown> {
    return null
  }

  async list(options: StorageListOptions): Promise<StorageListResult> {
    this.listed.push(options)
    return {
      objects: [
        { key: `${options.prefix}commercial-v1.docx` },
        { key: `${options.prefix}commercial-v2.xlsx` },
      ],
      truncated: false,
    }
  }

  async put(): Promise<unknown> {
    return null
  }
}

class EndOnlyPool implements DbPoolLike {
  ended = false

  async end(): Promise<void> {
    this.ended = true
  }
}

function message(body: unknown): Message {
  return {
    ack() {},
    attempts: 1,
    body,
    id: crypto.randomUUID(),
    retry() {},
    timestamp: new Date('2026-06-12T00:00:00.000Z'),
  }
}

function batch(messages: readonly Message[]): MessageBatch {
  return {
    ackAll() {},
    messages,
    metadata: {
      metrics: {
        backlogBytes: 0,
        backlogCount: 0,
      },
    },
    queue: 'lextract-cleanup',
    retryAll() {},
  }
}

describe('cleanup queue consumer', () => {
  it('deletes all document, raw response, and export prefix objects for a user', async () => {
    const pool = new SequencePool([
      [
        {
          document_object_key: 'users/user-id/extractions/ext-1/document.pdf',
          document_s3_key: 'legacy/original.pdf',
          id: 'ext-1',
          raw_extraction_object_keys: ['raw/pass-1.json', 'raw/pass-2.json'],
        },
      ],
    ])
    const bucket = new MemoryBucket()
    const env: Env = {
      ...routeTestEnv,
      // Safe test double: cleanup only uses the StorageBucket subset implemented above.
      DOCUMENTS_BUCKET: bucket as unknown as R2Bucket,
    }

    await handleCleanupBatch(
      batch([message({ kind: 'user', userId: 'user-id' })]),
      env,
      { createDb: () => pool },
    )

    expect(pool.queries[0]?.values).toEqual(['user-id'])
    expect(bucket.listed.map((item) => item.prefix)).toEqual([
      'lextract-documents/user-id/ext-1/exports/',
    ])
    expect(bucket.deleted).toEqual([
      'users/user-id/extractions/ext-1/document.pdf',
      'legacy/original.pdf',
      'raw/pass-1.json',
      'raw/pass-2.json',
      'lextract-documents/user-id/ext-1/exports/commercial-v1.docx',
      'lextract-documents/user-id/ext-1/exports/commercial-v2.xlsx',
    ])
  })

  it('continues cleanup after object delete failures and reports failures', async () => {
    const pool = new SequencePool([
      [
        {
          document_object_key: 'documents/fail.pdf',
          document_s3_key: 'documents/succeed.pdf',
          id: 'ext-1',
          raw_extraction_object_keys: ['raw/succeed.json'],
        },
      ],
    ])
    const bucket = new MemoryBucket([
      'documents/fail.pdf',
      'lextract-documents/user-id/ext-1/exports/commercial-v1.docx',
    ])
    const env: Env = {
      ...routeTestEnv,
      // Safe test double: cleanup only uses the StorageBucket subset implemented above.
      DOCUMENTS_BUCKET: bucket as unknown as R2Bucket,
    }

    await expect(
      cleanupUserObjects('user-id', env, { createDb: () => pool }),
    ).rejects.toThrow('Failed to delete 2 object(s) for user user-id')

    expect(bucket.deleted).toEqual([
      'documents/succeed.pdf',
      'raw/succeed.json',
      'lextract-documents/user-id/ext-1/exports/commercial-v2.xlsx',
    ])
  })

  it('acks malformed cleanup messages and reports unsupported DB pools', async () => {
    const bucket = new MemoryBucket()
    const env: Env = {
      ...routeTestEnv,
      // Safe test double: cleanup only uses the StorageBucket subset implemented above.
      DOCUMENTS_BUCKET: bucket as unknown as R2Bucket,
    }
    const invalid = message(null)

    await handleCleanupBatch(batch([invalid]), env, {
      createDb: () => new SequencePool([]),
    })
    await expect(
      cleanupUserObjects('user-id', env, { createDb: () => new EndOnlyPool() }),
    ).rejects.toThrow('Database pool does not support query')
  })
})
