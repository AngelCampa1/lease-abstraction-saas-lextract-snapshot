import { describe, expect, it } from 'vitest'

import {
  APP_STATUS_COLORS,
  INTERACTIVE_TARGET_CLASSES,
} from '@/lib/design-tokens'

describe('design tokens', () => {
  it('provides centralized app status colors for workflow states', () => {
    expect(APP_STATUS_COLORS.locked.badge).toContain('bg-amber-100')
    expect(APP_STATUS_COLORS.paid.badge).toContain('dark:bg-emerald-900/30')
    expect(APP_STATUS_COLORS.processing.badge).toContain('bg-primary/10')
    expect(APP_STATUS_COLORS.error.badge).toContain('text-red-800')
  })

  it('provides shared touch target classes for compact controls', () => {
    expect(INTERACTIVE_TARGET_CLASSES.compact).toContain('min-h-10')
    expect(INTERACTIVE_TARGET_CLASSES.compact).toContain('rounded-full')
    expect(INTERACTIVE_TARGET_CLASSES.icon).toContain('min-h-11')
    expect(INTERACTIVE_TARGET_CLASSES.inline).toContain('focus-visible:ring')
    expect(INTERACTIVE_TARGET_CLASSES.inline).toContain('rounded-full')
  })
})
