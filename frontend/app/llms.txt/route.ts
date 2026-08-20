import { buildLlmsTxt } from '@/lib/machine-readable'

export async function GET(): Promise<Response> {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600',
    },
  })
}
