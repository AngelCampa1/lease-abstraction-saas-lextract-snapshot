/** @vitest-environment node */
import { CONTENT_SILOS, getSiloById, getAllSilos } from '@/lib/content-silos'

describe('CONTENT_SILOS', () => {
  it('defines three content silos', () => {
    expect(Object.keys(CONTENT_SILOS)).toHaveLength(9)
  })

  it('has lease-abstraction silo with correct properties', () => {
    const silo = CONTENT_SILOS['lease-abstraction']
    expect(silo.id).toBe('lease-abstraction')
    expect(silo.displayName).toBe('Lease Abstraction')
    expect(silo.description).toBeTruthy()
    expect(silo.baseUrl).toBe('/resources/lease-abstraction')
  })

  it('has property-management silo with correct properties', () => {
    const silo = CONTENT_SILOS['property-management']
    expect(silo.id).toBe('property-management')
    expect(silo.displayName).toBe('Property Management')
    expect(silo.description).toBeTruthy()
    expect(silo.baseUrl).toBe('/resources/property-management')
  })

  it('has cam-audit silo with correct properties', () => {
    const silo = CONTENT_SILOS['cam-audit']
    expect(silo.id).toBe('cam-audit')
    expect(silo.displayName).toBe('CAM Audit')
    expect(silo.description).toBeTruthy()
    expect(silo.baseUrl).toBe('/resources/cam-audit')
  })
})

describe('getSiloById', () => {
  it('returns the correct silo for lease-abstraction', () => {
    const silo = getSiloById('lease-abstraction')
    expect(silo.id).toBe('lease-abstraction')
    expect(silo.displayName).toBe('Lease Abstraction')
  })

  it('returns the correct silo for property-management', () => {
    const silo = getSiloById('property-management')
    expect(silo.id).toBe('property-management')
  })

  it('returns the correct silo for cam-audit', () => {
    const silo = getSiloById('cam-audit')
    expect(silo.id).toBe('cam-audit')
  })
})

describe('getAllSilos', () => {
  it('returns all three silos', () => {
    const silos = getAllSilos()
    expect(silos).toHaveLength(9)
  })

  it('returns silos with correct structure', () => {
    const silos = getAllSilos()
    for (const silo of silos) {
      expect(silo).toHaveProperty('id')
      expect(silo).toHaveProperty('displayName')
      expect(silo).toHaveProperty('description')
      expect(silo).toHaveProperty('baseUrl')
    }
  })

  it('includes all silo ids', () => {
    const silos = getAllSilos()
    const ids = silos.map((s) => s.id)
    expect(ids).toContain('lease-abstraction')
    expect(ids).toContain('property-management')
    expect(ids).toContain('cam-audit')
  })
})
