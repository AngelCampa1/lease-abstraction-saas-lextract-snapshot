import { SITE_URL } from '@/lib/site-config'
import sitemap from '@/app/sitemap'

const INDEXNOW_API = 'https://api.indexnow.org/indexnow'

/** IndexNow API batch limit per submission request. */
export const INDEXNOW_BATCH_LIMIT = 10_000

/** Returns all indexable URLs matching the sitemap. */
export async function getAllIndexableUrls(): Promise<string[]> {
  return (await sitemap()).map((entry) => entry.url)
}

export interface IndexNowPayload {
  host: string
  key: string
  keyLocation: string
  /** Maximum 10,000 URLs per IndexNow API batch request. */
  urlList: string[]
}

/**
 * Builds the IndexNow batch submission payload.
 * @throws if `urls` exceeds the IndexNow 10,000-URL batch limit.
 */
export function buildIndexNowPayload(key: string, urls: string[]): IndexNowPayload {
  if (urls.length > INDEXNOW_BATCH_LIMIT) {
    throw new Error(
      `IndexNow batch limit exceeded: ${urls.length} URLs provided, maximum is ${INDEXNOW_BATCH_LIMIT}`,
    )
  }
  const host = new URL(SITE_URL).host
  return {
    host,
    key,
    keyLocation: `${SITE_URL}/${key}.txt`,
    urlList: urls,
  }
}

/**
 * Submits URLs to the IndexNow API.
 * @throws on non-2xx response or network error.
 */
export async function submitToIndexNow(key: string, urls: string[]): Promise<void> {
  const payload = buildIndexNowPayload(key, urls)
  const res = await fetch(INDEXNOW_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`IndexNow submission failed - HTTP ${res.status}: ${body}`)
  }
}
