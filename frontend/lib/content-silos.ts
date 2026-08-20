import type { Silo, SiloId } from './content-types'

export const CONTENT_SILOS: Record<SiloId, Silo> = {
  'lease-abstraction': {
    id: 'lease-abstraction',
    displayName: 'Lease Abstraction',
    description: 'Core content about commercial lease data extraction',
    baseUrl: '/resources/lease-abstraction',
  },
  'property-management': {
    id: 'property-management',
    displayName: 'Property Management',
    description: 'Content for property and asset managers',
    baseUrl: '/resources/property-management',
  },
  'cam-audit': {
    id: 'cam-audit',
    displayName: 'CAM Audit',
    description: 'CAM reconciliation and audit content (cross-sells CamAudit.io)',
    baseUrl: '/resources/cam-audit',
  },
  'cam-reconciliation': {
    id: 'cam-reconciliation',
    displayName: 'CAM Reconciliation',
    description: 'CAM charges, reconciliation, and tenant rights',
    baseUrl: '/resources/cam-reconciliation',
  },
  'compliance': {
    id: 'compliance',
    displayName: 'Compliance',
    description: 'Lease accounting compliance (ASC 842, IFRS 16)',
    baseUrl: '/resources/compliance',
  },
  'due-diligence': {
    id: 'due-diligence',
    displayName: 'Due Diligence',
    description: 'Lease due diligence for acquisitions and portfolio reviews',
    baseUrl: '/resources/due-diligence',
  },
  'lease-types': {
    id: 'lease-types',
    displayName: 'Lease Types',
    description: 'Comparisons and explanations of commercial lease structures',
    baseUrl: '/resources/lease-types',
  },
  'lease-negotiation': {
    id: 'lease-negotiation',
    displayName: 'Lease Negotiation',
    description: 'Commercial lease negotiation strategies and data',
    baseUrl: '/resources/lease-negotiation',
  },
  'lease-administration': {
    id: 'lease-administration',
    displayName: 'Lease Administration',
    description: 'Lease administration workflows and best practices',
    baseUrl: '/resources/lease-administration',
  },
} as const

export function getSiloById(id: SiloId): Silo {
  return CONTENT_SILOS[id]
}

export function getAllSilos(): Silo[] {
  return Object.values(CONTENT_SILOS)
}
