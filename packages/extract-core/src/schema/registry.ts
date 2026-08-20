import type { FieldDefinition } from './field-definition.js'
import { normalizeFieldDefinition } from './field-definition.js'
import { lextractSchema } from './lextract-schema.js'

export interface LextractRegistry {
  readonly fields: readonly FieldDefinition[]
  readonly categories: readonly string[]
  getField(fieldName: string): FieldDefinition | undefined
  getFieldsByCategory(category: string): FieldDefinition[]
}

export function buildLextractRegistry(): LextractRegistry {
  const fields = lextractSchema.map(normalizeFieldDefinition)
  const fieldsByName = new Map(fields.map((field) => [field.fieldName, field]))
  const categories = [...new Set(fields.map((field) => field.category))]

  return {
    fields: Object.freeze([...fields]),
    categories: Object.freeze([...categories]),
    getField(fieldName: string): FieldDefinition | undefined {
      return fieldsByName.get(fieldName)
    },
    getFieldsByCategory(category: string): FieldDefinition[] {
      return fields.filter((field) => field.category === category)
    },
  }
}
