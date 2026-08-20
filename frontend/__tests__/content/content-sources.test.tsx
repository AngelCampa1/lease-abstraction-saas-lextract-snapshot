/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { contentFrontmatterSchema } from '@/lib/content-schema'
import { SourcesChecked } from '@/components/content/sources-checked'

describe('content source provenance', () => {
  const sourcedFrontmatter = {
    title: 'AI Lease Abstraction Accuracy Benchmarks',
    slug: 'ai-lease-abstraction-accuracy-benchmarks',
    description:
      'A sourced benchmark page that explains commercial lease abstraction accuracy claims.',
    publishedAt: '2026-04-01',
    updatedAt: '2026-05-12',
    author: 'Angel Campa, Founder',
    category: 'articles',
    silo: 'lease-abstraction',
    tags: ['benchmarks'],
    readingTime: 6,
    featured: false,
    funnelStage: 'mofu',
  }

  it('accepts source citations in content frontmatter', () => {
    const parsed = contentFrontmatterSchema.parse({
      ...sourcedFrontmatter,
      sources: [
        {
          title: 'FASB Accounting Standards Codification Topic 842',
          url: 'https://asc.fasb.org/topic&trid=2169532',
          publisher: 'Financial Accounting Standards Board',
          checkedAt: '2026-05-12',
        },
      ],
    })

    expect(parsed.sources?.[0]).toMatchObject({
      title: 'FASB Accounting Standards Codification Topic 842',
      publisher: 'Financial Accounting Standards Board',
      checkedAt: '2026-05-12',
    })
  })

  it('requires publisher and checked date on every source citation', () => {
    expect(() =>
      contentFrontmatterSchema.parse({
        ...sourcedFrontmatter,
        sources: [
          {
            title: 'FASB Accounting Standards Codification Topic 842',
            url: 'https://asc.fasb.org/topic&trid=2169532',
            checkedAt: '2026-05-12',
          },
        ],
      }),
    ).toThrow()

    expect(() =>
      contentFrontmatterSchema.parse({
        ...sourcedFrontmatter,
        sources: [
          {
            title: 'FASB Accounting Standards Codification Topic 842',
            url: 'https://asc.fasb.org/topic&trid=2169532',
            publisher: 'Financial Accounting Standards Board',
          },
        ],
      }),
    ).toThrow()
  })

  it('renders a compact Sources checked block with publisher and checked date', () => {
    render(
      <SourcesChecked
        sources={[
          {
            title: 'Commercial lease accounting standard',
            url: 'https://asc.fasb.org/topic&trid=2169532',
            publisher: 'Financial Accounting Standards Board',
            checkedAt: '2026-05-12',
          },
        ]}
      />,
    )

    expect(screen.getByText('Sources checked')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Commercial lease accounting standard' })).toHaveAttribute(
      'href',
      'https://asc.fasb.org/topic&trid=2169532',
    )
    expect(screen.getByText(/Financial Accounting Standards Board/)).toBeInTheDocument()
    expect(screen.getByText(/May 12, 2026/)).toBeInTheDocument()
  })

  it('renders nothing when no sources are provided', () => {
    const { container } = render(<SourcesChecked sources={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when sources are undefined', () => {
    const { container } = render(<SourcesChecked />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders complete source metadata for each source', () => {
    render(
      <SourcesChecked
        sources={[
          {
            title: 'First source',
            url: 'https://example.com/first',
            publisher: 'Example Publisher',
            checkedAt: '2026-05-12',
          },
          {
            title: 'Second source',
            url: 'https://example.com/second',
            publisher: 'Example Publisher',
            checkedAt: '2026-05-12',
          },
        ]}
      />,
    )

    expect(screen.getAllByText(/Example Publisher - checked May 12, 2026/)).toHaveLength(2)
  })
})
