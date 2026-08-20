import { buildLextractRegistry } from '../../../../packages/extract-core/src/index'

export interface CamAuditPayloadInput {
  extractionId: string
  extractedData: Record<string, unknown>
  confidenceScores: Record<string, unknown>
  timestamp?: string
}

export interface CamAuditPayload {
  fields: Record<string, unknown>
  confidence_scores: Record<string, unknown>
  lextract_handoff: true
  extraction_id: string
  timestamp: string
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return base64UrlEncode(new Uint8Array(signature))
}

export function camRelevantFields(): string[] {
  return buildLextractRegistry()
    .fields.filter((field) => field.camRelevant)
    .map((field) => field.fieldName)
}

export function buildCamAuditPayload(input: CamAuditPayloadInput): CamAuditPayload {
  const fields: Record<string, unknown> = {}
  const scores: Record<string, unknown> = {}
  for (const fieldName of camRelevantFields()) {
    const value = input.extractedData[fieldName]
    if (value !== undefined) {
      fields[fieldName] = value
    }
    const score = input.confidenceScores[fieldName]
    if (score !== undefined) {
      scores[fieldName] = score
    }
  }
  return {
    confidence_scores: scores,
    extraction_id: input.extractionId,
    fields,
    lextract_handoff: true,
    timestamp: input.timestamp ?? new Date().toISOString(),
  }
}

export async function buildCamAuditRedirectUrl(input: {
  baseUrl: string
  extractionId: string
  payload: CamAuditPayload
  sharedKey: string
}): Promise<string> {
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(input.payload)),
  )
  const signature = await signPayload(payload, input.sharedKey)
  const url = new URL('/scan', input.baseUrl)
  url.searchParams.set('payload', `${payload}.${signature}`)
  url.searchParams.set('extraction_id', input.extractionId)
  url.searchParams.set('utm_source', 'lextract')
  url.searchParams.set('utm_campaign', `extraction_${input.extractionId}`)
  return url.toString()
}
