/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import {
  buildOrganizationSchema,
  buildWebApplicationSchema,
  buildFAQPageSchema,
  buildHowToSchema,
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildDefinedTermSchema,
  buildDefinedTermSetSchema,
  buildProductSchema,
  buildItemListSchema,
  buildSpeakableSchema,
  buildCollectionPageSchema,
  buildPersonSchema,
  buildOrganizationWithSearchSchema,
  buildServiceSchema,
} from '@/lib/schema'
import { SITE_URL } from '@/lib/site-config'

describe('buildOrganizationSchema', () => {
  it('returns schema with correct @context and @type', () => {
    const schema = buildOrganizationSchema()
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Organization')
  })

  it('has Lextract as name', () => {
    const schema = buildOrganizationSchema()
    expect(schema.name).toBe('Lextract')
  })

  it('includes url', () => {
    const schema = buildOrganizationSchema()
    expect(schema.url).toBe('https://lextract.io')
  })

  it('includes description about lease abstraction', () => {
    const schema = buildOrganizationSchema()
    expect(schema.description).toContain('lease')
  })

  it('includes logo pointing to the brand logo asset', () => {
    const schema = buildOrganizationSchema()
    expect(schema.logo).toBe(`${SITE_URL}/brand/lextract-logo.png`)
  })

  it('includes foundingDate', () => {
    const schema = buildOrganizationSchema()
    expect(schema.foundingDate).toBe('2026')
  })

  it('includes sameAs array', () => {
    const schema = buildOrganizationSchema()
    expect(Array.isArray(schema.sameAs)).toBe(true)
  })
})

describe('buildWebApplicationSchema', () => {
  it('returns WebApplication type', () => {
    const schema = buildWebApplicationSchema()
    expect(schema['@type']).toBe('WebApplication')
  })

  it('has Lextract as name', () => {
    const schema = buildWebApplicationSchema()
    expect(schema.name).toBe('Lextract')
  })

  it('has BusinessApplication category', () => {
    const schema = buildWebApplicationSchema()
    expect(schema.applicationCategory).toBe('BusinessApplication')
  })

  it('includes $15 price point in offers', () => {
    const schema = buildWebApplicationSchema()
    expect(schema.offers['@type']).toBe('Offer')
    expect(schema.offers.price).toBe('15')
    expect(schema.offers.priceCurrency).toBe('USD')
  })

  it('has Web operating system', () => {
    const schema = buildWebApplicationSchema()
    expect(schema.operatingSystem).toBe('Web')
  })
})

describe('buildFAQPageSchema', () => {
  it('returns FAQPage type', () => {
    const schema = buildFAQPageSchema([])
    expect(schema['@type']).toBe('FAQPage')
  })

  it('maps question/answer pairs to mainEntity', () => {
    const items = [
      { question: 'What is Lextract?', answer: 'A lease tool.' },
      { question: 'How much?', answer: '$15 per lease.' },
    ]
    const schema = buildFAQPageSchema(items)
    expect(schema.mainEntity).toHaveLength(2)
    expect(schema.mainEntity[0]['@type']).toBe('Question')
    expect(schema.mainEntity[0].name).toBe('What is Lextract?')
    expect(schema.mainEntity[0].acceptedAnswer['@type']).toBe('Answer')
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('A lease tool.')
  })

  it('handles empty array', () => {
    const schema = buildFAQPageSchema([])
    expect(schema.mainEntity).toHaveLength(0)
  })
})

describe('buildHowToSchema', () => {
  it('returns HowTo type', () => {
    const schema = buildHowToSchema({ name: 'Test', steps: [] })
    expect(schema['@type']).toBe('HowTo')
  })

  it('includes name and step array', () => {
    const steps = [
      { name: 'Upload', text: 'Upload your lease PDF' },
      { name: 'Extract', text: 'AI extracts fields' },
    ]
    const schema = buildHowToSchema({ name: 'How to use Lextract', steps })
    expect(schema.name).toBe('How to use Lextract')
    expect(schema.step).toHaveLength(2)
    expect(schema.step[0]['@type']).toBe('HowToStep')
    expect(schema.step[0].name).toBe('Upload')
  })
})

