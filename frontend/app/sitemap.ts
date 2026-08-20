import type { MetadataRoute } from 'next'
import { SITE_URL, PSEO_LAUNCH_DATE as PSEO_LAUNCH_DATE_STR } from '@/lib/site-config'
import { getAllContent } from '@/lib/content'
import { COMPARISONS } from '@/data/comparisons'
import { stateData } from '@/data/states'
import { INDEXABLE_FIELDS as FIELDS } from '@/data/fields'
import { INDEXABLE_RED_FLAGS as RED_FLAGS } from '@/data/red-flags'
import { PERSONAS } from '@/data/personas'
import { USE_CASES } from '@/data/use-cases'
import { INDEXABLE_LEASE_TYPES as LEASE_TYPES } from '@/data/lease-types'
import { INDEXABLE_INDUSTRIES as INDUSTRIES } from '@/data/industries'
import { INDEXABLE_LOCATIONS as LOCATIONS } from '@/data/locations'
import { INDEXABLE_GLOSSARY_TERMS as GLOSSARY_TERMS, GLOSSARY_LAST_UPDATED } from '@/data/glossary'
import { INDEXABLE_CLAUSES as CLAUSES, CLAUSES_LAST_UPDATED } from '@/data/clauses'
import { PROPERTY_TYPES } from '@/data/property-types'
import { TEMPLATES } from '@/data/templates'
import { INDEXABLE_INTEGRATIONS as INTEGRATIONS } from '@/data/integrations'
import { WORKFLOWS } from '@/data/workflows'
import { CASE_STUDIES, CASE_STUDIES_PUBLISHED_DATE } from '@/data/case-studies'
import { FAQS } from '@/data/faqs'
import { CALCULATORS } from '@/data/calculators'
import { PRODUCT_FEATURES } from '@/data/features'
import { isSitemapPath } from '@/lib/seo-route-policy'

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

