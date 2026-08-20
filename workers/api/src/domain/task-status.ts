import type { OwnerStorageInput } from './object-keys'

export type TaskStatus = 'generating' | 'complete' | 'failed'

export interface TaskStatusResult {
  status: TaskStatus
  url?: string
  version?: string
}

function ownerTaskPrefix(owner: OwnerStorageInput): string {
  return owner.kind === 'user'
    ? `export:user:${owner.userId}`
    : `export:session:${owner.sessionId}`
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return bytesToHex(signature)
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}

export async function taskSignature(
  message: string,
  secret: string,
): Promise<string> {
  return (await hmacSha256Hex(message, secret)).slice(0, 24)
}

export async function buildExportTaskId(
  owner: OwnerStorageInput,
  taskKey: string,
  secret: string,
): Promise<string> {
  const unsigned = `${ownerTaskPrefix(owner)}:${taskKey}`
  return `${unsigned}:${await taskSignature(unsigned, secret)}`
}

export async function exportTaskBelongsToOwner(
  taskId: string,
  owner: OwnerStorageInput,
  secret: string,
): Promise<boolean> {
  const parts = taskId.split(':')
  if (parts.length < 6 || parts[0] !== 'export') {
    return false
  }
  const unsigned = parts.slice(0, -1).join(':')
  const expected = await taskSignature(unsigned, secret)
  if (!timingSafeEqual(parts[parts.length - 1] ?? '', expected)) {
    return false
  }
  return unsigned.startsWith(`${ownerTaskPrefix(owner)}:`)
}
