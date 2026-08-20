# US-013: Landing Page

**Phase:** 2 — Independent Modules | **Depends on:** US-001, US-036 | **Blocks:** None
**Type:** Frontend
**Estimated session size:** Large

## Description

Build the marketing landing page at the root URL with 8 sections designed to convert commercial real estate professionals. This is the first page visitors see and the primary acquisition funnel for the product.

## Required Skills

- `superpowers:test-driven-development`
- `frontend-design:frontend-design` — this is the most design-intensive page
- `humanizer` — all copy must sound natural and professional, not AI-generated

## Acceptance Criteria

- [ ] 8 sections implemented per PRD Section 13: hero, how-it-works, sample output demo, red flags showcase, pricing cards, competitor comparison, CamAudit cross-sell, footer
- [ ] Hero: headline "Extract Every Clause from Any Commercial Lease in Minutes", subheadline, primary CTA to `/upload`
- [ ] How It Works: 3-step visual (Upload PDF → AI Extracts 99 Fields → Review & Export)
- [ ] Sample Output: interactive demo showing extracted fields with confidence badges (static/mocked data)
- [ ] Red Flag Detection: showcase 3-4 example red flags with severity icons
- [ ] Pricing: 3-column layout — Single ($15), 5-Pack ($65, 13% off), 10-Pack ($120, 20% off)
- [ ] Competitor Comparison: table comparing Lextract vs manual review vs other tools
- [ ] CamAudit Cross-Sell: section explaining the CAM audit integration
- [ ] Footer: company info, legal disclaimers, links
- [ ] Marketing nav includes "Resources" link pointing to `/resources` (content hub from US-038)
- [ ] SEO metadata: page-level `export const metadata` with title, description, `alternates.canonical` pointing to `SITE_URL`, and `openGraph` overrides
- [ ] JSON-LD structured data: `<JsonLd schema={buildWebApplicationSchema()} />` on the page
- [ ] JSON-LD FAQ schema: `<JsonLd schema={buildFAQPageSchema(faqItems)} />` if page includes FAQ section
- [ ] Target keywords in title/description: "lease abstraction", "commercial lease", "AI lease extraction", "126 fields"
- [ ] Responsive design across all breakpoints
- [ ] CTA buttons link to `/upload` (will 404 until Phase 3 — acceptable)
- [ ] Each section uses `FadeIn` component for scroll-triggered entrance (fade-up, 16px translate, triggers once at 20% viewport)
- [ ] Feature cards and pricing cards use `StaggerChildren` for sequential entrance
- [ ] CTA buttons have spring-based hover scale effect (`whileHover={{ scale: 1.02 }}`)
- [ ] All copy sounds natural, professional — no AI-generated tone

## Technical Details

### Files to Create/Modify

- Create: `frontend/app/(marketing)/page.tsx` (landing page)
- Create: `frontend/components/marketing/hero.tsx`
- Create: `frontend/components/marketing/how-it-works.tsx`
- Create: `frontend/components/marketing/sample-output.tsx`
- Create: `frontend/components/marketing/red-flags-showcase.tsx`
- Create: `frontend/components/marketing/pricing-cards.tsx`
- Create: `frontend/components/marketing/competitor-comparison.tsx`
- Create: `frontend/components/marketing/camaudit-crosssell.tsx`
- Create: `frontend/components/marketing/footer.tsx`
- Modify: `frontend/app/(marketing)/layout.tsx` (marketing-specific header/footer)
- Modify: `frontend/app/(marketing)/page.tsx` (add JSON-LD imports from `lib/schema.ts`, page metadata with canonical URL from `lib/site-config.ts`)
- Test: `frontend/__tests__/marketing/landing-page.test.tsx`

### Key Implementation Notes

- Use static/mocked data for the sample output demo — no API calls needed
- Pricing must match PRD exactly: $15 single, $65 five-pack (save 13%), $120 ten-pack (save 20%)
- The competitor comparison should highlight: speed (minutes vs hours), coverage (126 fields vs ~20), cost ($20 vs $200+), red flag detection (unique to Lextract)
- Modern SaaS aesthetic: clean, professional, trustworthy — target audience is CRE professionals
- Use `FadeIn` and `StaggerChildren` components from `frontend/components/motion/` for scroll-triggered animations — keep them subtle and professional
- The CamAudit cross-sell should feel like a value-add, not a hard sell

### Integration Points

- Standalone page — no backend dependencies
- CTA buttons link to `/upload` (US-017) and `/signup` (US-011)
- SEO is critical for organic acquisition — target "lease abstraction" keywords
- Uses `JsonLd` component and schema builders from US-036 (SEO Infrastructure)
- Uses `SITE_URL` from `lib/site-config.ts` for canonical URL in metadata
- Marketing nav "Resources" link connects to content hub (US-038) — will 404 until content stories ship, acceptable

## Verification

```bash
cd frontend
npm run build   # Build passes
npm test        # Landing page tests pass
# Manual: navigate to / — all 8 sections render
# Manual: check responsive at 375px, 768px, 1024px, 1440px
# Manual: verify SEO meta tags in page source
```

## Reference Docs

- `docs/PRD.md` — Section 13: Landing page requirements, 8 sections
- `docs/PRD.md` — Section 8: Pricing model
- `docs/PRD.md` — Section 10: CamAudit cross-sell messaging
