import { getPropertyTypeBySlug } from '@/data/property-types'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function PropertyTypeOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Property Type'
  try {
    const propertyType = getPropertyTypeBySlug(slug)
    if (propertyType) title = propertyType.name
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Property Type')
}
