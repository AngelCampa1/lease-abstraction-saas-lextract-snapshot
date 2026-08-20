import { describe, expect, it } from 'vitest'

import {
  documentKey,
  exportKey,
  exportPrefix,
  ownerStorageId,
  rawExtractionPassKey,
} from '../domain/object-keys'
import { StorageService } from '../services/storage'
import type { StorageListOptions, StorageListResult } from '../services/storage'
import { createStorage } from '../services/storage'

class MemoryBucket {
  readonly deletedKeys: string[] = []
  readonly objects = new Map<string, ArrayBuffer>()

  async delete(key: string): Promise<void> {
    this.deletedKeys.push(key)
    this.objects.delete(key)
  }

  async get(key: string): Promise<ArrayBuffer | null> {
    return this.objects.get(key) ?? null
  }

  async list(options: StorageListOptions): Promise<StorageListResult> {
    return {
      objects: [...this.objects.keys()]
        .filter((key) => key.startsWith(options.prefix))
        .sort()
        .map((key) => ({ key })),
      truncated: false,
    }
  }

  async put(key: string, value: ArrayBuffer): Promise<void> {
    this.objects.set(key, value)
  }
}

class PagedBucket extends MemoryBucket {
  override async list(options: StorageListOptions): Promise<StorageListResult> {
    if (!options.cursor) {
      return {
        cursor: 'next-page',
        objects: [{ key: `${options.prefix}original.pdf` }],
        truncated: true,
      }
    }

    return {
      objects: [{ key: `${options.prefix}exports/extraction.docx` }],
      truncated: false,
    }
  }
}

class FailingDeleteBucket extends MemoryBucket {
  constructor(private readonly failingKey: string) {
    super()
  }

  override async delete(key: string): Promise<void> {
    if (key === this.failingKey) {
      throw new Error(`failed ${key}`)
    }
    await super.delete(key)
  }
}

class FailingListBucket extends MemoryBucket {
  override async list(): Promise<StorageListResult> {
    throw new Error('list failed')
  }
}

describe('object key helpers', () => {
  it('builds document keys with the current R2 convention', () => {
    expect(documentKey({ extractionId: 'e1', ownerId: 'u1' })).toBe(
      'lextract-documents/u1/e1/original.pdf',
    )
  })

  it('builds anonymous owner ids without changing the document key shape', () => {
    expect(ownerStorageId({ kind: 'anonymous', sessionId: 'session-1' })).toBe(
      'anon/session-1',
    )
    expect(
      documentKey({
        extractionId: 'e1',
        ownerId: ownerStorageId({
          kind: 'anonymous',
          sessionId: 'session-1',
        }),
      }),
    ).toBe('lextract-documents/anon/session-1/e1/original.pdf')
  })

  it('uses the raw user id for authenticated owner storage ids', () => {
    expect(ownerStorageId({ kind: 'user', userId: 'user-1' })).toBe('user-1')
  })

  it('rejects owner ids with slashes before building object keys', () => {
    expect(() =>
      documentKey({ extractionId: 'e1', ownerId: 'user/../other' }),
    ).toThrow(/unsafe storage segment/i)
    expect(() =>
      exportPrefix({ extractionId: 'e1', ownerId: 'user/session-1' }),
    ).toThrow(/unsafe storage segment/i)
  })

  it('rejects path-like and control-character owner source values', () => {
    expect(() =>
      ownerStorageId({ kind: 'user', userId: '../user-1' }),
    ).toThrow(/unsafe storage segment/i)
    expect(() =>
      ownerStorageId({ kind: 'anonymous', sessionId: 'session\u0000id' }),
    ).toThrow(/unsafe storage segment/i)
  })

  it('builds export and raw pass keys under the extraction prefix', () => {
    expect(exportPrefix({ extractionId: 'e1', ownerId: 'u1' })).toBe(
      'lextract-documents/u1/e1/exports/',
    )
    expect(
      exportKey({
        extension: 'docx',
        extractionId: 'e1',
        format: 'extraction',
        ownerId: 'u1',
      }),
    ).toBe('lextract-documents/u1/e1/exports/extraction.docx')
    expect(
      rawExtractionPassKey({
        extractionId: 'e1',
        model: 'gemini-3-flash',
        ownerId: 'u1',
        passKind: 'primary',
      }),
    ).toBe('lextract-documents/u1/e1/raw/primary-gemini-3-flash.json')
  })
})

