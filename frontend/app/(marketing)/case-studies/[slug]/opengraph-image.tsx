import { getCaseStudyBySlug } from '@/data/case-studies'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function CaseStudyOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Case Study'
  try {
    const caseStudy = getCaseStudyBySlug(slug)
    if (caseStudy) title = caseStudy.name
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Case Study')
}
