import { getDeliveryTemplate } from './delivery-templates'
import {
  CANONICAL_BRAND_LOGO_URL,
  CANONICAL_SITE_URL,
  getEmailFooterCopy,
  getLeadMagnetDeliverySubject,
  getProductOneLine,
  getSenderFallback,
  getValidMagnetSlugs,
  renderTransactionalBodyTemplate,
} from './public-knowledge'
import { renderTemplate } from './render-template'

type D1Value = string | number | null

interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[] }>
  run(): Promise<D1RunResult>
}

interface D1Database {
  prepare(sql: string): D1PreparedStatement
}

interface D1RunResult {
  success: boolean
  meta?: {
    changes?: number
  }
}

interface Env {
  MARKETING_DB: D1Database
  MARKETING_WORKER_SECRET?: string
  RESEND_API_KEY?: string
  SEQUENCER_BASE_URL?: string
  SEQUENCER_CF_ACCESS_CLIENT_ID?: string
  SEQUENCER_CF_ACCESS_CLIENT_SECRET?: string
}

interface MarketingLead {
  id: string
  email: string
  first_name: string | null
  last_name?: string | null
  company: string | null
  primary_source?: string | null
  first_magnet_slug?: string | null
  apollo_contact_id?: string | null
  unsubscribed_at: string | null
  created_at: string
  updated_at: string
}

interface CaptureBody {
  event_type?: string
  email?: string
  first_name?: string
  last_name?: string
  company?: string
  source?: string
  magnet_slug?: string
  tool_slug?: string
  download_url?: string
  send_delivery_email?: boolean
  utm?: Record<string, string>
  payload?: Record<string, unknown>
  apollo_contact_id?: string | null
}

interface UnsubscribeBody {
  lead_id?: string
}

const BRAND_LOGO_URL = CANONICAL_BRAND_LOGO_URL

const VALID_EVENT_TYPES = new Set([
  'lead_magnet',
  'calculator',
  'exit_popup',
  'email_gate',
  'results_survey',
])

// Frontend slug → sequencer slug remapping. Only CAM differs; all others pass through.
const SEQUENCER_SLUG_MAP: Record<string, string> = {
  'cam-reconciliation-checklist': 'lextract-cam-reconciliation-checklist',
}

// Valid frontend-facing magnet slugs accepted by the /lead-magnet endpoint.
const VALID_LEAD_MAGNET_SLUGS = new Set([
  'lease-abstraction-checklist',
  'cam-reconciliation-checklist',
  'due-diligence-checklist',
  'lease-audit-workbook',
])

const VALID_MAGNETS = new Set(getValidMagnetSlugs())

const SITE_URL = CANONICAL_SITE_URL
const PRODUCT_ID = 'lextract'
const SEQUENCER_SEQUENCE_SLUG = 'lextract-onboarding'

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

function unauthorized(): Response {
  return json({ success: false, error: 'Unauthorized' }, { status: 401 })
}

function isAuthorized(request: Request, env: Env): boolean {
  if (!env.MARKETING_WORKER_SECRET) {
    return false
  }
  const header = request.headers.get('authorization') ?? ''
  return header === `Bearer ${env.MARKETING_WORKER_SECRET}`
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizeEmail(value: unknown): string | null {
  const email = cleanString(value)?.toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null
  }
  return email
}

function stringifyObject(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '{}'
  }
  return JSON.stringify(value)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeDownloadUrl(value: string): string {
  try {
    const url = new URL(value, SITE_URL)
    const isSiteUrl = url.origin === SITE_URL
    const isCloudflareR2Url =
      url.protocol === 'https:' && url.hostname.endsWith('.r2.cloudflarestorage.com')
    return isSiteUrl || isCloudflareR2Url ? url.toString() : SITE_URL
  } catch {
    return SITE_URL
  }
}

