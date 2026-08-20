/** @vitest-environment node */
import { describe, expect, it } from 'vitest'
import {
  AI_CS_APP_ID,
  buildAiCsProxyRequest,
  stableJson,
  validateAiCsAction,
} from './ai-cs-proxy'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_SECRET = 'test-cs-secret-32bytes-long-1234'

const USER = { id: 'user_abc', email: 'test@lextract.io' }

function baseInput(
  action: string,
  incomingBody: unknown,
): Parameters<typeof buildAiCsProxyRequest>[0] {
  return {
    action,
    incomingBody,
    user: USER,
    secret: VALID_SECRET,
    now: () => new Date('2026-06-01T00:00:00.000Z'),
    nonce: () => 'fixed-nonce',
  }
}

// ---------------------------------------------------------------------------
// validateAiCsAction
// ---------------------------------------------------------------------------

describe('validateAiCsAction', () => {
  it('returns /v1/sessions for "sessions"', () => {
    expect(validateAiCsAction('sessions')).toBe('/v1/sessions')
  })

  it('returns /v1/chat for "chat"', () => {
    expect(validateAiCsAction('chat')).toBe('/v1/chat')
  })

  it('returns /v1/escalations for "escalations"', () => {
    expect(validateAiCsAction('escalations')).toBe('/v1/escalations')
  })

  it('returns null for unknown actions', () => {
    expect(validateAiCsAction('unknown')).toBeNull()
    expect(validateAiCsAction('')).toBeNull()
    expect(validateAiCsAction('sessions/../chat')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// stableJson
// ---------------------------------------------------------------------------

describe('stableJson', () => {
  it('sorts object keys alphabetically', () => {
    const result = stableJson({ z: 1, a: 2, m: 3 })
    expect(result).toBe('{"a":2,"m":3,"z":1}')
  })

  it('sorts nested object keys', () => {
    const result = stableJson({ b: { z: 1, a: 2 }, a: 'x' })
    expect(result).toBe('{"a":"x","b":{"a":2,"z":1}}')
  })

  it('handles arrays without sorting elements', () => {
    const result = stableJson([3, 1, 2])
    expect(result).toBe('[3,1,2]')
  })

  it('handles primitives', () => {
    expect(stableJson(null)).toBe('null')
    expect(stableJson(42)).toBe('42')
    expect(stableJson('hello')).toBe('"hello"')
    expect(stableJson(true)).toBe('true')
  })

  it('omits undefined values', () => {
    const result = stableJson({ a: 1, b: undefined })
    expect(result).toBe('{"a":1}')
  })
})

// ---------------------------------------------------------------------------
// buildAiCsProxyRequest: throws for invalid action
// ---------------------------------------------------------------------------

describe('buildAiCsProxyRequest: invalid action', () => {
  it('throws for an unknown action', async () => {
    await expect(
      buildAiCsProxyRequest(baseInput('unknown', {})),
    ).rejects.toThrow('Unsupported AI-CS action')
  })
})

// ---------------------------------------------------------------------------
// buildAiCsProxyRequest: sessions
// ---------------------------------------------------------------------------

describe('buildAiCsProxyRequest: sessions', () => {
  it('injects appId and userId into the sessions body', async () => {
    const result = await buildAiCsProxyRequest(baseInput('sessions', {}))
    expect(result.body.appId).toBe(AI_CS_APP_ID)
    expect(result.body.userId).toBe(USER.id)
  })

  it('returns path /v1/sessions', async () => {
    const result = await buildAiCsProxyRequest(baseInput('sessions', {}))
    expect(result.path).toBe('/v1/sessions')
  })

  it('includes currentPath when present', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('sessions', { currentPath: '/dashboard' }),
    )
    expect(result.body.currentPath).toBe('/dashboard')
  })

  it('omits currentPath when absent', async () => {
    const result = await buildAiCsProxyRequest(baseInput('sessions', {}))
    expect(result.body).not.toHaveProperty('currentPath')
  })

  it('merges user email into metadata', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('sessions', { metadata: { plan: 'pro' } }),
    )
    const meta = result.body.metadata as Record<string, string>
    expect(meta.email).toBe(USER.email)
    expect(meta.plan).toBe('pro')
  })

  it('omits metadata when user has no email and body has no metadata', async () => {
    const result = await buildAiCsProxyRequest({
      ...baseInput('sessions', {}),
      user: { id: 'u1' },
    })
    expect(result.body).not.toHaveProperty('metadata')
  })
})

// ---------------------------------------------------------------------------
// buildAiCsProxyRequest: chat - identity fields
// ---------------------------------------------------------------------------

describe('buildAiCsProxyRequest: chat - identity fields', () => {
  it('injects appId into the chat body', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('chat', { sessionId: 's1', message: 'hi' }),
    )
    expect(result.body.appId).toBe(AI_CS_APP_ID)
  })

  it('injects userId into the chat body', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('chat', { sessionId: 's1', message: 'hi' }),
    )
    expect(result.body.userId).toBe(USER.id)
  })

  it('preserves sessionId in the chat body', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('chat', { sessionId: 'sess_xyz', message: 'hello' }),
    )
    expect(result.body.sessionId).toBe('sess_xyz')
  })

  it('preserves message in the chat body', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('chat', { sessionId: 's1', message: 'hello world' }),
    )
    expect(result.body.message).toBe('hello world')
  })

  it('preserves history when present', async () => {
    const history = [{ role: 'user', content: 'prev' }]
    const result = await buildAiCsProxyRequest(
      baseInput('chat', { sessionId: 's1', message: 'hi', history }),
    )
    expect(result.body.history).toEqual(history)
  })

  it('omits history when absent', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('chat', { sessionId: 's1', message: 'hi' }),
    )
    expect(result.body).not.toHaveProperty('history')
  })

  it('preserves currentPath when present', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('chat', { sessionId: 's1', message: 'hi', currentPath: '/leases' }),
    )
    expect(result.body.currentPath).toBe('/leases')
  })

  it('omits currentPath when absent', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('chat', { sessionId: 's1', message: 'hi' }),
    )
    expect(result.body).not.toHaveProperty('currentPath')
  })

  it('returns path /v1/chat', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('chat', { sessionId: 's1', message: 'hi' }),
    )
    expect(result.path).toBe('/v1/chat')
  })

  it('uses caller userId, not a hardcoded value', async () => {
    const result = await buildAiCsProxyRequest({
      ...baseInput('chat', { sessionId: 's1', message: 'hi' }),
      user: { id: 'different_user_id', email: 'other@lextract.io' },
    })
    expect(result.body.userId).toBe('different_user_id')
  })
})

