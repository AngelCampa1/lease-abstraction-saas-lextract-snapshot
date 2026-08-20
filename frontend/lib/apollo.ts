// Shared Apollo.io contact upsert helper.
// Used by all lead capture API routes so the logic lives in one place.

import {
  captureFrontendApiError,
  captureFrontendApiMessage,
} from '@/lib/sentry-reporting'

export interface ApolloLeadParams {
  email: string
  firstName?: string
  company?: string
  labelNames: string[]
}

interface ApolloContactPayload {
  email: string
  first_name?: string
  organization_name?: string
  label_names: string[]
  run_dedupe: boolean
}

/**
 * Create or update a contact in Apollo.io.
 * Returns the Apollo contact ID if successful, null on failure.
 * Errors are swallowed to avoid blocking the user experience.
 */
export async function upsertApolloContact(
  params: ApolloLeadParams,
): Promise<string | null> {
  const apolloApiKey = process.env.APOLLO_API_KEY
  if (!apolloApiKey) {
    console.error('[apollo] APOLLO_API_KEY not configured')
    captureFrontendApiMessage('Apollo API key is not configured', {
      area: 'marketing',
      route: '/api/leads',
      externalService: 'apollo',
      operation: 'config',
    })
    return null
  }

  const payload: ApolloContactPayload = {
    email: params.email.toLowerCase(),
    label_names: params.labelNames,
    run_dedupe: true,
  }

  if (params.firstName) {
    payload.first_name = params.firstName
  }
  if (params.company) {
    payload.organization_name = params.company
  }

  try {
    const response = await fetch('https://api.apollo.io/v1/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apolloApiKey,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '(unreadable)')
      console.error(`[apollo] Apollo returned ${response.status}: ${errorText}`)
      captureFrontendApiMessage('Apollo returned a non-OK response', {
        area: 'marketing',
        route: '/api/leads',
        externalService: 'apollo',
        operation: 'upsert-contact',
        statusCode: response.status,
      })
      return null
    }

    // safe: Apollo's response shape is optional-chained before reading the id.
    const data = await response.clone().json() as { contact?: { id?: string } }
    return data.contact?.id ?? null
  } catch (err) {
    console.error('[apollo] fetch failed:', err)
    captureFrontendApiError(err, {
      area: 'marketing',
      route: '/api/leads',
      externalService: 'apollo',
      operation: 'upsert-contact',
    })
    return null
  }
}
