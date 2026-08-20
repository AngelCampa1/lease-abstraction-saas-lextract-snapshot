import { notFound } from 'next/navigation'
import { buildArticleMarkdown } from '@/lib/machine-readable'

interface ArticleMarkdownRouteContext {
  params: Promise<{ slug?: string }>
}

function isContentLookupError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.startsWith('Content not found:') ||
      error.message.startsWith('Content redirected:') ||
      error.message.startsWith('Unknown content category:'))
  )
}

export async function GET(
  _request: Request,
  { params }: ArticleMarkdownRouteContext,
): Promise<Response> {
  const { slug } = await params
  if (typeof slug !== 'string') {
    notFound()
  }

  try {
    return new Response(await buildArticleMarkdown(slug), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 's-maxage=86400, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    if (!isContentLookupError(error)) {
      throw error
    }
    notFound()
  }
}
