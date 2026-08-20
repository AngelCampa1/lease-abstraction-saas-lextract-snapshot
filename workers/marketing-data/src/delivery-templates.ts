import lacStep0 from './templates/delivery/lease-abstraction-checklist_step_0.html'
import camStep0 from './templates/delivery/cam-reconciliation-checklist_step_0.html'
import ddStep0 from './templates/delivery/due-diligence-checklist_step_0.html'
import lawStep0 from './templates/delivery/lease-audit-workbook_step_0.html'

const TEMPLATES: Record<string, Record<number, string>> = {
  'lease-abstraction-checklist': {
    0: lacStep0,
  },
  'cam-reconciliation-checklist': {
    0: camStep0,
  },
  'due-diligence-checklist': {
    0: ddStep0,
  },
  'lease-audit-workbook': {
    0: lawStep0,
  },
}

/** Return the raw HTML delivery template for the given magnet slug, or null if not found. */
export function getDeliveryTemplate(slug: string, step: number): string | null {
  return TEMPLATES[slug]?.[step] ?? null
}
