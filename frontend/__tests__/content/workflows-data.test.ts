/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { WORKFLOWS, getAllWorkflowSlugs, getWorkflowBySlug } from '@/data/workflows'

const VALID_CATEGORIES = ['import', 'export', 'compliance', 'analysis', 'migration'] as const
const VALID_TOOLS = ['source', 'lextract', 'destination'] as const

// ─── WORKFLOWS ────────────────────────────────────────────────────────

describe('WORKFLOWS', () => {
  it('contains at least 30 entries', () => {
    expect(WORKFLOWS.length).toBeGreaterThanOrEqual(30)
  })

  it('getAllWorkflowSlugs returns all slugs', () => {
    const slugs = getAllWorkflowSlugs()
    expect(slugs.length).toBe(WORKFLOWS.length)
    expect(slugs).toEqual(WORKFLOWS.map((w) => w.slug))
  })

  it('every slug is unique', () => {
    const slugs = WORKFLOWS.map((w) => w.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every workflow has required non-empty string fields', () => {
    for (const w of WORKFLOWS) {
      expect(w.name.length, `name empty: ${w.slug}`).toBeGreaterThan(0)
      expect(w.slug.length, `slug empty: ${w.slug}`).toBeGreaterThan(0)
      expect(w.toolName.length, `toolName empty: ${w.slug}`).toBeGreaterThan(0)
      expect(w.toolSlug.length, `toolSlug empty: ${w.slug}`).toBeGreaterThan(0)
      expect(w.problem.length, `problem too short: ${w.slug}`).toBeGreaterThan(50)
      expect(w.timeSaved.length, `timeSaved empty: ${w.slug}`).toBeGreaterThan(0)
      expect(w.metaTitle.length, `metaTitle empty: ${w.slug}`).toBeGreaterThan(0)
      expect(w.metaDescription.length, `metaDescription too short: ${w.slug}`).toBeGreaterThan(50)
    }
  })

  it('every workflow has at least 3 steps', () => {
    for (const w of WORKFLOWS) {
      expect(w.steps.length, `steps < 3: ${w.slug}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('every workflow step has a valid tool field', () => {
    for (const w of WORKFLOWS) {
      for (const step of w.steps) {
        expect(
          // Widened to string[] so .includes() accepts step.tool (typed as string union)
          (VALID_TOOLS as ReadonlyArray<string>).includes(step.tool),
          `invalid tool "${step.tool}" in step "${step.name}" of workflow "${w.slug}"`,
        ).toBe(true)
      }
    }
  })

  it('every workflow step has non-empty name and description', () => {
    for (const w of WORKFLOWS) {
      for (const step of w.steps) {
        expect(step.name.length, `step name empty in ${w.slug}`).toBeGreaterThan(0)
        expect(step.description.length, `step description empty in ${w.slug}`).toBeGreaterThan(0)
      }
    }
  })

  it('every workflow has at least one FAQ', () => {
    for (const w of WORKFLOWS) {
      expect(w.faqs.length, `no FAQs: ${w.slug}`).toBeGreaterThan(0)
      for (const faq of w.faqs) {
        expect(faq.question.length, `FAQ question empty in ${w.slug}`).toBeGreaterThan(0)
        expect(faq.answer.length, `FAQ answer empty in ${w.slug}`).toBeGreaterThan(0)
      }
    }
  })

  it('every workflow has a valid category', () => {
    for (const w of WORKFLOWS) {
      expect(
        // Widened to string[] so .includes() accepts w.category (typed as string union)
        (VALID_CATEGORIES as ReadonlyArray<string>).includes(w.category),
        `invalid category "${w.category}" in workflow "${w.slug}"`,
      ).toBe(true)
    }
  })

  it('targetPersonas is non-empty for every workflow', () => {
    for (const w of WORKFLOWS) {
      expect(w.targetPersonas.length, `targetPersonas empty: ${w.slug}`).toBeGreaterThan(0)
      for (const persona of w.targetPersonas) {
        expect(persona.length, `empty persona string in ${w.slug}`).toBeGreaterThan(0)
      }
    }
  })

  it('relatedWorkflows slugs only reference valid workflow slugs', () => {
    const allSlugs = new Set(WORKFLOWS.map((w) => w.slug))
    for (const w of WORKFLOWS) {
      for (const related of w.relatedWorkflows) {
        expect(
          allSlugs.has(related),
          `relatedWorkflow slug "${related}" in "${w.slug}" does not exist`,
        ).toBe(true)
      }
    }
  })

  it('no workflow references itself in relatedWorkflows', () => {
    for (const w of WORKFLOWS) {
      expect(
        w.relatedWorkflows.includes(w.slug),
        `"${w.slug}" references itself in relatedWorkflows`,
      ).toBe(false)
    }
  })

  it('getWorkflowBySlug returns the correct entry', () => {
    const first = WORKFLOWS[0]
    const found = getWorkflowBySlug(first.slug)
    expect(found).toBeDefined()
    expect(found?.name).toBe(first.name)
    expect(found?.slug).toBe(first.slug)
  })

  it('getWorkflowBySlug returns the correct entry for a mid-list slug', () => {
    const mid = WORKFLOWS[Math.floor(WORKFLOWS.length / 2)]
    const found = getWorkflowBySlug(mid.slug)
    expect(found).toBeDefined()
    expect(found?.slug).toBe(mid.slug)
  })

  it('getWorkflowBySlug returns undefined for unknown slug', () => {
    expect(getWorkflowBySlug('nonexistent-workflow-slug')).toBeUndefined()
  })

  it('getWorkflowBySlug returns undefined for empty string', () => {
    expect(getWorkflowBySlug('')).toBeUndefined()
  })
})
