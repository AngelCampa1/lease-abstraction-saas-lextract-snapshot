'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { ConfidenceBadge } from '@/components/results/confidence-badge'
import { HELP_CONTENT } from '@/lib/help-content'
import { INTERACTIVE_TARGET_CLASSES } from '@/lib/design-tokens'
import {
  FIELD_LABELS,
  formatFieldValue,
} from '@/types/extraction'
import type {
  ExtractionFieldValue,
  ConfidenceScoreEntry,
} from '@/types/extraction'

interface FieldRowProps {
  fieldName: string
  fieldData: ExtractionFieldValue | undefined
  confidence: ConfidenceScoreEntry | undefined
  onFieldClick?: (fieldName: string, sourceText: string) => void
  isEditable?: boolean
  isEdited?: boolean
  onEdit?: (fieldName: string) => void
}

export function FieldRow({
  fieldName,
  fieldData,
  confidence,
  onFieldClick,
  isEditable = false,
  isEdited = false,
  onEdit,
}: FieldRowProps) {
  const [showSource, setShowSource] = useState(false)
  const label = FIELD_LABELS[fieldName] ?? fieldName
  const formattedValue = fieldData ? formatFieldValue(fieldData.value) : null
  const hasSourceText = fieldData?.source_text !== undefined && fieldData.source_text !== null

  function handleValueClick() {
    if (onEdit) {
      onEdit(fieldName)
    }
  }

  return (
    <div
      data-testid="field-row"
      className="group grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] items-center gap-2 md:gap-4 border-b border-border/50 px-2 py-2.5 last:border-b-0"
    >
      <span className="min-w-0 break-words text-sm font-semibold text-foreground">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {formattedValue !== null ? (
          onEdit ? (
            <button
              type="button"
              className={`min-w-0 break-words text-left text-sm text-muted-foreground hover:text-foreground ${INTERACTIVE_TARGET_CLASSES.inline}`}
              onClick={handleValueClick}
              aria-label={`Edit ${label} value`}
            >
              {formattedValue}
            </button>
          ) : (
            <span className="min-w-0 break-words text-sm text-muted-foreground">
              {formattedValue}
            </span>
          )
        ) : (
          <span className="text-sm italic text-muted-foreground/60">
            Not found in lease
          </span>
        )}
        {hasSourceText && (
          <span className="flex items-center gap-1">
            <button
              type="button"
              data-testid="source-text-trigger"
              aria-label={`View source text for ${label}`}
              className={`relative cursor-help text-xs text-muted-foreground/70 underline decoration-dotted ${INTERACTIVE_TARGET_CLASSES.inline}`}
              onMouseEnter={() => setShowSource(true)}
              onMouseLeave={() => setShowSource(false)}
              onFocus={() => setShowSource(true)}
              onBlur={() => setShowSource(false)}
              onClick={() => {
                if (onFieldClick && fieldData?.source_text) {
                  onFieldClick(fieldName, fieldData.source_text)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (onFieldClick && fieldData?.source_text) {
                    onFieldClick(fieldName, fieldData.source_text)
                  }
                }
              }}
            >
              source
              {showSource && (
                <span
                  data-testid="source-text-tooltip"
                  className="absolute bottom-full right-0 z-10 mb-1 max-w-[calc(100vw-2rem)] w-64 break-words rounded-md border border-border bg-popover p-2 text-left text-xs text-popover-foreground shadow-md sm:left-0 sm:right-auto"
                >
                  {fieldData?.source_text}
                </span>
              )}
            </button>
            <HelpTooltip label={`What is source text for ${label}?`}>
              {HELP_CONTENT.sourceText}
            </HelpTooltip>
          </span>
        )}
        {isEditable && (
          <span className="flex items-center gap-1">
            <Pencil
              data-testid="field-row-pencil-icon"
              className="size-3.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
            />
            <HelpTooltip label={`How do I edit ${label}?`}>
              {HELP_CONTENT.fieldEdit}
            </HelpTooltip>
          </span>
        )}
        {isEdited && (
          <span
            data-testid="field-row-edited-badge"
            className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary dark:bg-primary/20"
          >
            edited
          </span>
        )}
      </div>
      <div className="flex justify-end">
        {confidence && (
          <ConfidenceBadge
            score={confidence.score}
            tier={confidence.tier}
            size="sm"
          />
        )}
      </div>
    </div>
  )
}
