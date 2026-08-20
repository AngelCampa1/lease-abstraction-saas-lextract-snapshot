import type {
  ExtractedFieldValue,
  ExtractionResult,
  FieldExtractionValue,
  LextractRegistry,
} from '../models.js'
import type { FieldDataType } from '../schema/field-definition.js'

export class ModelResponseParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelResponseParseError'
  }
}

function stripThinkingTags(response: string): string {
  return response.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

function stripCodeFence(response: string): string {
  const match = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i.exec(response.trim())
  return match?.[1]?.trim() ?? response.trim()
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  // Runtime shape is narrowed to a non-array object above; this exposes safe key lookup.
  return value as Record<string, unknown>
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0
  }

  const normalized = value > 1 ? value / 100 : value
  return Math.max(0, Math.min(1, normalized))
}

function coerceNumberLike(rawValue: unknown, dataType: FieldDataType): ExtractedFieldValue {
  if (typeof rawValue === 'number') {
    if (dataType === 'percentage' && rawValue > 1 && rawValue <= 100) {
      return rawValue / 100
    }
    return rawValue
  }

  if (typeof rawValue !== 'string') {
    return isExtractedFieldValue(rawValue) ? rawValue : String(rawValue)
  }

  const cleaned = rawValue.replaceAll('$', '').replaceAll(',', '').replaceAll('%', '').trim()
  if (cleaned.length === 0) {
    return null
  }

  const parsed = Number(cleaned)
  if (Number.isNaN(parsed)) {
    return rawValue
  }

  if (dataType === 'percentage') {
    if (rawValue.trim().endsWith('%') || (parsed > 1 && parsed <= 100)) {
      return parsed / 100
    }
  }

  return parsed
}

function coerceFieldValue(rawValue: unknown, dataType: FieldDataType): ExtractedFieldValue {
  if (rawValue === null || rawValue === undefined) {
    return null
  }

  if (dataType === 'boolean') {
    if (typeof rawValue === 'boolean') {
      return rawValue
    }
    if (typeof rawValue === 'string') {
      const normalized = rawValue.trim().toLowerCase()
      if (['true', 'yes', '1'].includes(normalized)) {
        return true
      }
      if (['false', 'no', '0'].includes(normalized)) {
        return false
      }
      return null
    }
    return Boolean(rawValue)
  }

  if (dataType === 'number' || dataType === 'currency' || dataType === 'percentage') {
    return coerceNumberLike(rawValue, dataType)
  }

  if (dataType === 'array') {
    if (Array.isArray(rawValue)) {
      return rawValue
    }
    if (typeof rawValue === 'string') {
      return rawValue.trim().length > 0 ? rawValue.split(',').map((item) => item.trim()) : []
    }
    return [rawValue]
  }

  if (typeof rawValue === 'string') {
    return rawValue
  }

  return String(rawValue)
}

function isExtractedFieldValue(value: unknown): value is ExtractedFieldValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    Array.isArray(value) ||
    toRecord(value) !== null
  )
}

export function parseModelJson(response: string): unknown {
  const cleaned = stripCodeFence(stripThinkingTags(response))
  try {
    const parsed: unknown = JSON.parse(cleaned)
    return parsed
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown parse error'
    throw new ModelResponseParseError(`Model response did not contain valid JSON: ${reason}`)
  }
}

export function parseExtractionResponse(
  response: string,
  registry?: LextractRegistry,
): ExtractionResult {
  const parsed = parseModelJson(response)
  const responseRecord = toRecord(parsed)
  if (responseRecord === null) {
    throw new ModelResponseParseError('Model response is not a JSON object')
  }

  const fieldContainer = toRecord(responseRecord.fields) ?? responseRecord
  const fields: Record<string, FieldExtractionValue> = {}

  for (const [fieldName, rawField] of Object.entries(fieldContainer)) {
    const fieldRecord = toRecord(rawField)
    if (fieldRecord === null) {
      continue
    }

    const fieldDefinition = registry?.getField(fieldName)
    const value =
      fieldDefinition === undefined
        ? isExtractedFieldValue(fieldRecord.value)
          ? fieldRecord.value
          : null
        : coerceFieldValue(fieldRecord.value, fieldDefinition.dataType)
    const sourceText = typeof fieldRecord.source_text === 'string' ? fieldRecord.source_text.trim() : ''

    fields[fieldName] = {
      value,
      confidence: normalizeConfidence(fieldRecord.confidence),
      sourceText,
    }
  }

  return { fields }
}
