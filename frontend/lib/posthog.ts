/**
 * PostHog product analytics client.
 *
 * Initializes PostHog in production only. Provides type-safe wrappers
 * for event capture and user identification.
 */

import posthog from 'posthog-js'

/** Whether PostHog has been initialized in this session. */
let _initialized = false

/** Typed event name constants to prevent typos and enable autocomplete. */
export const EVENTS = {
  // Marketing
  cta_clicked: 'cta_clicked',
  pricing_viewed: 'pricing_viewed',
  faq_toggled: 'faq_toggled',

  // Exit popup
  exit_popup_shown: 'exit_popup_shown',
  exit_popup_freebie_selected: 'exit_popup_freebie_selected',
  exit_popup_submitted: 'exit_popup_submitted',
  exit_popup_dismissed: 'exit_popup_dismissed',

  // Auth
  signup_started: 'signup_started',
  signup_completed: 'signup_completed',
  signup_failed: 'signup_failed',
  signup_oauth_clicked: 'signup_oauth_clicked',
  login_started: 'login_started',
  login_completed: 'login_completed',
  login_failed: 'login_failed',
  login_oauth_clicked: 'login_oauth_clicked',

  // Upload
  upload_file_selected: 'upload_file_selected',
  upload_file_rejected: 'upload_file_rejected',
  upload_sample_clicked: 'upload_sample_clicked',
  upload_started: 'upload_started',
  upload_completed: 'upload_completed',
  upload_failed: 'upload_failed',

  // Processing
  processing_viewed: 'processing_viewed',
  processing_completed: 'processing_completed',

  // Email gate
  email_gate_shown: 'email_gate_shown',
  email_gate_submitted: 'email_gate_submitted',

  // Results / Teaser
  teaser_viewed: 'teaser_viewed',
  paywall_viewed: 'paywall_viewed',
  inline_signup_viewed: 'inline_signup_viewed',

  // Payment
  checkout_started: 'checkout_started',
  credit_used: 'credit_used',
  payment_completed: 'payment_completed',
  payment_cancelled: 'payment_cancelled',

  // Full results
  full_results_viewed: 'full_results_viewed',
  export_started: 'export_started',
  export_completed: 'export_completed',
  export_failed: 'export_failed',

  // Dashboard
  dashboard_viewed: 'dashboard_viewed',
  extraction_clicked: 'extraction_clicked',

  // Feedback
  feedback_opened: 'feedback_opened',
  feedback_submitted: 'feedback_submitted',

  // Results survey
  results_survey_shown: 'results_survey_shown',
  results_survey_submitted: 'results_survey_submitted',
  results_survey_dismissed: 'results_survey_dismissed',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

/**
 * Initialize PostHog analytics.
 *
 * Only initializes in production when NEXT_PUBLIC_POSTHOG_KEY is set.
 * Returns true if initialized, false if skipped.
 */
export function initPostHog(): boolean {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (process.env.NODE_ENV !== 'production') {
    return false
  }

  if (!key) {
    return false
  }

  posthog.init(key, {
    api_host: host ?? 'https://app.posthog.com',
    autocapture: false,
    advanced_disable_flags: true,
    capture_pageview: false,
    persistence: 'localStorage+cookie' as const,
  })

  _initialized = true
  return true
}

/**
 * Capture a custom analytics event.
 *
 * @param name - Event name (e.g., 'lease_uploaded', '$pageview')
 * @param properties - Optional key-value properties for the event
 */
export function captureEvent(
  name: EventName | '$pageview',
  properties?: Record<string, unknown>,
): void {
  if (!_initialized) return
  posthog.capture(name, properties)
}

/**
 * Identify an authenticated user for analytics.
 *
 * @param userId - Unique user identifier
 * @param traits - Optional user traits (email, plan, etc.)
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  if (!_initialized) return
  posthog.identify(userId, traits)
}

/**
 * Reset PostHog identity (call on logout).
 */
export function resetPostHog(): void {
  if (!_initialized) return
  posthog.reset()
}