async function upsertLead(
  env: Env,
  body: CaptureBody,
  email: string,
  now: string,
): Promise<MarketingLead> {
  const existing = await env.MARKETING_DB.prepare(
    'SELECT * FROM marketing_leads WHERE email = ? LIMIT 1',
  )
    .bind(email)
    .first<MarketingLead>()

  const leadId = existing?.id ?? crypto.randomUUID()

  await env.MARKETING_DB.prepare(
    `INSERT INTO marketing_leads (
      id, email, first_name, last_name, company, primary_source,
      first_magnet_slug, apollo_contact_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      first_name = COALESCE(excluded.first_name, marketing_leads.first_name),
      last_name = COALESCE(excluded.last_name, marketing_leads.last_name),
      company = COALESCE(excluded.company, marketing_leads.company),
      primary_source = COALESCE(marketing_leads.primary_source, excluded.primary_source),
      first_magnet_slug = COALESCE(marketing_leads.first_magnet_slug, excluded.first_magnet_slug),
      apollo_contact_id = COALESCE(excluded.apollo_contact_id, marketing_leads.apollo_contact_id),
      updated_at = excluded.updated_at`,
  )
    .bind(
      leadId,
      email,
      cleanString(body.first_name),
      cleanString(body.last_name),
      cleanString(body.company),
      cleanString(body.source),
      cleanString(body.magnet_slug),
      cleanString(body.apollo_contact_id),
      existing?.created_at ?? now,
      now,
    )
    .run()

  const lead = await env.MARKETING_DB.prepare(
    'SELECT * FROM marketing_leads WHERE email = ? LIMIT 1',
  )
    .bind(email)
    .first<MarketingLead>()

  if (!lead) {
    throw new Error('Marketing lead was not persisted.')
  }
  return lead
}

function getSequencerConfig(env: Env): { baseUrl: string; clientId: string; clientSecret: string } | null {
  const baseUrl = env.SEQUENCER_BASE_URL?.trim().replace(/\/+$/, '')
  const clientId = env.SEQUENCER_CF_ACCESS_CLIENT_ID?.trim()
  const clientSecret = env.SEQUENCER_CF_ACCESS_CLIENT_SECRET?.trim()
  if (!baseUrl || !clientId || !clientSecret) {
    return null
  }
  return { baseUrl, clientId, clientSecret }
}

interface LeadMagnetBody {
  email?: unknown
  magnetSlug?: unknown
  firstName?: unknown
  source?: unknown
  sourcePath?: unknown
}

/**
 * Like callSequencer but returns the parsed JSON response body.
 * Throws if the request fails or the response is not OK.
 */
async function callSequencerJson(
  config: { baseUrl: string; clientId: string; clientSecret: string },
  path: string,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
): Promise<unknown> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Access-Client-Id': config.clientId,
      'CF-Access-Client-Secret': config.clientSecret,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const responseBody = await response.text().catch(() => '')
    throw new Error(
      `Sequencer request failed: ${response.status} ${response.statusText} ${responseBody}`.trim(),
    )
  }
  return response.json()
}

async function handleLeadMagnet(request: Request, env: Env): Promise<Response> {
  if (!isAuthorized(request, env)) {
    return unauthorized()
  }

  const body = await readJson<LeadMagnetBody>(request)
  const email = normalizeEmail(body?.email)
  const magnetSlug = cleanString(body?.magnetSlug)

  if (!email) {
    return json({ success: false, error: 'email is required and must be valid.' }, { status: 400 })
  }
  if (!magnetSlug || !VALID_LEAD_MAGNET_SLUGS.has(magnetSlug)) {
    return json(
      { success: false, error: 'magnetSlug must be one of the four supported lead magnet slugs.' },
      { status: 400 },
    )
  }

  const config = getSequencerConfig(env)
  if (!config) {
    return json(
      { success: false, error: 'Sequencer credentials are not configured.' },
      { status: 502 },
    )
  }

  const sequencerSlug = SEQUENCER_SLUG_MAP[magnetSlug] ?? magnetSlug
  const idempotencyKey = `${email}:${sequencerSlug}`
  const firstName = cleanString(body?.firstName)
  const source = cleanString(body?.source) ?? 'exit-popup'
  const sourcePath = cleanString(body?.sourcePath)

  let parsed: unknown
  try {
    parsed = await callSequencerJson(
      config,
      `/api/v1/lead-magnets/${sequencerSlug}/download`,
      {
        email,
        first_name: firstName,
        source,
        utm: { source_path: sourcePath },
      },
      { 'Idempotency-Key': idempotencyKey },
    )
  } catch (err) {
    console.error('[lead-magnet] Sequencer download call failed:', err)
    return json(
      { success: false, error: 'Sequencer unavailable. Please try again.' },
      { status: 502 },
    )
  }

  const assetUrl =
    parsed !== null &&
    typeof parsed === 'object' &&
    'asset_url' in parsed &&
    typeof (parsed as Record<string, unknown>)['asset_url'] === 'string'
      ? (parsed as Record<string, unknown>)['asset_url']
      : null

  if (!assetUrl) {
    console.error('[lead-magnet] Sequencer response missing asset_url:', JSON.stringify(parsed))
    return json(
      { success: false, error: 'Sequencer did not return a download URL.' },
      { status: 502 },
    )
  }

  return json({ success: true, downloadUrl: assetUrl, emailed: true })
}

