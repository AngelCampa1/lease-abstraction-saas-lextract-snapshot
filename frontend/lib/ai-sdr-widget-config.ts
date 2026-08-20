/**
 * Client-side configuration for the hosted Ventora AI-SDR widget bundle.
 *
 * The bundle is served from the worker origin and exposes
 * `window.VentoraAiSdr.createAiSdrWidget`. It talks to lextract's same-origin
 * BFF (`/api/ai-sdr`), so the assertion secret never reaches the browser.
 */

export const AI_SDR_WORKER_ORIGIN = 'https://ventora-ai-sdr-worker.REPLACE_WITH_ACCOUNT_SUBDOMAIN.workers.dev'

/** Hosted widget bundle URL (UMD global `VentoraAiSdr`). */
export const AI_SDR_CLIENT_BUNDLE_URL = `${AI_SDR_WORKER_ORIGIN}/client/ai-sdr.global.js`

/** <script> id so the bundle loads at most once per page. */
export const AI_SDR_SCRIPT_ID = 'ventora-ai-sdr-client'

/** Mount point id for the widget root. */
export const AI_SDR_WIDGET_ROOT_ID = 'ventora-ai-sdr-root'

/** Same-origin BFF base path the widget posts session/chat/handoff calls to. */
export const AI_SDR_BFF_BASE_URL = '/api/ai-sdr'

/** Product identifier the widget includes in the session create call. */
export const AI_SDR_PRODUCT_ID = 'lextract'

/** Surface tag included in session metadata for analytics/segmentation. */
export const AI_SDR_SURFACE = 'marketing-site'

/** Poll cadence and ceiling while waiting for the hosted bundle global. */
export const AI_SDR_POLL_INTERVAL_MS = 120
export const AI_SDR_MAX_POLL_ATTEMPTS = 100
