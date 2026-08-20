'use client'

import { useParams } from 'next/navigation'
import { ProcessingContent } from '@/components/processing/processing-content'

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>()
  return <ProcessingContent id={id} />
}