async function callSequencer(
  env: Env,
  path: string,
  body: Record<string, unknown>,
): Promise<boolean> {
  const config = getSequencerConfig(env)
  if (!config) {
    return false
  }
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Access-Client-Id': config.clientId,
      'CF-Access-Client-Secret': config.clientSecret,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const responseBody = await response.text().catch(() => '')
    throw new Error(
      `Sequencer request failed: ${response.status} ${response.statusText} ${responseBody}`.trim(),
    )
  }
  return true
}

async function enrollSequencer(env: Env, lead: MarketingLead, body: CaptureBody): Promise<boolean> {
  const metadata = {
    source: body.source ?? null,
    eventType: body.event_type ?? null,
    magnetSlug: body.magnet_slug ?? null,
    toolSlug: body.tool_slug ?? null,
    company: lead.company ?? null,
    utm: body.utm ?? {},
    payload: body.payload ?? {},
  }
  await callSequencer(env, '/api/v1/contacts', {
    email: lead.email,
    product: PRODUCT_ID,
    properties: metadata,
  })
  return callSequencer(env, '/api/v1/enrollments', {
    email: lead.email,
    product: PRODUCT_ID,
    sequence_slug: SEQUENCER_SEQUENCE_SLUG,
    source: `marketing:${lead.id}`,
    properties: metadata,
  })
}

async function unsubscribeSequencer(env: Env, lead: MarketingLead): Promise<boolean> {
  return callSequencer(env, '/api/v1/unsubscribe', {
    email: lead.email,
    product: PRODUCT_ID,
    reason: `lextract-marketing-data-worker:${lead.id}`,
  })
}

async function insertEvent(
  env: Env,
  leadId: string,
  body: CaptureBody,
  now: string,
): Promise<boolean> {
  const eventType = body.event_type ?? ''
  const magnetSlug = cleanString(body.magnet_slug)
  const toolSlug = cleanString(body.tool_slug)

  const result = await env.MARKETING_DB.prepare(
    `INSERT OR IGNORE INTO marketing_events (
      id, lead_id, event_type, source, magnet_slug, tool_slug,
      utm_json, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      leadId,
      eventType,
      cleanString(body.source),
      magnetSlug,
      toolSlug,
      stringifyObject(body.utm),
      stringifyObject(body.payload),
      now,
    )
    .run()
  return result.meta?.changes !== 0
}
function htmlEmail(title: string, bodyHtml: string, unsubscribeUrl?: string): string {
  const footer = getEmailFooterCopy()
  const unsubscribeHtml = unsubscribeUrl
    ? `<p><a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748b">${escapeHtml(
        footer.unsubscribe,
      )}</a></p>`
    : ''
  return [
    '<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">',
    `<h1 style="font-size:20px">${escapeHtml(title)}</h1>`,
    `<p>${bodyHtml}</p>`,
    `<p>${escapeHtml(getProductOneLine())}</p>`,
    `<p>${escapeHtml(footer.support)}</p>`,
    unsubscribeHtml,
    '</body></html>',
  ].join('')
}

async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string,
): Promise<string | null> {
  if (!env.RESEND_API_KEY) {
    return null
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getSenderFallback(),
      to: [to],
      subject,
      html,
    }),
  })
  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}`)
  }
  const data = (await response.json().catch(() => ({}))) as { id?: string }
  return data.id ?? null
}

