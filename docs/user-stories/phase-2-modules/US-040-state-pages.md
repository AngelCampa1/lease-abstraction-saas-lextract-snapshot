# US-040: State Commercial Lease Law Pages

**Phase:** 2 — Independent Modules | **Depends on:** US-001, US-036 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Medium

## Description

Build state-specific commercial landlord-tenant law pages for 10 high-value states. Each page provides statutes, key facts, notice periods, audit rights, and FAQs relevant to CRE professionals leasing in that state. Generates strong local SEO signals. All data comes from the Deep Research output in `docs/content-research/`.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — state listing layout, state detail page design, fact cards, FAQ accordion
- `humanizer` — review all state content for natural, professional tone and legal accuracy

## Acceptance Criteria

- [ ] `/resources/states` renders a grid of 10 state cards with state name, code, and meta description excerpt
- [ ] `/resources/states/[state]` renders individual state pages with: overview, key statutes, key facts, notice periods, audit rights, FAQs
- [ ] State data stored in `frontend/data/states.ts` matching the `StateLandlordTenantData` interface
- [ ] 10 states implemented: CA, TX, NY, FL, IL, PA, OH, GA, NJ, VA
- [ ] Key statutes section renders statute name, description, and optional link to official state code
- [ ] Key facts section renders as a grid of label/value cards
- [ ] Notice periods section renders as a structured table (type, period, details)
- [ ] Audit rights section renders summary and detail paragraphs
- [ ] FAQs render as an accessible accordion (details/summary or similar)
- [ ] Each state page exports `generateMetadata` with title "{State} Commercial Lease Laws", description, canonical URL
- [ ] Each state page renders `<JsonLd schema={buildArticleSchema(...)} />`, `<JsonLd schema={buildBreadcrumbSchema(...)} />`, and `<JsonLd schema={buildFAQPageSchema(faqs)} />`
- [ ] `generateStaticParams` implemented to statically generate all 10 state pages
- [ ] Sitemap updated to include `/resources/states` and all 10 state slug routes
- [ ] Responsive design across all breakpoints
- [ ] All copy sounds natural and professional — no AI-generated tone

## Technical Details

### Files to Create/Modify

- Create: `frontend/data/states.ts`
- Create: `frontend/app/(marketing)/resources/states/page.tsx`
- Create: `frontend/app/(marketing)/resources/states/[state]/page.tsx`
- Modify: `frontend/app/sitemap.ts` (add state routes)
- Test: `frontend/__tests__/content/states-listing.test.tsx`
- Test: `frontend/__tests__/content/state-page.test.tsx`
- Test: `frontend/__tests__/content/states-data.test.ts`

### Key Implementation Notes

#### State Detail Page Layout
```typescript
// /resources/states/[state] page structure
// 1. Breadcrumbs: Resources > States > {State Name}
// 2. Hero: "{State} Commercial Lease Laws" heading + state overview
// 3. Key Facts grid: 5-7 fact cards (label + value)
// 4. Key Statutes section: list of statutes with name, description, optional link
// 5. Notice Periods table: type, period, details columns
// 6. Audit Rights section: summary paragraph + detailed explanation
// 7. FAQs accordion: 4-6 expandable Q&A items
// 8. CTA block: "Abstracting a {State} commercial lease?"
```

#### State Listing Page
```typescript
// /resources/states page
// 1. Hero: "Commercial Lease Laws by State" heading + description
// 2. Grid of state cards (2-3 columns) with:
//    - State name + code badge
//    - Meta description excerpt (first sentence of overview)
//    - "Learn more →" link to /resources/states/{slug}
```

#### FAQ Schema
```typescript
// Each state page renders FAQPage JSON-LD using buildFAQPageSchema from US-036
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const state = stateData.find((s) => s.slug === params.state)
  return {
    title: `${state.state} Commercial Lease Laws`,
    description: state.metaDescription,
    alternates: { canonical: `${SITE_URL}/resources/states/${state.slug}` },
  }
}
```

#### Sitemap Addition
```typescript
// Add to existing sitemap.ts
{ url: `${SITE_URL}/resources/states`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
...stateData.map((s) => ({
  url: `${SITE_URL}/resources/states/${s.slug}`,
  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6,
})),
```

#### Data Quality
- State data comes from Deep Research output (see `docs/content-research/prompt-2-glossary-and-states.md`)
- Focus on COMMERCIAL lease law — not residential
- Acknowledge where statutes don't exist and commercial terms are contract-driven
- Run all copy through `humanizer` skill
- Cite specific statute numbers where they exist

### Integration Points

- Uses `JsonLd`, `buildArticleSchema`, `buildBreadcrumbSchema`, `buildFAQPageSchema` from US-036 (SEO Infrastructure)
- Uses `Breadcrumbs` and `ContentCta` from US-037 (Content Infrastructure) if available, otherwise creates locally
- Uses `SITE_URL` from `lib/site-config.ts` for canonical URLs
- Linked from resources hub in US-038
- Modifies `app/sitemap.ts` created in US-036

## Verification

```bash
cd frontend
npm run build        # Build passes, 10 state pages statically generated
npm test             # All state page tests pass
# Manual: navigate to /resources/states — 10 state cards render
# Manual: click California — full state page with all sections
# Manual: expand FAQ item — accordion opens smoothly
# Manual: check responsive at 375px, 768px, 1024px, 1440px
# Manual: view page source — JSON-LD Article + BreadcrumbList + FAQPage schemas
```

## Reference Docs

- `docs/ARCHITECTURE.md` — "Frontend" section: route groups, marketing layout
- `docs/PRD.md` — Section 13: Content and SEO strategy
- `docs/content-research/prompt-2-glossary-and-states.md` — Deep Research prompt for state data
- CamAudit v2 reference: `camaudit-v2/frontend/src/app/(marketing)/resources/states/`
