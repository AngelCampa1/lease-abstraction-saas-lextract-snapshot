/** @vitest-environment node */
import { cn } from '@/lib/utils'

describe('smoke test', () => {
  it('cn utility merges classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('cn utility handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'inactive')).toBe('base active')
  })
})
