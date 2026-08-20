'use client'

import { FileText, Building2, Calendar } from 'lucide-react'
import { motion } from 'motion/react'
import { ConfidenceBadge } from '@/components/results/confidence-badge'
import { formatFieldValue, getConfidenceTier } from '@/types/extraction'
import type { FullExtraction } from '@/types/extraction'

interface ResultsHeaderProps {
  extraction: FullExtraction
}

function extractField(
  extraction: FullExtraction,
  fieldName: string,
): string | null {
  if (!extraction.extracted_data) return null
  const data = extraction.extracted_data[fieldName]
  if (!data) return null
  return formatFieldValue(data.value)
}

export function ResultsHeader({ extraction }: ResultsHeaderProps) {
  const address = extractField(extraction, 'premises_address')
  const landlord = extractField(extraction, 'landlord_legal_name')
  const tenant = extractField(extraction, 'tenant_legal_name')
  const commencement = extractField(extraction, 'commencement_date')
  const expiration = extractField(extraction, 'expiration_date')
  const termMonths = extractField(extraction, 'lease_term_months')
  const overallConfidencePercent =
    extraction.overall_confidence === null
      ? null
      : Math.round(extraction.overall_confidence * 100)

  return (
    <motion.div
      data-testid="results-header"
      className="space-y-4 rounded-lg border border-border bg-card p-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top row: filename + confidence */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            <span className="min-w-0 break-words">{extraction.document_filename}</span>
            {extraction.document_page_count !== null && (
              <span className="text-muted-foreground/70">
                ({extraction.document_page_count} pages)
              </span>
            )}
          </div>
          {address && (
            <h1 className="break-words text-xl font-bold tracking-tight text-foreground">
              {address}
            </h1>
          )}
        </div>
        {extraction.overall_confidence !== null && overallConfidencePercent !== null && (
          <div
            data-testid="overall-confidence-badge"
            role="status"
            aria-label={`Overall confidence: ${overallConfidencePercent}%`}
          >
            <ConfidenceBadge
              score={extraction.overall_confidence}
              tier={getConfidenceTier(extraction.overall_confidence)}
            />
          </div>
        )}
      </div>

      {/* Key details */}
      <div className="flex flex-wrap gap-6 border-t border-border pt-4">
        {landlord && (
          <div className="space-y-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Landlord
            </p>
            <p className="break-words text-sm font-semibold text-foreground">{landlord}</p>
          </div>
        )}
        {tenant && (
          <div className="space-y-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tenant
            </p>
            <p className="break-words text-sm font-semibold text-foreground">{tenant}</p>
          </div>
        )}
        {(commencement || expiration) && (
          <div className="flex items-center gap-2 space-y-0.5">
            <Calendar className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Lease Term
              </p>
              <p className="text-sm text-foreground">
                {commencement && <span>{commencement}</span>}
                {commencement && expiration && <span> - </span>}
                {expiration && <span>{expiration}</span>}
                {termMonths && (
                  <span className="text-muted-foreground">
                    {' '}
                    ({termMonths} mo)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
        {extraction.property_type && (
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
              {extraction.property_type}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
