# US-037: Content Infrastructure

**Phase:** 2 — Independent Modules | **Depends on:** US-001 | **Blocks:** US-038
**Type:** Frontend
**Estimated session size:** Medium

## Description

Set up the MDX content pipeline, shared content components, and data structures that all content pages (blog, guides, glossary, comparisons, state pages) build on. This is infrastructure only — no user-facing pages ship in this story. Modeled after the content architecture in CamAudit v2.

## Required Skills

- `superpowers:test-driven-development` — all utilities and components need tests

## Acceptance Criteria

- [ ] `next-mdx-remote`, `gray-matter`, and `remark-gfm` installed as dependencies
- [ ] Content directories created: `frontend/content/articles/`, `frontend/content/guides/`
- [ ] `lib/content.ts` exports `getContentBySlug(dir, slug)` and `getAllContent(dir)` utilities that read MDX files, parse frontmatter with gray-matter, and return typed content objects
- [ ] `lib/content-schema.ts` exports a Zod schema for MDX frontmatter validation: `title`, `slug`, `description`, `publishedAt`, `updatedAt`, `author`, `category`, `silo`, `tags`, `readingTime`, `featured`
- [ ] `components/content/mdx-components.tsx` exports a component map for MDX rendering (headings with anchor links, styled code blocks, callout boxes, tables)
- [ ] `components/content/breadcrumbs.tsx` renders accessible breadcrumb navigation with JSON-LD BreadcrumbList support
- [ ] `components/content/content-card.tsx` renders a card preview for content listings (title, description, reading time, category badge)
- [ ] `components/content/content-cta.tsx` renders a reusable call-to-action block ("Try Lextract" with link to `/upload`)
- [ ] `lib/content-silos.ts` exports silo definitions: `lease-abstraction`, `property-management`, `cam-audit` with display names and descriptions
- [ ] `lib/content-types.ts` exports TypeScript types: `ContentMeta`, `ContentItem`, `Silo`, `ContentCategory`
- [ ] All utilities and components have tests: frontmatter parsing, Zod validation, content loading, component rendering

## Technical Details

### Files to Create/Modify

- Create: `frontend/content/articles/.gitkeep`
- Create: `frontend/content/guides/.gitkeep`
- Create: `frontend/lib/content.ts`
- Create: `frontend/lib/content-schema.ts`
- Create: `frontend/lib/content-silos.ts`
- Create: `frontend/lib/content-types.ts`
- Create: `frontend/components/content/mdx-components.tsx`
- Create: `frontend/components/content/breadcrumbs.tsx`
- Create: `frontend/components/content/content-card.tsx`
- Create: `frontend/components/content/content-cta.tsx`
- Modify: `frontend/package.json` (add next-mdx-remote, gray-matter, remark-gfm)
- Test: `frontend/__tests__/content/content-utils.test.ts`
- Test: `frontend/__tests__/content/content-schema.test.ts`
- Test: `frontend/__tests__/content/mdx-components.test.tsx`
- Test: `frontend/__tests__/content/breadcrumbs.test.tsx`
- Test: `frontend/__tests__/content/content-card.test.tsx`

### Key Implementation Notes

#### `lib/content.ts`
```typescript
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { contentFrontmatterSchema } from './content-schema'

export async function getContentBySlug(dir: string, slug: string): Promise<ContentItem> {
  const filePath = path.join(process.cwd(), 'content', dir, `${slug}.mdx`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(raw)
  const meta = contentFrontmatterSchema.parse(data)
  return { meta, content }
}

export async function getAllContent(dir: string): Promise<ContentMeta[]> {
  // Read all .mdx files from dir, parse frontmatter, sort by publishedAt desc
}
```

#### `lib/content-schema.ts`
```typescript
import { z } from 'zod'

export const contentFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(50).max(200),
  publishedAt: z.string().date(),
  updatedAt: z.string().date(),
  author: z.string().min(1),
  category: z.enum(['articles', 'guides']),
  silo: z.enum(['lease-abstraction', 'property-management', 'cam-audit']),
  tags: z.array(z.string()),
  readingTime: z.string(),
  featured: z.boolean().default(false),
})
```

#### `lib/content-silos.ts`
```typescript
export const CONTENT_SILOS = {
  'lease-abstraction': {
    name: 'Lease Abstraction',
    description: 'Core content about commercial lease data extraction',
  },
  'property-management': {
    name: 'Property Management',
    description: 'Content for property and asset managers',
  },
  'cam-audit': {
    name: 'CAM Audit',
    description: 'CAM reconciliation and audit content (cross-sells CamAudit.io)',
  },
} as const
```

#### `components/content/breadcrumbs.tsx`
Follow CamAudit v2 pattern — render `<nav aria-label="Breadcrumb">` with `<ol>` items, accept a `crumbs` array of `{ label, href }`, and optionally render a `<JsonLd schema={buildBreadcrumbSchema(crumbs)} />` alongside.

#### `components/content/content-cta.tsx`
Simple CTA block with heading ("Ready to extract your lease data?"), description, and a primary button linking to `/upload`. Accepts optional `heading` and `description` overrides.

### Integration Points

- US-038 (Blog & Resource Guides) imports content utilities, MDX components, and content cards from this story
- US-039 (Glossary & Competitor Pages) imports breadcrumbs and CTA components
- US-040 (State Pages) imports breadcrumbs and CTA components
- Uses `JsonLd` and `buildBreadcrumbSchema` from US-036 (SEO Infrastructure)

## Verification

```bash
cd frontend
npm run build        # Build passes with new dependencies
npm test             # All content infrastructure tests pass
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Frontend" section: directory structure, component organization
- `docs/PRD.md` — Section 13: Content and SEO strategy
- CamAudit v2 reference: `camaudit-v2/frontend/src/lib/content.ts`, `components/content/`
