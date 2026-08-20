import React from 'react'
import { render, screen } from '@testing-library/react'
import { Breadcrumbs, buildBreadcrumbJsonLd } from '@/components/content/breadcrumbs'

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

describe('Breadcrumbs', () => {
  it('renders nothing when crumbs array is empty', () => {
    const { container } = render(<Breadcrumbs crumbs={[]} />)
    expect(container.querySelector('nav')).toBeNull()
  })

  it('renders nav with aria-label', () => {
    render(
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }]} />
    )
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toBeInTheDocument()
  })

  it('renders ordered list', () => {
    render(
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Articles' },
        ]}
      />
    )
    const list = screen.getByRole('list')
    expect(list).toBeInTheDocument()
  })

  it('renders links for non-last items with href', () => {
    render(
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Articles', href: '/articles' },
          { label: 'Current Page' },
        ]}
      />
    )
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/')
    expect(links[1]).toHaveAttribute('href', '/articles')
  })

  it('renders last item as span with aria-current="page"', () => {
    render(
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Current Page' },
        ]}
      />
    )
    const currentPage = screen.getByText('Current Page')
    expect(currentPage.tagName).toBe('SPAN')
    expect(currentPage).toHaveAttribute('aria-current', 'page')
  })

  it('renders separator between items', () => {
    const { container } = render(
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Articles', href: '/articles' },
          { label: 'Post' },
        ]}
      />
    )
    const separators = container.querySelectorAll('[aria-hidden="true"]')
    expect(separators).toHaveLength(2)
    expect(separators[0]).toHaveTextContent('/')
  })

  it('does not render JSON-LD by default', () => {
    const { container } = render(
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }]} />
    )
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).toBeNull()
  })

  it('renders JSON-LD when includeJsonLd is true', () => {
    const { container } = render(
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Articles' },
        ]}
        includeJsonLd
      />
    )
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).toBeInTheDocument()
    const jsonLd = JSON.parse(script?.innerHTML ?? '{}')
    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('BreadcrumbList')
    expect(jsonLd.itemListElement).toHaveLength(2)
  })

  it('renders a single crumb as span (no link)', () => {
    render(<Breadcrumbs crumbs={[{ label: 'Home' }]} />)
    const span = screen.getByText('Home')
    expect(span.tagName).toBe('SPAN')
    expect(span).toHaveAttribute('aria-current', 'page')
  })

  it('renders middle item without href as span without aria-current', () => {
    render(
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Category' },
          { label: 'Current Page' },
        ]}
      />
    )
    const category = screen.getByText('Category')
    expect(category.tagName).toBe('SPAN')
    expect(category).not.toHaveAttribute('aria-current')
  })
})

describe('buildBreadcrumbJsonLd', () => {
  it('builds correct JSON-LD structure', () => {
    const result = buildBreadcrumbJsonLd([
      { label: 'Home', href: 'https://lextract.io/' },
      { label: 'Articles', href: 'https://lextract.io/articles' },
      { label: 'My Post' },
    ])

    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('BreadcrumbList')

    const items = result.itemListElement as Array<Record<string, unknown>>
    expect(items).toHaveLength(3)

    expect(items[0].position).toBe(1)
    expect(items[0].name).toBe('Home')
    expect(items[0].item).toBe('https://lextract.io/')

    expect(items[2].position).toBe(3)
    expect(items[2].name).toBe('My Post')
    expect(items[2]).not.toHaveProperty('item')
  })

  it('returns empty item list for empty crumbs', () => {
    const result = buildBreadcrumbJsonLd([])
    const items = result.itemListElement as Array<Record<string, unknown>>
    expect(items).toEqual([])
  })
})
