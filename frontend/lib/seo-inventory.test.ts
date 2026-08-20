import {
  getContentRedirectTarget,
  getExplicitSeoRedirect,
  isIndexableContentSlug,
  isRetainedSeoSlug,
} from './seo-inventory'

describe('seo inventory', () => {
  it('retains only the curated field pages', () => {
    expect(isRetainedSeoSlug('fields', 'holdover-rate')).toBe(true)
    expect(isRetainedSeoSlug('fields', 'landlord-legal-name')).toBe(false)
  })

  it('defines explicit redirects for merged glossary pages', () => {
    expect(getExplicitSeoRedirect('glossary', 'lease-abstraction')).toBe(
      '/resources/articles/what-is-commercial-lease-abstraction'
    )
  })

  it('keeps only the priority location pages live', () => {
    expect(
      isRetainedSeoSlug('locations', 'new-york-commercial-lease-abstraction')
    ).toBe(true)
    expect(
      isRetainedSeoSlug('locations', 'little-rock-commercial-lease-abstraction')
    ).toBe(false)
  })

  it('removes merged articles from the indexable set', () => {
    expect(
      isIndexableContentSlug('articles', 'what-is-commercial-lease-abstraction')
    ).toBe(true)
    expect(isIndexableContentSlug('articles', 'what-is-lease-extraction')).toBe(
      false
    )
    expect(getContentRedirectTarget('articles', 'what-is-lease-extraction')).toBe(
      '/resources/articles/what-is-commercial-lease-abstraction'
    )
  })
})
