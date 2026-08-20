/** @vitest-environment node */
import { readFileSync } from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'

type GeneratedFullEntry = {
  meta: {
    slug: string
    updatedAt: string
    sources?: unknown[]
  }
  content: string
}

type GeneratedIndexEntry = {
  slug: string
  updatedAt?: string
  sources?: unknown[]
}

function readGeneratedFull(category: 'articles' | 'guides'): Record<string, GeneratedFullEntry> {
  const fullPath = join(process.cwd(), 'content', `${category}-full.json`)
  return JSON.parse(readFileSync(fullPath, 'utf-8')) as Record<string, GeneratedFullEntry>
}

function readGeneratedIndex(category: 'articles' | 'guides'): GeneratedIndexEntry[] {
  const indexPath = join(process.cwd(), 'content', `${category}-index.json`)
  return JSON.parse(readFileSync(indexPath, 'utf-8')) as GeneratedIndexEntry[]
}

function readMdxFrontmatter(category: 'articles' | 'guides', slug: string): Record<string, unknown> {
  const mdxPath = join(process.cwd(), 'content', category, `${slug}.mdx`)
  return matter(readFileSync(mdxPath, 'utf-8')).data
}

describe('generated content freshness', () => {
  it.each(['articles', 'guides'] as const)(
    '%s full index uses the same updatedAt date as source MDX frontmatter',
    (category) => {
      const generated = readGeneratedFull(category)

      for (const [slug, entry] of Object.entries(generated)) {
        const sourceFrontmatter = readMdxFrontmatter(category, slug)
        expect(entry.meta.updatedAt, `${category}/${slug}`).toBe(sourceFrontmatter.updatedAt)
      }
    },
  )

  it.each(['articles', 'guides'] as const)(
    '%s compact index mirrors freshness and source frontmatter',
    (category) => {
      const generated = readGeneratedIndex(category)

      for (const entry of generated) {
        const sourceFrontmatter = readMdxFrontmatter(category, entry.slug)
        if (sourceFrontmatter.updatedAt !== undefined) {
          expect(entry.updatedAt, `${category}/${entry.slug}`).toBe(
            sourceFrontmatter.updatedAt,
          )
        }
        expect(entry.sources, `${category}/${entry.slug}`).toEqual(sourceFrontmatter.sources)
      }
    },
  )
})
