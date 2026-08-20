import { getFieldBySlug } from '@/data/fields'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function FieldOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Lease Field'
  try {
    const field = getFieldBySlug(slug)
    if (field) title = field.displayLabel
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Field')
}
