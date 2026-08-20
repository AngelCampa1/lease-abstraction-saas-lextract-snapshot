const rawBrandUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lextract.io'
const parsedBrandUrl = new URL(rawBrandUrl)

if (parsedBrandUrl.hostname.startsWith('www.')) {
  parsedBrandUrl.hostname = parsedBrandUrl.hostname.slice(4)
}

const BRAND_SITE_URL = parsedBrandUrl.toString().replace(/\/+$/, '')

export const BRAND_ASSETS = {
  logoSvg: '/brand/lextract-logo.svg',
  logoPng: '/brand/lextract-logo.png',
  iconSvg: '/brand/lextract-icon.svg',
  iconPng: '/brand/lextract-icon.png',
  emailLogoPng: '/brand/lextract-email-logo.png',
  ogImagePng: '/brand/lextract-og.png',
  appleIconPng: '/brand/apple-icon.png',
  favicon32Png: '/brand/favicon-32.png',
  favicon16Png: '/brand/favicon-16.png',
} as const

export function getAbsoluteBrandAssetUrl(path: string): string {
  return `${BRAND_SITE_URL}${path}`
}
