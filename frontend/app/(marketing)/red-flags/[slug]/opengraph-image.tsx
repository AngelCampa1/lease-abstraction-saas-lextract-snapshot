import { getRedFlagBySlug } from '@/data/red-flags'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function RedFlagOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Red Flag'
  try {
    const flag = getRedFlagBySlug(slug)
    if (flag) title = flag.name
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Red Flag')
}
