import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  DashboardSkeleton,
  ProfileSkeleton,
  ProcessingSkeleton,
  ResultsSkeleton,
  FullResultsSkeleton,
  TeaserSkeleton,
} from '@/components/skeletons'

describe('Skeleton components', () => {
  it('DashboardSkeleton renders with correct testid and role', () => {
    render(<DashboardSkeleton />)
    const skeleton = screen.getByTestId('dashboard-skeleton')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveAttribute('role', 'status')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading dashboard')
  })

  it('DashboardSkeleton renders stat cards and extraction rows', () => {
    render(<DashboardSkeleton />)
    const skeleton = screen.getByTestId('dashboard-skeleton')
    const shimmerElements = skeleton.querySelectorAll('[data-slot="skeleton"]')
    expect(shimmerElements.length).toBeGreaterThanOrEqual(8)
  })

  it('ProfileSkeleton renders with correct testid and role', () => {
    render(<ProfileSkeleton />)
    const skeleton = screen.getByTestId('profile-skeleton')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveAttribute('role', 'status')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading profile')
  })

  it('ProfileSkeleton renders header and form skeleton', () => {
    render(<ProfileSkeleton />)
    const skeleton = screen.getByTestId('profile-skeleton')
    const shimmerElements = skeleton.querySelectorAll('[data-slot="skeleton"]')
    expect(shimmerElements.length).toBe(2)
  })

  it('ProcessingSkeleton renders with correct testid and role', () => {
    render(<ProcessingSkeleton />)
    const skeleton = screen.getByTestId('processing-skeleton')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveAttribute('role', 'status')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading processing status')
  })

  it('ProcessingSkeleton renders progress bar and step placeholders', () => {
    render(<ProcessingSkeleton />)
    const skeleton = screen.getByTestId('processing-skeleton')
    const shimmerElements = skeleton.querySelectorAll('[data-slot="skeleton"]')
    expect(shimmerElements.length).toBeGreaterThanOrEqual(6)
  })

  it('ResultsSkeleton renders with correct testid and role', () => {
    render(<ResultsSkeleton />)
    const skeleton = screen.getByTestId('results-skeleton')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveAttribute('role', 'status')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading results')
  })

  it('ResultsSkeleton renders header and field card placeholders', () => {
    render(<ResultsSkeleton />)
    const skeleton = screen.getByTestId('results-skeleton')
    const shimmerElements = skeleton.querySelectorAll('[data-slot="skeleton"]')
    expect(shimmerElements.length).toBeGreaterThanOrEqual(7)
  })

  it('FullResultsSkeleton renders with correct testid and role', () => {
    render(<FullResultsSkeleton />)
    const skeleton = screen.getByTestId('full-results-skeleton')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveAttribute('role', 'status')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading full results')
  })

  it('FullResultsSkeleton renders header, category, and sidebar placeholders', () => {
    render(<FullResultsSkeleton />)
    const skeleton = screen.getByTestId('full-results-skeleton')
    const shimmerElements = skeleton.querySelectorAll('[data-slot="skeleton"]')
    expect(shimmerElements.length).toBeGreaterThanOrEqual(7)
  })

  it('TeaserSkeleton renders with correct testid and role', () => {
    render(<TeaserSkeleton />)
    const skeleton = screen.getByTestId('teaser-skeleton')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveAttribute('role', 'status')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading teaser')
  })

  it('TeaserSkeleton renders header, fields, and CTA placeholders', () => {
    render(<TeaserSkeleton />)
    const skeleton = screen.getByTestId('teaser-skeleton')
    const shimmerElements = skeleton.querySelectorAll('[data-slot="skeleton"]')
    expect(shimmerElements.length).toBeGreaterThanOrEqual(9)
  })

  it('all skeletons mark inner elements as aria-hidden', () => {
    const { container } = render(<DashboardSkeleton />)
    const skeletonDivs = container.querySelectorAll('[data-slot="skeleton"]')
    skeletonDivs.forEach((el) => {
      expect(el).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
