import { getContentBySlug } from '@/lib/content'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function GuideOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Guide'
  try {
    const { meta } = await getContentBySlug('guides', slug)
    title = meta.title
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Guide')
}
