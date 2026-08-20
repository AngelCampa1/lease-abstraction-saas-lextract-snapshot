import { getIntegrationBySlug } from '@/data/integrations'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function IntegrationOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Integration'
  try {
    const integration = getIntegrationBySlug(slug)
    if (integration) title = integration.software
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Integration')
}
