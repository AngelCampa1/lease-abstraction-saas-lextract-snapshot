import { Hono } from 'hono'

import {
  MarketingWorkerNotConfiguredError,
  unsubscribeLead,
} from '../services/marketing-worker'
import type { AppBindings } from '../types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface LeadsRouteDependencies {
  fetch?: typeof fetch
}

export function createLeadsRoutes(
  dependencies: LeadsRouteDependencies = {},
): Hono<AppBindings> {
  const leads = new Hono<AppBindings>()

  leads.get('/unsubscribe', async (c) => {
    const leadId = c.req.query('lead_id') ?? ''
    if (!UUID_RE.test(leadId)) {
      return c.json({ detail: 'lead_id must be a valid UUID.' }, 422)
    }
    try {
      const unsubscribed = await unsubscribeLead(
        leadId,
        c.env,
        dependencies.fetch ?? fetch,
      )
      if (!unsubscribed) {
        return c.json({ detail: 'Lead not found.' }, 404)
      }
      return c.json({ success: true })
    } catch (error) {
      if (error instanceof MarketingWorkerNotConfiguredError) {
        return c.json({ detail: 'Marketing data service unavailable.' }, 503)
      }
      return c.json({ detail: 'Marketing data service unavailable.' }, 503)
    }
  })

  return leads
}

export const leadsRoutes = createLeadsRoutes()
