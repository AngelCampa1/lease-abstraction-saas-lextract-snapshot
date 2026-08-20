import { getWorkflowBySlug } from '@/data/workflows'
import { renderPseoOgImage } from '@/lib/og-image-template'
import type { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default async function WorkflowOGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<ImageResponse> {
  const { slug } = await params
  let title = 'Workflow'
  try {
    const workflow = getWorkflowBySlug(slug)
    if (workflow) title = workflow.name
  } catch {
    // use fallback title
  }
  return renderPseoOgImage(title, 'Workflow')
}
