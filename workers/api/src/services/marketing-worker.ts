import type { Env } from '../types'

export class MarketingWorkerNotConfiguredError extends Error {
  constructor() {
    super('Marketing Worker is not configured')
    this.name = 'MarketingWorkerNotConfiguredError'
  }
}

export async function unsubscribeLead(
  leadId: string,
  env: Env,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!env.MARKETING_WORKER_URL || !env.MARKETING_WORKER_SECRET) {
    throw new MarketingWorkerNotConfiguredError()
  }
  const response = await fetchImpl(
    `${env.MARKETING_WORKER_URL.replace(/\/+$/u, '')}/unsubscribe`,
    {
      body: JSON.stringify({ lead_id: leadId }),
      headers: {
        Authorization: `Bearer ${env.MARKETING_WORKER_SECRET}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  )
  if (response.status === 404) {
    return false
  }
  if (!response.ok) {
    throw new Error(`Marketing Worker request failed with status ${response.status}`)
  }
  const data = (await response.json()) as { success?: unknown }
  return data.success === true
}
