import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  MdxH2,
  MdxH3,
  MdxH4,
  MdxCodeBlock,
  MdxInlineCode,
  MdxLink,
  Callout,
  MdxTable,
  MdxTh,
  MdxTd,
  mdxComponents,
  generateAnchorId,
  extractTextFromChildren,
} from '@/components/content/mdx-components'

describe('generateAnchorId', () => {
  it('converts text to lowercase kebab-case', () => {
    expect(generateAnchorId('Hello World')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(generateAnchorId('What is Lease Abstraction?')).toBe(
      'what-is-lease-abstraction'
    )
  })

  it('collapses multiple spaces and dashes', () => {
    expect(generateAnchorId('Multiple   spaces   here')).toBe(
      'multiple-spaces-here'
    )
  })

  it('handles empty string', () => {
    expect(generateAnchorId('')).toBe('')
  })

  it('handles numbers', () => {
    expect(generateAnchorId('Section 3 Overview')).toBe('section-3-overview')
  })
})

describe('extractTextFromChildren', () => {
  it('extracts text from string children', () => {
    expect(extractTextFromChildren('hello')).toBe('hello')
  })

  it('extracts text from number children', () => {
    expect(extractTextFromChildren(42)).toBe('42')
  })

  it('extracts text from array children', () => {
    expect(extractTextFromChildren(['hello', ' ', 'world'])).toBe('hello world')
  })

  it('extracts text from React elements', () => {
    const element = React.createElement('strong', null, 'bold text')
    expect(extractTextFromChildren(element)).toBe('bold text')
  })

  it('returns empty string for null/undefined', () => {
    expect(extractTextFromChildren(null)).toBe('')
    expect(extractTextFromChildren(undefined)).toBe('')
  })

  it('returns empty string for React element without children prop', () => {
    const element = React.createElement('br')
    expect(extractTextFromChildren(element)).toBe('')
  })
})

describe('MdxH2', () => {
  it('renders h2 with id and anchor link', () => {
    render(<MdxH2>Getting Started</MdxH2>)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveAttribute('id', 'getting-started')
    expect(heading).toHaveTextContent('Getting Started')
  })

  it('renders anchor link with correct href', () => {
    render(<MdxH2>My Section</MdxH2>)
    const link = screen.getByRole('link', { name: 'Link to My Section' })
    expect(link).toHaveAttribute('href', '#my-section')
  })
})

describe('MdxH3', () => {
  it('renders h3 with id and anchor link', () => {
    render(<MdxH3>Sub Section</MdxH3>)
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveAttribute('id', 'sub-section')
  })
})

describe('MdxH4', () => {
  it('renders h4 with id and anchor link', () => {
    render(<MdxH4>Deep Section</MdxH4>)
    const heading = screen.getByRole('heading', { level: 4 })
    expect(heading).toHaveAttribute('id', 'deep-section')
  })
})

describe('MdxCodeBlock', () => {
  it('renders pre and code elements', () => {
    const { container } = render(<MdxCodeBlock>const x = 1</MdxCodeBlock>)
    const pre = container.querySelector('pre')
    const code = container.querySelector('code')
    expect(pre).toBeInTheDocument()
    expect(code).toBeInTheDocument()
    expect(code).toHaveTextContent('const x = 1')
  })

  it('applies className when provided', () => {
    const { container } = render(
      <MdxCodeBlock className="language-ts">code</MdxCodeBlock>
    )
    const pre = container.querySelector('pre')
    expect(pre?.className).toContain('language-ts')
  })
})

describe('MdxInlineCode', () => {
  it('renders inline code element', () => {
    const { container } = render(<MdxInlineCode>npm install</MdxInlineCode>)
    const code = container.querySelector('code')
    expect(code).toBeInTheDocument()
    expect(code).toHaveTextContent('npm install')
  })
})

describe('Callout', () => {
  it('renders with info variant by default', () => {
    render(<Callout>Some info</Callout>)
    const note = screen.getByRole('note')
    expect(note).toBeInTheDocument()
    expect(note).toHaveTextContent('Info')
    expect(note).toHaveTextContent('Some info')
  })

  it('renders warning variant', () => {
    render(<Callout variant="warning">Be careful</Callout>)
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('Warning')
    expect(note.className).toContain('border-yellow-500')
  })

  it('renders tip variant', () => {
    render(<Callout variant="tip">Pro tip</Callout>)
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('Tip')
    expect(note.className).toContain('border-emerald-500')
  })

  it('uses custom title when provided', () => {
    render(
      <Callout variant="info" title="Custom Title">
        Content
      </Callout>
    )
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('Custom Title')
  })
})

describe('MdxTable', () => {
  it('renders a responsive table wrapper', () => {
    const { container } = render(
      <MdxTable>
        <thead>
          <tr>
            <MdxTh>Header</MdxTh>
          </tr>
        </thead>
        <tbody>
          <tr>
            <MdxTd>Cell</MdxTd>
          </tr>
        </tbody>
      </MdxTable>
    )
    const wrapper = container.querySelector('.overflow-x-auto')
    expect(wrapper).toBeInTheDocument()
    const table = container.querySelector('table')
    expect(table).toBeInTheDocument()
  })

  it('renders th and td with correct content', () => {
    render(
      <MdxTable>
        <thead>
          <tr>
            <MdxTh>Name</MdxTh>
          </tr>
        </thead>
        <tbody>
          <tr>
            <MdxTd>Value</MdxTd>
          </tr>
        </tbody>
      </MdxTable>
    )
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
  })
})

describe('MdxLink', () => {
  it('renders Next.js Link for internal hrefs', () => {
    render(<MdxLink href="/glossary/cam-charges">CAM Charges</MdxLink>)
    const link = screen.getByRole('link', { name: 'CAM Charges' })
    expect(link).toHaveAttribute('href', '/glossary/cam-charges')
    expect(link).not.toHaveAttribute('target')
    expect(link).not.toHaveAttribute('rel')
  })

  it('renders external anchor for external hrefs', () => {
    render(<MdxLink href="https://example.com">Example</MdxLink>)
    const link = screen.getByRole('link', { name: 'Example' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders external anchor for http hrefs', () => {
    render(<MdxLink href="http://example.com">Example</MdxLink>)
    const link = screen.getByRole('link', { name: 'Example' })
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders span when href is undefined', () => {
    const { container } = render(<MdxLink>No Link</MdxLink>)
    const span = container.querySelector('span')
    expect(span).toBeInTheDocument()
    expect(span).toHaveTextContent('No Link')
    expect(container.querySelector('a')).not.toBeInTheDocument()
  })

  it('renders anchor link for hash-only hrefs', () => {
    render(<MdxLink href="#section">Section</MdxLink>)
    const link = screen.getByRole('link', { name: 'Section' })
    expect(link).toHaveAttribute('href', '#section')
    expect(link).not.toHaveAttribute('target')
  })
})

describe('mdxComponents', () => {
  it('exports all required component mappings', () => {
    expect(mdxComponents.h2).toBe(MdxH2)
    expect(mdxComponents.h3).toBe(MdxH3)
    expect(mdxComponents.h4).toBe(MdxH4)
    expect(mdxComponents.pre).toBe(MdxCodeBlock)
    expect(mdxComponents.code).toBe(MdxInlineCode)
    expect(mdxComponents.table).toBe(MdxTable)
    expect(mdxComponents.th).toBe(MdxTh)
    expect(mdxComponents.td).toBe(MdxTd)
    expect(mdxComponents.Callout).toBeDefined()
    expect(mdxComponents.a).toBe(MdxLink)
  })
})
