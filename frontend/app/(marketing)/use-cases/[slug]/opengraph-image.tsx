import { getUseCaseBySlug } from '@/data/use-cases'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function UseCaseOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Use Case'
  try {
    const useCase = getUseCaseBySlug(slug)
    if (useCase) title = useCase.name
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Use Case')
}
