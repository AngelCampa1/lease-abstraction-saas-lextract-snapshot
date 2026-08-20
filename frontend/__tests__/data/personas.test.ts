import { describe, it, expect } from 'vitest'
import {
  PERSONAS,
  getPersonaBySlug,
  getAllPersonaSlugs,
  getPersonaByName,
} from '@/data/personas'
import { getFieldBySlug } from '@/data/fields'
import { RED_FLAG_BY_ID } from '@/data/red-flags'
import { getUseCaseBySlug } from '@/data/use-cases'

describe('PERSONAS data integrity', () => {
  it('exposes the full set of professional personas', () => {
    expect(PERSONAS.length).toBeGreaterThanOrEqual(8)
  })

  it('has unique slugs', () => {
    const slugs = PERSONAS.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('has kebab-case slugs', () => {
    for (const p of PERSONAS) {
      expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  describe.each(PERSONAS.map((p) => [p.slug, p] as const))(
    'persona "%s"',
    (_slug, persona) => {
      it('has non-empty core text fields', () => {
        expect(persona.role.trim().length).toBeGreaterThan(0)
        expect(persona.shortTitle.trim().length).toBeGreaterThan(0)
        expect(persona.heroSubhead.trim().length).toBeGreaterThan(0)
        expect(persona.challenge.trim().length).toBeGreaterThan(0)
        expect(persona.solution.trim().length).toBeGreaterThan(0)
        expect(persona.metaTitle.trim().length).toBeGreaterThan(0)
        expect(persona.metaDescription.trim().length).toBeGreaterThan(0)
      })

      it('has a complete roiStat', () => {
        expect(persona.roiStat.value.trim().length).toBeGreaterThan(0)
        expect(persona.roiStat.label.trim().length).toBeGreaterThan(0)
        expect(persona.roiStat.detail.trim().length).toBeGreaterThan(0)
      })

      it('has at least four outcomes, all non-empty', () => {
        expect(persona.outcomes.length).toBeGreaterThanOrEqual(4)
        for (const outcome of persona.outcomes) {
          expect(outcome.trim().length).toBeGreaterThan(0)
        }
      })

      it('has workflow steps with clean names and descriptions', () => {
        expect(persona.workflowSteps.length).toBeGreaterThan(0)
        for (const step of persona.workflowSteps) {
          expect(step.name.trim().length).toBeGreaterThan(0)
          expect(step.description.trim().length).toBeGreaterThan(0)
          // Guard against the find/replace corruption from the earlier draft.
          expect(step.name).not.toContain('Portfolio workflow')
        }
      })

      it('has FAQs with questions and answers', () => {
        expect(persona.faqs.length).toBeGreaterThan(0)
        for (const faq of persona.faqs) {
          expect(faq.question.trim().length).toBeGreaterThan(0)
          expect(faq.answer.trim().length).toBeGreaterThan(0)
        }
      })

      it('references key fields that all resolve in the field schema', () => {
        expect(persona.keyFields.length).toBeGreaterThan(0)
        for (const rawSlug of persona.keyFields) {
          const fieldSlug = rawSlug.replace(/_/g, '-')
          expect(
            getFieldBySlug(fieldSlug),
            `keyField "${rawSlug}" should resolve to a known field`
          ).toBeDefined()
        }
      })

      it('references red flags that all resolve to known rules', () => {
        expect(persona.relevantRedFlags.length).toBeGreaterThan(0)
        for (const rfId of persona.relevantRedFlags) {
          expect(
            RED_FLAG_BY_ID[rfId],
            `red flag "${rfId}" should resolve to a known rule`
          ).toBeDefined()
        }
      })

      it('references use cases that all resolve to known use cases', () => {
        for (const ucSlug of persona.relatedUseCases) {
          expect(
            getUseCaseBySlug(ucSlug),
            `use case "${ucSlug}" should resolve to a known use case`
          ).toBeDefined()
        }
      })
    }
  )
})

describe('persona helper functions', () => {
  it('getPersonaBySlug returns the matching persona', () => {
    const persona = getPersonaBySlug('tenant-representatives')
    expect(persona?.role).toBe('Tenant Representatives')
  })

  it('getPersonaBySlug returns undefined for an unknown slug', () => {
    expect(getPersonaBySlug('not-a-real-persona')).toBeUndefined()
  })

  it('getAllPersonaSlugs returns every slug', () => {
    expect(getAllPersonaSlugs().sort()).toEqual(
      PERSONAS.map((p) => p.slug).sort()
    )
  })

  it('getPersonaByName matches on role name, case-insensitive', () => {
    expect(getPersonaByName('property managers')?.slug).toBe(
      'property-managers'
    )
  })

  it('getPersonaByName matches on short title', () => {
    expect(getPersonaByName('Tenant Reps')?.slug).toBe('tenant-representatives')
  })

  it('getPersonaByName returns undefined for an empty or unknown name', () => {
    expect(getPersonaByName('')).toBeUndefined()
    expect(getPersonaByName('nobody')).toBeUndefined()
  })
})
