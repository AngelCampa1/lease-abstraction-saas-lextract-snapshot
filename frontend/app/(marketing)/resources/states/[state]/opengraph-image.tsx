import { getStateBySlug } from '@/data/states'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function StateOGImage({
  params,
}: {
  params: Promise<{ state: string }>
}): Promise<ImageResponse> {
  const { state } = await params
  let title = 'State Guide'
  try {
    const stateData = getStateBySlug(state)
    if (stateData) title = stateData.state
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'State Guide')
}
