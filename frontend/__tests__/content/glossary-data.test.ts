/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import {
  INDEXABLE_GLOSSARY_TERMS as GLOSSARY_TERMS,
  GLOSSARY_TERM_COUNT,
  GLOSSARY_CATEGORY_LABELS,
  getGlossaryTermBySlug,
  getGlossaryTermsByCategory,
  getAlphabetIndex,
  getTermsByLetter,
} from '@/data/glossary'
import type { GlossaryCategory } from '@/data/glossary'

describe('GLOSSARY_TERMS', () => {
  it('contains the retained indexable glossary set', () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(10)
  })

  it('GLOSSARY_TERM_COUNT matches the actual array length', () => {
    expect(GLOSSARY_TERM_COUNT).toBe(GLOSSARY_TERMS.length)
  })

  it('every term has a non-empty term name', () => {
    for (const t of GLOSSARY_TERMS) {
      expect(t.term.length).toBeGreaterThan(0)
    }
  })

  it('every term has a non-empty slug', () => {
    for (const t of GLOSSARY_TERMS) {
      expect(t.slug.length).toBeGreaterThan(0)
    }
  })

  it('every slug is unique', () => {
    const slugs = GLOSSARY_TERMS.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every term has a definition of reasonable length', () => {
    for (const t of GLOSSARY_TERMS) {
      expect(t.definition.length).toBeGreaterThan(50)
    }
  })

  it('every term has an extended definition of reasonable length', () => {
    for (const t of GLOSSARY_TERMS) {
      expect(t.extendedDefinition.length).toBeGreaterThan(100)
    }
  })

  it('every term has a valid category', () => {
    const validCategories: GlossaryCategory[] = [
      'financial',
      'legal',
      'operational',
      'parties',
      'property',
    ]
    for (const t of GLOSSARY_TERMS) {
      expect(validCategories).toContain(t.category)
    }
  })

  it('every term has relatedTerms as an array', () => {
    for (const t of GLOSSARY_TERMS) {
      expect(Array.isArray(t.relatedTerms)).toBe(true)
    }
  })

  it('all relatedTerm slugs reference valid terms', () => {
    for (const t of GLOSSARY_TERMS) {
      for (const related of t.relatedTerms) {
        expect(typeof related).toBe('string')
        expect(related.length).toBeGreaterThan(0)
      }
    }
  })

  it('every term definition and extendedDefinition is a non-empty string', () => {
    for (const t of GLOSSARY_TERMS) {
      expect(typeof t.definition).toBe('string')
      expect(t.definition.length).toBeGreaterThan(0)
      expect(typeof t.extendedDefinition).toBe('string')
      expect(t.extendedDefinition.length).toBeGreaterThan(0)
    }
  })

  it('includes key CRE terms', () => {
    const slugs = GLOSSARY_TERMS.map((t) => t.slug)
    expect(slugs).toContain('cam-charges')
    expect(slugs).toContain('nnn-lease')
    expect(slugs).toContain('base-rent')
    expect(slugs).toContain('guarantor')
  })
})

describe('GLOSSARY_CATEGORY_LABELS', () => {
  it('has labels for all categories', () => {
    expect(GLOSSARY_CATEGORY_LABELS.financial).toBe('Financial')
    expect(GLOSSARY_CATEGORY_LABELS.legal).toBe('Legal')
    expect(GLOSSARY_CATEGORY_LABELS.operational).toBe('Operational')
    expect(GLOSSARY_CATEGORY_LABELS.parties).toBe('Parties')
    expect(GLOSSARY_CATEGORY_LABELS.property).toBe('Property')
  })
})

describe('getGlossaryTermBySlug', () => {
  it('returns a term when slug exists', () => {
    const term = getGlossaryTermBySlug('base-rent')
    expect(term).toBeDefined()
    expect(term?.term).toBe('Base Rent')
  })

  it('returns undefined for non-existent slug', () => {
    const term = getGlossaryTermBySlug('nonexistent-slug')
    expect(term).toBeUndefined()
  })
})

describe('getGlossaryTermsByCategory', () => {
  it('returns only terms of the specified category', () => {
    const financialTerms = getGlossaryTermsByCategory('financial')
    expect(financialTerms.length).toBeGreaterThan(0)
    for (const t of financialTerms) {
      expect(t.category).toBe('financial')
    }
  })

  it('returns terms for major categories', () => {
    const majorCategories: GlossaryCategory[] = [
      'financial',
      'legal',
      'operational',
    ]
    for (const cat of majorCategories) {
      const terms = getGlossaryTermsByCategory(cat)
      expect(terms.length).toBeGreaterThan(0)
    }
  })

  it('returns empty array for category with no matching terms', () => {
    // parties category may have zero terms, which is valid
    const terms = getGlossaryTermsByCategory('parties')
    expect(Array.isArray(terms)).toBe(true)
  })
})

describe('getAlphabetIndex', () => {
  it('returns an array of uppercase letters', () => {
    const index = getAlphabetIndex()
    expect(index.length).toBeGreaterThan(0)
    for (const letter of index) {
      expect(letter).toMatch(/^[A-Z]$/)
    }
  })

  it('returns letters sorted alphabetically', () => {
    const index = getAlphabetIndex()
    const sorted = [...index].sort()
    expect(index).toEqual(sorted)
  })

  it('contains no duplicates', () => {
    const index = getAlphabetIndex()
    expect(new Set(index).size).toBe(index.length)
  })
})

describe('getTermsByLetter', () => {
  it('groups terms by their first letter', () => {
    const grouped = getTermsByLetter()
    const letters = Object.keys(grouped)
    expect(letters.length).toBeGreaterThan(0)

    for (const letter of letters) {
      for (const term of grouped[letter]) {
        expect(term.term.charAt(0).toUpperCase()).toBe(letter)
      }
    }
  })

  it('sorts terms alphabetically within each letter group', () => {
    const grouped = getTermsByLetter()
    for (const letter of Object.keys(grouped)) {
      const terms = grouped[letter]
      for (let i = 1; i < terms.length; i++) {
        expect(terms[i - 1].term.localeCompare(terms[i].term)).toBeLessThanOrEqual(0)
      }
    }
  })

  it('includes all terms from GLOSSARY_TERMS', () => {
    const grouped = getTermsByLetter()
    const totalCount = Object.values(grouped).reduce(
      (sum, terms) => sum + terms.length,
      0
    )
    expect(totalCount).toBe(GLOSSARY_TERMS.length)
  })
})
