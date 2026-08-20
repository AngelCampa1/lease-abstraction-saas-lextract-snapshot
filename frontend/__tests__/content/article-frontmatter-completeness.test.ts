/** @vitest-environment node */
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'

const articlesDir = path.join(process.cwd(), 'content', 'articles')
const guidesDir = path.join(process.cwd(), 'content', 'guides')

function getArticleFrontmatter() {
  return fs
    .readdirSync(articlesDir)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => {
      const source = fs.readFileSync(path.join(articlesDir, file), 'utf8')
      return { file, data: matter(source).data }
    })
}

function getFrontmatterBySlug(dir: string, slug: string) {
  const source = fs.readFileSync(path.join(dir, `${slug}.mdx`), 'utf8')
  return matter(source).data
}

describe('article frontmatter completeness', () => {
  it('requires every article to declare updatedAt', () => {
    const missingUpdatedAt = getArticleFrontmatter()
      .filter(({ data }) => typeof data.updatedAt !== 'string')
      .map(({ file }) => file)

    expect(missingUpdatedAt).toEqual([])
  })

  it('requires every article to include FAQ metadata for answer engines', () => {
    const missingFaq = getArticleFrontmatter()
      .filter(({ data }) => !Array.isArray(data.faq) || data.faq.length === 0)
      .map(({ file }) => file)

    expect(missingFaq).toEqual([])
  })

  it('requires strategic comparison and compliance pages to include checked sources', () => {
    const strategicPages = [
      { dir: articlesDir, slug: 'ai-lease-abstraction-guide' },
      { dir: articlesDir, slug: 'lease-abstraction-companies' },
      { dir: guidesDir, slug: 'data-security-compliance-lease-abstraction' },
    ]

    const missingSources = strategicPages
      .filter(({ dir, slug }) => {
        const sources = getFrontmatterBySlug(dir, slug).sources
        return !Array.isArray(sources) || sources.length < 2
      })
      .map(({ slug }) => slug)

    expect(missingSources).toEqual([])
  })
})
