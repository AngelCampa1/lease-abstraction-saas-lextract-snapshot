/**
 * Pre-build script: generates JSON indexes from MDX content.
 *
 * - content/{category}-index.json  — frontmatter only (for listing pages)
 * - content/{category}-full.json   — frontmatter + HTML body (for detail pages)
 *
 * MDX is compiled to HTML at build time so article pages don't need
 * next-mdx-remote at runtime (which fails on Cloudflare Workers).
 */
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')

const CONTENT_DIR = path.join(__dirname, '..', 'content')

async function compileMarkdown(source) {
  // Use unified/remark/rehype pipeline to convert markdown → HTML
  const { unified } = await import('unified')
  const remarkParse = (await import('remark-parse')).default
  const remarkGfm = (await import('remark-gfm')).default
  const remarkRehype = (await import('remark-rehype')).default
  const rehypeStringify = (await import('rehype-stringify')).default

  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(source)

  return String(result)
}

async function generateIndex(category) {
  const dir = path.join(CONTENT_DIR, category)
  if (!fs.existsSync(dir)) {
    console.warn(`No content directory: ${dir}`)
    return
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'))
  const indexItems = []
  const fullItems = {}

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
    const { data, content } = matter(raw)
    const html = await compileMarkdown(content)
    indexItems.push(data)
    fullItems[data.slug] = { meta: data, content: html }
  }

  indexItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  const indexPath = path.join(CONTENT_DIR, `${category}-index.json`)
  fs.writeFileSync(indexPath, JSON.stringify(indexItems, null, 2))
  console.log(`Generated ${indexPath} (${indexItems.length} items)`)

  const fullPath = path.join(CONTENT_DIR, `${category}-full.json`)
  fs.writeFileSync(fullPath, JSON.stringify(fullItems))
  console.log(`Generated ${fullPath} (${Object.keys(fullItems).length} items)`)
}

async function main() {
  await generateIndex('articles')
  await generateIndex('guides')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