describe('StorageService', () => {
  it('stores and reads documents through the configured bucket', async () => {
    const bucket = new MemoryBucket()
    const storage = new StorageService(bucket)
    const body = new Uint8Array([37, 80, 68, 70]).buffer

    const key = await storage.putDocument(
      { extractionId: 'e1', ownerId: 'u1' },
      body,
    )
    const stored = await storage.getObject(key)

    expect(key).toBe('lextract-documents/u1/e1/original.pdf')
    expect(stored).toEqual(body)
  })

  it('deletes every key under an extraction prefix', async () => {
    const bucket = new MemoryBucket()
    const storage = new StorageService(bucket)
    await bucket.put('lextract-documents/u1/e1/original.pdf', new ArrayBuffer(1))
    await bucket.put(
      'lextract-documents/u1/e1/exports/extraction.docx',
      new ArrayBuffer(1),
    )

    await storage.deleteExtractionObjects({ extractionId: 'e1', ownerId: 'u1' })

    expect(bucket.deletedKeys.sort()).toEqual([
      'lextract-documents/u1/e1/original.pdf',
      'lextract-documents/u1/e1/exports/extraction.docx',
    ].sort())
  })

  it('deletes paged extraction object listings', async () => {
    const bucket = new PagedBucket()
    const storage = new StorageService(bucket)

    await storage.deleteExtractionObjects({ extractionId: 'e1', ownerId: 'u1' })

    expect(bucket.deletedKeys).toEqual([
      'lextract-documents/u1/e1/original.pdf',
      'lextract-documents/u1/e1/exports/extraction.docx',
    ])
  })

  it('deletes a single object by key', async () => {
    const bucket = new MemoryBucket()
    const storage = new StorageService(bucket)
    await bucket.put('lextract-documents/u1/e1/original.pdf', new ArrayBuffer(1))

    await storage.deleteObject('lextract-documents/u1/e1/original.pdf')

    expect(bucket.deletedKeys).toEqual([
      'lextract-documents/u1/e1/original.pdf',
    ])
  })

  it('stores arbitrary objects and raw extraction responses', async () => {
    const bucket = new MemoryBucket()
    const storage = new StorageService(bucket)

    await storage.putObject('custom/report.json', new ArrayBuffer(1), 'application/json')
    const rawKey = await storage.putRawExtractionResponse(
      {
        extractionId: 'e1',
        model: 'provider-model-v1',
        ownerId: 'u1',
        passKind: 'pass1',
      },
      '{"ok":true}',
    )

    expect(bucket.objects.has('custom/report.json')).toBe(true)
    expect(rawKey).toBe(
      'lextract-documents/u1/e1/raw/pass1-provider-model-v1.json',
    )
  })

  it('deletes prefix objects and reports best-effort delete failures', async () => {
    const bucket = new FailingDeleteBucket('prefix/fail.json')
    const storage = new StorageService(bucket)
    await bucket.put('prefix/fail.json', new ArrayBuffer(1))
    await bucket.put('prefix/succeed.json', new ArrayBuffer(1))

    const result = await storage.deletePrefixBestEffort('prefix/')

    expect(result.deleted).toBe(1)
    expect(result.failures.map((failure) => failure.key)).toEqual([
      'prefix/fail.json',
    ])
    expect(bucket.deletedKeys).toEqual(['prefix/succeed.json'])
    await expect(storage.deletePrefix('prefix/')).rejects.toThrow(
      'Failed to delete 1 object(s) under prefix/',
    )
  })

  it('reports prefix list failures without deleting objects', async () => {
    const bucket = new FailingListBucket()
    const storage = new StorageService(bucket)

    const result = await storage.deletePrefixBestEffort('prefix/')

    expect(result).toMatchObject({
      deleted: 0,
      failures: [{ key: 'prefix/' }],
    })
  })

  it('requires the documents bucket binding when creating storage', () => {
    expect(() => createStorage({})).toThrow(/documents_bucket/i)
  })

  it('creates storage from the documents bucket binding', async () => {
    const bucket = new MemoryBucket()
    const env = {
      DOCUMENTS_BUCKET: bucket,
      ENVIRONMENT: 'test',
      FRONTEND_URL: 'https://lextract.io',
    }

    const storage = createStorage(env)
    await storage.putDocument(
      { extractionId: 'e1', ownerId: 'u1' },
      new ArrayBuffer(1),
    )

    expect(bucket.objects.has('lextract-documents/u1/e1/original.pdf')).toBe(
      true,
    )
  })
})
