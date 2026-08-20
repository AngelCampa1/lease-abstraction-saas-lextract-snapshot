import { getGlossaryTermBySlug } from '@/data/glossary'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function GlossaryTermOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Glossary Term'
  try {
    const term = getGlossaryTermBySlug(slug)
    if (term) title = term.term
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Glossary')
}
