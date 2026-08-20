/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { contentFrontmatterSchema } from '@/lib/content-schema'

const CONTENT_DIR = path.join(process.cwd(), 'content')

const EXPECTED_ARTICLES = [
  'what-is-commercial-lease-abstraction',
  'red-flags-tenant-reps-commercial-lease',
  'manual-vs-ai-lease-abstraction',
  'property-managers-lease-abstracts-revenue-leakage',
  '126-fields-commercial-lease-checklist',
]

const EXPECTED_GUIDES = [
  'cam-reconciliation-audit-rights-guide',
  'commercial-lease-financial-terms-guide',
  'lease-abstraction-portfolio-management',
  'commercial-lease-renewal-termination-guide',
  'data-security-compliance-lease-abstraction',
]

describe('seed article MDX files', () => {
  for (const slug of EXPECTED_ARTICLES) {
    describe(`articles/${slug}.mdx`, () => {
      const filePath = path.join(CONTENT_DIR, 'articles', `${slug}.mdx`)

      it('exists on disk', () => {
        expect(fs.existsSync(filePath)).toBe(true)
      })

      it('has valid frontmatter per content schema', () => {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(raw)
        const result = contentFrontmatterSchema.safeParse(data)
        if (!result.success) {
          throw new Error(
            `Frontmatter validation failed for ${slug}: ${JSON.stringify(result.error.issues, null, 2)}`
          )
        }
        expect(result.success).toBe(true)
      })

      it('has category set to "articles"', () => {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(raw)
        expect(data.category).toBe('articles')
      })

      it('has slug matching filename', () => {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(raw)
        expect(data.slug).toBe(slug)
      })

      it('has non-empty content body', () => {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { content } = matter(raw)
        expect(content.trim().length).toBeGreaterThan(100)
      })

      it('has at least one h2 heading in body', () => {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { content } = matter(raw)
        expect(content).toMatch(/^## /m)
      })
    })
  }
})

describe('seed guide MDX files', () => {
  for (const slug of EXPECTED_GUIDES) {
    describe(`guides/${slug}.mdx`, () => {
      const filePath = path.join(CONTENT_DIR, 'guides', `${slug}.mdx`)

      it('exists on disk', () => {
        expect(fs.existsSync(filePath)).toBe(true)
      })

      it('has valid frontmatter per content schema', () => {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(raw)
        const result = contentFrontmatterSchema.safeParse(data)
        if (!result.success) {
          throw new Error(
            `Frontmatter validation failed for ${slug}: ${JSON.stringify(result.error.issues, null, 2)}`
          )
        }
        expect(result.success).toBe(true)
      })

      it('has category set to "guides"', () => {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(raw)
        expect(data.category).toBe('guides')
      })

      it('has slug matching filename', () => {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(raw)
        expect(data.slug).toBe(slug)
      })

      it('has non-empty content body', () => {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { content } = matter(raw)
        expect(content.trim().length).toBeGreaterThan(200)
      })

      it('has at least two h2 headings in body', () => {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const { content } = matter(raw)
        const h2Count = (content.match(/^## /gm) || []).length
        expect(h2Count).toBeGreaterThanOrEqual(2)
      })
    })
  }
})

describe('all content files count', () => {
  it('has at least 5 article files', () => {
    const articlesDir = path.join(CONTENT_DIR, 'articles')
    const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.mdx'))
    expect(files.length).toBeGreaterThanOrEqual(5)
  })

  it('has at least 5 guide files', () => {
    const guidesDir = path.join(CONTENT_DIR, 'guides')
    const files = fs.readdirSync(guidesDir).filter((f) => f.endsWith('.mdx'))
    expect(files.length).toBeGreaterThanOrEqual(5)
  })
})
