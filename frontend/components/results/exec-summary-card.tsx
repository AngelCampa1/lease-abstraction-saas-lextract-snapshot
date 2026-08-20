'use client'

import { APP_STATUS_COLORS } from '@/lib/design-tokens'
import type { RedFlag } from '@/types/extraction'

interface ExecSummaryCardProps {
  extractedData: Record<string, unknown>
  redFlags: Array<{ category?: string; severity?: string }>
}

interface FieldEntry {
  value: unknown
}

function isFieldEntry(v: unknown): v is FieldEntry {
  return typeof v === 'object' && v !== null && 'value' in v
}

function getFieldValue(
  extractedData: Record<string, unknown>,
  key: string,
): unknown {
  const entry = extractedData[key]
  if (entry === undefined || entry === null) return null
  if (isFieldEntry(entry)) return entry.value
  return entry
}

function displayValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '-'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '-'
  const str = String(val).trim()
  return str === '' ? '-' : str
}

/**
 * Render a money field the way a lease abstract should read.
 *
 * The extractor returns these as numbers, so without this the summary card
 * shows an annual rent of `1381000`. Values that are not purely numeric pass
 * through untouched, which covers both an already-formatted `$120,000` and a
 * genuine phrase like `two months rent`.
 *
 * Whole amounts drop the cents; anything with a fractional part keeps exactly
 * two places, so `115083.5` reads as `$115,083.50` rather than `$115,083.5`.
 */
function displayMoney(val: unknown): string {
  const base = displayValue(val)
  if (base === '-') return base

  const numeric = Number(base)
  if (!Number.isFinite(numeric)) return base

  return numeric.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
  })
}

/**
 * Renewal options, distinguishing "no option" from "we do not know".
 *
 * The old logic treated a missing `has_renewal_option` as false and printed
 * "None", which asserts the lease grants no renewal. On a lease abstract that
 * is the expensive direction to be wrong in: a tenant rep who reads "None"
 * stops looking for a renewal the lease actually grants. An unextracted field
 * now reads '-' like every other unknown, and only an explicit `false` says
 * "None".
 *
 * A confirmed option whose terms were not extracted reads "Yes" rather than
 * '-', because the option itself is known even when its terms are not.
 */
function getRenewalDisplay(extractedData: Record<string, unknown>): string {
  const hasOption = getFieldValue(extractedData, 'has_renewal_option')
  if (hasOption === null || hasOption === undefined || hasOption === '') return '-'
  if (!hasOption) return 'None'

  const terms = displayValue(getFieldValue(extractedData, 'renewal_terms'))
  return terms === '-' ? 'Yes' : terms
}

function getEscalationDisplay(extractedData: Record<string, unknown>): string {
  const fixedRate = getFieldValue(extractedData, 'fixed_escalation_rate')
  if (fixedRate !== null && fixedRate !== undefined && String(fixedRate).trim() !== '') {
    return displayValue(fixedRate)
  }
  const escalationType = getFieldValue(extractedData, 'escalation_type')
  return displayValue(escalationType)
}

interface GridFieldProps {
  label: string
  value: string
}

function GridField({ label, value }: GridFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="break-words text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

export function ExecSummaryCard({
  extractedData,
  redFlags,
}: ExecSummaryCardProps) {
  const leaseType = displayValue(getFieldValue(extractedData, 'lease_structure_type'))
  const annualRent = displayMoney(getFieldValue(extractedData, 'base_rent_annual'))
  const leaseExpires = displayValue(getFieldValue(extractedData, 'expiration_date'))
  const annualEscalation = getEscalationDisplay(extractedData)
  const renewalOptions = getRenewalDisplay(extractedData)
  const securityDeposit = displayMoney(
    getFieldValue(extractedData, 'security_deposit_amount'),
  )

  const flagCount = redFlags.length
  const uniqueCategories = Array.from(
    new Set(
      redFlags
        .map((f) => f.category)
        .filter((c): c is string => typeof c === 'string' && c.trim() !== ''),
    ),
  ).slice(0, 2)

  return (
    <div className="border border-primary bg-primary/5 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <GridField label="Lease Type" value={leaseType} />
        <GridField label="Annual Rent" value={annualRent} />
        <GridField label="Lease Expires" value={leaseExpires} />
        <GridField label="Annual Escalation" value={annualEscalation} />
        <GridField label="Renewal Options" value={renewalOptions} />
        <GridField label="Security Deposit" value={securityDeposit} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {flagCount > 0 ? (
          <>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${APP_STATUS_COLORS.locked.badge}`}>
              ⚠ {flagCount} red {flagCount === 1 ? 'flag' : 'flags'}
            </span>
            {uniqueCategories.length > 0 && (
              <span className="min-w-0 break-words text-xs text-muted-foreground">
                {uniqueCategories.join(', ')}
              </span>
            )}
          </>
        ) : (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${APP_STATUS_COLORS.paid.badge}`}>
            No red flags ✓
          </span>
        )}
      </div>
    </div>
  )
}

// Re-export RedFlag type for consumer convenience - the props type uses
// a structural subset so consumers can pass the full RedFlag[] from the extraction.
export type { RedFlag }
