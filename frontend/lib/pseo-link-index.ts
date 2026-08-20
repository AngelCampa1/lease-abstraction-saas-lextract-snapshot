import type { FunnelStage } from './content-types'
import { VERTICAL_FUNNEL_MAP } from './funnel-config'
import { INDEXABLE_GLOSSARY_TERMS as GLOSSARY_TERMS } from '@/data/glossary'
import { INDEXABLE_FIELDS as FIELDS } from '@/data/fields'
import { INDEXABLE_CLAUSES as CLAUSES } from '@/data/clauses'
import { WORKFLOWS } from '@/data/workflows'
import { INDEXABLE_INTEGRATIONS as INTEGRATIONS } from '@/data/integrations'
import { USE_CASES } from '@/data/use-cases'
import { INDEXABLE_LEASE_TYPES as LEASE_TYPES } from '@/data/lease-types'
import { PROPERTY_TYPES } from '@/data/property-types'
import { INDEXABLE_RED_FLAGS as RED_FLAGS } from '@/data/red-flags'
import { TEMPLATES } from '@/data/templates'
import { PERSONAS } from '@/data/personas'
import { INDEXABLE_INDUSTRIES as INDUSTRIES } from '@/data/industries'
import { INDEXABLE_LOCATIONS as LOCATIONS } from '@/data/locations'
import { stateData } from '@/data/states'
import { COMPARISONS } from '@/data/comparisons'
import { CASE_STUDIES } from '@/data/case-studies'

export interface PseoLinkEntry {
  label: string
  href: string
  vertical: string
  funnelStage: FunnelStage
}

