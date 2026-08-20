import { describe, expect, it } from 'vitest'
import { buildLextractRegistry } from '../src/index.js'
import { parseLextractSchema } from '../src/schema/lextract-schema.js'

describe('lextract registry', () => {
  it('loads all schema fields from docs/lextract_field_schema.json', () => {
    const registry = buildLextractRegistry()

    expect(registry.fields.length).toBeGreaterThanOrEqual(99)
    expect(registry.getField('landlord_legal_name')?.fieldName).toBe('landlord_legal_name')
    expect(registry.categories.length).toBeGreaterThan(10)
  })

  it('converts schema field definitions to camelCase at the package boundary', () => {
    const registry = buildLextractRegistry()
    const field = registry.getField('rentable_square_footage')

    expect(field).toMatchObject({
      fieldName: 'rentable_square_footage',
      displayLabel: 'Rentable Area (RSF)',
      camRelevant: true,
    })
    expect(field).not.toHaveProperty('field_name')
    expect(field).not.toHaveProperty('display_label')
    expect(field).not.toHaveProperty('cam_relevant')
  })

  it('defines landlord and tenant as direct lease counterparties', () => {
    const registry = buildLextractRegistry()

    expect(registry.getField('landlord_legal_name')?.description).toContain(
      'direct lease counterparty',
    )
    expect(registry.getField('tenant_legal_name')?.description).toContain(
      'direct lease counterparty',
    )
    expect(registry.getField('tenant_legal_name')?.description).toContain(
      'member account',
    )
  })

  it('returns fields by category without mutating registry state', () => {
    const registry = buildLextractRegistry()

    const first = registry.getFieldsByCategory('Parties & Property')
    const second = registry.getFieldsByCategory('Parties & Property')

    expect(first.length).toBeGreaterThan(0)
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
    first.pop()
    expect(registry.getFieldsByCategory('Parties & Property')).toHaveLength(second.length)
  })

  it('protects registry field objects from external mutation', () => {
    const registry = buildLextractRegistry()
    const firstField = registry.fields[0]

    expect(firstField).toBeDefined()
    if (!firstField) {
      throw new Error('Expected schema to contain at least one field')
    }

    const originalFieldName = firstField.fieldName
    const originalDisplayLabel = firstField.displayLabel
    const originalAlias = firstField.aliases[0]
    const lookupField = registry.getField(originalFieldName)

    expect(lookupField).toBeDefined()
    if (!lookupField) {
      throw new Error(`Expected lookup for ${originalFieldName}`)
    }

    Reflect.set(firstField, 'displayLabel', 'Mutated Label')
    Reflect.set(firstField.aliases, '0', 'Mutated Alias')
    Reflect.set(lookupField, 'displayLabel', 'Lookup Mutated Label')

    expect(registry.fields[0]?.displayLabel).toBe(originalDisplayLabel)
    expect(registry.fields[0]?.aliases[0]).toBe(originalAlias)
    expect(registry.getField(originalFieldName)?.displayLabel).toBe(originalDisplayLabel)
    expect(registry.getField(originalFieldName)?.aliases[0]).toBe(originalAlias)
  })

  it('rejects malformed schema input before exposing registry fields', () => {
    const validField = {
      field_name: 'lease_start_date',
      display_label: 'Lease Start Date',
      category: 'Critical Dates',
      description: 'The date the lease starts.',
      aliases: ['Commencement Date'],
      data_type: 'date',
      required: true,
      cam_relevant: false,
    }

    expect(() => parseLextractSchema({ fields: [] })).toThrow(/must be an array/)
    expect(() => parseLextractSchema([null])).toThrow(/must be an object/)
    expect(() =>
      parseLextractSchema([{ ...validField, field_name: 123 }]),
    ).toThrow(/field_name must be a string/)
    expect(() =>
      parseLextractSchema([{ ...validField, required: 'yes' }]),
    ).toThrow(/required must be a boolean/)
    expect(() =>
      parseLextractSchema([{ ...validField, aliases: [123] }]),
    ).toThrow(/aliases must be a string array/)
    expect(() =>
      parseLextractSchema([{ ...validField, data_type: 'object' }]),
    ).toThrow(/data_type is not supported/)
    expect(() =>
      parseLextractSchema([{ ...validField, weight: 'heavy' }]),
    ).toThrow(/weight must be a number/)
    expect(() =>
      parseLextractSchema([{ ...validField, critical: 'yes' }]),
    ).toThrow(/critical must be a boolean/)
  })
})