describe('buildArticleSchema', () => {
  it('returns Article type', () => {
    const schema = buildArticleSchema({
      headline: 'Test',
      description: 'Desc',
      url: 'https://lextract.io/blog/test',
      datePublished: '2026-01-01',
      dateModified: '2026-01-02',
      author: 'Test Author',
    })
    expect(schema['@type']).toBe('Article')
  })

  it('includes all required fields', () => {
    const schema = buildArticleSchema({
      headline: 'My Article',
      description: 'Article desc',
      url: 'https://lextract.io/blog/my-article',
      datePublished: '2026-03-01',
      dateModified: '2026-03-15',
      author: 'Angel Campa',
    })
    expect(schema.headline).toBe('My Article')
    expect(schema.description).toBe('Article desc')
    expect(schema.url).toBe('https://lextract.io/blog/my-article')
    expect(schema.datePublished).toBe('2026-03-01')
    expect(schema.dateModified).toBe('2026-03-15')
    expect(schema.author.name).toBe('Angel Campa')
    expect(schema.publisher.name).toBe('Lextract')
  })

  it('strips job title suffix from author name', () => {
    const schema = buildArticleSchema({
      headline: 'Test',
      description: 'Desc',
      url: 'https://lextract.io/blog/test',
      datePublished: '2026-01-01',
      dateModified: '2026-01-01',
      author: 'Angel Campa, Founder',
    })
    expect(schema.author.name).toBe('Angel Campa')
    expect(schema.author.jobTitle).toBe('Founder')
  })

  it('defaults jobTitle to Founder when no comma in author string', () => {
    const schema = buildArticleSchema({
      headline: 'Test',
      description: 'Desc',
      url: 'https://lextract.io/blog/test',
      datePublished: '2026-01-01',
      dateModified: '2026-01-01',
      author: 'Angel Campa',
    })
    expect(schema.author.jobTitle).toBe('Founder')
  })

  it('includes author profile url for Angel Campa', () => {
    const schema = buildArticleSchema({
      headline: 'Test',
      description: 'Desc',
      url: 'https://lextract.io/blog/test',
      datePublished: '2026-01-01',
      dateModified: '2026-01-01',
      author: 'Angel Campa',
    })
    expect(schema.author.url).toBe('https://lextract.io/about/angel-campa')
  })

  it('includes an absolute image when provided', () => {
    const schema = buildArticleSchema({
      headline: 'Test',
      description: 'Desc',
      url: 'https://lextract.io/blog/test',
      datePublished: '2026-01-01',
      dateModified: '2026-01-02',
      author: 'Author',
      image: 'https://lextract.io/og-image.png',
    })
    expect(schema.image).toBe('https://lextract.io/og-image.png')
  })

  it('defaults to the canonical Open Graph image when not provided', () => {
    const schema = buildArticleSchema({
      headline: 'Test',
      description: 'Desc',
      url: 'https://lextract.io/blog/test',
      datePublished: '2026-01-01',
      dateModified: '2026-01-02',
      author: 'Author',
    })
    expect(schema.image).toBe(`${SITE_URL}/brand/lextract-og.png`)
  })
})

describe('buildBreadcrumbSchema', () => {
  it('returns BreadcrumbList type', () => {
    const schema = buildBreadcrumbSchema([])
    expect(schema['@type']).toBe('BreadcrumbList')
  })

  it('maps items to itemListElement with positions', () => {
    const items = [
      { name: 'Home', url: 'https://lextract.io' },
      { name: 'Blog', url: 'https://lextract.io/blog' },
      { name: 'Article', url: 'https://lextract.io/blog/test' },
    ]
    const schema = buildBreadcrumbSchema(items)
    expect(schema.itemListElement).toHaveLength(3)
    expect(schema.itemListElement[0].position).toBe(1)
    expect(schema.itemListElement[0].name).toBe('Home')
    expect(schema.itemListElement[1].position).toBe(2)
    expect(schema.itemListElement[2].position).toBe(3)
  })

  it('handles single item', () => {
    const schema = buildBreadcrumbSchema([{ name: 'Home', url: '/' }])
    expect(schema.itemListElement).toHaveLength(1)
    expect(schema.itemListElement[0]['@type']).toBe('ListItem')
  })
})

