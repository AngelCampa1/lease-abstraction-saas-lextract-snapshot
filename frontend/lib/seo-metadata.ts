import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/site-config'

interface MarketingMetadataInput {
  title: string
  description: string
  path: `/${string}`
  type?: 'website' | 'article'
}

export function buildIndexableMarketingMetadata({
  title,
  description,
  path,
  type = 'website',
}: MarketingMetadataInput): Metadata {
  const canonicalUrl = `${SITE_URL}${path}`
  const image = {
    ...DEFAULT_OG_IMAGE,
    url: DEFAULT_OG_IMAGE.url.startsWith('http')
      ? DEFAULT_OG_IMAGE.url
      : `${SITE_URL}${DEFAULT_OG_IMAGE.url}`,
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      url: canonicalUrl,
      title,
      description,
      type,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.url],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}
