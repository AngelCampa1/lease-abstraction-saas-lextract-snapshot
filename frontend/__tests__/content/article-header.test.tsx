import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArticleHeader } from '@/components/content/article-header'

describe('ArticleHeader', () => {
  const defaultProps = {
    title: 'What Is Commercial Lease Abstraction?',
    author: 'Angel Campa, Founder',
    publishedAt: '2026-03-03',
    readingTime: 7,
    category: 'articles' as const,
  }

  it('renders the title as an h1 heading', () => {
    render(<ArticleHeader {...defaultProps} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('What Is Commercial Lease Abstraction?')
  })

  it('renders the author name', () => {
    render(<ArticleHeader {...defaultProps} />)
    expect(screen.getByText('Angel Campa, Founder')).toBeInTheDocument()
  })

  it('renders formatted publish date', () => {
    render(<ArticleHeader {...defaultProps} />)
    expect(screen.getByText('March 3, 2026')).toBeInTheDocument()
  })

  it('renders reading time', () => {
    render(<ArticleHeader {...defaultProps} />)
    expect(screen.getByText('7 min read')).toBeInTheDocument()
  })

  it('renders category badge', () => {
    render(<ArticleHeader {...defaultProps} />)
    expect(screen.getByText('articles')).toBeInTheDocument()
  })

  it('renders guide category when passed', () => {
    render(<ArticleHeader {...defaultProps} category="guides" />)
    expect(screen.getByText('guides')).toBeInTheDocument()
  })

  it('renders time element with datetime attribute', () => {
    const { container } = render(<ArticleHeader {...defaultProps} />)
    const timeEl = container.querySelector('time')
    expect(timeEl).not.toBeNull()
    expect(timeEl?.getAttribute('dateTime')).toBe('2026-03-03')
  })

  it('renders tags when provided', () => {
    render(
      <ArticleHeader
        {...defaultProps}
        tags={['lease abstraction', 'CRE']}
      />
    )
    expect(screen.getByText('lease abstraction')).toBeInTheDocument()
    expect(screen.getByText('CRE')).toBeInTheDocument()
  })

  it('renders without tags when not provided', () => {
    const { container } = render(<ArticleHeader {...defaultProps} />)
    expect(container.querySelectorAll('[data-testid="tag"]')).toHaveLength(0)
  })

  it('renders author as a link to /about/angel-campa for Angel Campa', () => {
    render(<ArticleHeader {...defaultProps} author="Angel Campa, Founder" />)
    const link = screen.getByRole('link', { name: 'Angel Campa, Founder' })
    expect(link).toHaveAttribute('href', '/about/angel-campa')
  })

  it('renders author as plain text (no link) for unknown authors', () => {
    render(<ArticleHeader {...defaultProps} author="Jane Smith" />)
    expect(screen.getByText('Jane Smith').tagName).toBe('SPAN')
    expect(screen.queryByRole('link', { name: 'Jane Smith' })).toBeNull()
  })

  it('does not render "Updated" when updatedAt is not provided', () => {
    render(<ArticleHeader {...defaultProps} />)
    expect(screen.queryByText(/Updated/)).toBeNull()
  })

  it('does not render "Updated" when updatedAt equals publishedAt', () => {
    render(<ArticleHeader {...defaultProps} updatedAt="2026-03-03" />)
    expect(screen.queryByText(/Updated/)).toBeNull()
  })

  it('renders "Last updated" with formatted date when updatedAt differs from publishedAt', () => {
    render(<ArticleHeader {...defaultProps} updatedAt="2026-03-24" />)
    expect(screen.getByText(/Last updated/)).toBeInTheDocument()
    expect(screen.getByText(/March 24, 2026/)).toBeInTheDocument()
  })

  it('renders updatedAt as a time element with correct dateTime attribute', () => {
    const { container } = render(<ArticleHeader {...defaultProps} updatedAt="2026-03-24" />)
    const times = container.querySelectorAll('time')
    const updated = Array.from(times).find(t => t.getAttribute('dateTime') === '2026-03-24')
    expect(updated).not.toBeNull()
  })
})
