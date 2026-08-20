import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { getRobotsDisallowPaths } from '@/lib/seo-route-policy'

export default function robots(): MetadataRoute.Robots {
  const disallow = getRobotsDisallowPaths()
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow,
      },
      {
        // Explicit rules for AI citation bots and Bing (powers Copilot).
        // CCBot (Common Crawl training) is intentionally excluded - it provides no citation benefit.
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'OAI-SearchBot',
          'ClaudeBot',
          'Claude-User',
          'anthropic-ai',
          'PerplexityBot',
          'Perplexity-User',
          'Google-Extended',
          'GoogleOther',
          'Bingbot',
          'Applebot',
          'Applebot-Extended',
        ],
        allow: ['/'],
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
