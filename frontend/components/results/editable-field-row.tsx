'use client'

import { useState, useCallback, useRef } from 'react'
import { Pencil, Loader2, RotateCcw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { HelpTooltip } from '@/components/ui/help-tooltip'
import { ConfidenceBadge } from '@/components/results/confidence-badge'
import { FieldEditInput } from '@/components/results/field-edit-input'
import { useFieldEdit } from '@/hooks/use-field-edit'
import { ApiError } from '@/lib/api'
import { getUserFacingError } from '@/lib/user-facing-errors'
import { HELP_CONTENT } from '@/lib/help-content'
import { INTERACTIVE_TARGET_CLASSES } from '@/lib/design-tokens'
import {
  FIELD_LABELS,
  formatFieldValue,
} from '@/types/extraction'
import type {
  ExtractionFieldValue,
  ConfidenceScoreEntry,
  RedFlag,
} from '@/types/extraction'

interface EditableFieldRowProps {
  fieldName: string
  fieldData: ExtractionFieldValue | undefined
  confidence: ConfidenceScoreEntry | undefined
  extractionId: string
  isEditable: boolean
  isEdited: boolean
  originalValue?: unknown
  onEditComplete: (fieldName: string, newRedFlags: RedFlag[]) => void
  onFieldClick?: (fieldName: string, sourceText: string) => void
}

export function EditableFieldRow({
  fieldName,
  fieldData,
  confidence,
  extractionId,
  isEditable,
  isEdited,
  originalValue,
  onEditComplete,
  onFieldClick,
}: EditableFieldRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const label = FIELD_LABELS[fieldName] ?? fieldName
  const formattedValue = fieldData ? formatFieldValue(fieldData.value) : null
  const hasSourceText = fieldData?.source_text !== undefined && fieldData.source_text !== null
  const { mutateAsync, isPending } = useFieldEdit({ extractionId })

  const showEditError = useCallback(
    (error: unknown, genericMessage: string) => {
      if (error instanceof ApiError && error.status === 409) {
        // A concurrent edit won the CAS race. onSettled refetches server truth,
        // so the displayed value will correct itself - tell the user explicitly
        // instead of letting their edit vanish without explanation.
        const conflict = getUserFacingError(error, 'results')
        toast.error(conflict.description)
        return
      }
      toast.error(genericMessage)
    },
    [],
  )

  const handleSave = useCallback(
    async (value: unknown) => {
      try {
        const response = await mutateAsync({
          field_name: fieldName,
          value,
        })
        setIsEditing(false)
        onEditComplete(fieldName, response.red_flags)
        requestAnimationFrame(() => editButtonRef.current?.focus())
      } catch (error) {
        showEditError(error, `Failed to save ${label}`)
        setIsEditing(false)
        requestAnimationFrame(() => editButtonRef.current?.focus())
      }
    },
    [mutateAsync, fieldName, label, onEditComplete, showEditError],
  )

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    requestAnimationFrame(() => editButtonRef.current?.focus())
  }, [])

  const handleRevert = useCallback(async () => {
    try {
      const response = await mutateAsync({
        field_name: fieldName,
        value: originalValue,
      })
      onEditComplete(fieldName, response.red_flags)
    } catch (error) {
      showEditError(error, `Failed to revert ${label}`)
    }
  }, [mutateAsync, fieldName, originalValue, label, onEditComplete, showEditError])

  const handleValueClick = useCallback(() => {
    if (isEditable) {
      setIsEditing(true)
    }
  }, [isEditable])

  return (
    <div
      data-testid="editable-field-row"
      className="group grid grid-cols-1 items-start gap-1 border-b border-border/50 px-2 py-2.5 last:border-b-0 md:grid-cols-[1fr_2fr_auto] md:items-center md:gap-4"
    >
      <span className="min-w-0 break-words text-sm font-semibold text-foreground">{label}</span>

      <div className="flex min-w-0 items-center gap-2">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="edit"
              data-testid="field-edit-container"
              className="flex-1"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
            >
              <FieldEditInput
                fieldName={fieldName}
                currentValue={fieldData?.value ?? null}
                onSave={handleSave}
                onCancel={handleCancel}
              />
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                Enter to save · Esc to cancel
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="display"
              className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {isEditable ? (
                <button
                  type="button"
                  ref={editButtonRef}
                  data-testid="field-value-clickable"
                  className={`min-w-0 break-words text-left text-sm text-muted-foreground hover:text-foreground ${INTERACTIVE_TARGET_CLASSES.inline}`}
                  onClick={handleValueClick}
                  aria-label={`Edit ${label} value`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleValueClick()
                    }
                  }}
                >
                  {formattedValue ?? (
                    <span className="italic text-muted-foreground/60">
                      Not found in lease
                    </span>
                  )}
                </button>
              ) : (
                <span
                  data-testid="field-value-display"
                  className="min-w-0 break-words text-sm text-muted-foreground"
                >
                  {formattedValue ?? (
                    <span className="italic text-muted-foreground/60">
                      Not found in lease
                    </span>
                  )}
                </span>
              )}

              {isEditable && (
                <span className="flex items-center gap-1">
                  <Pencil
                    data-testid="pencil-icon"
                    aria-hidden="true"
                    className="size-3.5 text-muted-foreground/50 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                  />
                  <HelpTooltip label={`How do I edit ${label}?`}>
                    {HELP_CONTENT.fieldEdit}
                  </HelpTooltip>
                </span>
              )}

              {isEdited && (
                <span
                  data-testid="edited-badge"
                  className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary dark:bg-primary/20"
                >
                  edited
                </span>
              )}

              {isEdited && originalValue !== undefined && (
                <button
                  data-testid="revert-button"
                  type="button"
                  onClick={handleRevert}
                  className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <RotateCcw className="size-3" />
                  Revert to AI value
                </button>
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
                      if ((e.key === 'Enter' || e.key === ' ') && onFieldClick && fieldData?.source_text) {
                        e.preventDefault()
                        onFieldClick(fieldName, fieldData.source_text)
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
            </motion.div>
          )}
        </AnimatePresence>

        {isPending && (
          <Loader2
            data-testid="save-spinner"
            className="size-4 animate-spin text-muted-foreground"
          />
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