// ---------------------------------------------------------------------------
// buildAiCsProxyRequest: escalations - identity fields
// ---------------------------------------------------------------------------

describe('buildAiCsProxyRequest: escalations - identity fields', () => {
  it('injects appId into the escalation body', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('escalations', { sessionId: 's1' }),
    )
    expect(result.body.appId).toBe(AI_CS_APP_ID)
  })

  it('injects userId into the escalation body', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('escalations', { sessionId: 's1' }),
    )
    expect(result.body.userId).toBe(USER.id)
  })

  it('preserves sessionId in the escalation body', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('escalations', { sessionId: 'sess_esc' }),
    )
    expect(result.body.sessionId).toBe('sess_esc')
  })

  it('preserves reason when present', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('escalations', { sessionId: 's1', reason: 'billing' }),
    )
    expect(result.body.reason).toBe('billing')
  })

  it('omits reason when absent', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('escalations', { sessionId: 's1' }),
    )
    expect(result.body).not.toHaveProperty('reason')
  })

  it('preserves message when present', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('escalations', { sessionId: 's1', message: 'need help' }),
    )
    expect(result.body.message).toBe('need help')
  })

  it('merges user email into contact', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('escalations', { sessionId: 's1', contact: { phone: '555-1234' } }),
    )
    const contact = result.body.contact as Record<string, string>
    expect(contact.email).toBe(USER.email)
    expect(contact.phone).toBe('555-1234')
  })

  it('omits contact when user has no email and body has no contact', async () => {
    const result = await buildAiCsProxyRequest({
      ...baseInput('escalations', { sessionId: 's1' }),
      user: { id: 'u1' },
    })
    expect(result.body).not.toHaveProperty('contact')
  })

  it('returns path /v1/escalations', async () => {
    const result = await buildAiCsProxyRequest(
      baseInput('escalations', { sessionId: 's1' }),
    )
    expect(result.path).toBe('/v1/escalations')
  })

  it('uses caller userId, not a hardcoded value', async () => {
    const result = await buildAiCsProxyRequest({
      ...baseInput('escalations', { sessionId: 's1' }),
      user: { id: 'another_user', email: 'another@lextract.io' },
    })
    expect(result.body.userId).toBe('another_user')
  })
})

