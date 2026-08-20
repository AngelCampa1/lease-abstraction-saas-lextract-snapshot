import { getIndustryBySlug } from '@/data/industries'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function IndustryOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Industry'
  try {
    const industry = getIndustryBySlug(slug)
    if (industry) title = industry.name
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Industry')
}
