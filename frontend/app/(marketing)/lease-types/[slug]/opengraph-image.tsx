import { getLeaseTypeBySlug } from '@/data/lease-types'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function LeaseTypeOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Lease Type'
  try {
    const leaseType = getLeaseTypeBySlug(slug)
    if (leaseType) title = leaseType.name
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Lease Type')
}
