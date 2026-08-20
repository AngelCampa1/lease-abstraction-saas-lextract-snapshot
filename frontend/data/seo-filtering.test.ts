import { getAllIndexableFieldSlugs } from './fields'
import { getIndexableGlossaryTermBySlug } from './glossary'
import { LOCATIONS, getAllIndexableLocationSlugs, getLocationSeoRedirect } from './locations'
import { getStateBySlug } from './states'

describe('seo-driven data filtering', () => {
  it('removes low-value field pages from the live slug set', () => {
    expect(getAllIndexableFieldSlugs()).toContain('holdover-rate')
    expect(getAllIndexableFieldSlugs()).not.toContain('landlord-legal-name')
  })

  it('removes merged glossary pages from the live term set', () => {
    expect(getIndexableGlossaryTermBySlug('lease-abstraction')).toBeUndefined()
    expect(getIndexableGlossaryTermBySlug('cam-charges')).toBeDefined()
  })

  it('keeps only the major market location pages indexable', () => {
    expect(getAllIndexableLocationSlugs()).toContain('new-york-commercial-lease-abstraction')
    expect(getAllIndexableLocationSlugs()).not.toContain('little-rock-commercial-lease-abstraction')
  })

  // A pruned location redirects to its state page. Washington DC has a
  // stateSlug ('district-of-columbia') with no entry in states.ts, so building
  // the target from stateSlug unconditionally produced a 308 into a 404.
  it('never redirects a pruned location to a state page that does not exist', () => {
    for (const location of LOCATIONS) {
      const target = getLocationSeoRedirect(location.slug)
      if (target === null) continue

      const stateSlug = target.replace('/resources/states/', '')
      if (stateSlug === target) continue // fell back to a non-state target

      expect(
        getStateBySlug(stateSlug),
        `${location.slug} redirects to ${target}, which 404s`
      ).toBeDefined()
    }
  })

  it('falls back to the states index when a location has no state page', () => {
    expect(getLocationSeoRedirect('washington-dc-commercial-lease-abstraction')).toBe(
      '/resources/states'
    )
  })
})
