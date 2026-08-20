import type { FunnelStage } from './content-types'
import { VERTICAL_FUNNEL_MAP } from './funnel-config'
import { isIndexableContentSlug } from './seo-inventory'
import articlesIndex from '@/content/articles-index.json'
import guidesIndex from '@/content/guides-index.json'
import { CALCULATORS } from '@/data/calculators'
import { CASE_STUDIES } from '@/data/case-studies'
import { INDEXABLE_CLAUSES as CLAUSES } from '@/data/clauses'
import { COMPARISONS } from '@/data/comparisons'
import { FAQS } from '@/data/faqs'
import { INDEXABLE_FIELDS as FIELDS } from '@/data/fields'
import { INDEXABLE_GLOSSARY_TERMS as GLOSSARY_TERMS } from '@/data/glossary'
import { INDEXABLE_INDUSTRIES as INDUSTRIES } from '@/data/industries'
import { INDEXABLE_INTEGRATIONS as INTEGRATIONS } from '@/data/integrations'
import { INDEXABLE_LEASE_TYPES as LEASE_TYPES } from '@/data/lease-types'
import { INDEXABLE_LOCATIONS as LOCATIONS } from '@/data/locations'
import { PERSONAS } from '@/data/personas'
import { PROPERTY_TYPES } from '@/data/property-types'
import { INDEXABLE_RED_FLAGS as RED_FLAGS } from '@/data/red-flags'
import { stateData } from '@/data/states'
import { TEMPLATES } from '@/data/templates'
import { USE_CASES } from '@/data/use-cases'
import { WORKFLOWS } from '@/data/workflows'

export type ResourceHubSectionHeading = 'Learn' | 'Reference' | 'Segments' | 'Tools'

export interface ResourceHub {
  label: string
  href: string
  description: string
  vertical: string
  funnelStage: FunnelStage
}

export interface ResourceHubSection {
  heading: ResourceHubSectionHeading
  hubs: ResourceHub[]
}

export interface ResourceHubChild {
  label: string
  href: string
  vertical: string
  funnelStage: FunnelStage
  parentHref: string
}

interface ContentIndexItem {
  title: string
  slug: string
  category: 'articles' | 'guides'
  funnelStage?: FunnelStage
}

const RESOURCE_HUB_SECTIONS: ResourceHubSection[] = [
  {
    heading: 'Learn',
    hubs: [
      hub('Articles', '/resources/articles', 'How-to and strategy articles', 'articles'),
      hub('Guides', '/resources/guides', 'Deep reference guides', 'guides'),
      hub('FAQ', '/faq', 'Commercial lease abstraction answers', 'faq', 'tofu'),
      hub('Case Studies', '/case-studies', 'Example lease abstraction outcomes', 'case-studies'),
    ],
  },
  {
    heading: 'Reference',
    hubs: [
      hub('Glossary', '/glossary', 'Commercial lease term definitions', 'glossary'),
      hub('Fields', '/fields', 'Priority extracted lease fields', 'fields'),
      hub('Clauses', '/clauses', 'Clause definitions and review notes', 'clauses'),
      hub('Red Flags', '/red-flags', 'Automated lease risk checks', 'red-flags'),
      hub('State Laws', '/resources/states', 'Commercial lease law by state', 'states'),
    ],
  },
  {
    heading: 'Segments',
    hubs: [
      hub('By Role', '/for', 'Tenant reps, brokers, attorneys, and owners', 'personas'),
      hub('Industries', '/industries', 'Lease abstraction by industry', 'industries'),
      hub('Use Cases', '/use-cases', 'Lease workflows and scenarios', 'use-cases'),
      hub('Lease Types', '/lease-types', 'NNN, gross, ground, and more', 'lease-types'),
      hub('Property Types', '/property-types', 'Office, retail, industrial, and specialty', 'property-types'),
      hub('Locations', '/locations', 'Major commercial real estate markets', 'locations'),
    ],
  },
  {
    heading: 'Tools',
    hubs: [
      hub('Calculators', '/calculators', 'Commercial lease calculators', 'calculators', 'bofu'),
      hub('Templates', '/templates', 'Checklists and templates', 'templates'),
      hub('Workflows', '/workflows', 'Export and import workflows', 'workflows'),
      hub('Integrations', '/integrations', 'Yardi, MRI, Excel, and more', 'integrations'),
      hub('Comparisons', '/resources/comparisons', 'Lextract vs. alternatives', 'comparisons'),
    ],
  },
]

function hub(
  label: string,
  href: string,
  description: string,
  vertical: string,
  funnelStage: FunnelStage = VERTICAL_FUNNEL_MAP[vertical] ?? 'mofu'
): ResourceHub {
  return { label, href, description, vertical, funnelStage }
}