describe('buildDefinedTermSchema', () => {
  it('returns DefinedTerm type', () => {
    const schema = buildDefinedTermSchema({ term: 'CAM Charges', definition: 'Common area fees.', slug: 'cam-charges' })
    expect(schema['@type']).toBe('DefinedTerm')
  })

  it('includes correct @context', () => {
    const schema = buildDefinedTermSchema({ term: 'NNN Lease', definition: 'Triple net.', slug: 'nnn-lease' })
    expect(schema['@context']).toBe('https://schema.org')
  })

  it('sets name from term', () => {
    const schema = buildDefinedTermSchema({ term: 'Base Rent', definition: 'Fixed rent amount.', slug: 'base-rent' })
    expect(schema.name).toBe('Base Rent')
  })

  it('sets description from definition', () => {
    const schema = buildDefinedTermSchema({ term: 'Base Rent', definition: 'Fixed rent amount.', slug: 'base-rent' })
    expect(schema.description).toBe('Fixed rent amount.')
  })

  it('builds url from slug', () => {
    const schema = buildDefinedTermSchema({ term: 'CAM Charges', definition: 'Fees.', slug: 'cam-charges' })
    expect(schema.url).toBe(`${SITE_URL}/glossary/cam-charges`)
  })

  it('sets inDefinedTermSet with DefinedTermSet type and glossary url', () => {
    const schema = buildDefinedTermSchema({ term: 'CAM Charges', definition: 'Fees.', slug: 'cam-charges' })
    expect(schema.inDefinedTermSet['@type']).toBe('DefinedTermSet')
    expect(schema.inDefinedTermSet.name).toBe('Commercial Lease Glossary')
    expect(schema.inDefinedTermSet.url).toBe(`${SITE_URL}/glossary`)
  })
})

describe('buildDefinedTermSetSchema', () => {
  it('returns DefinedTermSet type', () => {
    const schema = buildDefinedTermSetSchema([])
    expect(schema['@type']).toBe('DefinedTermSet')
  })

  it('includes correct context', () => {
    const schema = buildDefinedTermSetSchema([])
    expect(schema['@context']).toBe('https://schema.org')
  })

  it('has name and description', () => {
    const schema = buildDefinedTermSetSchema([])
    expect(schema.name).toBe('Commercial Lease Glossary')
    expect(schema.description).toContain('commercial real estate')
  })

  it('maps terms to definedTerm array', () => {
    const terms = [
      { term: 'CAM Charges', definition: 'Common area maintenance fees.' },
      { term: 'NNN Lease', definition: 'Triple net lease structure.' },
    ]
    const schema = buildDefinedTermSetSchema(terms)
    expect(schema.definedTerm).toHaveLength(2)
    expect(schema.definedTerm[0]['@type']).toBe('DefinedTerm')
    expect(schema.definedTerm[0].name).toBe('CAM Charges')
    expect(schema.definedTerm[0].description).toBe('Common area maintenance fees.')
    expect(schema.definedTerm[1].name).toBe('NNN Lease')
  })

  it('handles empty terms array', () => {
    const schema = buildDefinedTermSetSchema([])
    expect(schema.definedTerm).toHaveLength(0)
  })
})

describe('buildItemListSchema', () => {
  const items = [
    { name: 'CAM Charges', url: 'https://lextract.io/glossary/cam-charges', description: 'Common area fees.' },
    { name: 'Base Rent', url: 'https://lextract.io/glossary/base-rent', description: 'Fixed rent amount.' },
    { name: 'NNN Lease', url: 'https://lextract.io/glossary/nnn-lease' },
  ]

  it('returns ItemList type with correct @context', () => {
    const schema = buildItemListSchema({ name: 'Test List', description: 'A test.', items })
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('ItemList')
  })

  it('sets name and description from options', () => {
    const schema = buildItemListSchema({ name: 'Glossary', description: 'Lease terms.', items })
    expect(schema.name).toBe('Glossary')
    expect(schema.description).toBe('Lease terms.')
  })

  it('sets numberOfItems to items array length', () => {
    const schema = buildItemListSchema({ name: 'List', description: 'Desc.', items })
    expect(schema.numberOfItems).toBe(3)
  })

  it('assigns 1-based position to each itemListElement', () => {
    const schema = buildItemListSchema({ name: 'List', description: 'Desc.', items })
    expect(schema.itemListElement[0].position).toBe(1)
    expect(schema.itemListElement[1].position).toBe(2)
    expect(schema.itemListElement[2].position).toBe(3)
  })

  it('sets ListItem @type on each element', () => {
    const schema = buildItemListSchema({ name: 'List', description: 'Desc.', items })
    for (const el of schema.itemListElement) {
      expect(el['@type']).toBe('ListItem')
    }
  })

  it('maps name and url from each item', () => {
    const schema = buildItemListSchema({ name: 'List', description: 'Desc.', items })
    expect(schema.itemListElement[0].name).toBe('CAM Charges')
    expect(schema.itemListElement[0].url).toBe('https://lextract.io/glossary/cam-charges')
    expect(schema.itemListElement[1].name).toBe('Base Rent')
  })

  it('includes description when provided', () => {
    const schema = buildItemListSchema({ name: 'List', description: 'Desc.', items })
    expect(schema.itemListElement[0].description).toBe('Common area fees.')
    expect(schema.itemListElement[1].description).toBe('Fixed rent amount.')
  })

  it('omits description when not provided', () => {
    const schema = buildItemListSchema({ name: 'List', description: 'Desc.', items })
    expect('description' in schema.itemListElement[2]).toBe(false)
  })

  it('omits url when not provided', () => {
    const schema = buildItemListSchema({
      name: 'List',
      description: 'Desc.',
      items: [{ name: 'No URL item' }],
    })
    expect(schema.itemListElement[0].name).toBe('No URL item')
    expect('url' in schema.itemListElement[0]).toBe(false)
  })

  it('handles empty items array', () => {
    const schema = buildItemListSchema({ name: 'Empty', description: 'No items.', items: [] })
    expect(schema.numberOfItems).toBe(0)
    expect(schema.itemListElement).toHaveLength(0)
  })
})

