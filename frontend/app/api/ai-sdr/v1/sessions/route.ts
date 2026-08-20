import { handleAiSdrBffRequest } from '@/lib/ai-sdr-handlers'

export const dynamic = 'force-dynamic'

export function POST(request: Request): Promise<Response> {
  return handleAiSdrBffRequest({
    action: 'sessions',
    request,
    env: {
      AI_SDR_WORKER_URL: process.env.AI_SDR_WORKER_URL,
      AI_SDR_CLIENT_ASSERTION_SECRET: process.env.AI_SDR_CLIENT_ASSERTION_SECRET,
    },
  })
}
