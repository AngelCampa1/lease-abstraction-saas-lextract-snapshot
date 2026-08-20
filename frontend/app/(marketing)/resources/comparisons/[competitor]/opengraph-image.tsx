import { getComparisonBySlug } from '@/data/comparisons'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function ComparisonOGImage({
  params,
}: {
  params: Promise<{ competitor: string }>
}): Promise<ImageResponse> {
  const { competitor } = await params
  let title = 'Comparison'
  try {
    const comparison = getComparisonBySlug(competitor)
    if (comparison) title = comparison.competitor
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Comparison')
}
