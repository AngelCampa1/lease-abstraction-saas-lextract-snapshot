/** @vitest-environment node */
import { describe, it, expect } from 'vitest'
import { getLeaseTypeByName } from '@/data/lease-types'

describe('getLeaseTypeByName', () => {
  it('finds lease type by exact name', () => {
    const result = getLeaseTypeByName('Triple Net Lease (NNN)')
    expect(result).toBeDefined()
    expect(result?.slug).toBe('nnn-lease')
  })

  it('finds lease type by abbreviation', () => {
    const result = getLeaseTypeByName('NNN')
    expect(result).toBeDefined()
    expect(result?.slug).toBe('nnn-lease')
  })

  it('matches case-insensitively', () => {
    const result = getLeaseTypeByName('nnn')
    expect(result).toBeDefined()
    expect(result?.slug).toBe('nnn-lease')
  })

  it('matches partial name via includes', () => {
    const result = getLeaseTypeByName('Modified Gross')
    expect(result).toBeDefined()
    expect(result?.slug).toBe('modified-gross-lease')
  })

  it('returns undefined for unknown lease type', () => {
    const result = getLeaseTypeByName('ZZZZ Completely Unknown ZZZZ')
    expect(result).toBeUndefined()
  })

  it('trims whitespace', () => {
    const result = getLeaseTypeByName('  NNN  ')
    expect(result).toBeDefined()
    expect(result?.slug).toBe('nnn-lease')
  })
})
