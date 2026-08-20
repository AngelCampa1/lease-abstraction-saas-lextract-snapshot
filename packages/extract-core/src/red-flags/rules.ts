import { buildLextractRegistry } from '../schema/registry.js'

export type RedFlagSeverity = 'low' | 'medium' | 'high'

export interface RedFlag {
  readonly ruleId: string
  readonly name: string
  readonly severity: RedFlagSeverity
  readonly description: string
  readonly triggeredValue: string
}

export interface RedFlagRule {
  readonly id: string
  readonly name: string
  readonly severity: RedFlagSeverity
  evaluate(data: Readonly<Record<string, unknown>>): RedFlag | null
}

const INTERNAL_CAM_RELATED_RULE_IDS: ReadonlySet<string> = new Set([
  'RF-001',
  'RF-002',
  'RF-003',
  'RF-004',
  'RF-005',
  'RF-006',
  'RF-013',
  'RF-014',
  'RF-015',
])

const INTERNAL_CAM_RELEVANT_FIELDS: ReadonlySet<string> = new Set(
  buildLextractRegistry()
    .fields.filter((field) => field.camRelevant)
    .map((field) => field.fieldName),
)

export const CAM_RELATED_RULE_IDS: readonly string[] = Object.freeze([...INTERNAL_CAM_RELATED_RULE_IDS])

export const CAM_RELEVANT_FIELDS: readonly string[] = Object.freeze([...INTERNAL_CAM_RELEVANT_FIELDS])

export function getCamRelatedRuleIds(): ReadonlySet<string> {
  return new Set(INTERNAL_CAM_RELATED_RULE_IDS)
}

export function getCamRelevantFields(): ReadonlySet<string> {
  return new Set(INTERNAL_CAM_RELEVANT_FIELDS)
}

export function isCamRelatedRuleId(ruleId: string): boolean {
  return INTERNAL_CAM_RELATED_RULE_IDS.has(ruleId)
}

export function isCamRelevantField(fieldName: string): boolean {
  return INTERNAL_CAM_RELEVANT_FIELDS.has(fieldName)
}

