import {
  BRAND_ASSETS,
  getAbsoluteBrandAssetUrl,
} from './brand'
import { buildOrganizationSchema } from './schema'
import { DEFAULT_OG_IMAGE, SITE_URL } from './site-config'

describe('brand assets', () => {
  it('defines canonical logo assets for every brand surface', () => {
    expect(BRAND_ASSETS.logoSvg).toBe('/brand/lextract-logo.svg')
    expect(BRAND_ASSETS.logoPng).toBe('/brand/lextract-logo.png')
    expect(BRAND_ASSETS.iconSvg).toBe('/brand/lextract-icon.svg')
    expect(BRAND_ASSETS.iconPng).toBe('/brand/lextract-icon.png')
    expect(BRAND_ASSETS.emailLogoPng).toBe('/brand/lextract-email-logo.png')
    expect(BRAND_ASSETS.ogImagePng).toBe('/brand/lextract-og.png')
  })

  it('builds absolute brand asset URLs from site config', () => {
    expect(getAbsoluteBrandAssetUrl(BRAND_ASSETS.logoPng)).toBe(
      `${SITE_URL}/brand/lextract-logo.png`
    )
  })

  it('uses the canonical logo in structured data and social defaults', () => {
    expect(buildOrganizationSchema().logo).toBe(
      `${SITE_URL}/brand/lextract-logo.png`
    )
    expect(DEFAULT_OG_IMAGE.url).toBe('/brand/lextract-og.png')
  })
})
