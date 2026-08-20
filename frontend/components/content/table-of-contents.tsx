import React from 'react'

export interface TocHeading {
  text: string
  id: string
  level: number
}

function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function extractHeadings(content: string): TocHeading[] {
  const headings: TocHeading[] = []

  // Support both markdown (## Heading) and HTML (<h2>Heading</h2>) formats
  const mdRegex = /^## (.+)$/gm
  const htmlRegex = /<h2[^>]*>([^<]+)<\/h2>/gi

  let match: RegExpExecArray | null
  match = mdRegex.exec(content)
  while (match) {
    headings.push({ text: match[1].trim(), id: generateId(match[1].trim()), level: 2 })
    match = mdRegex.exec(content)
  }

  if (headings.length === 0) {
    match = htmlRegex.exec(content)
    while (match) {
      headings.push({ text: match[1].trim(), id: generateId(match[1].trim()), level: 2 })
      match = htmlRegex.exec(content)
    }
  }

  return headings
}

interface TableOfContentsProps {
  headings: TocHeading[]
}

function TableOfContents({ headings }: TableOfContentsProps) {
  if (headings.length < 2) {
    return null
  }

  return (
    <nav aria-label="Table of contents" className="hidden lg:block lg:sticky lg:top-24">
      <p className="mb-3 text-sm font-semibold text-foreground">On this page</p>
      <ul className="space-y-1 text-sm">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className="flex min-h-[44px] items-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export { TableOfContents, extractHeadings }
