/**
 * Shared design tokens for semantic colors used across components.
 * Brand colors (primary, brand-dark, etc.) are defined in globals.css
 * and accessed via Tailwind classes (bg-primary, text-brand-dark, etc.).
 *
 * These constants standardize the semantic color palettes that appear
 * in multiple components - confidence tiers, severity levels, field
 * categories, and processing status indicators.
 */

/** Confidence tiers: emerald = high, amber = medium, red = low, muted = not_found */
export const CONFIDENCE_COLORS = {
  high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  not_found: 'bg-muted text-muted-foreground',
} as const

/** Confidence bar fill colors (for progress/chart bars) */
export const CONFIDENCE_BAR_COLORS = {
  high: 'bg-emerald-500 dark:bg-emerald-400',
  medium: 'bg-amber-500 dark:bg-amber-400',
  low: 'bg-red-500 dark:bg-red-400',
  not_found: 'bg-muted-foreground/30 dark:bg-muted-foreground/20',
} as const

/** Red flag severity badges */
export const SEVERITY_COLORS = {
  critical: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  high: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  medium: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  low: {
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
} as const

export type SeverityLevel = keyof typeof SEVERITY_COLORS

/** Lease field category chips - consistent across glossary, sample-output, sample-report */
export const CATEGORY_COLORS: Record<string, string> = {
  // Glossary categories (lowercase)
  financial: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  legal: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  operational: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  parties: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  property: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  // Marketing sample-output categories (capitalized)
  Parties: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  Dates: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  Financial: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  CAM: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Renewal: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
}

/** Processing step & dashboard stat status colors */
export const STATUS_COLORS = {
  success: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500',
    icon: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  active: {
    text: 'text-primary dark:text-primary',
    bg: 'bg-primary',
    icon: 'text-primary dark:text-primary',
    iconBg: 'bg-primary/10 dark:bg-primary/20',
  },
  warning: {
    text: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-500',
    icon: 'text-yellow-600 dark:text-yellow-400',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  error: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500',
    icon: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
  },
} as const

/** App workflow statuses shared by dashboard, teaser, results, and export surfaces. */
export const APP_STATUS_COLORS = {
  locked: {
    badge:
      'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
  paid: {
    badge:
      'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  processing: {
    badge:
      'border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/20 dark:text-primary',
  },
  error: {
    badge:
      'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
} as const

/** Shared sizing/focus affordances for compact interactive controls. */
export const INTERACTIVE_TARGET_CLASSES = {
  compact:
    'min-h-10 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  icon:
    'min-h-11 min-w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  inline:
    'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
} as const

/** "No issues" / success state panel */
export const SUCCESS_PANEL = {
  container: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950',
  icon: 'text-emerald-600 dark:text-emerald-400',
  heading: 'text-emerald-800 dark:text-emerald-200',
  body: 'text-emerald-700 dark:text-emerald-300',
} as const

/** Inline success indicator (e.g. download complete row) */
export const SUCCESS_INLINE = {
  container: 'border-emerald-500/50 bg-emerald-500/10',
  text: 'text-emerald-700 dark:text-emerald-400',
} as const

/** Error / failed state panel - symmetric counterpart to SUCCESS_PANEL */
export const ERROR_PANEL = {
  container: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950',
  icon: 'text-red-600 dark:text-red-400',
  heading: 'text-red-800 dark:text-red-200',
  body: 'text-red-700 dark:text-red-300',
} as const

/** Callout variants for MDX content */
export const CALLOUT_COLORS = {
  info: 'border-primary bg-primary/5 dark:bg-primary/10',
  warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
  tip: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950',
} as const
