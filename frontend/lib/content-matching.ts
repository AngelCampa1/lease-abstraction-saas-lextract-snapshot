import type { ContentMeta, FunnelStage, SiloId } from './content-types'
import { getAllContent } from './content'
import { lookupPseoLinks } from './pseo-link-index'
import type { PseoLinkEntry } from './pseo-link-index'
import { getNextStage, VERTICAL_FUNNEL_MAP } from './funnel-config'

/**
 * Load all articles and guides into a single array.
 * Used by pSEO pages that need related content from both categories.
 */
export async function getAllContentItems(): Promise<ContentMeta[]> {
  const [articles, guides] = await Promise.all([
    getAllContent('articles'),
    getAllContent('guides'),
  ])
  return [...articles, ...guides]
}

/**
 * Score and return related content items for a given content piece.
 * Scoring: +3 same silo, +1 per shared tag, +1 same category.
 */
export function getRelatedContent(
  allContent: ContentMeta[],
  current: ContentMeta,
  max: number = 3
): ContentMeta[] {
  const currentTagSet = new Set(current.tags.map((t) => t.toLowerCase()))

  const scored = allContent
    .filter((item) => !(item.slug === current.slug && item.category === current.category))
    .map((item) => {
      let score = 0
      if (item.silo === current.silo) score += 3
      if (item.category === current.category) score += 1
      for (const tag of item.tags) {
        if (currentTagSet.has(tag.toLowerCase())) score += 1
      }
      return { item, score }
    })
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, max).map((s) => s.item)
}

const VERTICAL_SILO_MAP: Record<string, SiloId[]> = {
  fields: ['lease-abstraction', 'cam-audit', 'cam-reconciliation'],
  'red-flags': ['cam-audit', 'cam-reconciliation', 'lease-abstraction'],
  glossary: ['lease-abstraction', 'lease-types', 'lease-negotiation'],
  clauses: ['lease-negotiation', 'lease-abstraction', 'lease-administration'],
  'use-cases': ['due-diligence', 'lease-abstraction', 'compliance'],
  'lease-types': ['lease-types', 'lease-abstraction', 'lease-negotiation'],
  'property-types': ['property-management', 'lease-abstraction'],
  templates: ['lease-administration', 'lease-abstraction', 'compliance'],
  integrations: ['lease-administration', 'property-management'],
  workflows: ['lease-administration', 'property-management', 'lease-abstraction'],
  states: ['lease-abstraction', 'compliance', 'lease-administration'],
  locations: ['lease-abstraction', 'property-management', 'due-diligence'],
  comparisons: ['lease-abstraction'],
  personas: ['lease-abstraction', 'property-management', 'due-diligence'],
  industries: ['lease-abstraction', 'property-management'],
  'case-studies': ['lease-abstraction', 'due-diligence', 'property-management'],
  faq: ['lease-abstraction', 'lease-types', 'lease-negotiation'],
  calculators: ['cam-reconciliation', 'lease-abstraction', 'cam-audit'],
}

/**
 * Score content for pSEO pages based on vertical/silo affinity and keyword overlap.
 */
