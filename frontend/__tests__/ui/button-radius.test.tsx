import { describe, expect, it } from 'vitest'

import { buttonVariants } from '@/components/ui/button'

const cornerRadiusClasses = ['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl']
const buttonSizes = [
  'default',
  'xs',
  'sm',
  'lg',
  'icon',
  'icon-xs',
  'icon-sm',
  'icon-lg',
] as const

describe('buttonVariants radius', () => {
  it('emits pill or circular radius classes for every size', () => {
    for (const size of buttonSizes) {
      const classes = buttonVariants({ size })

      expect(classes).toContain('rounded-full')

      for (const radiusClass of cornerRadiusClasses) {
        expect(classes).not.toContain(radiusClass)
      }
    }
  })
})
