import {
  getFieldSeoRedirect,
  getIndexableFieldBySlug,
} from '@/data/fields'
import {
  getGlossarySeoRedirect,
  getIndexableGlossaryTermBySlug,
} from '@/data/glossary'
import {
  getClauseSeoRedirect,
  getIndexableClauseBySlug,
} from '@/data/clauses'
import {
  getIndexableRedFlagBySlug,
  getRedFlagSeoRedirect,
} from '@/data/red-flags'

const FIELD_ALIASES: Record<string, string> = {
  'assignment-rights': '/fields/exclusive-use-rights',
  'base-rent': '/fields/base-rent-annual',
  'base-year-expense-stop': '/fields/base-year',
  'cam-cap': '/fields/cam-cap-percentage',
  'cam-charges': '/glossary/cam-charges',
  'cam-estimate': '/fields/cam-exclusions',
  'free-rent': '/glossary/free-rent-period',
  'free-rent-period': '/glossary/rent-abatement',
  'gross-sales-reporting': '/lease-types/percentage-lease',
  'gross-up-provision': '/clauses/gross-up-provision',
  'insurance-requirements': '/fields/cgl-occurrence-limit',
  'landlord-legal-name': '/fields/commencement-date',
  'lease-type': '/lease-types',
  'notice-requirements': '/fields/renewal-notice-days',
  'operating-expense-inclusions': '/fields/cam-exclusions',
  'operating-expenses': '/glossary/operating-expense-pass-through',
  'percentage-rent-rate': '/lease-types/percentage-lease',
  'permitted-use': '/fields/exclusive-use-rights',
  'premises-address': '/fields/commencement-date',
  'renewal-options': '/fields/renewal-notice-days',
  'rent-escalation': '/glossary/rent-escalation-schedule',
  'rent-escalation-rate': '/fields/fixed-escalation-rate',
  'rentable-area': '/fields/rentable-square-footage',
  'security-deposit': '/glossary/guarantor',
  'subletting-rights': '/fields/exclusive-use-rights',
  'termination-option': '/glossary/termination-option',
  'tenant-improvement-allowance': '/fields/ti-allowance-per-rsf',
  'ti-allowance': '/fields/ti-allowance-per-rsf',
  'tenant-legal-name': '/fields/commencement-date',
  'termination-options': '/red-flags/no-renewal-option',
  'utility-responsibilities': '/fields/cam-exclusions',
}

const RED_FLAG_ALIASES: Record<string, string> = {
  'below-market-rent-on-renewal': '/red-flags/no-renewal-option',
  'missing-assignment-rights': '/red-flags/missing-cam-exclusions',
  'missing-cam-cap': '/red-flags/no-cam-cap',
  'missing-gross-sales-reporting': '/red-flags/missing-cam-exclusions',
  'missing-termination-option': '/red-flags/no-renewal-option',
  'no-audit-rights': '/red-flags/missing-audit-rights',
}

export function resolveFieldHref(slug: string): string | null {
  const alias = FIELD_ALIASES[slug]
  if (alias) return alias
  if (getIndexableFieldBySlug(slug)) {
    return `/fields/${slug}`
  }
  return getFieldSeoRedirect(slug)
}

export function resolveGlossaryHref(slug: string): string | null {
  if (getIndexableGlossaryTermBySlug(slug)) {
    return `/glossary/${slug}`
  }
  return getGlossarySeoRedirect(slug)
}

export function resolveClauseHref(slug: string): string | null {
  if (getIndexableClauseBySlug(slug)) {
    return `/clauses/${slug}`
  }
  return getClauseSeoRedirect(slug)
}

export function resolveRedFlagHref(slug: string): string | null {
  const alias = RED_FLAG_ALIASES[slug]
  if (alias) return alias
  if (getIndexableRedFlagBySlug(slug)) {
    return `/red-flags/${slug}`
  }
  return getRedFlagSeoRedirect(slug)
}
