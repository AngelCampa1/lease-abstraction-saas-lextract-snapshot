/** @vitest-environment node */
import { describe, expect, it } from 'vitest'

import {
  resolveClauseHref,
  resolveFieldHref,
  resolveGlossaryHref,
} from '@/lib/pseo-paths'

describe('pSEO path resolution', () => {
  it('returns live routes for retained content', () => {
    expect(resolveFieldHref('base-rent-annual')).toBe('/fields/base-rent-annual')
    expect(resolveClauseHref('gross-up-provision')).toBe('/clauses/gross-up-provision')
    expect(resolveGlossaryHref('base-rent')).toBe('/glossary/base-rent')
  })

  it('falls back to retention-aware redirects for non-indexable content', () => {
    expect(resolveFieldHref('rofr-space')).toBe('/fields')
    expect(resolveGlossaryHref('holdover-provision')).toBe('/glossary')
    expect(resolveGlossaryHref('lease-abstraction')).toBe(
      '/resources/articles/what-is-commercial-lease-abstraction'
    )
  })

  it('suppresses stale identifiers that do not map to a live slug', () => {
    expect(resolveFieldHref('landlord_legal_name')).toBeNull()
    expect(resolveFieldHref('annual_base_rent')).toBeNull()
    expect(resolveClauseHref('rent-escalation')).toBeNull()
  })
})
