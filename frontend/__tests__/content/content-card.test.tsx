import React from 'react'
import { render, screen } from '@testing-library/react'
import { ContentCard } from '@/components/content/content-card'
import type { ContentMeta } from '@/lib/content-types'

// Mock next/link to render a plain anchor tag
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

const mockContent: ContentMeta = {
  title: 'What Is Lease Abstraction?',
  slug: 'what-is-lease-abstraction',
  description:
    'Learn how lease abstraction transforms commercial lease PDFs into structured data for property managers.',
  publishedAt: '2024-06-15',
  updatedAt: '2024-07-01',
  author: 'Lextract Team',
  category: 'articles',
  silo: 'lease-abstraction',
  tags: ['lease-abstraction', 'commercial-real-estate', 'property-management', 'extra-tag'],
  readingTime: 5,
  featured: true,
  funnelStage: 'mofu',
}

describe('ContentCard', () => {
  it('renders article element', () => {
    render(<ContentCard content={mockContent} />)
    const article = screen.getByRole('article')
    expect(article).toBeInTheDocument()
  })

  it('renders content title', () => {
    render(<ContentCard content={mockContent} />)
    expect(screen.getByText('What Is Lease Abstraction?')).toBeInTheDocument()
  })

  it('renders content description', () => {
    render(<ContentCard content={mockContent} />)
    expect(
      screen.getByText(/Learn how lease abstraction transforms/)
    ).toBeInTheDocument()
  })

  it('renders reading time', () => {
    render(<ContentCard content={mockContent} />)
    expect(screen.getByText('5 min read')).toBeInTheDocument()
  })

  it('renders category badge', () => {
    render(<ContentCard content={mockContent} />)
    expect(screen.getByText('articles')).toBeInTheDocument()
  })

  it('links to correct path using default basePath', () => {
    render(<ContentCard content={mockContent} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      '/resources/articles/what-is-lease-abstraction'
    )
  })

  it('links to correct path using custom basePath', () => {
    render(<ContentCard content={mockContent} basePath="/blog" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      '/blog/articles/what-is-lease-abstraction'
    )
  })

  it('renders at most 3 tags', () => {
    render(<ContentCard content={mockContent} />)
    expect(screen.getByText('lease-abstraction')).toBeInTheDocument()
    expect(screen.getByText('commercial-real-estate')).toBeInTheDocument()
    expect(screen.getByText('property-management')).toBeInTheDocument()
    expect(screen.queryByText('extra-tag')).not.toBeInTheDocument()
  })

  it('renders with no tags gracefully', () => {
    const contentNoTags: ContentMeta = { ...mockContent, tags: [] }
    render(<ContentCard content={contentNoTags} />)
    expect(screen.getByText('What Is Lease Abstraction?')).toBeInTheDocument()
  })
})
