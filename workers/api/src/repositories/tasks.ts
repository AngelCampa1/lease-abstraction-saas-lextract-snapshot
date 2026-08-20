import type { TaskStatusResult } from '../domain/task-status'
import { exportKey } from '../domain/object-keys'
import { createStorage } from '../services/storage'
import type { Env } from '../types'

export async function getExportTaskStatus(
  taskId: string,
  env: Env,
): Promise<TaskStatusResult> {
  const parts = taskId.split(':')
  if (parts.length < 8 || parts[0] !== 'export') {
    return { status: 'generating' }
  }
  const ownerType = parts[1]
  const ownerId = parts[2]
  const extractionId = parts[3]
  const template = parts[4]
  const format = parts[5]
  const version = parts[6]
  if (
    (ownerType !== 'user' && ownerType !== 'session') ||
    !ownerId ||
    !extractionId ||
    !template ||
    (format !== 'docx' && format !== 'xlsx' && format !== 'pdf') ||
    !version
  ) {
    return { status: 'generating' }
  }
  const objectKey = exportKey({
    extension: format,
    extractionId,
    format: `${template}-${version}`,
    ownerId: ownerType === 'session' ? `anon/${ownerId}` : ownerId,
  })
  const object = await createStorage(env).getObject(objectKey)
  if (object === null) {
    return { status: 'generating' }
  }
  return {
    status: 'complete',
    url: `/api/v1/extractions/${extractionId}/export/${format}/download?template=${template}&version=${version}`,
    version,
  }
}
