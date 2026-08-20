# US-036: SEO Infrastructure

**Phase:** 2 — Independent Modules | **Depends on:** US-001 | **Blocks:** US-013, US-038, US-039, US-040
**Type:** Frontend
**Estimated session size:** Medium

## Description

Set up the foundational SEO infrastructure that all marketing and public-facing pages build on. This includes centralized site config, dynamic sitemap generation, robots.txt with AI crawler policies, a reusable JSON-LD structured data component, type-safe Schema.org builder functions, root layout metadata defaults (Open Graph, Twitter Cards, googleBot directives), and Google Analytics 4 integration. Modeled after the proven SEO architecture in CamAudit v2.

## Required Skills

- `superpowers:test-driven-development` — all modules need tests
- `frontend-design:frontend-design` — OG image creation

## Acceptance Criteria

- [ ] `lib/site-config.ts` exports `SITE_URL` (from `NEXT_PUBLIC_SITE_URL`, defaults to `https://lextract.io`) and `SITE_DISPLAY_DOMAIN` (extracted hostname) with validation
- [ ] `app/sitemap.ts` generates Next.js MetadataRoute.Sitemap with static marketing routes, correct priorities and change frequencies
- [ ] `app/robots.ts` generates MetadataRoute.Robots: allow `/`, disallow `/api/`, `/auth/`, `/results/`, `/processing/`, `/dashboard/`; explicit rules for AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot); sitemap reference
- [ ] `components/json-ld.tsx` renders `<script type="application/ld+json">` with XSS protection (escape `<` as `\u003c`)
- [ ] `lib/schema.ts` exports type-safe builders: `buildOrganizationSchema()`, `buildWebApplicationSchema()`, `buildFAQPageSchema()`, `buildHowToSchema()`, `buildArticleSchema()`, `buildBreadcrumbSchema()`
- [ ] Root layout `metadata` export includes: `metadataBase`, title template (`%s | Lextract`), description, `openGraph` (type, locale, url, siteName, images with `/og-image.png`), `twitter` (summary_large_image), `robots` (index, follow, googleBot max-image-preview: large)
- [ ] GA4 integration via `next/script` in root layout, gated on `NEXT_PUBLIC_GA4_MEASUREMENT_ID` env var
- [ ] OG image placeholder at `frontend/public/og-image.png` (1200x630)
- [ ] All modules have tests: site-config validation, sitemap entries, robots rules, json-ld rendering + XSS, schema builder output shapes

## Technical Details

### Files to Create/Modify

- Create: `frontend/lib/site-config.ts`
- Create: `frontend/app/sitemap.ts`
- Create: `frontend/app/robots.ts`
- Create: `frontend/components/json-ld.tsx`
- Create: `frontend/lib/schema.ts`
- Create: `frontend/public/og-image.png` (placeholder 1200x630)
- Modify: `frontend/app/layout.tsx` (add root metadata export, GA4 scripts)
- Test: `frontend/__tests__/seo/site-config.test.ts`
- Test: `frontend/__tests__/seo/sitemap.test.ts`
- Test: `frontend/__tests__/seo/robots.test.ts`
- Test: `frontend/__tests__/seo/json-ld.test.tsx`
- Test: `frontend/__tests__/seo/schema.test.ts`

### Key Implementation Notes

#### `lib/site-config.ts`
```typescript
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lextract.io'
// Extract hostname, throw descriptive error if URL is invalid
export const SITE_DISPLAY_DOMAIN = new URL(SITE_URL).host
```

#### `app/sitemap.ts`
Static routes to include initially (dynamic routes added by later stories):
- `/` — priority 1.0, weekly
- `/upload` — priority 0.9, monthly (will 404 until US-017, but sitemap can exist early)

#### `app/robots.ts`
```typescript
rules: [
  { userAgent: '*', allow: ['/'], disallow: ['/api/', '/auth/', '/results/', '/processing/', '/dashboard/'] },
  { userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'Bingbot'],
    allow: ['/'], disallow: ['/api/', '/auth/', '/results/', '/processing/', '/dashboard/'] },
]
```

#### `components/json-ld.tsx`
Follow CamAudit pattern exactly — generic component accepting any schema object, escaping `<` to prevent `</script>` injection.

#### `lib/schema.ts`
Schema builders for Lextract-specific structured data:
- **Organization**: name "Lextract", description about lease abstraction
- **WebApplication**: name "Lextract", category "BusinessApplication", offers with 220 price point
- **FAQPage**: generic builder taking question/answer pairs
- **HowTo**: generic builder for step-by-step (Upload → Extract → Review)
- **Article**: generic builder for any future blog/resource content
- **BreadcrumbList**: generic builder for navigation breadcrumbs

#### Root layout metadata
```typescript
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Lextract — AI-Powered Commercial Lease Abstraction', template: '%s | Lextract' },
  description: 'Extract 126 structured fields from any commercial lease PDF in minutes. AI-powered lease abstraction with confidence scoring and red flag detection. 220 per lease.',
  openGraph: { type: 'website', locale: 'en_US', url: SITE_URL, siteName: 'Lextract', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
}
```

#### GA4
```tsx
const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? ''
// In <head>, conditionally render GA4 scripts only if GA4_ID is set
```

### Integration Points

- US-013 (Landing Page) uses `JsonLd`, `buildWebApplicationSchema`, `buildFAQPageSchema`, and per-page metadata with canonical URL
- US-011 (Auth Pages) should set `robots: { index: false }` on auth layouts
- US-012 (App Shell) should set `robots: { index: false }` on the `(app)` layout
- Every future marketing page uses `lib/site-config.ts` for canonical URLs and `lib/schema.ts` for structured data

## Verification

```bash
cd frontend
npm run build        # Build passes, sitemap.xml and robots.txt generated
npm test             # All SEO tests pass
# Manual: visit /sitemap.xml — valid XML with routes
# Manual: visit /robots.txt — correct rules
# Manual: view page source of / — check <script type="application/ld+json">, OG tags, title template
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Frontend" section: deployment domain, route groups
- `docs/PRD.md` — Section 13: Landing page SEO keywords, target audience
- CamAudit v2 reference: `camaudit-v2/frontend/src/app/sitemap.ts`, `robots.ts`, `lib/schema.ts`, `components/json-ld.tsx`
