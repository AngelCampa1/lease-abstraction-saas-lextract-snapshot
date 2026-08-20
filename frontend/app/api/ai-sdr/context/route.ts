import { handleAiSdrContextRequest } from '@/lib/ai-sdr-handlers'

export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  return handleAiSdrContextRequest({
    request,
    env: { AI_SDR_CONTEXT_SECRET: process.env.AI_SDR_CONTEXT_SECRET },
  })
}
