'use client'

import { motion } from 'motion/react'
import { Lock } from 'lucide-react'
import type { LockedCategory } from '@/hooks/use-teaser'

const BLURRED_CATEGORIES = [
  'Operating Expenses',
  'Insurance Requirements',
  'Renewal Options',
  'Maintenance & Repairs',
  'Assignment & Subletting',
  'Default & Remedies',
  'Parking Provisions',
  'Signage Rights',
  'HVAC Responsibilities',
  'Environmental Provisions',
  'Estoppel Requirements',
  'Subordination Terms',
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

interface CategoryInfo {
  name: string
  fieldCount: number
}

interface BlurredFieldsProps {
  totalFields: number
  visibleCount: number
  /** Real category data from the teaser API response */
  locked_categories?: LockedCategory[]
  /** Legacy prop - generic category display (no field counts) */
  categories?: CategoryInfo[]
}

export function BlurredFields({
  totalFields,
  visibleCount,
  locked_categories,
  categories,
}: BlurredFieldsProps) {
  const hiddenCount = totalFields - visibleCount

  // Prefer locked_categories (real API data) when provided and non-empty.
  // Fall back to legacy categories or the static BLURRED_CATEGORIES list.
  const useRealCategories =
    locked_categories !== undefined && locked_categories.length > 0

  const displayCategories: CategoryInfo[] = useRealCategories
    ? locked_categories.map((c) => ({ name: c.name, fieldCount: c.field_count }))
    : categories && categories.length > 0
      ? categories
      : BLURRED_CATEGORIES.map((name) => ({ name, fieldCount: 0 }))

  return (
    <section
      data-testid="blurred-fields-section"
      className="relative"
      aria-labelledby="blurred-overlay-heading"
    >
      <motion.div
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        role="presentation"
        aria-hidden="true"
      >
        {displayCategories.map((category) => (
          <motion.div
            key={category.name}
            variants={itemVariants}
            className="rounded-lg border bg-muted/60 p-3 select-none"
            data-testid="blurred-field-card"
          >
            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              {category.name}
            </p>
            {useRealCategories ? (
              <>
                <p className="text-xs text-muted-foreground/70">
                  {category.fieldCount === 1
                    ? '1 field'
                    : `${category.fieldCount} fields`}
                </p>
                <div className="mt-2 h-3 rounded bg-muted-foreground/20 blur-sm" />
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/60">
                  <Lock className="size-3" aria-hidden="true" />
                  <span>locked</span>
                </div>
              </>
            ) : (
              <div className="blur-[6px]">
                <p className="mt-1 text-sm">
                  {category.fieldCount > 0
                    ? `${category.fieldCount} ${category.fieldCount === 1 ? 'field' : 'fields'} extracted`
                    : 'Locked field preview'}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm"
        data-testid="blur-overlay"
      >
        <Lock className="mb-2 size-8 text-muted-foreground" aria-hidden="true" />
        <h3
          id="blurred-overlay-heading"
          className="text-lg font-semibold text-foreground"
        >
          Unlock all {hiddenCount} remaining fields
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Includes confidence scores, red flag analysis, and full export
        </p>
      </div>
    </section>
  )
}
