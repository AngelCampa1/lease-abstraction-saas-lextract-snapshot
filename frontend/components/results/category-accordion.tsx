'use client'

import { useMemo } from 'react'
import { FieldRow } from '@/components/results/field-row'
import { EditableFieldRow } from '@/components/results/editable-field-row'
import { getConfidenceTier, FIELD_LABELS } from '@/types/extraction'
import { CONFIDENCE_COLORS } from '@/lib/design-tokens'
import type {
  CategoryDefinition,
  ExtractionFieldValue,
  ConfidenceScoreEntry,
  RedFlag,
} from '@/types/extraction'

interface CategoryAccordionProps {
  category: CategoryDefinition
  extractedData: Record<string, ExtractionFieldValue>
  confidenceScores: Record<string, ConfidenceScoreEntry>
  defaultOpen?: boolean
  onFieldClick?: (fieldName: string, sourceText: string) => void
  isEditable?: boolean
  editedFields?: Set<string>
  onFieldEdit?: (fieldName: string) => void
  extractionId?: string
  onEditComplete?: (fieldName: string, newRedFlags: RedFlag[]) => void
  originalValues?: Record<string, unknown>
  filterText?: string
  /** Number of red flags whose triggered field belongs to this category */
  redFlagCount?: number
}

function computeAverageConfidence(
  fields: string[],
  confidenceScores: Record<string, ConfidenceScoreEntry>,
): number | null {
  const scores = fields
    .map((f) => confidenceScores[f]?.score)
    .filter((s): s is number => s !== undefined)
  if (scores.length === 0) return null
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

export function CategoryAccordion({
  category,
  extractedData,
  confidenceScores,
  defaultOpen = false,
  onFieldClick,
  isEditable = false,
  editedFields,
  onFieldEdit,
  extractionId,
  onEditComplete,
  originalValues,
  filterText = '',
  redFlagCount,
}: CategoryAccordionProps) {
  const filteredFields = useMemo(() => {
    if (!filterText.trim()) return category.fields
    const lower = filterText.toLowerCase()
    return category.fields.filter((fieldName) => {
      const label = FIELD_LABELS[fieldName] ?? fieldName
      return label.toLowerCase().includes(lower) || fieldName.toLowerCase().includes(lower)
    })
  }, [category.fields, filterText])

  if (filterText.trim() && filteredFields.length === 0) return null

  const fieldCount = category.fields.length
  const avgConfidence = computeAverageConfidence(
    category.fields,
    confidenceScores,
  )

  return (
    <details
      role="group"
      data-testid={`category-accordion-${category.name}`}
      className="group rounded-lg border border-border bg-card"
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-muted/50">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-foreground">
            {category.displayName}
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
          </span>
          {redFlagCount !== undefined && redFlagCount > 0 && (
            <span
              data-testid="red-flag-indicator"
              className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 text-xs font-semibold"
              aria-label={`${redFlagCount} red ${redFlagCount === 1 ? 'flag' : 'flags'}`}
            >
              ⚠ {redFlagCount}
            </span>
          )}
        </div>
        {avgConfidence !== null && (
          <span
            data-testid="category-avg-confidence"
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_COLORS[getConfidenceTier(avgConfidence)]}`}
          >
            {Math.round(avgConfidence * 100)}% avg
          </span>
        )}
      </summary>
      <div className="border-t border-border px-2 py-1">
        {filteredFields.map((fieldName) => {
          const fieldIsEdited = editedFields?.has(fieldName) ?? false

          if (isEditable && extractionId && onEditComplete) {
            return (
              <EditableFieldRow
                key={fieldName}
                fieldName={fieldName}
                fieldData={extractedData[fieldName]}
                confidence={confidenceScores[fieldName]}
                extractionId={extractionId}
                isEditable={isEditable}
                isEdited={fieldIsEdited}
                originalValue={originalValues?.[fieldName]}
                onEditComplete={onEditComplete}
                onFieldClick={onFieldClick}
              />
            )
          }

          return (
            <FieldRow
              key={fieldName}
              fieldName={fieldName}
              fieldData={extractedData[fieldName]}
              confidence={confidenceScores[fieldName]}
              isEditable={isEditable}
              isEdited={fieldIsEdited}
              onEdit={onFieldEdit}
              onFieldClick={onFieldClick}
            />
          )
        })}
      </div>
    </details>
  )
}

// ---------------------------------------------------------------------------
// SortedCategoryList
// Renders a list of CategoryAccordion components sorted so that categories
// with red flags appear first (by flag count DESC), while the relative order
// of unflagged categories is preserved.
// ---------------------------------------------------------------------------

interface SortedCategoryListProps {
  categories: CategoryDefinition[]
  extractedData: Record<string, ExtractionFieldValue>
  confidenceScores: Record<string, ConfidenceScoreEntry>
  redFlags: RedFlag[]
  defaultOpenFirst?: boolean
  allExpanded?: boolean
  onFieldClick?: (fieldName: string, sourceText: string) => void
  isEditable?: boolean
  editedFields?: Set<string>
  onFieldEdit?: (fieldName: string) => void
  extractionId?: string
  onEditComplete?: (fieldName: string, newRedFlags: RedFlag[]) => void
  originalValues?: Record<string, unknown>
  filterText?: string
}

const RED_FLAG_RULE_FIELDS: Record<string, string[]> = {
  'RF-001': ['management_fee_cap'],
  'RF-002': ['audit_rights'],
  'RF-003': ['cam_cap_percentage'],
  'RF-004': ['cap_cumulative_vs_annual'],
  'RF-005': ['lease_structure_type', 'gross_up_percentage'],
  'RF-006': ['cam_exclusions'],
  'RF-007': ['monetary_cure_period'],
  'RF-008': ['holdover_rate'],
  'RF-009': ['has_termination_option', 'lease_term_months'],
  'RF-010': ['restoration_requirement', 'tenant_work_description'],
  'RF-011': ['has_renewal_option'],
  'RF-012': ['recapture_right'],
  'RF-013': ['base_year_gross_up', 'base_year'],
  'RF-014': ['reconciliation_frequency', 'lease_structure_type'],
  'RF-015': ['cam_audit_deadline_days'],
  'RF-016': ['force_majeure_clause'],
  'RF-017': ['auto_renewal', 'auto_renewal_terms'],
  'RF-018': ['casualty_termination_right'],
  'RF-019': ['relocation_right'],
  'RF-020': ['has_purchase_option'],
}

function getRedFlagFieldNames(flag: RedFlag): string[] {
  if (Object.hasOwn(FIELD_LABELS, flag.name)) {
    return [flag.name]
  }
  if (flag.rule_id) {
    return RED_FLAG_RULE_FIELDS[flag.rule_id] ?? []
  }
  return []
}

/**
 * Builds a map from category name → number of red flags touching that category.
 * A flag is attributed to a category if any of that category's fields matches
 * either a legacy field-key `name` value or fields associated with its SDK
 * `rule_id`.
 */
function buildFlagCountMap(
  categories: CategoryDefinition[],
  redFlags: RedFlag[],
): Map<string, number> {
  const map = new Map<string, number>()
  for (const cat of categories) {
    const fieldSet = new Set(cat.fields)
    const count = redFlags.filter((flag) =>
      getRedFlagFieldNames(flag).some((fieldName) => fieldSet.has(fieldName)),
    ).length
    map.set(cat.name, count)
  }
  return map
}

export function SortedCategoryList({
  categories,
  extractedData,
  confidenceScores,
  redFlags,
  defaultOpenFirst = false,
  allExpanded = false,
  onFieldClick,
  isEditable = false,
  editedFields,
  onFieldEdit,
  extractionId,
  onEditComplete,
  originalValues,
  filterText = '',
}: SortedCategoryListProps) {
  const flagCountMap = useMemo(
    () => buildFlagCountMap(categories, redFlags),
    [categories, redFlags],
  )

  const sorted = useMemo(() => {
    // Stable sort: flagged categories first (desc by count), unflagged preserve original order
    const withIndex = categories.map((cat, idx) => ({ cat, idx }))
    const flagged = withIndex
      .filter(({ cat }) => (flagCountMap.get(cat.name) ?? 0) > 0)
      .sort(
        (a, b) =>
          (flagCountMap.get(b.cat.name) ?? 0) -
          (flagCountMap.get(a.cat.name) ?? 0),
      )
    const unflagged = withIndex.filter(
      ({ cat }) => (flagCountMap.get(cat.name) ?? 0) === 0,
    )
    return [...flagged, ...unflagged]
  }, [categories, flagCountMap])

  return (
    <>
      {sorted.map(({ cat, idx }) => (
        <CategoryAccordion
          key={`${cat.name}-${String(allExpanded)}`}
          category={cat}
          extractedData={extractedData}
          confidenceScores={confidenceScores}
          defaultOpen={allExpanded || (defaultOpenFirst && idx === 0)}
          onFieldClick={onFieldClick}
          isEditable={isEditable}
          editedFields={editedFields}
          onFieldEdit={onFieldEdit}
          extractionId={extractionId}
          onEditComplete={onEditComplete}
          originalValues={originalValues}
          filterText={filterText}
          redFlagCount={flagCountMap.get(cat.name)}
        />
      ))}
    </>
  )
}
