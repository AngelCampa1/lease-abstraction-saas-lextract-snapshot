import { getLocationBySlug } from '@/data/locations'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function LocationOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Location'
  try {
    const location = getLocationBySlug(slug)
    if (location) {
      title = location.state ? `${location.city}, ${location.state}` : location.city
    }
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Location')
}
