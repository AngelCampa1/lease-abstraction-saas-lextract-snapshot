import type { FunnelStage } from './content-types'

/**
 * Maps each pSEO vertical to its funnel stage.
 * TOFU: awareness/education - users learning about concepts
 * MOFU: consideration - users evaluating approaches and how-tos
 * BOFU: decision - users comparing tools, checking pricing, ready to act
 */
export const VERTICAL_FUNNEL_MAP: Record<string, FunnelStage> = {
  // TOFU - educates on concepts and terminology
  glossary: 'tofu',
  clauses: 'tofu',
  'lease-types': 'tofu',
  'property-types': 'tofu',
  industries: 'tofu',
  // MOFU - evaluation and process-oriented
  fields: 'mofu',
  'red-flags': 'mofu',
  workflows: 'mofu',
  templates: 'mofu',
  'use-cases': 'mofu',
  states: 'mofu',
  locations: 'mofu',
  // BOFU - decision-ready, software-specific
  integrations: 'bofu',
  comparisons: 'bofu',
  personas: 'bofu',
  'case-studies': 'bofu',
}

const STAGE_ORDER: FunnelStage[] = ['tofu', 'mofu', 'bofu']

export function getNextStage(stage: FunnelStage): FunnelStage | null {
  const idx = STAGE_ORDER.indexOf(stage)
  return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null
}

