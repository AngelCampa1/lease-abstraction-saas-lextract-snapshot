export type FieldDataType =
  | 'string'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'boolean'
  | 'array'

export interface FieldDefinition {
  readonly fieldName: string
  readonly displayLabel: string
  readonly category: string
  readonly description: string
  readonly aliases: readonly string[]
  readonly dataType: FieldDataType
  readonly required: boolean
  readonly camRelevant: boolean
  readonly weight: number
  readonly critical: boolean
}

export interface RawFieldDefinition {
  field_name: string
  display_label: string
  category: string
  description: string
  aliases: readonly string[]
  data_type: FieldDataType
  required: boolean
  cam_relevant: boolean
  weight: number
  critical: boolean
}

export function isFieldDataType(value: unknown): value is FieldDataType {
  return (
    value === 'string' ||
    value === 'number' ||
    value === 'currency' ||
    value === 'percentage' ||
    value === 'date' ||
    value === 'boolean' ||
    value === 'array'
  )
}

export function normalizeFieldDefinition(raw: RawFieldDefinition): FieldDefinition {
  const aliases = Object.freeze([...raw.aliases])

  return Object.freeze({
    fieldName: raw.field_name,
    displayLabel: raw.display_label,
    category: raw.category,
    description: raw.description,
    aliases,
    dataType: raw.data_type,
    required: raw.required,
    camRelevant: raw.cam_relevant,
    weight: raw.weight,
    critical: raw.critical,
  })
}
