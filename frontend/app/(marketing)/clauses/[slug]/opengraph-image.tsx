import { getClauseBySlug } from '@/data/clauses'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function ClauseOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Lease Clause'
  try {
    const clause = getClauseBySlug(slug)
    if (clause) title = clause.name
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Clause')
}
