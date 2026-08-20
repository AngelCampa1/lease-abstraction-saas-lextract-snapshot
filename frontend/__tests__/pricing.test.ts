import { describe, expect, it } from 'vitest'
import {
  PRICING,
  PROCESSING_ESTIMATES,
  SUPPORT_POLICY,
  formatPrice,
} from '@/lib/pricing'

describe('pricing configuration', () => {
  it('matches the public Lextract $15 per lease pricing model', () => {
    expect(PRICING.single.price).toBe(15)
    expect(PRICING.single.perLease).toBe(15)
    expect(PRICING.pack5.price).toBe(65)
    expect(PRICING.pack5.perLease).toBe(13)
    expect(PRICING.pack10.price).toBe(120)
    expect(PRICING.pack10.perLease).toBe(12)
  })

  it('formats whole-dollar prices without cents', () => {
    expect(formatPrice(PRICING.single.price)).toBe('$15')
    expect(formatPrice(PRICING.pack5.price)).toBe('$65')
    expect(formatPrice(PRICING.pack10.price)).toBe('$120')
  })

  it('rounds fractional display prices up to the next whole dollar', () => {
    expect(formatPrice(14.5)).toBe('$15')
    expect(formatPrice(12.01)).toBe('$13')
  })

  it('exposes the current support policy without a money-back guarantee claim', () => {
    expect(SUPPORT_POLICY).toBe('If an extraction looks wrong, email support and we will review it.')
    expect(SUPPORT_POLICY).not.toMatch(/money[- ]back|no\s+questions\s+asked/i)
  })

  it('formats processing estimates with and without page counts', () => {
    expect(PROCESSING_ESTIMATES.extractingWithPageCount(42)).toContain('42')
    expect(PROCESSING_ESTIMATES.extracting).toBeTruthy()
  })
})
