import { describe, it, expect } from 'vitest'
import { magnetForPath } from '@/lib/page-magnet-map'

describe('magnetForPath', () => {
  it('maps CAM-related paths to the CAM checklist', () => {
    expect(magnetForPath('/red-flags/cam-overbilling')).toBe('cam-reconciliation-checklist')
    expect(magnetForPath('/clauses/operating-expense-gross-up')).toBe('cam-reconciliation-checklist')
  })
  it('maps diligence/acquisition paths to the due-diligence checklist', () => {
    expect(magnetForPath('/use-cases/acquisition-due-diligence')).toBe('due-diligence-checklist')
    expect(magnetForPath('/case-studies/portfolio-acquisition')).toBe('due-diligence-checklist')
  })
  it('maps audit/workflow/tool paths to the audit workbook', () => {
    expect(magnetForPath('/tools/lease-comparison')).toBe('lease-audit-workbook')
    expect(magnetForPath('/workflows/portfolio-qa')).toBe('lease-audit-workbook')
    expect(magnetForPath('/calculators/cam-cap')).toBe('lease-audit-workbook')
  })
  it('falls back to the lease-abstraction checklist as default', () => {
    expect(magnetForPath('/')).toBe('lease-abstraction-checklist')
    expect(magnetForPath('/pricing')).toBe('lease-abstraction-checklist')
    expect(magnetForPath('/fields/base-rent')).toBe('lease-abstraction-checklist')
  })
  it('returns the default magnet for an empty string pathname', () => {
    expect(magnetForPath('')).toBe('lease-abstraction-checklist')
  })
  it('is case-insensitive and tolerates trailing slashes', () => {
    expect(magnetForPath('/Red-Flags/CAM/')).toBe('cam-reconciliation-checklist')
  })
})