async function maybeSendLeadMagnetDelivery(
  env: Env,
  body: CaptureBody,
  lead: MarketingLead,
): Promise<string | null> {
  if (!body.send_delivery_email || !body.magnet_slug) {
    return null
  }
  const downloadUrl = normalizeDownloadUrl(
    cleanString(body.download_url) ?? `${SITE_URL}/templates`,
  )
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?id=${lead.id}`
  const greetingName = lead.first_name?.trim() ? ` ${lead.first_name.trim()}` : ''
  const subject = getLeadMagnetDeliverySubject(body.magnet_slug)

  const template = getDeliveryTemplate(body.magnet_slug, 0)
  const htmlBody = template
    ? renderTemplate(template, {
        logo_url: BRAND_LOGO_URL,
        greeting_name: escapeHtml(greetingName),
        delivery_body_html: renderTransactionalBodyTemplate(
          'lead-magnet-delivery',
          'htmlTemplate',
          {
            download_url: escapeHtml(downloadUrl),
          },
        ),
        download_url: escapeHtml(downloadUrl),
        unsubscribe_url: escapeHtml(unsubscribeUrl),
        site_url: SITE_URL,
        email_footer_unsubscribe: escapeHtml(getEmailFooterCopy().unsubscribe),
        email_footer_support: escapeHtml(getEmailFooterCopy().support),
      })
    : htmlEmail(
        subject,
        renderTransactionalBodyTemplate('lead-magnet-delivery', 'htmlTemplate', {
          download_url: escapeHtml(downloadUrl),
        }),
        unsubscribeUrl,
      )

  return sendEmail(env, lead.email, subject, htmlBody)
}

async function handleCapture(request: Request, env: Env): Promise<Response> {
  if (!isAuthorized(request, env)) {
    return unauthorized()
  }
  const body = await readJson<CaptureBody>(request)
  const email = normalizeEmail(body?.email)
  const eventType = cleanString(body?.event_type)
  if (!body || !email || !eventType || !VALID_EVENT_TYPES.has(eventType)) {
    return json({ success: false, error: 'Invalid capture payload.' }, { status: 400 })
  }
  if (body.magnet_slug && !VALID_MAGNETS.has(body.magnet_slug)) {
    return json({ success: false, error: 'Invalid magnet_slug.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const normalizedBody = { ...body, event_type: eventType }
  const lead = await upsertLead(env, normalizedBody, email, now)
  const isNewEvent = await insertEvent(env, lead.id, normalizedBody, now)
  let messageId: string | null = null
  if (isNewEvent) {
    await enrollSequencer(env, lead, normalizedBody)
    messageId = await maybeSendLeadMagnetDelivery(env, normalizedBody, lead)
  }

  return json({ success: true, leadId: lead.id, messageId })
}

async function handleUnsubscribe(request: Request, env: Env): Promise<Response> {
  if (!isAuthorized(request, env)) {
    return unauthorized()
  }
  const body = await readJson<UnsubscribeBody>(request)
  const leadId = cleanString(body?.lead_id)
  if (!leadId) {
    return json({ success: false, error: 'lead_id is required.' }, { status: 400 })
  }
  const lead = await env.MARKETING_DB.prepare(
    'SELECT * FROM marketing_leads WHERE id = ? LIMIT 1',
  )
    .bind(leadId)
    .first<MarketingLead>()
  if (!lead) {
    return json({ success: false, error: 'Lead not found.' }, { status: 404 })
  }

  const now = new Date().toISOString()
  await env.MARKETING_DB.prepare(
    'UPDATE marketing_leads SET unsubscribed_at = ?, updated_at = ? WHERE id = ?',
  )
    .bind(now, now, leadId)
    .run()
  await unsubscribeSequencer(env, lead)
  return json({ success: true })
}

async function handleFetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === 'GET' && url.pathname === '/health') {
    return json({ ok: true })
  }
  if (request.method === 'POST' && url.pathname === '/capture') {
    return handleCapture(request, env)
  }
  if (request.method === 'POST' && url.pathname === '/unsubscribe') {
    return handleUnsubscribe(request, env)
  }
  if (request.method === 'POST' && url.pathname === '/lead-magnet') {
    return handleLeadMagnet(request, env)
  }
  return json({ success: false, error: 'Not found' }, { status: 404 })
}

export default {
  fetch: handleFetch,
}
