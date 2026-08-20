import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RelatedContent } from '@/components/content/related-content'
import type { ContentMeta } from '@/lib/content-types'

const makeMeta = (overrides: Partial<ContentMeta>): ContentMeta => ({
  title: 'Default Title',
  slug: 'default-slug',
  description: 'A sufficiently long description that passes the minimum fifty character validation requirement.',
  publishedAt: '2026-03-01',
  updatedAt: '2026-03-01',
  author: 'Test Author',
  category: 'articles',
  silo: 'lease-abstraction',
  tags: ['test'],
  readingTime: 5,
  featured: false,
  funnelStage: 'mofu',
  ...overrides,
})

describe('RelatedContent', () => {
  it('renders heading "Related Articles"', () => {
    const items = [
      makeMeta({ title: 'Article One', slug: 'article-one' }),
      makeMeta({ title: 'Article Two', slug: 'article-two' }),
    ]
    render(<RelatedContent items={items} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Related Articles')
  })

  it('renders content cards for each item', () => {
    const items = [
      makeMeta({ title: 'Article One', slug: 'article-one' }),
      makeMeta({ title: 'Article Two', slug: 'article-two' }),
    ]
    render(<RelatedContent items={items} />)
    expect(screen.getByText('Article One')).toBeInTheDocument()
    expect(screen.getByText('Article Two')).toBeInTheDocument()
  })

  it('uses custom heading when provided', () => {
    const items = [
      makeMeta({ title: 'Guide One', slug: 'guide-one', category: 'guides' }),
      makeMeta({ title: 'Guide Two', slug: 'guide-two', category: 'guides' }),
    ]
    render(<RelatedContent items={items} heading="Related Guides" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Related Guides')
  })

  it('limits display to 3 items maximum', () => {
    const items = [
      makeMeta({ title: 'One', slug: 'one' }),
      makeMeta({ title: 'Two', slug: 'two' }),
      makeMeta({ title: 'Three', slug: 'three' }),
      makeMeta({ title: 'Four', slug: 'four' }),
    ]
    render(<RelatedContent items={items} />)
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
    expect(screen.getByText('Three')).toBeInTheDocument()
    expect(screen.queryByText('Four')).not.toBeInTheDocument()
  })

  it('returns null when items array is empty', () => {
    const { container } = render(<RelatedContent items={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('uses custom basePath', () => {
    const items = [makeMeta({ title: 'Test', slug: 'test' })]
    render(<RelatedContent items={items} basePath="/custom" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/custom/articles/test')
  })
})
