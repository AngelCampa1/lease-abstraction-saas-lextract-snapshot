# US-039: Glossary & Competitor Comparison Pages

**Phase:** 2 — Independent Modules | **Depends on:** US-001, US-036 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Medium

## Description

Build the commercial lease glossary and competitor comparison pages. The glossary provides SEO-rich definitions of 25+ CRE terms. Competitor pages offer balanced comparisons against LeaseLens and outsourced abstraction services. All data comes from the Deep Research output in `docs/content-research/`.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — glossary layout, comparison table design, alphabetical navigation
- `humanizer` — review all definitions and comparison copy for natural, professional tone

## Acceptance Criteria

- [ ] `/glossary` renders an alphabetical listing of 25+ commercial lease terms with anchor navigation (A-Z jumplinks)
- [ ] Each glossary term renders inline on the `/glossary` page with term name, definition, extended definition (expandable), related terms (linked), and category badge
- [ ] `/resources/comparisons` renders a listing of available competitor comparisons as cards
- [ ] `/resources/comparisons/leaselens` renders a full comparison page: introduction, feature table, pricing comparison, strengths/weaknesses, verdict
- [ ] `/resources/comparisons/outsourced-services` renders a full comparison page with the same structure
- [ ] Glossary data stored in `frontend/data/glossary.ts` matching the `GlossaryTerm` interface
- [ ] Comparison data stored in `frontend/data/comparisons.ts` matching the `ComparisonData` interface
- [ ] `/glossary` page exports `generateMetadata` with title "Commercial Lease Glossary", description, canonical URL
- [ ] `/glossary` renders `<JsonLd schema={buildDefinedTermSetSchema(...)} />` with DefinedTermSet structured data
- [ ] Each comparison page exports `generateMetadata` with title, description, canonical URL
- [ ] Each comparison page renders `<JsonLd schema={buildArticleSchema(...)} />` and `<JsonLd schema={buildBreadcrumbSchema(...)} />`
- [ ] Sitemap updated to include `/glossary`, `/resources/comparisons`, and all comparison slug routes
- [ ] Responsive design across all breakpoints
- [ ] All copy sounds natural and professional — no AI-generated tone

## Technical Details

### Files to Create/Modify

- Create: `frontend/data/glossary.ts`
- Create: `frontend/data/comparisons.ts`
- Create: `frontend/app/(marketing)/glossary/page.tsx`
- Create: `frontend/app/(marketing)/resources/comparisons/page.tsx`
- Create: `frontend/app/(marketing)/resources/comparisons/[competitor]/page.tsx`
- Modify: `frontend/lib/schema.ts` (add `buildDefinedTermSetSchema()` builder)
- Modify: `frontend/app/sitemap.ts` (add glossary and comparison routes)
- Test: `frontend/__tests__/content/glossary-page.test.tsx`
- Test: `frontend/__tests__/content/comparison-page.test.tsx`
- Test: `frontend/__tests__/content/glossary-data.test.ts`
- Test: `frontend/__tests__/content/comparison-data.test.ts`

### Key Implementation Notes

#### Glossary Page Layout
```typescript
// /glossary page structure
// 1. Hero: "Commercial Lease Glossary" + description
// 2. A-Z jumplink bar: clickable letters that anchor-scroll
// 3. Terms grouped by first letter, each term card showing:
//    - Term name (h3, bold)
//    - Category badge (financial, legal, operational, parties, property)
//    - Short definition (always visible)
//    - Extended definition (expandable with "Read more")
//    - Related terms as clickable pills that scroll to the target term
```

#### Comparison Page Layout
```typescript
// /resources/comparisons/[competitor] page structure
// 1. Breadcrumbs: Resources > Comparisons > {Competitor}
// 2. Hero: "Lextract vs {Competitor}" heading
// 3. Introduction paragraphs
// 4. Feature comparison table (feature, Lextract value, Competitor value, advantage indicator)
// 5. Pricing comparison section
// 6. Side-by-side strengths/weaknesses
// 7. "Best for" summary boxes
// 8. Verdict paragraphs
// 9. CTA block
```

#### DefinedTermSet Schema
```typescript
// Add to lib/schema.ts
export function buildDefinedTermSetSchema(terms: { term: string; definition: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Commercial Lease Glossary',
    description: 'Definitions of common commercial real estate lease terms',
    definedTerm: terms.map((t) => ({
      '@type': 'DefinedTerm',
      name: t.term,
      description: t.definition,
    })),
  }
}
```

#### Sitemap Addition
```typescript
// Add to existing sitemap.ts
{ url: `${SITE_URL}/glossary`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
{ url: `${SITE_URL}/resources/comparisons`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
...comparisons.map((c) => ({
  url: `${SITE_URL}/resources/comparisons/${c.competitorSlug}`,
  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6,
})),
```

#### Data Quality
- Glossary terms come from Deep Research output (see `docs/content-research/prompt-2-glossary-and-states.md`)
- Comparison data comes from Deep Research output (see `docs/content-research/prompt-3-competitor-comparisons.md`)
- Run all copy through `humanizer` skill
- Comparisons must be balanced — acknowledge competitor strengths honestly

### Integration Points

- Uses `JsonLd`, `buildArticleSchema`, `buildBreadcrumbSchema` from US-036 (SEO Infrastructure)
- Adds `buildDefinedTermSetSchema` to `lib/schema.ts` from US-036
- Uses `Breadcrumbs` and `ContentCta` from US-037 (Content Infrastructure) if available, otherwise creates locally
- Uses `SITE_URL` from `lib/site-config.ts` for canonical URLs
- Linked from resources hub in US-038
- Modifies `app/sitemap.ts` created in US-036

## Verification

```bash
cd frontend
npm run build        # Build passes, static pages generated
npm test             # All glossary and comparison tests pass
# Manual: navigate to /glossary — 25+ terms render with A-Z navigation
# Manual: click a related term — scrolls to target
# Manual: navigate to /resources/comparisons/leaselens — full comparison renders
# Manual: navigate to /resources/comparisons/outsourced-services — full comparison renders
# Manual: check responsive at 375px, 768px, 1024px, 1440px
# Manual: view page source — JSON-LD DefinedTermSet on glossary, Article on comparisons
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Frontend" section: route groups, marketing layout
- `docs/PRD.md` — Section 13: Content and SEO strategy
- `docs/content-research/prompt-2-glossary-and-states.md` — Deep Research prompt for glossary data
- `docs/content-research/prompt-3-competitor-comparisons.md` — Deep Research prompt for comparison data
- CamAudit v2 reference: `camaudit-v2/frontend/src/app/(marketing)/glossary/`, `camaudit-v2/frontend/src/app/(marketing)/resources/comparisons/`
