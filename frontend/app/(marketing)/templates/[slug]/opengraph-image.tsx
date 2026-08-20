import { getTemplateBySlug } from '@/data/templates'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function TemplateOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Template'
  try {
    const template = getTemplateBySlug(slug)
    if (template) title = template.name
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Template')
}
