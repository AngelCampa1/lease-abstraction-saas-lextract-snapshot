/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { buildFAQPageSchema } from '@/lib/schema'
import { GLOSSARY_TERMS, getGlossaryTermBySlug } from '@/data/glossary'
import { CLAUSES, getClauseBySlug } from '@/data/clauses'

// ─── Glossary FAQ Data Validation ───────────────────────────────────

const GLOSSARY_SLUGS_WITH_FAQS = [
  'base-rent',
  'cam-charges',
  'nnn-lease',
  'gross-lease',
  'rent-escalation-schedule',
  'commencement-date',
  'lease-expiration-date',
  'security-deposit',
  'tenant-improvement-allowance',
  'renewal-option',
  'holdover-provision',
  'assignment-and-subletting',
  'personal-guarantee',
  'co-tenancy-clause',
  'exclusive-use-clause',
  'force-majeure',
  'estoppel-certificate',
  'snda',
  'operating-expenses',
  'base-year',
  'rent-abatement',
  'permitted-use',
  'right-of-first-refusal',
  'guarantor',
  'pro-rata-share',
  'landlord',
  'tenant',
  'lease-abstract',
  'lease-abstraction',
]

describe('Glossary FAQ data', () => {
  it('has faqs field on GlossaryTerm interface (at least one term has faqs)', () => {
    const termsWithFaqs = GLOSSARY_TERMS.filter(
      (t) => t.faqs !== undefined && t.faqs.length > 0
    )
    expect(termsWithFaqs.length).toBeGreaterThanOrEqual(29)
  })

  it.each(GLOSSARY_SLUGS_WITH_FAQS)(
    'glossary term "%s" has 3-4 FAQ items',
    (slug) => {
      const term = getGlossaryTermBySlug(slug)
      expect(term).toBeDefined()
      expect(term!.faqs).toBeDefined()
      expect(term!.faqs!.length).toBeGreaterThanOrEqual(3)
      expect(term!.faqs!.length).toBeLessThanOrEqual(4)
    }
  )

  it.each(GLOSSARY_SLUGS_WITH_FAQS)(
    'glossary term "%s" FAQ items have non-empty question and answer',
    (slug) => {
      const term = getGlossaryTermBySlug(slug)
      for (const faq of term!.faqs!) {
        expect(faq.question.length).toBeGreaterThan(10)
        expect(faq.answer.length).toBeGreaterThan(30)
      }
    }
  )
})

// ─── Clauses FAQ Data Validation ────────────────────────────────────

describe('Clauses FAQ data', () => {
  it('every clause has 3 FAQ items', () => {
    for (const clause of CLAUSES) {
      expect(clause.faqs).toBeDefined()
      expect(clause.faqs!.length).toBe(3)
    }
  })

  it('clause FAQ items have non-empty question and answer', () => {
    for (const clause of CLAUSES) {
      for (const faq of clause.faqs!) {
        expect(faq.question.length).toBeGreaterThan(10)
        expect(faq.answer.length).toBeGreaterThan(30)
      }
    }
  })
})

// ─── FAQPage Schema Generation ──────────────────────────────────────

describe('buildFAQPageSchema with glossary FAQs', () => {
  it('generates valid FAQPage schema from glossary term FAQs', () => {
    const term = getGlossaryTermBySlug('base-rent')
    expect(term).toBeDefined()
    expect(term!.faqs).toBeDefined()

    const schema = buildFAQPageSchema(term!.faqs!)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity.length).toBeGreaterThanOrEqual(3)

    for (const entity of schema.mainEntity) {
      expect(entity['@type']).toBe('Question')
      expect(entity.name.length).toBeGreaterThan(0)
      expect(entity.acceptedAnswer['@type']).toBe('Answer')
      expect(entity.acceptedAnswer.text.length).toBeGreaterThan(0)
    }
  })

  it('generates valid FAQPage schema from clause FAQs', () => {
    const clause = getClauseBySlug('escalation-clause')
    expect(clause).toBeDefined()
    expect(clause!.faqs).toBeDefined()

    const schema = buildFAQPageSchema(clause!.faqs!)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity.length).toBe(3)
  })
})
