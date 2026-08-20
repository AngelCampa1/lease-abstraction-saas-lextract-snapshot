# US-038: Blog & Resource Guide Pages

**Phase:** 2 — Independent Modules | **Depends on:** US-037, US-036 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Large

## Description

Build the blog article and resource guide pages with MDX-powered content, per-page SEO, and a resources hub. This is the primary content marketing surface — 5 blog articles and 5 resource guides targeting CRE professionals searching for commercial lease information. All starter content comes from the Deep Research output in `docs/content-research/`.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — content listing layouts, article page design, reading experience
- `humanizer` — review and polish all MDX content for natural, professional tone

## Acceptance Criteria

- [ ] `/resources` hub page renders with sections for articles, guides, and links to glossary/comparisons/states
- [ ] `/resources/articles` listing page renders all blog articles as content cards, sorted by date descending
- [ ] `/resources/articles/[slug]` renders individual articles with MDX content, breadcrumbs, reading time, author, CTA block
- [ ] `/resources/guides/[slug]` renders individual guides with MDX content, breadcrumbs, reading time, author, CTA block
- [ ] 5 blog article MDX files exist in `frontend/content/articles/` with valid frontmatter
- [ ] 5 resource guide MDX files exist in `frontend/content/guides/` with valid frontmatter
- [ ] Each content page exports `generateMetadata` with title, description, `alternates.canonical`, and `openGraph` overrides
- [ ] Each content page renders `<JsonLd schema={buildArticleSchema(...)} />` with Article structured data
- [ ] Each content page renders `<JsonLd schema={buildBreadcrumbSchema(...)} />` with BreadcrumbList structured data
- [ ] `generateStaticParams` implemented for both `[slug]` routes to enable static generation
- [ ] Sitemap updated to include `/resources`, `/resources/articles`, and all article/guide slug routes
- [ ] Content renders with proper typography: readable line lengths, heading hierarchy, code blocks, lists
- [ ] Responsive design across all breakpoints
- [ ] All copy sounds natural and professional — no AI-generated tone

## Technical Details

### Files to Create/Modify

- Create: `frontend/app/(marketing)/resources/page.tsx` (resources hub)
- Create: `frontend/app/(marketing)/resources/articles/page.tsx` (articles listing)
- Create: `frontend/app/(marketing)/resources/articles/[slug]/page.tsx` (article detail)
- Create: `frontend/app/(marketing)/resources/guides/[slug]/page.tsx` (guide detail)
- Create: `frontend/content/articles/what-is-commercial-lease-abstraction.mdx`
- Create: `frontend/content/articles/red-flags-tenant-reps-commercial-lease.mdx`
- Create: `frontend/content/articles/manual-vs-ai-lease-abstraction.mdx`
- Create: `frontend/content/articles/property-managers-lease-abstracts-revenue-leakage.mdx`
- Create: `frontend/content/articles/126-fields-commercial-lease-checklist.mdx`
- Create: `frontend/content/guides/cam-reconciliation-audit-rights-guide.mdx`
- Create: `frontend/content/guides/commercial-lease-financial-terms-guide.mdx`
- Create: `frontend/content/guides/lease-abstraction-portfolio-management.mdx`
- Create: `frontend/content/guides/commercial-lease-renewal-termination-guide.mdx`
- Create: `frontend/content/guides/data-security-compliance-lease-abstraction.mdx`
- Modify: `frontend/app/sitemap.ts` (add content routes)
- Test: `frontend/__tests__/content/resources-hub.test.tsx`
- Test: `frontend/__tests__/content/article-page.test.tsx`
- Test: `frontend/__tests__/content/guide-page.test.tsx`

### Key Implementation Notes

#### Article/Guide Detail Page Pattern
```typescript
import { getContentBySlug, getAllContent } from '@/lib/content'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { mdxComponents } from '@/components/content/mdx-components'
import { Breadcrumbs } from '@/components/content/breadcrumbs'
import { ContentCta } from '@/components/content/content-cta'
import { JsonLd } from '@/components/json-ld'
import { buildArticleSchema, buildBreadcrumbSchema } from '@/lib/schema'
import remarkGfm from 'remark-gfm'

export async function generateStaticParams() {
  const items = await getAllContent('articles')
  return items.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { meta } = await getContentBySlug('articles', params.slug)
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `${SITE_URL}/resources/articles/${meta.slug}` },
    openGraph: { title: meta.title, description: meta.description, type: 'article',
      publishedTime: meta.publishedAt, modifiedTime: meta.updatedAt },
  }
}
```

#### Resources Hub Layout
The `/resources` hub page should display:
- Hero section with "Resources" heading and description
- "Articles" section with latest 3 articles as content cards + "View all" link
- "Guides" section with latest 3 guides as content cards
- Links to Glossary (`/glossary`), Comparisons (`/resources/comparisons`), State Pages (`/resources/states`)

#### Sitemap Addition
```typescript
// Add to existing sitemap.ts
const articles = await getAllContent('articles')
const guides = await getAllContent('guides')
const contentRoutes = [
  { url: `${SITE_URL}/resources`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  { url: `${SITE_URL}/resources/articles`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ...articles.map((a) => ({ url: `${SITE_URL}/resources/articles/${a.slug}`, lastModified: new Date(a.updatedAt), changeFrequency: 'monthly', priority: 0.6 })),
  ...guides.map((g) => ({ url: `${SITE_URL}/resources/guides/${g.slug}`, lastModified: new Date(g.updatedAt), changeFrequency: 'monthly', priority: 0.6 })),
]
```

#### Content Quality
- All 10 MDX files come from Deep Research output (see `docs/content-research/prompt-1-articles-and-guides.md`)
- Run every piece through `humanizer` skill to ensure natural tone
- Frontmatter must pass Zod validation from US-037's content schema

### Integration Points

- Uses content infrastructure from US-037 (loading utilities, MDX components, content cards, breadcrumbs, CTA)
- Uses `JsonLd`, `buildArticleSchema`, `buildBreadcrumbSchema` from US-036 (SEO Infrastructure)
- Uses `SITE_URL` from `lib/site-config.ts` for canonical URLs
- Resources hub links to US-039 (Glossary & Comparisons) and US-040 (State Pages)
- Modifies `app/sitemap.ts` created in US-036

## Verification

```bash
cd frontend
npm run build        # Build passes, static pages generated
npm test             # All content page tests pass
# Manual: navigate to /resources — hub renders with content sections
# Manual: navigate to /resources/articles — all 5 articles listed
# Manual: click into an article — full content renders with breadcrumbs, CTA
# Manual: check responsive at 375px, 768px, 1024px, 1440px
# Manual: view page source — JSON-LD Article schema, OG tags, canonical URL
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Frontend" section: route groups, marketing layout
- `docs/PRD.md` — Section 13: Content and SEO strategy
- `docs/content-research/prompt-1-articles-and-guides.md` — Deep Research prompt for content generation
- CamAudit v2 reference: `camaudit-v2/frontend/src/app/(marketing)/resources/`
