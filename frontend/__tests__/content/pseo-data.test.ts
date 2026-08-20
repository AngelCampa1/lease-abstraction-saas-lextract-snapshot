/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import {
  CLAUSES,
  getAllClauseSlugs,
  getClauseBySlug,
  CLAUSE_CATEGORY_LABELS,
} from '@/data/clauses'
import {
  PROPERTY_TYPES,
  getAllPropertyTypeSlugs,
  getPropertyTypeBySlug,
  PROPERTY_TYPES_COUNT,
} from '@/data/property-types'
import { RED_FLAG_BY_ID, RED_FLAGS } from '@/data/red-flags'
import {
  TEMPLATES,
  getAllTemplateSlugs,
  getTemplateBySlug,
} from '@/data/templates'
import {
  INTEGRATIONS,
  getAllIntegrationSlugs,
  getIntegrationBySlug,
} from '@/data/integrations'

// ─── Clauses ─────────────────────────────────────────────────────────

describe('CLAUSES', () => {
  it('contains at least 30 entries', () => {
    expect(CLAUSES.length).toBeGreaterThanOrEqual(30)
  })

  it('getAllClauseSlugs returns all slugs', () => {
    const slugs = getAllClauseSlugs()
    expect(slugs.length).toBe(CLAUSES.length)
    expect(slugs).toEqual(CLAUSES.map((c) => c.slug))
  })

  it('every slug is unique', () => {
    const slugs = CLAUSES.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every clause has required non-empty string fields', () => {
    for (const clause of CLAUSES) {
      expect(clause.name.length).toBeGreaterThan(0)
      expect(clause.slug.length).toBeGreaterThan(0)
      expect(clause.definition.length).toBeGreaterThan(50)
      expect(clause.whyItMatters.length).toBeGreaterThan(50)
      expect(clause.howToNegotiate.length).toBeGreaterThan(50)
      expect(clause.metaTitle.length).toBeGreaterThan(0)
      expect(clause.metaDescription.length).toBeGreaterThan(50)
    }
  })

  it('every clause has a valid category', () => {
    const validCategories = Object.keys(CLAUSE_CATEGORY_LABELS)
    for (const clause of CLAUSES) {
      expect(validCategories).toContain(clause.category)
    }
  })

  it('all relatedClauses slugs reference valid clauses', () => {
    const allSlugs = new Set(CLAUSES.map((c) => c.slug))
    for (const clause of CLAUSES) {
      for (const related of clause.relatedClauses) {
        expect(allSlugs.has(related)).toBe(true)
      }
    }
  })

  it('getClauseBySlug returns the correct clause', () => {
    const first = CLAUSES[0]
    const found = getClauseBySlug(first.slug)
    expect(found).toBeDefined()
    expect(found?.name).toBe(first.name)
  })

  it('getClauseBySlug returns undefined for unknown slug', () => {
    expect(getClauseBySlug('nonexistent-clause-slug')).toBeUndefined()
  })

})

// ─── Property Types ───────────────────────────────────────────────────