const STOPWORDS = new Set([
  'lease', 'commercial', 'abstraction', 'data', 'property', 'the', 'and', 'for',
  'in', 'of', 'to', 'a', 'an', 'is', 'are', 'that', 'this', 'it', 'with', 'on',
  'at', 'by', 'from', 'or', 'as', 'be', 'was', 'not',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
}

function stageFor(vertical: string): FunnelStage {
  return VERTICAL_FUNNEL_MAP[vertical] ?? 'mofu'
}

/**
 * Build keyword → link entries index.
 * Each keyword maps to all pSEO links that match it.
 * Built once at module load (SSG build time).
 */
function buildIndex(): Map<string, PseoLinkEntry[]> {
  const index = new Map<string, PseoLinkEntry[]>()

  function addEntry(keywords: string[], entry: PseoLinkEntry): void {
    for (const kw of keywords) {
      const existing = index.get(kw)
      if (existing) {
        // Avoid duplicates by href
        if (!existing.some((e) => e.href === entry.href)) {
          existing.push(entry)
        }
      } else {
        index.set(kw, [entry])
      }
    }
  }

  // ── Glossary ──────────────────────────────────────────────────────────────
  for (const term of GLOSSARY_TERMS) {
    const entry: PseoLinkEntry = {
      label: term.term,
      href: `/glossary/${term.slug}`,
      vertical: 'glossary',
      funnelStage: stageFor('glossary'),
    }
    const kws = [
      ...tokenize(term.term),
      ...tokenize(term.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Fields ────────────────────────────────────────────────────────────────
  for (const field of FIELDS) {
    const entry: PseoLinkEntry = {
      label: field.displayLabel,
      href: `/fields/${field.slug}`,
      vertical: 'fields',
      funnelStage: stageFor('fields'),
    }
    const kws = [
      ...tokenize(field.fieldName),
      ...tokenize(field.displayLabel),
      ...field.aliases.flatMap((a) => tokenize(a)),
      ...tokenize(field.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Clauses ───────────────────────────────────────────────────────────────
  for (const clause of CLAUSES) {
    const entry: PseoLinkEntry = {
      label: clause.name,
      href: `/clauses/${clause.slug}`,
      vertical: 'clauses',
      funnelStage: stageFor('clauses'),
    }
    const kws = [
      ...tokenize(clause.name),
      ...tokenize(clause.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Workflows ─────────────────────────────────────────────────────────────
  for (const wf of WORKFLOWS) {
    const entry: PseoLinkEntry = {
      label: wf.name,
      href: `/workflows/${wf.slug}`,
      vertical: 'workflows',
      funnelStage: stageFor('workflows'),
    }
    const kws = [
      ...tokenize(wf.name),
      ...tokenize(wf.toolName),
      ...tokenize(wf.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Integrations ──────────────────────────────────────────────────────────
  for (const intg of INTEGRATIONS) {
    const entry: PseoLinkEntry = {
      label: `${intg.software} Integration`,
      href: `/integrations/${intg.slug}`,
      vertical: 'integrations',
      funnelStage: stageFor('integrations'),
    }
    const kws = [
      ...tokenize(intg.software),
      ...tokenize(intg.vendor),
      ...tokenize(intg.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Use Cases ─────────────────────────────────────────────────────────────
  for (const uc of USE_CASES) {
    const entry: PseoLinkEntry = {
      label: uc.name,
      href: `/use-cases/${uc.slug}`,
      vertical: 'use-cases',
      funnelStage: stageFor('use-cases'),
    }
    const kws = [
      ...tokenize(uc.name),
      ...tokenize(uc.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Lease Types ───────────────────────────────────────────────────────────
  for (const lt of LEASE_TYPES) {
    const entry: PseoLinkEntry = {
      label: lt.name,
      href: `/lease-types/${lt.slug}`,
      vertical: 'lease-types',
      funnelStage: stageFor('lease-types'),
    }
    const kws = [
      ...tokenize(lt.name),
      ...tokenize(lt.abbreviation),
      ...tokenize(lt.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Property Types ────────────────────────────────────────────────────────
  for (const pt of PROPERTY_TYPES) {
    const entry: PseoLinkEntry = {
      label: pt.name,
      href: `/property-types/${pt.slug}`,
      vertical: 'property-types',
      funnelStage: stageFor('property-types'),
    }
    const kws = [
      ...tokenize(pt.name),
      ...tokenize(pt.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Red Flags ─────────────────────────────────────────────────────────────
  for (const rf of RED_FLAGS) {
    const entry: PseoLinkEntry = {
      label: rf.name,
      href: `/red-flags/${rf.slug}`,
      vertical: 'red-flags',
      funnelStage: stageFor('red-flags'),
    }
    const kws = [
      ...tokenize(rf.name),
      ...tokenize(rf.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Templates ─────────────────────────────────────────────────────────────
  for (const tpl of TEMPLATES) {
    const entry: PseoLinkEntry = {
      label: tpl.name,
      href: `/templates/${tpl.slug}`,
      vertical: 'templates',
      funnelStage: stageFor('templates'),
    }
    const kws = [
      ...tokenize(tpl.name),
      ...tokenize(tpl.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Personas ──────────────────────────────────────────────────────────────
  for (const persona of PERSONAS) {
    const entry: PseoLinkEntry = {
      label: persona.role,
      href: `/for/${persona.slug}`,
      vertical: 'personas',
      funnelStage: stageFor('personas'),
    }
    const kws = [
      ...tokenize(persona.role),
      ...tokenize(persona.shortTitle),
      ...tokenize(persona.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Industries ────────────────────────────────────────────────────────────
  for (const ind of INDUSTRIES) {
    const entry: PseoLinkEntry = {
      label: ind.shortName,
      href: `/industries/${ind.slug}`,
      vertical: 'industries',
      funnelStage: stageFor('industries'),
    }
    const kws = [
      ...tokenize(ind.name),
      ...tokenize(ind.shortName),
      ...tokenize(ind.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Locations ─────────────────────────────────────────────────────────────
  for (const loc of LOCATIONS) {
    const entry: PseoLinkEntry = {
      label: `${loc.city}, ${loc.stateAbbr}`,
      href: `/locations/${loc.slug}`,
      vertical: 'locations',
      funnelStage: stageFor('locations'),
    }
    const kws = [
      ...tokenize(loc.city),
      ...tokenize(loc.state),
      loc.stateAbbr.toLowerCase(),
    ]
    addEntry(kws, entry)
  }

  // ── States ────────────────────────────────────────────────────────────────
  for (const state of stateData) {
    const entry: PseoLinkEntry = {
      label: `${state.state} Lease Laws`,
      href: `/resources/states/${state.slug}`,
      vertical: 'states',
      funnelStage: stageFor('states'),
    }
    const kws = [
      ...tokenize(state.state),
      state.stateCode.toLowerCase(),
      state.slug,
    ]
    addEntry(kws, entry)
  }

  // ── Comparisons ───────────────────────────────────────────────────────────
  for (const comp of COMPARISONS) {
    const entry: PseoLinkEntry = {
      label: `Lextract vs ${comp.competitor}`,
      href: `/resources/comparisons/${comp.competitorSlug}`,
      vertical: 'comparisons',
      funnelStage: stageFor('comparisons'),
    }
    const kws = [
      ...tokenize(comp.competitor),
      ...tokenize(comp.competitorSlug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  // ── Case Studies ──────────────────────────────────────────────────────────
  for (const cs of CASE_STUDIES) {
    const entry: PseoLinkEntry = {
      label: cs.name,
      href: `/case-studies/${cs.slug}`,
      vertical: 'case-studies',
      funnelStage: stageFor('case-studies'),
    }
    const kws = [
      ...tokenize(cs.tenantName),
      ...tokenize(cs.landlordName),
      ...tokenize(cs.propertyType),
      ...tokenize(cs.location),
      ...tokenize(cs.leaseStructure),
      ...tokenize(cs.slug.replace(/-/g, ' ')),
    ]
    addEntry(kws, entry)
  }

  return index
}

// Built once at module load (SSG build time)
const PSEO_LINK_INDEX: Map<string, PseoLinkEntry[]> = buildIndex()

/**
 * Look up pSEO links matching given keywords.
 * Deduplicates by href, returns up to `max` entries.
 */
export function lookupPseoLinks(
  keywords: string[],
  options: {
    max?: number
    excludeVerticals?: string[]
    preferFunnelStage?: FunnelStage
  } = {}
): PseoLinkEntry[] {
  const { max = 8, excludeVerticals = [], preferFunnelStage } = options
  const seen = new Set<string>()
  const preferred: PseoLinkEntry[] = []
  const rest: PseoLinkEntry[] = []

  for (const kw of keywords) {
    if (!kw) continue
    // Tokenize the keyword and look up each token in the index
    for (const token of tokenize(kw)) {
      const tokenMatches = PSEO_LINK_INDEX.get(token)
      if (!tokenMatches) continue
      for (const entry of tokenMatches) {
        if (seen.has(entry.href)) continue
        if (excludeVerticals.includes(entry.vertical)) continue
        seen.add(entry.href)
        if (preferFunnelStage && entry.funnelStage === preferFunnelStage) {
          preferred.push(entry)
        } else {
          rest.push(entry)
        }
      }
    }
  }

  return [...preferred, ...rest].slice(0, max)
}

/**
 * Exposed for testing - returns the size of the built index.
 */
export function getPseoIndexSize(): number {
  return PSEO_LINK_INDEX.size
}
