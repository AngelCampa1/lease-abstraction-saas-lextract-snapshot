import type { LeadMagnetSlug } from '@/data/lead-magnets'

const RULES: ReadonlyArray<{ test: RegExp; slug: LeadMagnetSlug }> = [
  { test: /\/(audit|workbook|workflow|calculat|tool|template)/i, slug: 'lease-audit-workbook' },
  { test: /\b(cam|operating-expense|reconciliation|gross-up)\b/i, slug: 'cam-reconciliation-checklist' },
  { test: /\b(due-diligence|diligence|acquisition|case-stud)/i, slug: 'due-diligence-checklist' },
]

const DEFAULT_MAGNET: LeadMagnetSlug = 'lease-abstraction-checklist'

export function magnetForPath(pathname: string): LeadMagnetSlug {
  const normalized = (pathname || '/').toLowerCase()
  for (const rule of RULES) {
    if (rule.test.test(normalized)) return rule.slug
  }
  return DEFAULT_MAGNET
}
