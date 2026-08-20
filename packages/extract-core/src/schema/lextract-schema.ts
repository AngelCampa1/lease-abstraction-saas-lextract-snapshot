import schemaJson from '../../../../docs/lextract_field_schema.json' with { type: 'json' }
import { isFieldDataType } from './field-definition.js'
import type { FieldDataType, RawFieldDefinition } from './field-definition.js'

function toRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`)
  }

  // Object shape was narrowed above; indexing unknown JSON requires a record view.
  return value as Record<string, unknown>
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new TypeError(`Schema field ${key} must be a string`)
  }
  return value
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new TypeError(`Schema field ${key} must be a boolean`)
  }
  return value
}

function readOptionalBoolean(record: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = record[key]
  if (value === undefined) {
    return fallback
  }
  if (typeof value !== 'boolean') {
    throw new TypeError(`Schema field ${key} must be a boolean`)
  }
  return value
}

function readOptionalNumber(record: Record<string, unknown>, key: string, fallback: number): number {
  const value = record[key]
  if (value === undefined) {
    return fallback
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new TypeError(`Schema field ${key} must be a number`)
  }
  return value
}

function readAliases(record: Record<string, unknown>): readonly string[] {
  const value = record.aliases
  if (!Array.isArray(value) || !value.every((alias) => typeof alias === 'string')) {
    throw new TypeError('Schema field aliases must be a string array')
  }
  return [...value]
}

function readDataType(record: Record<string, unknown>): FieldDataType {
  const value = record.data_type
  if (!isFieldDataType(value)) {
    throw new TypeError('Schema field data_type is not supported')
  }
  return value
}

function parseRawFieldDefinition(value: unknown, index: number): RawFieldDefinition {
  const record = toRecord(value, `Schema entry ${index}`)

  return {
    field_name: readString(record, 'field_name'),
    display_label: readString(record, 'display_label'),
    category: readString(record, 'category'),
    description: readString(record, 'description'),
    aliases: readAliases(record),
    data_type: readDataType(record),
    required: readBoolean(record, 'required'),
    cam_relevant: readBoolean(record, 'cam_relevant'),
    weight: readOptionalNumber(record, 'weight', 1),
    critical: readOptionalBoolean(record, 'critical', false),
  }
}

export function parseLextractSchema(value: unknown): readonly RawFieldDefinition[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Lextract schema must be an array')
  }
  return value.map(parseRawFieldDefinition)
}

export const lextractSchema = parseLextractSchema(schemaJson)