function safeFloat(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return null
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function safeBool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function normalizeFractionPercentage(value: number): number {
  return Math.abs(value) > 0 && Math.abs(value) <= 1 ? value * 100 : value
}

function normalizeMultiplierPercentage(value: number): number {
  return Math.abs(value) > 0 && Math.abs(value) <= 10 ? value * 100 : value
}

function containsNnn(value: unknown): boolean {
  return typeof value === 'string' && value.toLowerCase().includes('nnn')
}

function isMissingString(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

function flag(
  rule: Pick<RedFlagRule, 'id' | 'name' | 'severity'>,
  description: string,
  triggeredValue: string,
): RedFlag {
  return {
    ruleId: rule.id,
    name: rule.name,
    severity: rule.severity,
    description,
    triggeredValue,
  }
}

const ruleDefinitions: readonly RedFlagRule[] = [
  {
    id: 'RF-001',
    name: 'Excessive Management Fee',
    severity: 'high',
    evaluate(data) {
      const value = safeFloat(data.management_fee_cap)
      if (value === null) {
        return flag(this, 'No management fee cap found. Missing cap means unlimited management fees.', 'missing')
      }
      const percent = normalizeFractionPercentage(value)
      return percent > 15
        ? flag(this, `Management fee cap of ${percent}% exceeds the 15% threshold. Fees above 15% are typically exploitative.`, `${percent}%`)
        : null
    },
  },
  {
    id: 'RF-002',
    name: 'Missing Audit Rights',
    severity: 'high',
    evaluate(data) {
      const value = safeBool(data.audit_rights)
      return value === null || value === false
        ? flag(this, "Tenant does not have the right to audit landlord's CAM charges - major liability.", value === null ? 'missing' : 'false')
        : null
    },
  },
  {
    id: 'RF-003',
    name: 'No CAM Cap',
    severity: 'high',
    evaluate(data) {
      return safeFloat(data.cam_cap_percentage) === null
        ? flag(this, 'No CAM cap percentage found. Without a cap, annual CAM increases have no ceiling.', 'missing')
        : null
    },
  },
  {
    id: 'RF-004',
    name: 'Cumulative CAM Cap',
    severity: 'medium',
    evaluate(data) {
      return typeof data.cap_cumulative_vs_annual === 'string' &&
        data.cap_cumulative_vs_annual.trim().toLowerCase().includes('cumulative')
        ? flag(this, 'CAM cap is cumulative/compounding rather than annual. Cumulative caps heavily favor the landlord.', data.cap_cumulative_vs_annual)
        : null
    },
  },
  {
    id: 'RF-005',
    name: 'No Gross-Up Provision',
    severity: 'medium',
    evaluate(data) {
      return containsNnn(data.lease_structure_type) && safeFloat(data.gross_up_percentage) === null
        ? flag(this, 'NNN lease has no gross-up percentage. In partially occupied buildings, tenant overpays for variable expenses.', 'missing')
        : null
    },
  },
  {
    id: 'RF-006',
    name: 'Missing CAM Exclusions',
    severity: 'high',
    evaluate(data) {
      const value = data.cam_exclusions
      if (value === null || value === undefined) {
        return flag(this, 'No CAM exclusions found. Without exclusions, landlord can pass through any expense including capital expenditures.', 'missing')
      }
      return Array.isArray(value) && value.length === 0
        ? flag(this, 'No CAM exclusions found. Without exclusions, landlord can pass through any expense including capital expenditures.', 'empty list')
        : null
    },
  },
  {
    id: 'RF-007',
    name: 'Short Cure Period',
    severity: 'medium',
    evaluate(data) {
      const value = safeFloat(data.monetary_cure_period)
      return value !== null && value < 10
        ? flag(this, `Monetary cure period of ${Math.trunc(value)} days is below the 10-day minimum. Insufficient time to remedy payment defaults.`, `${Math.trunc(value)} days`)
        : null
    },
  },
  {
    id: 'RF-008',
    name: 'Aggressive Holdover Rate',
    severity: 'medium',
    evaluate(data) {
      const value = safeFloat(data.holdover_rate)
      const percent = value === null ? null : normalizeMultiplierPercentage(value)
      return percent !== null && percent > 200
        ? flag(this, `Holdover rate of ${percent}% exceeds 200%. Punitive holdover penalties.`, `${percent}%`)
        : null
    },
  },
  {
    id: 'RF-009',
    name: 'No Termination Option',
    severity: 'low',
    evaluate(data) {
      const hasTermination = safeBool(data.has_termination_option)
      const termMonths = safeFloat(data.lease_term_months)
      return hasTermination === false && termMonths !== null && termMonths > 60
        ? flag(this, `Long-term lease (${Math.trunc(termMonths)} months) with no early termination option - high commitment risk.`, `${Math.trunc(termMonths)} months, no termination`)
        : null
    },
  },
  {
    id: 'RF-010',
    name: 'Missing Restoration Clarity',
    severity: 'low',
    evaluate(data) {
      return safeBool(data.restoration_requirement) === true && isMissingString(data.tenant_work_description)
        ? flag(this, "Restoration is required but tenant work description is missing. Scope of required restoration is undefined.", 'restoration required, no work description')
        : null
    },
  },
  {
    id: 'RF-011',
    name: 'No Renewal Option',
    severity: 'low',
    evaluate(data) {
      return safeBool(data.has_renewal_option) === false
        ? flag(this, 'No guaranteed right to extend occupancy.', 'false')
        : null
    },
  },
  {
    id: 'RF-012',
    name: 'Recapture Right Present',
    severity: 'medium',
    evaluate(data) {
      return safeBool(data.recapture_right) === true
        ? flag(this, 'Landlord can terminate lease upon assignment or subletting request.', 'true')
        : null
    },
  },
  {
    id: 'RF-013',
    name: 'No Base Year Gross-Up',
    severity: 'medium',
    evaluate(data) {
      const grossUp = safeBool(data.base_year_gross_up)
      const baseYear = data.base_year
      if ((grossUp === false || grossUp === null) && baseYear !== null && baseYear !== undefined) {
        return flag(this, 'Base year is not normalized to full occupancy. This can inflate future operating expense charges.', `base_year_gross_up=${grossUp === null ? 'missing' : 'false'}, base_year=${String(baseYear)}`)
      }
      return null
    },
  },
  {
    id: 'RF-014',
    name: 'No Reconciliation Frequency',
    severity: 'medium',
    evaluate(data) {
      return data.reconciliation_frequency === null || data.reconciliation_frequency === undefined
        ? containsNnn(data.lease_structure_type)
          ? flag(this, 'NNN lease has no defined CAM reconciliation schedule. Without a schedule, disputes are harder to initiate.', 'missing')
          : null
        : null
    },
  },
  {
    id: 'RF-015',
    name: 'Short Audit Window',
    severity: 'medium',
    evaluate(data) {
      const value = safeFloat(data.cam_audit_deadline_days)
      return value !== null && value < 60
        ? flag(this, `CAM audit deadline of ${Math.trunc(value)} days is below the 60-day minimum. Insufficient time to dispute reconciliation.`, `${Math.trunc(value)} days`)
        : null
    },
  },
  {
    id: 'RF-016',
    name: 'Missing Force Majeure Clause',
    severity: 'medium',
    evaluate(data) {
      const value = safeBool(data.force_majeure_clause)
      return value === null || value === false
        ? flag(this, 'No force majeure clause found. Without this protection, tenants may remain liable during unforeseeable events.', value === null ? 'missing' : 'false')
        : null
    },
  },
  {
    id: 'RF-017',
    name: 'Auto-Renewal Without Notice Terms',
    severity: 'medium',
    evaluate(data) {
      return safeBool(data.auto_renewal) === true && isMissingString(data.auto_renewal_terms)
        ? flag(this, 'Lease auto-renews but no notice period terms are specified. Tenants risk unintended renewals.', 'auto_renewal=true, no notice terms')
        : null
    },
  },
  {
    id: 'RF-018',
    name: 'No Casualty Termination Right',
    severity: 'medium',
    evaluate(data) {
      return isMissingString(data.casualty_termination_right)
        ? flag(this, 'No casualty termination right found. If the premises are substantially damaged, the tenant may be trapped in unusable space.', 'missing')
        : null
    },
  },
  {
    id: 'RF-019',
    name: 'Relocation Right Present',
    severity: 'medium',
    evaluate(data) {
      return safeBool(data.relocation_right) === true
        ? flag(this, 'Landlord has the right to relocate the tenant to different premises. This can disrupt operations.', 'true')
        : null
    },
  },
  {
    id: 'RF-020',
    name: 'No Purchase Option Disclosure',
    severity: 'low',
    evaluate(data) {
      return safeBool(data.has_purchase_option) === null
        ? flag(this, 'Purchase option status not identified. Under ASC 842 / IFRS 16, this can affect lease liability calculations.', 'missing')
        : null
    },
  },
]

const internalRedFlagRules: readonly RedFlagRule[] = ruleDefinitions.map((rule) => Object.freeze(rule))

export const redFlagRules: readonly RedFlagRule[] = Object.freeze([...internalRedFlagRules])

export function getRedFlagRules(): readonly RedFlagRule[] {
  return [...internalRedFlagRules]
}
