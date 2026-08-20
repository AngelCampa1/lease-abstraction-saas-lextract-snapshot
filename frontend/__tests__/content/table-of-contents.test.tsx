import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TableOfContents, extractHeadings } from '@/components/content/table-of-contents'
import type { TocHeading } from '@/components/content/table-of-contents'

describe('extractHeadings', () => {
  it('extracts h2 headings from markdown content', () => {
    const content = `
# Title

Some intro text.

## First Section

Content here.

## Second Section

More content.

### Subsection

Details.

## Third Section

Final content.
`
    const headings = extractHeadings(content)
    expect(headings).toHaveLength(3)
    expect(headings[0]).toEqual({ text: 'First Section', id: 'first-section', level: 2 })
    expect(headings[1]).toEqual({ text: 'Second Section', id: 'second-section', level: 2 })
    expect(headings[2]).toEqual({ text: 'Third Section', id: 'third-section', level: 2 })
  })

  it('returns empty array for content with no h2 headings', () => {
    const content = '# Title\n\nSome text without subheadings.'
    expect(extractHeadings(content)).toEqual([])
  })

  it('handles special characters in heading text', () => {
    const content = '## CAM Reconciliation & Audit Rights\n\n## What\'s Included?'
    const headings = extractHeadings(content)
    expect(headings).toHaveLength(2)
    expect(headings[0].text).toBe('CAM Reconciliation & Audit Rights')
    expect(headings[0].id).toBe('cam-reconciliation-audit-rights')
    expect(headings[1].text).toBe("What's Included?")
  })

  it('trims whitespace from heading text', () => {
    const content = '##   Extra Spaces   \n\nContent.'
    const headings = extractHeadings(content)
    expect(headings[0].text).toBe('Extra Spaces')
  })
})

describe('TableOfContents', () => {
  const sampleHeadings: TocHeading[] = [
    { text: 'Introduction', id: 'introduction', level: 2 },
    { text: 'Key Concepts', id: 'key-concepts', level: 2 },
    { text: 'Best Practices', id: 'best-practices', level: 2 },
  ]

  it('renders a navigation landmark', () => {
    render(<TableOfContents headings={sampleHeadings} />)
    const nav = screen.getByRole('navigation', { name: 'Table of contents' })
    expect(nav).toBeInTheDocument()
  })

  it('renders "On this page" heading', () => {
    render(<TableOfContents headings={sampleHeadings} />)
    expect(screen.getByText('On this page')).toBeInTheDocument()
  })

  it('renders links for each heading', () => {
    render(<TableOfContents headings={sampleHeadings} />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
    expect(links[0]).toHaveAttribute('href', '#introduction')
    expect(links[0]).toHaveTextContent('Introduction')
    expect(links[1]).toHaveAttribute('href', '#key-concepts')
    expect(links[2]).toHaveAttribute('href', '#best-practices')
  })

  it('returns null when headings array is empty', () => {
    const { container } = render(<TableOfContents headings={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when fewer than 2 headings', () => {
    const { container } = render(
      <TableOfContents headings={[{ text: 'Only One', id: 'only-one', level: 2 }]} />
    )
    expect(container.innerHTML).toBe('')
  })
})
