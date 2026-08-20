export type {
  FieldDataType,
  FieldDefinition,
  RawFieldDefinition,
} from './schema/field-definition.js'
export type { LextractRegistry } from './schema/registry.js'

export type ExtractedFieldValue =
  | string
  | number
  | boolean
  | null
  | readonly unknown[]
  | Record<string, unknown>

export interface FieldExtractionValue {
  readonly value: ExtractedFieldValue
  readonly confidence: number
  readonly sourceText: string
}

export interface ExtractionResult {
  readonly fields: Readonly<Record<string, FieldExtractionValue>>
}