export function getRelatedContentForPseo(
  allContent: ContentMeta[],
  vertical: string,
  keywords: string[],
  max: number = 3
): ContentMeta[] {
  const silos = VERTICAL_SILO_MAP[vertical] ?? ['lease-abstraction']
  const normalizedKeywords = keywords.map((k) => k.toLowerCase())

  const scored = allContent
    .map((item) => {
      let score = 0
      if (silos.includes(item.silo)) score += 3
      for (const tag of item.tags) {
        const normalizedTag = tag.toLowerCase()
        for (const keyword of normalizedKeywords) {
          if (normalizedTag.includes(keyword) || keyword.includes(normalizedTag)) {
            score += 2
          }
        }
      }
      return { item, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, max).map((s) => s.item)
}

/**
 * Map content tags to pSEO page links for cross-pollination.
 * Uses the auto-generated pseo-link-index, returns up to 8 links.
 * Prioritizes next-funnel-stage links when funnelStage is provided.
 */
export function getPseoLinksForContent(
  tags: string[],
  funnelStage?: FunnelStage
): Array<{ label: string; href: string }> {
  const preferNextStage = funnelStage ? getNextStage(funnelStage) ?? undefined : undefined
  const entries = lookupPseoLinks(tags, {
    max: 8,
    preferFunnelStage: preferNextStage,
  })
  return entries.map((e) => ({ label: e.label, href: e.href }))
}

export interface JourneyLinks {
  /** Same funnel stage - reinforces current understanding, max 3 */
  related: ContentMeta[]
  /** Next funnel stage - moves reader toward decision, max 2 */
  goDeeper: ContentMeta[]
}

/**
 * Partition related content into same-stage and next-stage buckets.
 * Scoring: same silo (+3), shared tags (+1 each), same category (+1).
 */
export function getJourneyLinks(
  allContent: ContentMeta[],
  current: ContentMeta
): JourneyLinks {
  const currentTagSet = new Set(current.tags.map((t) => t.toLowerCase()))
  const nextStage = getNextStage(current.funnelStage)

  const candidates = allContent
    .filter((item) => !(item.slug === current.slug && item.category === current.category))
    .map((item) => {
      let score = 0
      if (item.silo === current.silo) score += 3
      if (item.category === current.category) score += 1
      for (const tag of item.tags) {
        if (currentTagSet.has(tag.toLowerCase())) score += 1
      }
      return { item, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  const related: ContentMeta[] = []
  const goDeeper: ContentMeta[] = []

  for (const { item } of candidates) {
    if (nextStage && item.funnelStage === nextStage && goDeeper.length < 2) {
      goDeeper.push(item)
    } else if (item.funnelStage === current.funnelStage && related.length < 3) {
      related.push(item)
    }
    if (related.length >= 3 && goDeeper.length >= 2) break
  }

  return { related, goDeeper }
}

/**
 * For pSEO pages: find pages in OTHER verticals that share keywords with
 * the current page. Returns a map of vertical → links, max 3 per vertical,
 * max 4 verticals. Prioritizes next-funnel-stage verticals.
 */
export function getSmartCrossLinks(
  currentVertical: string,
  keywords: string[]
): Record<string, Array<{ label: string; href: string }>> {
  const currentStage = VERTICAL_FUNNEL_MAP[currentVertical] ?? 'mofu'
  const nextStage = getNextStage(currentStage)

  const entries = lookupPseoLinks(keywords, {
    max: 60,
    excludeVerticals: [currentVertical],
    preferFunnelStage: nextStage ?? undefined,
  })

  // Group by vertical
  const byVertical = new Map<string, PseoLinkEntry[]>()
  for (const entry of entries) {
    const existing = byVertical.get(entry.vertical)
    if (existing) {
      if (existing.length < 3) existing.push(entry)
    } else {
      byVertical.set(entry.vertical, [entry])
    }
  }

  // Sort verticals: next-stage first, then current-stage, then rest
  const sortedVerticals = [...byVertical.keys()].sort((a, b) => {
    const aStage = VERTICAL_FUNNEL_MAP[a] ?? 'mofu'
    const bStage = VERTICAL_FUNNEL_MAP[b] ?? 'mofu'
    const stageOrder = { tofu: 0, mofu: 1, bofu: 2 }
    // Prefer next-stage links
    if (nextStage) {
      const aIsNext = aStage === nextStage ? -1 : 0
      const bIsNext = bStage === nextStage ? -1 : 0
      if (aIsNext !== bIsNext) return aIsNext - bIsNext
    }
    return stageOrder[aStage] - stageOrder[bStage]
  })

  const result: Record<string, Array<{ label: string; href: string }>> = {}
  let verticalCount = 0
  for (const vertical of sortedVerticals) {
    if (verticalCount >= 4) break
    const links = byVertical.get(vertical)
    if (!links || links.length === 0) continue
    result[vertical] = links.map((e) => ({ label: e.label, href: e.href }))
    verticalCount++
  }

  return result
}
