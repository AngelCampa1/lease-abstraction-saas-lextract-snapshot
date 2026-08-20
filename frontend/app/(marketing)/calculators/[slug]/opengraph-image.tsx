import { getCalculatorBySlug } from '@/data/calculators'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function CalculatorOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Calculator'
  try {
    const calculator = getCalculatorBySlug(slug)
    if (calculator) title = calculator.title
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Calculator')
}
