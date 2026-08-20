import { getFaqBySlug } from '@/data/faqs'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function FaqOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'FAQ'
  try {
    const faqItem = getFaqBySlug(slug)
    if (faqItem) title = faqItem.question
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'FAQ')
}
