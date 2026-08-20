import { buildPricingMarkdown } from '@/lib/machine-readable'

export async function GET(): Promise<Response> {
  return new Response(buildPricingMarkdown(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600',
    },
  })
}
