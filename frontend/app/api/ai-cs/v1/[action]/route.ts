import { auth } from '@/lib/neon-auth/server'
import { handleAiCsProxyRequest } from '@/lib/ai-cs-handlers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params

  return handleAiCsProxyRequest(request, action, {
    getSession: () => auth.getSession(),
    fetch: (url, init) => fetch(url, init),
    secret: process.env.AI_CS_CLIENT_ASSERTION_SECRET ?? '',
  })
}
