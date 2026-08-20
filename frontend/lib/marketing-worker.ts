import {
  captureFrontendApiError,
  captureFrontendApiMessage,
} from '@/lib/sentry-reporting'

export type MarketingEventType =
  | 'lead_magnet'
  | 'calculator'
  | 'exit_popup'
  | 'email_gate'
  | 'results_survey'

export interface MarketingCaptureInput {
  eventType: MarketingEventType
  email: string
  firstName?: string
  lastName?: string
  company?: string
  source?: string
  magnetSlug?: string
  toolSlug?: string
  downloadUrl?: string
  sendDeliveryEmail?: boolean
  utm?: Record<string, string>
  payload?: Record<string, unknown>
  apolloContactId?: string | null
}

export interface MarketingCaptureResult {
  success: boolean
  leadId?: string
  skipped?: boolean
  statusCode?: number
}

function getMarketingWorkerConfig(): { url: string; secret: string } | null {
  const url = process.env.MARKETING_WORKER_URL?.trim()
  const secret = process.env.MARKETING_WORKER_SECRET?.trim()
  if (!url || !secret) {
    return null
  }
  return { url: url.replace(/\/+$/, ''), secret }
}

export async function captureMarketingEvent(
  input: MarketingCaptureInput,
): Promise<MarketingCaptureResult> {
  const config = getMarketingWorkerConfig()
  if (!config) {
    captureFrontendApiMessage('Marketing worker configuration is missing', {
      area: 'marketing',
      route: '/api/leads',
      externalService: 'marketing-worker',
      operation: 'capture',
    })
    return { success: false, skipped: true }
  }

  try {
    const response = await fetch(`${config.url}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: input.eventType,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        company: input.company,
        source: input.source,
        magnet_slug: input.magnetSlug,
        tool_slug: input.toolSlug,
        download_url: input.downloadUrl,
        send_delivery_email: input.sendDeliveryEmail,
        utm: input.utm,
        payload: input.payload,
        apollo_contact_id: input.apolloContactId,
      }),
    })

    if (!response.ok) {
      captureFrontendApiMessage('Marketing worker returned a non-OK response', {
        area: 'marketing',
        route: '/api/leads',
        externalService: 'marketing-worker',
        operation: 'capture',
        statusCode: response.status,
      })
      return { success: false, skipped: false, statusCode: response.status }
    }

    const data = (await response.json().catch(() => ({}))) as { leadId?: string }
    return { success: true, leadId: data.leadId }
  } catch (err) {
    captureFrontendApiError(err, {
      area: 'marketing',
      route: '/api/leads',
      externalService: 'marketing-worker',
      operation: 'capture',
    })
    return { success: false, skipped: false }
  }
}
