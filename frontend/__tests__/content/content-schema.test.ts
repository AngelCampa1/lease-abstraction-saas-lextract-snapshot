/** @vitest-environment node */
import { contentFrontmatterSchema, expertQuoteItemSchema } from '@/lib/content-schema'

const validFrontmatter = {
  title: 'What Is Lease Abstraction?',
  slug: 'what-is-lease-abstraction',
  description:
    'Learn how lease abstraction transforms commercial lease PDFs into structured data for property managers.',
  publishedAt: '2024-06-15',
  updatedAt: '2024-07-01',
  author: 'Lextract Team',
  category: 'articles' as const,
  silo: 'lease-abstraction' as const,
  tags: ['lease-abstraction', 'commercial-real-estate'],
  readingTime: 5,
  featured: true,
}

describe('contentFrontmatterSchema', () => {
  it('parses valid frontmatter successfully', () => {
    const result = contentFrontmatterSchema.parse(validFrontmatter)
    expect(result.title).toBe('What Is Lease Abstraction?')
    expect(result.slug).toBe('what-is-lease-abstraction')
    expect(result.publishedAt).toBe('2024-06-15')
    expect(result.featured).toBe(true)
    expect(result.readingTime).toBe(5)
  })

  it('applies default value for featured when omitted', () => {
    const { featured: _featured, ...withoutFeatured } = validFrontmatter
    const result = contentFrontmatterSchema.parse(withoutFeatured)
    expect(result.featured).toBe(false)
  })

  it('requires updatedAt', () => {
    const result = contentFrontmatterSchema.parse(validFrontmatter)
    expect(result.updatedAt).toBe('2024-07-01')
  })

  it('rejects frontmatter without updatedAt', () => {
    const { updatedAt: _updatedAt, ...withoutUpdatedAt } = validFrontmatter
    expect(() => contentFrontmatterSchema.parse(withoutUpdatedAt)).toThrow()
  })

  it('rejects empty title', () => {
    expect(() =>
      contentFrontmatterSchema.parse({ ...validFrontmatter, title: '' })
    ).toThrow()
  })

  it('rejects empty slug', () => {
    expect(() =>
      contentFrontmatterSchema.parse({ ...validFrontmatter, slug: '' })
    ).toThrow()
  })

  it('rejects description shorter than 50 characters', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        description: 'Too short',
      })
    ).toThrow()
  })

  it('rejects description longer than 200 characters', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        description: 'A'.repeat(201),
      })
    ).toThrow()
  })

  it('rejects invalid date format for publishedAt', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        publishedAt: 'June 15, 2024',
      })
    ).toThrow()
  })

  it('rejects invalid date format for updatedAt', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        updatedAt: 'not-a-date',
      })
    ).toThrow()
  })

  it('rejects invalid category', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        category: 'blog',
      })
    ).toThrow()
  })

  it('accepts articles category', () => {
    const result = contentFrontmatterSchema.parse({
      ...validFrontmatter,
      category: 'articles',
    })
    expect(result.category).toBe('articles')
  })

  it('accepts guides category', () => {
    const result = contentFrontmatterSchema.parse({
      ...validFrontmatter,
      category: 'guides',
    })
    expect(result.category).toBe('guides')
  })

  it('rejects invalid silo', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        silo: 'unknown-silo',
      })
    ).toThrow()
  })

  it('accepts all valid silo values', () => {
    for (const silo of ['lease-abstraction', 'property-management', 'cam-audit']) {
      const result = contentFrontmatterSchema.parse({
        ...validFrontmatter,
        silo,
      })
      expect(result.silo).toBe(silo)
    }
  })

  it('rejects empty tags array items', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        tags: ['valid', ''],
      })
    ).toThrow()
  })

  it('accepts empty tags array', () => {
    const result = contentFrontmatterSchema.parse({
      ...validFrontmatter,
      tags: [],
    })
    expect(result.tags).toEqual([])
  })

  it('rejects non-integer reading time', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        readingTime: 3.5,
      })
    ).toThrow()
  })

  it('rejects zero reading time', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        readingTime: 0,
      })
    ).toThrow()
  })

  it('rejects negative reading time', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        readingTime: -1,
      })
    ).toThrow()
  })

  it('rejects missing required fields', () => {
    expect(() => contentFrontmatterSchema.parse({})).toThrow()
  })

  it('rejects empty author', () => {
    expect(() =>
      contentFrontmatterSchema.parse({ ...validFrontmatter, author: '' })
    ).toThrow()
  })

  it('accepts valid quotes array in frontmatter', () => {
    const result = contentFrontmatterSchema.parse({
      ...validFrontmatter,
      quotes: [
        {
          quote: 'Tenant improvement allowances in Class A office markets average $80 to $120 per square foot.',
          name: 'CBRE Research',
          title: 'North America Office Figures Q4 2025',
          organization: 'CBRE',
        },
      ],
    })
    expect(result.quotes).toHaveLength(1)
    expect(result.quotes?.[0].name).toBe('CBRE Research')
  })

  it('accepts frontmatter without quotes field', () => {
    const result = contentFrontmatterSchema.parse(validFrontmatter)
    expect(result.quotes).toBeUndefined()
  })

  it('rejects quotes with quote string shorter than 10 characters', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...validFrontmatter,
        quotes: [{ quote: 'Short', name: 'Author', title: 'Title', organization: 'Org' }],
      })
    ).toThrow()
  })
})

describe('expertQuoteItemSchema', () => {
  const validQuote = {
    quote: 'Tenant improvement allowances in Class A office markets average $80 to $120 per square foot.',
    name: 'CBRE Research',
    title: 'North America Office Figures Q4 2025',
    organization: 'CBRE',
  }

  it('parses a valid quote item', () => {
    const result = expertQuoteItemSchema.parse(validQuote)
    expect(result.quote).toBe(validQuote.quote)
    expect(result.name).toBe('CBRE Research')
    expect(result.title).toBe('North America Office Figures Q4 2025')
    expect(result.organization).toBe('CBRE')
  })

  it('rejects quote string shorter than 10 characters', () => {
    expect(() =>
      expertQuoteItemSchema.parse({ ...validQuote, quote: 'Too short' })
    ).toThrow()
  })

  it('rejects empty name', () => {
    expect(() =>
      expertQuoteItemSchema.parse({ ...validQuote, name: '' })
    ).toThrow()
  })

  it('rejects empty title', () => {
    expect(() =>
      expertQuoteItemSchema.parse({ ...validQuote, title: '' })
    ).toThrow()
  })

  it('rejects empty organization', () => {
    expect(() =>
      expertQuoteItemSchema.parse({ ...validQuote, organization: '' })
    ).toThrow()
  })

  it('rejects missing fields', () => {
    expect(() => expertQuoteItemSchema.parse({})).toThrow()
  })
})
