/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

type StoredLead = {
  id: string
  email: string
  first_name: string | null
  company: string | null
  first_magnet_slug: string | null
  unsubscribed_at: string | null
  created_at: string
  updated_at: string
}

type StoredEvent = {
  id: string
  lead_id: string
  event_type: string
  magnet_slug: string | null
  tool_slug: string | null
  payload_json: string
}

const LEAD_UUID = '11111111-1111-4111-8111-111111111111'
const EVENT_UUID_1 = '22222222-2222-4222-8222-222222222222'
const EVENT_UUID_2 = '33333333-3333-4333-8333-333333333333'
const DELIVERY_UUID = '44444444-4444-4444-8444-444444444444'

class MemoryD1 {
  leads = new Map<string, StoredLead>()
  events: StoredEvent[] = []

  prepare(sql: string) {
    return new MemoryStatement(this, sql)
  }
}

class MemoryStatement {
  private values: unknown[] = []

  constructor(
    private readonly db: MemoryD1,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values
    return this
  }

  first<T = unknown>(): Promise<T | null> {
    if (this.sql.includes('FROM marketing_leads WHERE email')) {
      const row = this.db.leads.get(String(this.values[0])) ?? null
      // safe: this in-memory D1 fake returns the row shape requested by worker queries.
      return Promise.resolve(row as T | null)
    }
    if (this.sql.includes('FROM marketing_events') && this.sql.includes('WHERE lead_id')) {
      // safe: this branch handles the exact event identity query bound by insertEvent().
      const [leadId, eventType, magnetSlug, toolSlug] = this.values as [
        string,
        string,
        string | null,
        string | null,
      ]
      const row =
        this.db.events.find(
          (event) =>
            event.lead_id === leadId &&
            event.event_type === eventType &&
            event.magnet_slug === magnetSlug &&
            event.tool_slug === toolSlug,
        ) ?? null
      // safe: this in-memory D1 fake returns the row shape requested by worker queries.
      return Promise.resolve(row as T | null)
    }
    if (this.sql.includes('FROM marketing_leads WHERE id')) {
      const id = String(this.values[0])
      const row = [...this.db.leads.values()].find((lead) => lead.id === id) ?? null
      // safe: this in-memory D1 fake returns the row shape requested by worker queries.
      return Promise.resolve(row as T | null)
    }
    return Promise.resolve(null)
  }

  all<T = unknown>(): Promise<{ results: T[] }> {
    return Promise.resolve({ results: [] })
  }

  run() {
    if (this.sql.startsWith('INSERT INTO marketing_leads')) {
      const [
        id,
        email,
        firstName,
        lastName,
        company,
        primarySource,
        firstMagnetSlug,
        apolloContactId,
        now,
      ] = this.values as [
        string,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string,
      ]
      const existing = this.db.leads.get(email)
      this.db.leads.set(email, {
        id: existing?.id ?? id,
        email,
        first_name: firstName ?? existing?.first_name ?? null,
        company: company ?? existing?.company ?? null,
        first_magnet_slug: firstMagnetSlug ?? existing?.first_magnet_slug ?? null,
        unsubscribed_at: existing?.unsubscribed_at ?? null,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      })
      void lastName
      void primarySource
      void apolloContactId
      return Promise.resolve({ success: true, meta: { changes: 1 } })
    } else if (this.sql.startsWith('INSERT OR IGNORE INTO marketing_events')) {
      // safe: this branch matches the Worker's fixed marketing_events insert binding order.
      const [id, leadId, eventType, , magnetSlug, toolSlug, , payloadJson] =
        this.values as string[]
      const exists = this.db.events.some(
        (event) =>
          event.lead_id === leadId &&
          event.event_type === eventType &&
          event.magnet_slug === magnetSlug &&
          event.tool_slug === toolSlug,
      )
      if (exists) {
        return Promise.resolve({ success: true, meta: { changes: 0 } })
      }
      this.db.events.push({
        id,
        lead_id: leadId,
        event_type: eventType,
        magnet_slug: magnetSlug,
        tool_slug: toolSlug,
        payload_json: payloadJson,
      })
      return Promise.resolve({ success: true, meta: { changes: 1 } })
    } else if (this.sql.startsWith('UPDATE marketing_leads SET unsubscribed_at')) {
      const [unsubscribedAt, , id] = this.values as [string, string, string]
      for (const [email, lead] of this.db.leads.entries()) {
        if (lead.id === id) {
          this.db.leads.set(email, {
            ...lead,
            unsubscribed_at: unsubscribedAt,
          })
        }
      }
    }
    return Promise.resolve({ success: true, meta: { changes: 1 } })
  }
}