function contentChildren(items: readonly unknown[], parentHref: string): ResourceHubChild[] {
  const children: ResourceHubChild[] = []

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue
    if (!('title' in item) || !('slug' in item) || !('category' in item)) continue
    const { title, slug, category } = item
    const funnelStage = 'funnelStage' in item ? item.funnelStage : undefined

    if (
      typeof title !== 'string' ||
      typeof slug !== 'string' ||
      typeof category !== 'string' ||
      (category !== 'articles' && category !== 'guides') ||
      !isIndexableContentSlug(category, slug)
    ) {
      continue
    }

    const itemStage: FunnelStage =
      funnelStage === 'tofu' || funnelStage === 'mofu' || funnelStage === 'bofu'
        ? funnelStage
        : VERTICAL_FUNNEL_MAP[category] ?? 'mofu'

    children.push({
      label: title,
      href: `/resources/${category}/${slug}`,
      vertical: category,
      funnelStage: itemStage,
      parentHref,
    })
  }

  return children
}

function child(
  label: string,
  href: string,
  vertical: string,
  parentHref: string,
  funnelStage: FunnelStage = VERTICAL_FUNNEL_MAP[vertical] ?? 'mofu'
): ResourceHubChild {
  return { label, href, vertical, funnelStage, parentHref }
}

const RESOURCE_HUB_CHILDREN: Record<string, ResourceHubChild[]> = {
  '/resources/articles': contentChildren(articlesIndex as ContentIndexItem[], '/resources/articles'),
  '/resources/guides': contentChildren(guidesIndex as ContentIndexItem[], '/resources/guides'),
  '/faq': FAQS.map((item) => child(item.question, `/faq/${item.slug}`, 'faq', '/faq', 'tofu')),
  '/case-studies': CASE_STUDIES.map((item) =>
    child(item.name, `/case-studies/${item.slug}`, 'case-studies', '/case-studies')
  ),
  '/glossary': GLOSSARY_TERMS.map((item) =>
    child(item.term, `/glossary/${item.slug}`, 'glossary', '/glossary')
  ),
  '/fields': FIELDS.map((item) =>
    child(item.displayLabel, `/fields/${item.slug}`, 'fields', '/fields')
  ),
  '/clauses': CLAUSES.map((item) =>
    child(item.name, `/clauses/${item.slug}`, 'clauses', '/clauses')
  ),
  '/red-flags': RED_FLAGS.map((item) =>
    child(item.name, `/red-flags/${item.slug}`, 'red-flags', '/red-flags')
  ),
  '/resources/states': stateData.map((item) =>
    child(`${item.state} Lease Laws`, `/resources/states/${item.slug}`, 'states', '/resources/states')
  ),
  '/for': PERSONAS.map((item) =>
    child(item.role, `/for/${item.slug}`, 'personas', '/for')
  ),
  '/industries': INDUSTRIES.map((item) =>
    child(item.shortName, `/industries/${item.slug}`, 'industries', '/industries')
  ),
  '/use-cases': USE_CASES.map((item) =>
    child(item.name, `/use-cases/${item.slug}`, 'use-cases', '/use-cases')
  ),
  '/lease-types': LEASE_TYPES.map((item) =>
    child(item.name, `/lease-types/${item.slug}`, 'lease-types', '/lease-types')
  ),
  '/property-types': PROPERTY_TYPES.map((item) =>
    child(item.name, `/property-types/${item.slug}`, 'property-types', '/property-types')
  ),
  '/locations': LOCATIONS.map((item) =>
    child(`${item.city}, ${item.stateAbbr}`, `/locations/${item.slug}`, 'locations', '/locations')
  ),
  '/calculators': CALCULATORS.map((item) =>
    child(item.title, `/calculators/${item.slug}`, 'calculators', '/calculators', 'bofu')
  ),
  '/templates': TEMPLATES.map((item) =>
    child(item.name, `/templates/${item.slug}`, 'templates', '/templates')
  ),
  '/workflows': WORKFLOWS.map((item) =>
    child(item.name, `/workflows/${item.slug}`, 'workflows', '/workflows')
  ),
  '/integrations': INTEGRATIONS.map((item) =>
    child(`${item.software} Integration`, `/integrations/${item.slug}`, 'integrations', '/integrations')
  ),
  '/resources/comparisons': COMPARISONS.map((item) =>
    child(`Lextract vs ${item.competitor}`, `/resources/comparisons/${item.competitorSlug}`, 'comparisons', '/resources/comparisons')
  ),
}

export function getResourceHubSections(): ResourceHubSection[] {
  return RESOURCE_HUB_SECTIONS.map((section) => ({
    heading: section.heading,
    hubs: section.hubs.map((hubItem) => ({ ...hubItem })),
  }))
}

export function getAllResourceHubHrefs(): string[] {
  return RESOURCE_HUB_SECTIONS.flatMap((section) => section.hubs.map((hubItem) => hubItem.href))
}

export function getResourceHubByHref(href: string): ResourceHub | undefined {
  return RESOURCE_HUB_SECTIONS
    .flatMap((section) => section.hubs)
    .find((hubItem) => hubItem.href === href)
}

export function getResourceHubChildren(href: string): ResourceHubChild[] {
  return (RESOURCE_HUB_CHILDREN[href] ?? []).map((childItem) => ({ ...childItem }))
}
