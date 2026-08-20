import { BRAND_ASSETS } from '@/lib/brand'

const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lextract.io'
const parsedUrl = new URL(rawUrl)

if (parsedUrl.hostname.startsWith('www.')) {
  parsedUrl.hostname = parsedUrl.hostname.slice(4)
}

/** Canonical site URL without trailing slash */
export const SITE_URL = parsedUrl.toString().replace(/\/+$/, '')

/** Display hostname (e.g. "lextract.io") */
export const SITE_DISPLAY_DOMAIN = new URL(SITE_URL).host

/** Site brand name */
export const SITE_NAME = 'Lextract'

/** Launch date for pSEO pages - used as lastModified in sitemap and Last Updated on page */
export const PSEO_LAUNCH_DATE = '2026-03-17'

/** Default OG image for social sharing previews */
export const DEFAULT_OG_IMAGE = {
  url: BRAND_ASSETS.ogImagePng,
  width: 1200,
  height: 630,
  alt: 'Lextract - AI-Powered Commercial Lease Abstraction',
} as const
