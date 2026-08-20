/** @vitest-environment node */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import * as publicAppLayout from '@/app/(public-app)/layout'
import { metadata as rootNotFoundMetadata } from '@/app/not-found'
import { metadata as marketingNotFoundMetadata } from '@/app/(marketing)/not-found'
import { metadata as uploadMetadata } from '@/app/(public-app)/upload/layout'
import { metadata as processingMetadata } from '@/app/(public-app)/processing/[id]/layout'
import { metadata as resultsMetadata } from '@/app/(public-app)/results/[id]/layout'
import { metadata as unsubscribeMetadata } from '@/app/(marketing)/unsubscribe/page'
import { metadata as appMetadata } from '@/app/(app)/layout'
import { generateMetadata as generateFieldMetadata } from '@/app/(marketing)/fields/[slug]/page'
import { generateMetadata as generateRedFlagMetadata } from '@/app/(marketing)/red-flags/[slug]/page'
import { generateMetadata as generateCalculatorMetadata } from '@/app/(marketing)/calculators/[slug]/page'
import { generateMetadata as generateComparisonMetadata } from '@/app/(marketing)/resources/comparisons/[competitor]/page'
import { generateMetadata as generateStateMetadata } from '@/app/(marketing)/resources/states/[state]/page'
import { generateMetadata as generatePersonaMetadata } from '@/app/(marketing)/for/[slug]/page'
import { generateMetadata as generateLeaseTypeMetadata } from '@/app/(marketing)/lease-types/[slug]/page'
import { generateMetadata as generateArticleMetadata } from '@/app/(marketing)/resources/articles/[slug]/page'
import { generateMetadata as generateFeatureMetadata } from '@/app/(marketing)/features/[slug]/page'

describe('route metadata indexation', () => {
  it('keeps public upload pages indexable at the public-app layout level', () => {
    expect('metadata' in publicAppLayout).toBe(false)
  })

  it('sets canonical metadata for the upload funnel page', () => {
    expect(uploadMetadata.alternates?.canonical).toBe('https://lextract.io/upload')
    expect(uploadMetadata.openGraph?.url).toBe('https://lextract.io/upload')
    expect(uploadMetadata.robots).toEqual({
      index: true,
      follow: true,
    })
  })

  it('keeps authenticated app pages noindex', () => {
    expect(appMetadata.robots).toEqual({
      index: false,
      follow: false,
    })
  })

  it('keeps processing and results utility pages noindex', () => {
    expect(processingMetadata.robots).toEqual({
      index: false,
      follow: false,
    })
    expect(resultsMetadata.robots).toEqual({
      index: false,
      follow: false,
    })
  })

  it('keeps unsubscribe utility pages noindex', () => {
    expect(unsubscribeMetadata.robots).toEqual({
      index: false,
      follow: false,
    })
  })

  it('keeps 404 pages explicitly noindex', () => {
    expect(rootNotFoundMetadata.robots).toEqual({
      index: false,
      follow: false,
    })
    expect(marketingNotFoundMetadata.robots).toEqual({
      index: false,
      follow: false,
    })
  })

  it('uses route-specific Open Graph image URLs for dynamic pSEO pages', async () => {
    const fieldMetadata = await generateFieldMetadata({
      params: Promise.resolve({ slug: 'base-rent-annual' }),
    })
    const redFlagMetadata = await generateRedFlagMetadata({
      params: Promise.resolve({ slug: 'no-cam-cap' }),
    })

    expect(fieldMetadata.openGraph?.images).toEqual([
      {
        url: 'https://lextract.io/fields/base-rent-annual/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Annual Base Rent - Lextract Field Reference',
      },
    ])
    expect(redFlagMetadata.openGraph?.images).toEqual([
      {
        url: 'https://lextract.io/red-flags/no-cam-cap/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'No CAM Cap - Lextract Red Flag Reference',
      },
    ])
  })

  it('keeps pSEO visible and structured-data dates sourced from the same constant', () => {
    const fieldSource = readFileSync(
      join(process.cwd(), 'app/(marketing)/fields/[slug]/page.tsx'),
      'utf8'
    )
    const redFlagSource = readFileSync(
      join(process.cwd(), 'app/(marketing)/red-flags/[slug]/page.tsx'),
      'utf8'
    )

    expect(fieldSource).toContain('const FIELD_PAGE_UPDATED_AT')
    expect(fieldSource).toContain('<LastUpdated date={FIELD_PAGE_UPDATED_AT} />')
    expect(redFlagSource).toContain('const RED_FLAG_PAGE_UPDATED_AT')
    expect(redFlagSource).toContain('<LastUpdated date={RED_FLAG_PAGE_UPDATED_AT} />')
  })

  it('sets canonical, Open Graph, and Twitter metadata for indexable marketing templates', async () => {
    const cases = [
      {
        expectedUrl: 'https://lextract.io/calculators/nnn-lease-cost-calculator',
        metadata: await generateCalculatorMetadata({
          params: Promise.resolve({ slug: 'nnn-lease-cost-calculator' }),
        }),
      },
      {
        expectedUrl: 'https://lextract.io/resources/comparisons/leaselens',
        metadata: await generateComparisonMetadata({
          params: Promise.resolve({ competitor: 'leaselens' }),
        }),
      },
      {
        expectedUrl: 'https://lextract.io/resources/states/california',
        metadata: await generateStateMetadata({
          params: Promise.resolve({ state: 'california' }),
        }),
      },
      {
        expectedUrl: 'https://lextract.io/for/tenant-representatives',
        metadata: await generatePersonaMetadata({
          params: Promise.resolve({ slug: 'tenant-representatives' }),
        }),
      },
      {
        expectedUrl: 'https://lextract.io/lease-types/nnn-lease',
        metadata: await generateLeaseTypeMetadata({
          params: Promise.resolve({ slug: 'nnn-lease' }),
        }),
      },
    ]

    for (const { expectedUrl, metadata } of cases) {
      const twitter = metadata.twitter as {
        card?: string
        title?: string
        description?: string
        images?: string | string[]
      } | undefined

      expect(metadata.alternates?.canonical).toBe(expectedUrl)
      expect(metadata.openGraph?.url).toBe(expectedUrl)
      expect(twitter?.card).toBe('summary_large_image')
      expect(twitter?.title).toBe(metadata.title)
      expect(twitter?.description).toBe(metadata.description)
      expect(twitter?.images).toBeDefined()
      expect(metadata.robots).toEqual({ index: true, follow: true })
    }
  })

  it('sets Twitter metadata and explicit robots for article and feature templates', async () => {
    const cases = [
      await generateArticleMetadata({
        params: Promise.resolve({ slug: 'what-is-commercial-lease-abstraction' }),
      }),
      await generateFeatureMetadata({
        params: Promise.resolve({ slug: 'confidence-scoring' }),
      }),
    ]

    for (const metadata of cases) {
      const twitter = metadata.twitter as {
        card?: string
        title?: string
        description?: string
        images?: string | string[]
      } | undefined

      expect(metadata.robots).toEqual({ index: true, follow: true })
      expect(twitter?.card).toBe('summary_large_image')
      expect(twitter?.title).toBe(metadata.title)
      expect(twitter?.description).toBe(metadata.description)
      expect(twitter?.images).toBeDefined()
    }
  })
})
