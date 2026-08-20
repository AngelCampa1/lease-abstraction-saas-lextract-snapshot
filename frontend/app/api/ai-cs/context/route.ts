import {
  AI_CS_APP_ID,
  buildLextractAppContext,
  buildSignedContextResponse,
  verifyContextRequest,
} from '@/lib/ai-cs-context'

export const dynamic = 'force-dynamic'

export function GET(request: Request): Response {
  const secret = process.env.AI_CS_CONTEXT_SECRET?.trim()
  if (!secret) {
    return new Response(JSON.stringify({ error: 'App context unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const verification = verifyContextRequest({
    request,
    secret,
    appId: AI_CS_APP_ID,
    nowMs: Date.now(),
  })
  if (!verification.ok) {
    return new Response(
      JSON.stringify({ error: verification.message, code: verification.code }),
      { status: verification.status, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const url = new URL(request.url)
  const signed = buildSignedContextResponse({
    appContext: buildLextractAppContext(),
    path: `${url.pathname}${url.search}`,
    secret,
  })

  return new Response(signed.body, { status: 200, headers: signed.headers })
}
