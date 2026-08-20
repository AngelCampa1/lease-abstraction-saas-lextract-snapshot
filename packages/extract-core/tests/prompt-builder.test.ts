import { describe, expect, it } from 'vitest'

import { buildExtractionPrompt } from '../src/index.js'
import { buildLextractRegistry } from '../src/schema/registry.js'

describe('buildExtractionPrompt', () => {
  it('builds a schema-anchored prompt with field names, labels, and output contract', () => {
    const prompt = buildExtractionPrompt(buildLextractRegistry())

    expect(prompt).toContain('Return only valid JSON')
    expect(prompt).toContain('"value"')
    expect(prompt).toContain('"confidence"')
    expect(prompt).toContain('"source_text"')
    expect(prompt).toContain('landlord_legal_name')
    expect(prompt).toContain('Landlord Name')
    expect(prompt).toContain('base_rent_annual')
    expect(prompt).toContain('Annual Base Rent')
  })

  it('includes party disambiguation rules for member-platform and vendor cross-references', () => {
    const prompt = buildExtractionPrompt(buildLextractRegistry())

    expect(prompt).toContain('Direct lease party rules')
    expect(prompt).toContain('Cobot Member Account')
    expect(prompt).toContain('subscription/payment vendors')
    expect(prompt).toContain('property managers')
    expect(prompt).toContain('source_text for landlord_legal_name and tenant_legal_name')
  })

  it('treats generic member-platform tenant captions as placeholders to override', () => {
    const prompt = buildExtractionPrompt(buildLextractRegistry())

    expect(prompt).toContain('Generic labels like "New Incubator Space LLC Member"')
    expect(prompt).toContain('placeholder tenant labels')
    expect(prompt).toContain('real legal company')
    expect(prompt).toContain('Do not choose the placeholder')
  })
})