// Fixed date for pSEO pages launched at go-live. Avoids spurious lastModified churn on every build.
const PSEO_LAUNCH_DATE = new Date(PSEO_LAUNCH_DATE_STR)
// Fixed date for money page cross-linking update (April 2026). Avoids churn on redeploy.
const MONEY_PAGE_UPDATE_DATE = new Date('2026-04-01')
const MARKETING_UPDATE_DATE = new Date('2026-04-30')
const FEATURE_PAGE_UPDATE_DATE = new Date('2026-05-31')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getAllContent('articles')
  const guides = await getAllContent('guides')

  const contentRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/resources`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'weekly' as ChangeFrequency,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/resources/articles`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'weekly' as ChangeFrequency,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/resources/guides`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'weekly' as ChangeFrequency,
      priority: 0.7,
    },
    ...articles.map((a) => ({
      url: `${SITE_URL}/resources/articles/${a.slug}`,
      lastModified: new Date(a.updatedAt ?? a.publishedAt),
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
    ...guides.map((g) => ({
      url: `${SITE_URL}/resources/guides/${g.slug}`,
      lastModified: new Date(g.updatedAt ?? g.publishedAt),
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
  ]

  const glossaryLastUpdated = new Date(GLOSSARY_LAST_UPDATED)
  const glossaryRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/glossary`,
      lastModified: glossaryLastUpdated,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    },
    ...GLOSSARY_TERMS.map((t) => ({
      url: `${SITE_URL}/glossary/${t.slug}`,
      lastModified: glossaryLastUpdated,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
  ]

  const comparisonRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/resources/comparisons`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    },
    ...COMPARISONS.map((c) => ({
      url: `${SITE_URL}/resources/comparisons/${c.competitorSlug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
  ]

  const clausesLastUpdated = new Date(CLAUSES_LAST_UPDATED)
  const clauseRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/clauses`,
      lastModified: clausesLastUpdated,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...CLAUSES.map((c) => ({
      url: `${SITE_URL}/clauses/${c.slug}`,
      lastModified: clausesLastUpdated,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
  ]

  const propertyTypeRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/property-types`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...PROPERTY_TYPES.map((pt) => ({
      url: `${SITE_URL}/property-types/${pt.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
  ]

  const templateRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/templates`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    },
    ...TEMPLATES.map((t) => ({
      url: `${SITE_URL}/templates/${t.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
  ]

  const integrationRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/integrations`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    },
    ...INTEGRATIONS.map((i) => ({
      url: `${SITE_URL}/integrations/${i.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
  ]

  const workflowRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/workflows`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    },
    ...WORKFLOWS.map((w) => ({
      url: `${SITE_URL}/workflows/${w.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
  ]

  const calculatorRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/calculators`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...CALCULATORS.map((c) => ({
      url: `${SITE_URL}/calculators/${c.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
  ]

  const faqRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/faq`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...FAQS.map((f) => ({
      url: `${SITE_URL}/faq/${f.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    })),
  ]

  const caseStudiesDate = new Date(CASE_STUDIES_PUBLISHED_DATE)
  const caseStudyRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/case-studies`,
      lastModified: caseStudiesDate,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...CASE_STUDIES.map((cs) => ({
      url: `${SITE_URL}/case-studies/${cs.slug}`,
      lastModified: caseStudiesDate,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    })),
  ]

  const toolRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/tools`,
      lastModified: MONEY_PAGE_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/tools/lease-comparison`,
      lastModified: MONEY_PAGE_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    },
  ]

  const featureRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/features`,
      lastModified: FEATURE_PAGE_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.9,
    },
    ...PRODUCT_FEATURES.map((feature) => ({
      url: `${SITE_URL}/features/${feature.slug}`,
      lastModified: FEATURE_PAGE_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    })),
  ]

  const routes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'weekly' as ChangeFrequency,
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/llms.txt`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'weekly' as ChangeFrequency,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/llms-full.txt`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'weekly' as ChangeFrequency,
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/pricing.md`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'weekly' as ChangeFrequency,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/lease-abstraction-software`,
      lastModified: MONEY_PAGE_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/lease-extraction-software`,
      lastModified: MONEY_PAGE_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/ai-lease-abstraction`,
      lastModified: MONEY_PAGE_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/lease-abstraction-services`,
      lastModified: MONEY_PAGE_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/automated-lease-abstraction`,
      lastModified: MONEY_PAGE_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/upload`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/about/angel-campa`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'yearly' as ChangeFrequency,
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'yearly' as ChangeFrequency,
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/sample-report`,
      lastModified: MARKETING_UPDATE_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...toolRoutes,
    ...featureRoutes,
    ...contentRoutes,
    ...calculatorRoutes,
    ...faqRoutes,
    ...glossaryRoutes,
    ...comparisonRoutes,
    ...clauseRoutes,
    ...propertyTypeRoutes,
    ...templateRoutes,
    ...integrationRoutes,
    ...workflowRoutes,
    ...caseStudyRoutes,
    {
      url: `${SITE_URL}/resources/states`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    },
    ...stateData.map((s) => ({
      url: `${SITE_URL}/resources/states/${s.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
    // Field extraction pages (126 pages)
    {
      url: `${SITE_URL}/fields`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...FIELDS.map((f) => ({
      url: `${SITE_URL}/fields/${f.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.5,
    })),
    // Red flag detail pages (20 pages)
    {
      url: `${SITE_URL}/red-flags`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...RED_FLAGS.map((rf) => ({
      url: `${SITE_URL}/red-flags/${rf.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
    // Persona pages (10 pages)
    {
      url: `${SITE_URL}/for`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...PERSONAS.map((p) => ({
      url: `${SITE_URL}/for/${p.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    })),
    // Use case pages (12 pages)
    {
      url: `${SITE_URL}/use-cases`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    },
    ...USE_CASES.map((uc) => ({
      url: `${SITE_URL}/use-cases/${uc.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
    // Lease type pages (12 pages)
    {
      url: `${SITE_URL}/lease-types`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...LEASE_TYPES.map((lt) => ({
      url: `${SITE_URL}/lease-types/${lt.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
    // Industry vertical pages (11 pages)
    {
      url: `${SITE_URL}/industries`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.8,
    },
    ...INDUSTRIES.map((i) => ({
      url: `${SITE_URL}/industries/${i.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.6,
    })),
    // City/metro pages (51 pages)
    {
      url: `${SITE_URL}/locations`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.7,
    },
    ...LOCATIONS.map((l) => ({
      url: `${SITE_URL}/locations/${l.slug}`,
      lastModified: PSEO_LAUNCH_DATE,
      changeFrequency: 'monthly' as ChangeFrequency,
      priority: 0.5,
    })),
  ]

  return routes.filter((entry) => isSitemapPath(new URL(entry.url).pathname))
}
