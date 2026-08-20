import { PUBLIC_KNOWLEDGE } from './public-knowledge'
import type { LeadMagnetKnowledge } from './public-knowledge'

export type LeadMagnetFormat = 'PDF' | 'XLSX'

export type LeadMagnetDefinition = LeadMagnetKnowledge
  & {
    r2ObjectKey: string
    localAssetPath: string
    minimumBytes: number
    minimumPages?: number
    minimumSheets?: number
  }

export const LEAD_MAGNETS_BUCKET = 'lextract-lead-magnets'

export type LeadMagnetSlug = LeadMagnetKnowledge['slug']

const LEAD_MAGNET_VALIDATION: Record<
  LeadMagnetSlug,
  { minimumBytes: number; minimumPages?: number; minimumSheets?: number }
> = {
  'lease-abstraction-checklist': {
    minimumBytes: 20_000,
    minimumPages: 8,
  },
  'cam-reconciliation-checklist': {
    minimumBytes: 20_000,
    minimumPages: 7,
  },
  'due-diligence-checklist': {
    minimumBytes: 20_000,
    minimumPages: 7,
  },
  'lease-audit-workbook': {
    minimumBytes: 20_000,
    minimumSheets: 8,
  },
}

export const PROMOTED_LEAD_MAGNETS: readonly LeadMagnetDefinition[] =
  PUBLIC_KNOWLEDGE.marketing.leadMagnets.map((magnet) => {
    const extension = magnet.fileFormat.toLowerCase()
    const fileName = `${magnet.slug}-v3.${extension}`
    const validation = LEAD_MAGNET_VALIDATION[magnet.slug]
    return {
      ...magnet,
      r2ObjectKey: fileName,
      localAssetPath: `public/lead-magnets/${fileName}`,
      ...validation,
    }
  })

export const LEAD_MAGNET_SLUGS: LeadMagnetSlug[] = PROMOTED_LEAD_MAGNETS.map(
  (magnet) => magnet.slug,
)

export function getLeadMagnet(slug: string): LeadMagnetDefinition | undefined {
  return PROMOTED_LEAD_MAGNETS.find((magnet) => magnet.slug === slug)
}