// ---------------------------------------------------------------------------
// buildAiCsProxyRequest: HMAC signing headers
// ---------------------------------------------------------------------------

describe('buildAiCsProxyRequest: HMAC signing headers', () => {
  it('returns all three signing headers', async () => {
    const result = await buildAiCsProxyRequest(baseInput('sessions', {}))
    expect(result.headers['X-Ventora-Timestamp']).toBeTruthy()
    expect(result.headers['X-Ventora-Nonce']).toBeTruthy()
    expect(result.headers['X-Ventora-Signature']).toMatch(/^[a-f0-9]{64}$/)
  })

  it('sets Content-Type to application/json', async () => {
    const result = await buildAiCsProxyRequest(baseInput('sessions', {}))
    expect(result.headers['Content-Type']).toBe('application/json')
  })

  it('produces a deterministic signature for a fixed timestamp and nonce', async () => {
    const r1 = await buildAiCsProxyRequest(baseInput('chat', { sessionId: 's1', message: 'hi' }))
    const r2 = await buildAiCsProxyRequest(baseInput('chat', { sessionId: 's1', message: 'hi' }))
    expect(r1.headers['X-Ventora-Signature']).toBe(r2.headers['X-Ventora-Signature'])
  })

  it('produces different signatures when the body differs', async () => {
    const r1 = await buildAiCsProxyRequest(baseInput('chat', { sessionId: 's1', message: 'hi' }))
    const r2 = await buildAiCsProxyRequest(baseInput('chat', { sessionId: 's1', message: 'bye' }))
    expect(r1.headers['X-Ventora-Signature']).not.toBe(r2.headers['X-Ventora-Signature'])
  })

  it('produces different signatures with different secrets', async () => {
    const r1 = await buildAiCsProxyRequest(baseInput('sessions', {}))
    const r2 = await buildAiCsProxyRequest({ ...baseInput('sessions', {}), secret: 'other-secret' })
    expect(r1.headers['X-Ventora-Signature']).not.toBe(r2.headers['X-Ventora-Signature'])
  })

  it('the chat body signature covers appId and userId', async () => {
    // Two users on the same session should produce different signatures because
    // appId+userId are included in the signed body.
    const r1 = await buildAiCsProxyRequest(
      baseInput('chat', { sessionId: 's1', message: 'hi' }),
    )
    const r2 = await buildAiCsProxyRequest({
      ...baseInput('chat', { sessionId: 's1', message: 'hi' }),
      user: { id: 'different_user' },
    })
    expect(r1.headers['X-Ventora-Signature']).not.toBe(r2.headers['X-Ventora-Signature'])
  })

  it('the escalation body signature covers appId and userId', async () => {
    const r1 = await buildAiCsProxyRequest(
      baseInput('escalations', { sessionId: 's1' }),
    )
    const r2 = await buildAiCsProxyRequest({
      ...baseInput('escalations', { sessionId: 's1' }),
      user: { id: 'different_user' },
    })
    expect(r1.headers['X-Ventora-Signature']).not.toBe(r2.headers['X-Ventora-Signature'])
  })
})