describe('buildProductSchema', () => {
  it('returns Product type with correct context', () => {
    const schema = buildProductSchema()
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Product')
  })

  it('has name and description', () => {
    const schema = buildProductSchema()
    expect(schema.name).toBe('Lextract Lease Abstraction')
    expect(schema.description).toContain('126')
  })

  it('includes image pointing to the brand Open Graph asset', () => {
    const schema = buildProductSchema()
    expect(schema.image).toBe(`${SITE_URL}/brand/lextract-og.png`)
  })

  it('has brand with Organization type', () => {
    const schema = buildProductSchema()
    expect(schema.brand['@type']).toBe('Organization')
    expect(schema.brand.name).toBe('Lextract')
    expect(schema.brand.url).toBe(SITE_URL)
  })

  it('has AggregateOffer with multi-tier pricing', () => {
    const schema = buildProductSchema()
    expect(schema.offers['@type']).toBe('AggregateOffer')
    expect(schema.offers.lowPrice).toBe('15')
    expect(schema.offers.highPrice).toBe('120')
    expect(schema.offers.priceCurrency).toBe('USD')
    expect(schema.offers.offerCount).toBe(3)
    expect(schema.offers.offers[0].price).toBe('15')
    expect(schema.offers.offers[1].price).toBe('65')
    expect(schema.offers.offers[2].price).toBe('120')
    expect(schema.offers.offers[0].availability).toBe('https://schema.org/InStock')
  })

  it('includes url pointing to site root', () => {
    const schema = buildProductSchema()
    expect(schema.url).toBe(SITE_URL)
  })
})

describe('buildSpeakableSchema', () => {
  it('returns a WebPage type wrapping SpeakableSpecification', () => {
    const schema = buildSpeakableSchema('https://lextract.io/glossary/cam-charges', ['#definition'])
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('WebPage')
    expect(schema['@id']).toBe('https://lextract.io/glossary/cam-charges')
    expect(schema.speakable['@type']).toBe('SpeakableSpecification')
    expect(schema.speakable.cssSelector).toEqual(['#definition'])
  })

  it('passes multiple CSS selectors through to speakable spec', () => {
    const schema = buildSpeakableSchema(
      'https://lextract.io/faq/what-is-cam',
      ['#faq-short-answer', '#faq-full-answer']
    )
    expect(schema.speakable.cssSelector).toHaveLength(2)
    expect(schema.speakable.cssSelector[0]).toBe('#faq-short-answer')
    expect(schema.speakable.cssSelector[1]).toBe('#faq-full-answer')
  })
})

describe('buildOrganizationSchema sameAs', () => {
  it('includes LinkedIn URL in sameAs', () => {
    const schema = buildOrganizationSchema()
    expect(schema.sameAs).toContain('https://www.linkedin.com/in/angelcampa1/')
  })
})

describe('buildOrganizationWithSearchSchema', () => {
  it('returns organization schema without unsupported SearchAction markup', () => {
    const schema = buildOrganizationWithSearchSchema()
    expect(schema['@type']).toBe('Organization')
    expect(schema.name).toBe('Lextract')
    expect(schema.sameAs).toContain('https://www.linkedin.com/in/angelcampa1/')
    expect('potentialAction' in schema).toBe(false)
  })
})

