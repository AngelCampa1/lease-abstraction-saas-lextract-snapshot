import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ComparisonTable, getAdvantageIndicator } from '@/components/content/comparison-table'
import type { ComparisonFeature } from '@/data/comparisons'

const mockFeatures: ComparisonFeature[] = [
  {
    feature: 'Price',
    lextract: '$15 per lease',
    competitor: '$25 per lease',
    advantage: 'lextract',
  },
  {
    feature: 'Speed',
    lextract: '5–15 minutes',
    competitor: '5–15 minutes',
    advantage: 'tie',
  },
  {
    feature: 'Customization',
    lextract: 'Fixed schema',
    competitor: 'Fully customizable',
    advantage: 'competitor',
  },
]

describe('ComparisonTable', () => {
  it('renders a table element', () => {
    render(<ComparisonTable features={mockFeatures} competitorName="TestComp" />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('renders table headers with correct labels', () => {
    render(<ComparisonTable features={mockFeatures} competitorName="TestComp" />)
    expect(screen.getByText('Feature')).toBeInTheDocument()
    expect(screen.getAllByText('Lextract').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('TestComp').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Advantage')).toBeInTheDocument()
  })

  it('renders a row for each feature', () => {
    render(<ComparisonTable features={mockFeatures} competitorName="TestComp" />)
    expect(screen.getAllByText('Price').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Speed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Customization').length).toBeGreaterThanOrEqual(1)
  })

  it('renders lextract and competitor values', () => {
    render(<ComparisonTable features={mockFeatures} competitorName="TestComp" />)
    expect(screen.getAllByText('$15 per lease').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('$25 per lease').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Fully customizable').length).toBeGreaterThanOrEqual(1)
  })

  it('renders advantage badges', () => {
    render(<ComparisonTable features={mockFeatures} competitorName="TestComp" />)
    expect(screen.getAllByText('Lextract').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Tie').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Competitor').length).toBeGreaterThanOrEqual(1)
  })

  it('renders with empty features array', () => {
    render(<ComparisonTable features={[]} competitorName="Empty" />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

describe('getAdvantageIndicator', () => {
  it('returns correct label for lextract', () => {
    const result = getAdvantageIndicator('lextract')
    expect(result.label).toBe('Lextract')
    expect(result.className).toContain('primary')
  })

  it('returns correct label for competitor', () => {
    const result = getAdvantageIndicator('competitor')
    expect(result.label).toBe('Competitor')
    expect(result.className).toContain('muted')
  })

  it('returns correct label for tie', () => {
    const result = getAdvantageIndicator('tie')
    expect(result.label).toBe('Tie')
    expect(result.className).toContain('muted')
  })
})
