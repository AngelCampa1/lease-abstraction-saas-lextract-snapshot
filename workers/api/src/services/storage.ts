import { documentKey, extractionPrefix, rawExtractionPassKey } from '../domain/object-keys'
import type {
  ExtractionObjectKeyInput,
  RawExtractionPassKeyInput,
} from '../domain/object-keys'

export interface StorageListOptions {
  prefix: string
  cursor?: string
}

export interface StorageListResult {
  objects: readonly { key: string }[]
  truncated: boolean
  cursor?: string
}

export interface StorageDeleteFailure {
  error: unknown
  key: string
}

export interface StorageDeleteResult {
  deleted: number
  failures: readonly StorageDeleteFailure[]
}

export interface StorageBucket {
  delete(key: string): Promise<void>
  get(key: string): Promise<unknown>
  list(options: StorageListOptions): Promise<StorageListResult>
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>
}

export class StorageService {
  constructor(private readonly bucket: StorageBucket) {}

  async putDocument(
    input: ExtractionObjectKeyInput,
    value: ArrayBuffer | ArrayBufferView | ReadableStream,
  ): Promise<string> {
    const key = documentKey(input)
    await this.bucket.put(key, value, {
      httpMetadata: { contentType: 'application/pdf' },
    })
    return key
  }

  async getObject(key: string): Promise<unknown> {
    return this.bucket.get(key)
  }

  async putObject(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream,
    contentType: string,
  ): Promise<void> {
    await this.bucket.put(key, value, {
      httpMetadata: { contentType },
    })
  }

  async putRawExtractionResponse(
    input: RawExtractionPassKeyInput,
    value: string,
  ): Promise<string> {
    const key = rawExtractionPassKey(input)
    await this.bucket.put(key, new TextEncoder().encode(value), {
      httpMetadata: { contentType: 'application/json' },
    })
    return key
  }

  async deleteObject(key: string): Promise<void> {
    await this.bucket.delete(key)
  }

  async deleteExtractionObjects(
    input: ExtractionObjectKeyInput,
  ): Promise<void> {
    let cursor: string | undefined
    const prefix = extractionPrefix(input)

    do {
      const result: StorageListResult = await this.bucket.list(
        cursor === undefined ? { prefix } : { cursor, prefix },
      )
      await Promise.all(
        result.objects.map((object) => this.bucket.delete(object.key)),
      )
      cursor = result.truncated ? result.cursor : undefined
    } while (cursor !== undefined)
  }

  async deletePrefix(prefix: string): Promise<void> {
    const result = await this.deletePrefixBestEffort(prefix)
    if (result.failures.length > 0) {
      throw new Error(`Failed to delete ${result.failures.length} object(s) under ${prefix}`)
    }
  }

  async deletePrefixBestEffort(prefix: string): Promise<StorageDeleteResult> {
    let cursor: string | undefined
    let deleted = 0
    const failures: StorageDeleteFailure[] = []

    do {
      const result: StorageListResult = await this.bucket
        .list(cursor === undefined ? { prefix } : { cursor, prefix })
        .catch((error: unknown) => {
          failures.push({ error, key: prefix })
          return { objects: [], truncated: false }
        })
      const deleteResults = await Promise.allSettled(
        result.objects.map(async (object) => {
          await this.bucket.delete(object.key)
          return object.key
        }),
      )
      for (const deleteResult of deleteResults) {
        if (deleteResult.status === 'fulfilled') {
          deleted += 1
        } else {
          const objectIndex = deleteResults.indexOf(deleteResult)
          const object = result.objects[objectIndex]
          failures.push({
            error: deleteResult.reason,
            key: object?.key ?? prefix,
          })
        }
      }
      cursor = result.truncated ? result.cursor : undefined
    } while (cursor !== undefined)

    return { deleted, failures }
  }
}

export function createStorage(env: {
  DOCUMENTS_BUCKET?: StorageBucket
}): StorageService {
  if (!env.DOCUMENTS_BUCKET) {
    throw new Error('DOCUMENTS_BUCKET binding is required')
  }

  return new StorageService(env.DOCUMENTS_BUCKET)
}