describe('PROPERTY_TYPES', () => {
  it('PROPERTY_TYPES_COUNT matches array length', () => {
    expect(PROPERTY_TYPES_COUNT).toBe(PROPERTY_TYPES.length)
  })

  it('contains at least 15 entries', () => {
    expect(PROPERTY_TYPES.length).toBeGreaterThanOrEqual(15)
  })

  it('getAllPropertyTypeSlugs returns all slugs', () => {
    const slugs = getAllPropertyTypeSlugs()
    expect(slugs.length).toBe(PROPERTY_TYPES.length)
  })

  it('every slug is unique', () => {
    const slugs = PROPERTY_TYPES.map((pt) => pt.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every property type has required non-empty string fields', () => {
    for (const pt of PROPERTY_TYPES) {
      expect(pt.name.length).toBeGreaterThan(0)
      expect(pt.slug.length).toBeGreaterThan(0)
      expect(pt.overview.length).toBeGreaterThan(50)
      expect(pt.metaTitle.length).toBeGreaterThan(0)
      expect(pt.metaDescription.length).toBeGreaterThan(50)
    }
  })

  it('all commonRedFlags reference valid RF IDs in RED_FLAG_BY_ID', () => {
    const validIds = new Set(RED_FLAGS.map((rf) => rf.ruleId))
    for (const pt of PROPERTY_TYPES) {
      for (const rfId of pt.commonRedFlags) {
        expect(validIds.has(rfId)).toBe(true)
      }
    }
  })

  it('every property type has at least one FAQ', () => {
    for (const pt of PROPERTY_TYPES) {
      expect(pt.faqs.length).toBeGreaterThan(0)
      for (const faq of pt.faqs) {
        expect(faq.question.length).toBeGreaterThan(0)
        expect(faq.answer.length).toBeGreaterThan(0)
      }
    }
  })

  it('getPropertyTypeBySlug returns the correct entry', () => {
    const first = PROPERTY_TYPES[0]
    const found = getPropertyTypeBySlug(first.slug)
    expect(found?.name).toBe(first.name)
  })
})

// ─── Templates ───────────────────────────────────────────────────────

describe('TEMPLATES', () => {
  it('contains at least 10 entries', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(10)
  })

  it('getAllTemplateSlugs returns all slugs', () => {
    expect(getAllTemplateSlugs().length).toBe(TEMPLATES.length)
  })

  it('every slug is unique', () => {
    const slugs = TEMPLATES.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every template has required non-empty fields', () => {
    for (const t of TEMPLATES) {
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.description.length).toBeGreaterThan(50)
      expect(t.keyItems.length).toBeGreaterThanOrEqual(5)
      expect(t.metaTitle.length).toBeGreaterThan(0)
    }
  })

  it('every template has at least one FAQ', () => {
    for (const t of TEMPLATES) {
      expect(t.faqs.length).toBeGreaterThan(0)
    }
  })

  it('getTemplateBySlug returns the correct entry', () => {
    const first = TEMPLATES[0]
    const found = getTemplateBySlug(first.slug)
    expect(found?.name).toBe(first.name)
  })

  it('getTemplateBySlug returns undefined for unknown slug', () => {
    expect(getTemplateBySlug('unknown-template-slug')).toBeUndefined()
  })
})

// ─── Integrations ────────────────────────────────────────────────────

describe('INTEGRATIONS', () => {
  it('contains at least 12 entries', () => {
    expect(INTEGRATIONS.length).toBeGreaterThanOrEqual(12)
  })

  it('getAllIntegrationSlugs returns all slugs', () => {
    expect(getAllIntegrationSlugs().length).toBe(INTEGRATIONS.length)
  })

  it('every slug is unique', () => {
    const slugs = INTEGRATIONS.map((i) => i.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every integration has required non-empty fields', () => {
    for (const i of INTEGRATIONS) {
      expect(i.software.length).toBeGreaterThan(0)
      expect(i.slug.length).toBeGreaterThan(0)
      expect(i.overview.length).toBeGreaterThan(50)
      expect(i.howLextractHelps.length).toBeGreaterThan(50)
      expect(i.workflowSteps.length).toBeGreaterThanOrEqual(3)
      expect(i.metaTitle.length).toBeGreaterThan(0)
    }
  })

  it('every integration has at least one FAQ', () => {
    for (const i of INTEGRATIONS) {
      expect(i.faqs.length).toBeGreaterThan(0)
    }
  })

  it('getIntegrationBySlug returns the correct entry', () => {
    const first = INTEGRATIONS[0]
    const found = getIntegrationBySlug(first.slug)
    expect(found?.software).toBe(first.software)
  })
})

// ─── RED_FLAG_BY_ID ──────────────────────────────────────────────────

describe('RED_FLAG_BY_ID', () => {
  it('contains an entry for every RED_FLAG ruleId', () => {
    for (const rf of RED_FLAGS) {
      expect(RED_FLAG_BY_ID[rf.ruleId]).toBeDefined()
      expect(RED_FLAG_BY_ID[rf.ruleId].name).toBe(rf.name)
      expect(RED_FLAG_BY_ID[rf.ruleId].slug).toBe(rf.slug)
      expect(RED_FLAG_BY_ID[rf.ruleId].severity).toBe(rf.severity)
    }
  })

  it('has the same number of entries as RED_FLAGS', () => {
    expect(Object.keys(RED_FLAG_BY_ID).length).toBe(RED_FLAGS.length)
  })
})
