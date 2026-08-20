import { createHmac, createHash, randomUUID } from 'node:crypto'

export const AI_CS_APP_ID = 'lextract'
export const AI_CS_WORKER_BASE_URL = 'https://ventora-ai-cs-worker.REPLACE_WITH_ACCOUNT_SUBDOMAIN.workers.dev'

const ACTION_PATHS = {
  sessions: '/v1/sessions',
  chat: '/v1/chat',
  escalations: '/v1/escalations',
} satisfies Record<string, string>

type AiCsAction = keyof typeof ACTION_PATHS

export interface AiCsAuthenticatedUser {
  id: string
  email?: string
}

export interface AiCsProxyRequestInput {
  action: string
  incomingBody: unknown
  user: AiCsAuthenticatedUser
  secret: string
  now?: () => Date
  nonce?: () => string
}

export interface AiCsProxyRequest {
  path: string
  body: Record<string, unknown>
  headers: Record<string, string>
}

export function validateAiCsAction(action: string): string | null {
  return isAiCsAction(action) ? ACTION_PATHS[action] : null
}

export async function buildAiCsProxyRequest(
  input: AiCsProxyRequestInput,
): Promise<AiCsProxyRequest> {
  const path = validateAiCsAction(input.action)
  if (path === null) {
    throw new Error('Unsupported AI-CS action')
  }

  const body = normalizeBody(input.action, input.incomingBody, input.user)
  const timestamp = (input.now ?? (() => new Date()))().toISOString()
  const nonce = (input.nonce ?? randomUUID)()
  const payload = buildHmacPayload({
    timestamp,
    nonce,
    method: 'POST',
    path,
    body,
  })

  return {
    path,
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-Ventora-Timestamp': timestamp,
      'X-Ventora-Nonce': nonce,
      'X-Ventora-Signature': signHmacPayload(payload, input.secret),
    },
  }
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortStable(toStableJsonValue(value)))
}

function normalizeBody(
  action: string,
  incomingBody: unknown,
  user: AiCsAuthenticatedUser,
): Record<string, unknown> {
  const body = isRecord(incomingBody) ? incomingBody : {}
  if (action === 'sessions') {
    const metadata = mergeStringRecords(stringRecord(body.metadata), {
      email: user.email,
    })
    const sessionBody: Record<string, unknown> = {
      appId: AI_CS_APP_ID,
      userId: user.id,
    }
    if (typeof body.currentPath === 'string') {
      sessionBody.currentPath = body.currentPath
    }
    if (Object.keys(metadata).length > 0) {
      sessionBody.metadata = metadata
    }
    return sessionBody
  }

  if (action === 'chat') {
    const chatBody: Record<string, unknown> = {
      appId: AI_CS_APP_ID,
      userId: user.id,
    }
    if (typeof body.sessionId === 'string') {
      chatBody.sessionId = body.sessionId
    }
    if (typeof body.message === 'string') {
      chatBody.message = body.message
    }
    if (Array.isArray(body.history)) {
      chatBody.history = body.history
    }
    if (typeof body.currentPath === 'string') {
      chatBody.currentPath = body.currentPath
    }
    return chatBody
  }

  const escalationBody: Record<string, unknown> = {
    appId: AI_CS_APP_ID,
    userId: user.id,
  }
  if (typeof body.sessionId === 'string') {
    escalationBody.sessionId = body.sessionId
  }
  if (typeof body.reason === 'string') {
    escalationBody.reason = body.reason
  }
  if (typeof body.message === 'string') {
    escalationBody.message = body.message
  }
  const contact = mergeStringRecords(stringRecord(body.contact), {
    email: user.email,
  })
  if (Object.keys(contact).length > 0) {
    escalationBody.contact = contact
  }
  return escalationBody
}

function buildHmacPayload(input: {
  timestamp: string
  nonce: string
  method: string
  path: string
  body: unknown
}): string {
  const hash = createHash('sha256').update(stableJson(input.body)).digest('hex')
  return `${input.timestamp}.${input.nonce}.${input.method.toUpperCase()}.${input.path}.${hash}`
}

function signHmacPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function isAiCsAction(action: string): action is AiCsAction {
  return Object.hasOwn(ACTION_PATHS, action)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {}
  }
  const result: Record<string, string> = {}
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string') {
      result[key] = child
    }
  }
  return result
}

function mergeStringRecords(
  base: Record<string, string>,
  additions: Record<string, string | undefined>,
): Record<string, string> {
  const result = { ...base }
  for (const [key, value] of Object.entries(additions)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      result[key] = value
    }
  }
  return result
}

function toStableJsonValue(value: unknown): null | boolean | number | string | unknown[] | Record<string, unknown> {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(toStableJsonValue)
  }
  if (isRecord(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined) {
        result[key] = toStableJsonValue(child)
      }
    }
    return result
  }
  return null
}

function sortStable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortStable)
  }
  if (!isRecord(value)) {
    return value
  }
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortStable(value[key])
  }
  return sorted
}
