'use client'

import { AiCsWidget as VentoraAiCsWidget } from '@ventora/ai-cs/react'
import { useAuth } from '@/hooks/use-auth'
import { usePathname } from 'next/navigation'

const AI_CS_APP_ID = 'lextract'

export function AiCsWidget() {
  const { user } = useAuth()
  const pathname = usePathname()

  if (user === null) {
    return null
  }

  return (
    <VentoraAiCsWidget
      api={{ baseUrl: '/api/ai-cs', credentials: 'same-origin' }}
      session={{
        appId: AI_CS_APP_ID,
        userId: user.id,
        ...(pathname !== null ? { currentPath: pathname } : {}),
      }}
      brand={{ id: 'lextract' }}
    />
  )
}
