import { exportKey } from '../domain/object-keys'
import { createConfiguredDb } from '../repositories/db'
import type { DbPoolLike } from '../repositories/db'
import { createStorage } from '../services/storage'
import type { Env } from '../types'

export interface CleanupQueueMessage {
  kind: 'user'
  userId: string
}

export interface CleanupConsumerDependencies {
  createDb?: (env: Env) => DbPoolLike
}

interface CleanupExtractionRow {
  document_object_key: string | null
  document_s3_key: string | null
  id: string
  raw_extraction_object_keys: readonly unknown[] | null
}

interface CleanupDeleteFailure {
  error: unknown
  key: string
}

function query(pool: DbPoolLike): NonNullable<DbPoolLike['query']> {
  if (!pool.query) {
    throw new Error('Database pool does not support query')
  }
  return pool.query.bind(pool)
}

function configuredDb(dependencies: CleanupConsumerDependencies, env: Env): DbPoolLike {
  return dependencies.createDb?.(env) ?? createConfiguredDb(env)
}

function isCleanupMessage(value: unknown): value is CleanupQueueMessage {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const message = value as { kind?: unknown; userId?: unknown }
  return message.kind === 'user' && typeof message.userId === 'string'
}

function explicitKeys(row: CleanupExtractionRow): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  const add = (value: unknown): void => {
    if (typeof value === 'string' && value.length > 0 && !seen.has(value)) {
      seen.add(value)
      keys.push(value)
    }
  }
  add(row.document_object_key)
  add(row.document_s3_key)
  for (const rawKey of row.raw_extraction_object_keys ?? []) {
    add(rawKey)
  }
  return keys
}

function exportPrefix(userId: string, extractionId: string): string {
  const marker = exportKey({
    extension: 'docx',
    extractionId,
    format: 'cleanup-marker',
    ownerId: userId,
  })
  return marker.slice(0, marker.lastIndexOf('/') + 1)
}

export async function cleanupUserObjects(
  userId: string,
  env: Env,
  dependencies: CleanupConsumerDependencies = {},
): Promise<{ deleted: number; userId: string }> {
  const pool = configuredDb(dependencies, env)
  const storage = createStorage(env)
  try {
    const rows = await query(pool)<CleanupExtractionRow>(
      `SELECT id, document_object_key, document_s3_key, raw_extraction_object_keys
       FROM extractions
       WHERE user_id = $1
         AND deleted_at IS NOT NULL`,
      [userId],
    )
    let deleted = 0
    const failures: CleanupDeleteFailure[] = []
    for (const row of rows.rows) {
      for (const key of explicitKeys(row)) {
        await storage
          .deleteObject(key)
          .then(() => {
            deleted += 1
          })
          .catch((error: unknown) => {
            failures.push({ error, key })
          })
      }
      const prefixResult = await storage.deletePrefixBestEffort(
        exportPrefix(userId, row.id),
      )
      deleted += prefixResult.deleted
      failures.push(...prefixResult.failures)
    }
    if (failures.length > 0) {
      console.error('Failed to delete user cleanup objects', {
        failedKeys: failures.map((failure) => failure.key),
        userId,
      })
      throw new Error(`Failed to delete ${failures.length} object(s) for user ${userId}`)
    }
    return { deleted, userId }
  } finally {
    await pool.end()
  }
}

export async function handleCleanupBatch(
  batch: MessageBatch,
  env: Env,
  dependencies: CleanupConsumerDependencies = {},
): Promise<void> {
  for (const message of batch.messages) {
    if (isCleanupMessage(message.body)) {
      await cleanupUserObjects(message.body.userId, env, dependencies)
    }
    message.ack()
  }
}