describe('buildCollectionPageSchema', () => {
  const parts = [
    { name: 'Glossary', url: 'https://lextract.io/glossary', description: 'Lease terms.' },
    { name: 'Fields', url: 'https://lextract.io/fields', description: 'Extracted fields.' },
  ]

  it('returns CollectionPage @type with schema.org context', () => {
    const schema = buildCollectionPageSchema({ name: 'Resources', description: 'All resources', url: 'https://lextract.io/resources', parts })
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('CollectionPage')
  })

  it('maps name, description, and url from opts', () => {
    const schema = buildCollectionPageSchema({ name: 'Test Name', description: 'Test desc', url: 'https://lextract.io/test', parts })
    expect(schema.name).toBe('Test Name')
    expect(schema.description).toBe('Test desc')
    expect(schema.url).toBe('https://lextract.io/test')
  })

  it('hasPart length matches parts array', () => {
    const schema = buildCollectionPageSchema({ name: 'R', description: 'D', url: 'https://lextract.io/r', parts })
    expect(schema.hasPart).toHaveLength(2)
  })

  it('each hasPart element has WebPage @type with name, url, description', () => {
    const schema = buildCollectionPageSchema({ name: 'R', description: 'D', url: 'https://lextract.io/r', parts })
    expect(schema.hasPart[0]['@type']).toBe('WebPage')
    expect(schema.hasPart[0].name).toBe('Glossary')
    expect(schema.hasPart[0].url).toBe('https://lextract.io/glossary')
    expect(schema.hasPart[0].description).toBe('Lease terms.')
    expect(schema.hasPart[1]['@type']).toBe('WebPage')
    expect(schema.hasPart[1].name).toBe('Fields')
  })

  it('empty parts array produces empty hasPart', () => {
    const schema = buildCollectionPageSchema({ name: 'R', description: 'D', url: 'https://lextract.io/r', parts: [] })
    expect(schema.hasPart).toEqual([])
  })
})

describe('buildPersonSchema', () => {
  const baseOpts = {
    name: 'Angel Campa',
    jobTitle: 'Founder',
    profileUrl: 'https://lextract.io/about/angel-campa',
  }

  it('returns Person @type with correct context', () => {
    const schema = buildPersonSchema(baseOpts)
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Person')
  })

  it('sets name and jobTitle', () => {
    const schema = buildPersonSchema(baseOpts)
    expect(schema.name).toBe('Angel Campa')
    expect(schema.jobTitle).toBe('Founder')
  })

  it('sets url to profileUrl', () => {
    const schema = buildPersonSchema(baseOpts)
    expect(schema.url).toBe('https://lextract.io/about/angel-campa')
  })

  it('includes image when imageUrl is provided', () => {
    const schema = buildPersonSchema({ ...baseOpts, imageUrl: 'https://lextract.io/images/angel-campa-avatar.svg' })
    expect(schema.image).toBe('https://lextract.io/images/angel-campa-avatar.svg')
  })

  it('omits image when imageUrl is not provided', () => {
    const schema = buildPersonSchema(baseOpts)
    expect('image' in schema).toBe(false)
  })

  it('includes linkedInUrl in sameAs', () => {
    const schema = buildPersonSchema({ ...baseOpts, linkedInUrl: 'https://linkedin.com/in/test' })
    expect(schema.sameAs).toContain('https://linkedin.com/in/test')
  })

  it('sets empty sameAs when linkedInUrl is not provided', () => {
    const schema = buildPersonSchema(baseOpts)
    expect(schema.sameAs).toEqual([])
  })

  it('sets worksFor to Lextract organization', () => {
    const schema = buildPersonSchema(baseOpts)
    expect(schema.worksFor['@type']).toBe('Organization')
    expect(schema.worksFor.name).toBe('Lextract')
    expect(schema.worksFor.url).toBe(SITE_URL)
  })
})

describe('buildServiceSchema', () => {
  it('builds service schema from options with Lextract provider and offer', () => {
    const schema = buildServiceSchema({
      name: 'Lease Abstraction Service',
      description: 'Extract structured commercial lease data from PDFs.',
      url: `${SITE_URL}/lease-abstraction-software`,
      serviceType: 'Lease Abstraction',
    })
    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Lease Abstraction Service',
      description: 'Extract structured commercial lease data from PDFs.',
      url: `${SITE_URL}/lease-abstraction-software`,
      serviceType: 'Lease Abstraction',
      provider: { '@type': 'Organization', name: 'Lextract', url: SITE_URL },
      offers: {
        '@type': 'Offer',
        price: '15',
        priceCurrency: 'USD',
      },
    })
    expect(schema.offers.description).toContain('$15 per lease')
  })
})