function env(db = new MemoryD1()) {
  return {
    MARKETING_DB: db,
    MARKETING_WORKER_SECRET: 'secret-token',
    RESEND_API_KEY: 'resend-key',
    SEQUENCER_BASE_URL: 'https://sequencer.example.com',
    SEQUENCER_CF_ACCESS_CLIENT_ID: 'client-id',
    SEQUENCER_CF_ACCESS_CLIENT_SECRET: 'client-secret',
  }
}

function authedRequest(path: string, body: unknown) {
  return new Request(`https://marketing.example.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer secret-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('marketing data worker', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'crypto',
      {
        randomUUID: vi
          .fn()
          .mockReturnValueOnce(LEAD_UUID)
          .mockReturnValueOnce(EVENT_UUID_1)
          .mockReturnValueOnce(EVENT_UUID_2)
          .mockReturnValueOnce(DELIVERY_UUID),
      },
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'email-1' }), { status: 200 })),
    )
  })

  it('captures a lead idempotently and appends one event per unique submission', async () => {
    const { default: worker } = await import('../../../workers/marketing-data/src/index')
    const db = new MemoryD1()

    const first = await worker.fetch(
      authedRequest('/capture', {
        event_type: 'lead_magnet',
        email: 'Tenant@Example.com',
        first_name: 'Alice',
        company: 'Acme',
        magnet_slug: 'lease-abstraction-checklist',
        source: 'template-page',
      }),
      env(db),
    )
    const duplicate = await worker.fetch(
      authedRequest('/capture', {
        event_type: 'lead_magnet',
        email: 'tenant@example.com',
        magnet_slug: 'lease-abstraction-checklist',
      }),
      env(db),
    )

    expect(first.status).toBe(200)
    expect(duplicate.status).toBe(200)
    expect(db.leads.size).toBe(1)
    expect(db.events).toHaveLength(1)
    const fetchMock = vi.mocked(fetch)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sequencer.example.com/api/v1/enrollments',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"sequence_slug":"lextract-onboarding"'),
      }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sequencer.example.com/api/v1/enrollments',
      expect.objectContaining({
        body: expect.stringContaining('"product":"lextract"'),
      }),
    )
  })

  it('does not resend or re-enroll duplicate lead magnet submissions', async () => {
    const { default: worker } = await import('../../../workers/marketing-data/src/index')
    const db = new MemoryD1()

    const payload = {
      event_type: 'lead_magnet',
      email: 'tenant@example.com',
      magnet_slug: 'lease-abstraction-checklist',
      download_url: 'https://lextract.io/templates',
      send_delivery_email: true,
    }
    const first = await worker.fetch(authedRequest('/capture', payload), env(db))
    const duplicate = await worker.fetch(authedRequest('/capture', payload), env(db))

    expect(first.status).toBe(200)
    expect(duplicate.status).toBe(200)
    // safe: this Worker endpoint always returns a JSON object with optional messageId.
    const firstJson = (await first.json()) as { messageId?: string | null }
    // safe: this Worker endpoint always returns a JSON object with optional messageId.
    const duplicateJson = (await duplicate.json()) as { messageId?: string | null }
    expect(firstJson.messageId).toBe('email-1')
    expect(duplicateJson.messageId).toBeNull()
    expect(db.events).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('allows a returning email to request a different lead magnet once', async () => {
    const { default: worker } = await import('../../../workers/marketing-data/src/index')
    const db = new MemoryD1()

    await worker.fetch(
      authedRequest('/capture', {
        event_type: 'lead_magnet',
        email: 'tenant@example.com',
        magnet_slug: 'lease-abstraction-checklist',
        download_url: 'https://lextract.io/templates',
        send_delivery_email: true,
      }),
      env(db),
    )
    const second = await worker.fetch(
      authedRequest('/capture', {
        event_type: 'lead_magnet',
        email: 'tenant@example.com',
        magnet_slug: 'due-diligence-checklist',
        download_url: 'https://lextract.io/templates',
        send_delivery_email: true,
      }),
      env(db),
    )

    expect(second.status).toBe(200)
    expect(db.events).toHaveLength(2)
    expect(fetch).toHaveBeenCalledTimes(6)
  })

  it('unsubscribes a lead and forwards suppression to Sequencer', async () => {
    const { default: worker } = await import('../../../workers/marketing-data/src/index')
    const db = new MemoryD1()
    await worker.fetch(
      authedRequest('/capture', {
        event_type: 'lead_magnet',
        email: 'tenant@example.com',
        magnet_slug: 'lease-abstraction-checklist',
      }),
      env(db),
    )

    const response = await worker.fetch(
      authedRequest('/unsubscribe', { lead_id: LEAD_UUID }),
      env(db),
    )

    expect(response.status).toBe(200)
    expect(db.leads.get('tenant@example.com')?.unsubscribed_at).toBeTruthy()
    const fetchMock = vi.mocked(fetch)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sequencer.example.com/api/v1/unsubscribe',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"email":"tenant@example.com"'),
      }),
    )
  })

  it('keeps Cloudflare R2 presigned URLs in lead magnet delivery emails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { default: worker } = await import('../../../workers/marketing-data/src/index')

    const response = await worker.fetch(
      authedRequest('/capture', {
        event_type: 'lead_magnet',
        email: 'tenant@example.com',
        magnet_slug: 'lease-abstraction-checklist',
        download_url:
          'https://account.r2.cloudflarestorage.com/lextract-lead-magnets/lease-abstraction-checklist-v3.pdf?X-Amz-Signature=abc',
        send_delivery_email: true,
      }),
      env(),
    )

    expect(response.status).toBe(200)
    const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
    const body = JSON.parse(init.body as string) as { html: string }
    expect(body.html).toContain(
      'https://account.r2.cloudflarestorage.com/lextract-lead-magnets/lease-abstraction-checklist-v3.pdf?X-Amz-Signature=abc',
    )
  })

  it('sends lead magnet delivery from the canonical public sender', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { default: worker } = await import('../../../workers/marketing-data/src/index')

    const response = await worker.fetch(
      authedRequest('/capture', {
        event_type: 'lead_magnet',
        email: 'tenant@example.com',
        magnet_slug: 'lease-abstraction-checklist',
        download_url: 'https://lextract.io/templates',
        send_delivery_email: true,
      }),
      env(),
    )

    expect(response.status).toBe(200)
    const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
    const body = JSON.parse(init.body as string) as { from: string }
    expect(body.from).toBe('Angel Campa <angel.campa@lextract.io>')
  })

  it('includes an unsubscribe link in lead magnet delivery emails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-1' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { default: worker } = await import('../../../workers/marketing-data/src/index')

    const response = await worker.fetch(
      authedRequest('/capture', {
        event_type: 'lead_magnet',
        email: 'tenant@example.com',
        magnet_slug: 'lease-abstraction-checklist',
        download_url:
          'https://account.r2.cloudflarestorage.com/lextract-lead-magnets/lease-abstraction-checklist-v3.pdf?X-Amz-Signature=abc',
        send_delivery_email: true,
      }),
      env(),
    )

    expect(response.status).toBe(200)
    const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
    const body = JSON.parse(init.body as string) as { html: string }
    expect(body.html).toContain(`https://lextract.io/unsubscribe?id=${LEAD_UUID}`)
    expect(body.html).toContain('Unsubscribe')
    expect(body.html).not.toContain('use the link in any follow-up message')
  })

  it('keeps public knowledge lookups behind the worker helper', () => {
    const workerRoot = path.resolve(__dirname, '..', '..', '..', 'workers', 'marketing-data')
    const indexSource = readFileSync(path.join(workerRoot, 'src', 'index.ts'), 'utf-8')
    const helperSource = readFileSync(
      path.join(workerRoot, 'src', 'public-knowledge.ts'),
      'utf-8',
    )

    expect(indexSource).not.toContain('public-knowledge.generated.json')
    expect(indexSource).not.toContain('.find(')
    expect(indexSource).not.toContain('Lextract <hello@lextract.io>')
    expect(indexSource).not.toContain('You can download it here:')
    expect(indexSource).not.toContain("here is this week's lease review insight")
    expect(indexSource).not.toContain('getNurtureTemplate')
    expect(helperSource).toContain('public-knowledge.generated.json')
  })

  it('keeps lead magnet fulfillment templates out of legacy nurture naming', () => {
    const workerRoot = path.resolve(__dirname, '..', '..', '..', 'workers', 'marketing-data')
    const indexSource = readFileSync(path.join(workerRoot, 'src', 'index.ts'), 'utf-8')
    const deliveryHelper = readFileSync(
      path.join(workerRoot, 'src', 'delivery-templates.ts'),
      'utf-8',
    )
    const readme = readFileSync(path.join(workerRoot, 'README.md'), 'utf-8')

    expect(indexSource).not.toContain('nurture-templates')
    expect(deliveryHelper).not.toContain('templates/nurture')
    expect(readme).not.toContain('nurture scheduling')
  })

  // ── /lead-magnet endpoint ────────────────────────────────────────────────────

  describe('/lead-magnet endpoint', () => {
    it('calls sequencer download with remapped CAM slug and returns downloadUrl', async () => {
      const sequencerResponse = { asset_url: 'https://r2.example.com/cam-checklist.pdf' }
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(sequencerResponse), { status: 200 }),
      )
      vi.stubGlobal('fetch', fetchMock)
      const { default: worker } = await import('../../../workers/marketing-data/src/index')

      const response = await worker.fetch(
        authedRequest('/lead-magnet', {
          email: 'user@example.com',
          magnetSlug: 'cam-reconciliation-checklist',
          firstName: 'Jane',
          sourcePath: '/red-flags/cam-overbilling',
        }),
        env(),
      )

      expect(response.status).toBe(200)
      // safe: response is the typed JSON returned by handleLeadMagnet
      const body = (await response.json()) as {
        success: boolean
        downloadUrl: string
        emailed: boolean
      }
      expect(body.success).toBe(true)
      expect(body.downloadUrl).toBe('https://r2.example.com/cam-checklist.pdf')
      expect(body.emailed).toBe(true)

      // Must remap to the sequencer slug
      expect(fetchMock).toHaveBeenCalledWith(
        'https://sequencer.example.com/api/v1/lead-magnets/lextract-cam-reconciliation-checklist/download',
        expect.objectContaining({ method: 'POST' }),
      )
      // Must send idempotency key
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['Idempotency-Key']).toBe(
        'user@example.com:lextract-cam-reconciliation-checklist',
      )
      // Must forward firstName and sourcePath
      const reqBody = JSON.parse(init.body as string) as {
        email: string
        first_name: string
        utm: { source_path: string }
      }
      expect(reqBody.email).toBe('user@example.com')
      expect(reqBody.first_name).toBe('Jane')
      expect(reqBody.utm.source_path).toBe('/red-flags/cam-overbilling')
    })

    it('passes through non-CAM slugs unchanged', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ asset_url: 'https://r2.example.com/checklist.pdf' }), { status: 200 }),
      )
      vi.stubGlobal('fetch', fetchMock)
      const { default: worker } = await import('../../../workers/marketing-data/src/index')

      await worker.fetch(
        authedRequest('/lead-magnet', {
          email: 'user@example.com',
          magnetSlug: 'lease-abstraction-checklist',
        }),
        env(),
      )

      expect(fetchMock).toHaveBeenCalledWith(
        'https://sequencer.example.com/api/v1/lead-magnets/lease-abstraction-checklist/download',
        expect.anything(),
      )
    })

    it('returns 401 when authorization header is wrong', async () => {
      const { default: worker } = await import('../../../workers/marketing-data/src/index')
      const response = await worker.fetch(
        new Request('https://marketing.example.com/lead-magnet', {
          method: 'POST',
          headers: { Authorization: 'Bearer wrong-secret', 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'user@example.com', magnetSlug: 'lease-abstraction-checklist' }),
        }),
        env(),
      )
      expect(response.status).toBe(401)
    })

    it('returns 400 for missing email', async () => {
      const { default: worker } = await import('../../../workers/marketing-data/src/index')
      const response = await worker.fetch(
        authedRequest('/lead-magnet', { magnetSlug: 'lease-abstraction-checklist' }),
        env(),
      )
      expect(response.status).toBe(400)
    })

    it('returns 400 for invalid email format', async () => {
      const { default: worker } = await import('../../../workers/marketing-data/src/index')
      const response = await worker.fetch(
        authedRequest('/lead-magnet', { email: 'not-an-email', magnetSlug: 'lease-abstraction-checklist' }),
        env(),
      )
      expect(response.status).toBe(400)
    })

    it('returns 400 for unknown magnetSlug', async () => {
      const { default: worker } = await import('../../../workers/marketing-data/src/index')
      const response = await worker.fetch(
        authedRequest('/lead-magnet', { email: 'user@example.com', magnetSlug: 'unknown-slug' }),
        env(),
      )
      expect(response.status).toBe(400)
    })

    it('returns 502 when sequencer config is absent', async () => {
      const { default: worker } = await import('../../../workers/marketing-data/src/index')
      const noCredsEnv = {
        MARKETING_DB: new MemoryD1(),
        MARKETING_WORKER_SECRET: 'secret-token',
        RESEND_API_KEY: 'resend-key',
        // No SEQUENCER_BASE_URL / SEQUENCER_CF_ACCESS_CLIENT_ID / SECRET
      }
      const response = await worker.fetch(
        authedRequest('/lead-magnet', { email: 'user@example.com', magnetSlug: 'lease-abstraction-checklist' }),
        noCredsEnv,
      )
      expect(response.status).toBe(502)
      // safe: response is typed JSON error from handleLeadMagnet
      const body = (await response.json()) as { success: boolean; error: string }
      expect(body.success).toBe(false)
    })

    it('returns 502 when sequencer returns a non-OK status', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response('Internal Server Error', { status: 500 }),
      )
      vi.stubGlobal('fetch', fetchMock)
      const { default: worker } = await import('../../../workers/marketing-data/src/index')

      const response = await worker.fetch(
        authedRequest('/lead-magnet', { email: 'user@example.com', magnetSlug: 'due-diligence-checklist' }),
        env(),
      )
      expect(response.status).toBe(502)
    })

    it('returns 502 when sequencer returns no asset_url', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'no_sequence' }), { status: 200 }),
      )
      vi.stubGlobal('fetch', fetchMock)
      const { default: worker } = await import('../../../workers/marketing-data/src/index')

      const response = await worker.fetch(
        authedRequest('/lead-magnet', { email: 'user@example.com', magnetSlug: 'lease-audit-workbook' }),
        env(),
      )
      expect(response.status).toBe(502)
    })
  })

  it('keeps the marketing worker available on the public workers.dev route', () => {
    const workerRoot = path.resolve(__dirname, '..', '..', '..', 'workers', 'marketing-data')
    const wranglerConfig: {
      name?: unknown
      workers_dev?: unknown
      d1_databases?: Array<{
        binding?: unknown
        database_name?: unknown
      }>
    } = JSON.parse(readFileSync(path.join(workerRoot, 'wrangler.jsonc'), 'utf-8'))

    expect(wranglerConfig.name).toBe('lextract-marketing-data')
    expect(wranglerConfig.workers_dev).toBe(true)
    expect(wranglerConfig.d1_databases).toContainEqual(
      expect.objectContaining({
        binding: 'MARKETING_DB',
        database_name: 'lextract-marketing',
      }),
    )
  })
})
