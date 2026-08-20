import { getPersonaBySlug } from '@/data/personas'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function PersonaOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Role'
  try {
    const persona = getPersonaBySlug(slug)
    if (persona) title = persona.role
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'By Role')
}
