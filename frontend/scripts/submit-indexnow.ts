/**
 * Post-deploy script: submits all indexable URLs to IndexNow.
 *
 * Usage:
 *   INDEXNOW_KEY=<key> npm run submit-indexnow
 *
 * In dry-run mode (no key set), prints the payload without submitting.
 */
import { getAllIndexableUrls, buildIndexNowPayload, submitToIndexNow } from '../lib/indexnow'

async function main(): Promise<void> {
  const key = process.env.INDEXNOW_KEY ?? ''
  const isDryRun = !key

  if (isDryRun) {
    console.log('[IndexNow] No INDEXNOW_KEY set — running in dry-run mode (no submission)')
  }

  const urls = await getAllIndexableUrls()
  console.log(`[IndexNow] Collected ${urls.length} URLs`)

  if (isDryRun) {
    const payload = buildIndexNowPayload('dry-run-key', urls)
    console.log('[IndexNow] Payload preview:')
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  await submitToIndexNow(key, urls)
  console.log(`[IndexNow] Submitted ${urls.length} URLs successfully`)
}

main().catch((err: unknown) => {
  console.error('[IndexNow] Fatal error:', err)
  process.exit(1)
})
