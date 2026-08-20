import { createConfiguredDb } from '../repositories/db'
import type { DbPoolLike } from '../repositories/db'
import { sendEmail } from '../services/resend'
import type { EmailSendInput, EmailSendResult } from '../services/resend'
import type { Env } from '../types'

const CAMAUDIT_URL = 'https://partner.camaudit.io'

export type EmailQueueMessage =
  | { kind: 'extraction-complete'; extractionId: string }
  | { kind: 'cam-flags'; extractionId: string }
  | { kind: 'anonymous-notify'; extractionId: string }

export interface EmailConsumerDependencies {
  createDb?: (env: Env) => DbPoolLike
  sendEmail?: (input: EmailSendInput, env: Env) => Promise<EmailSendResult>
}

interface CompleteEmailRow {
  document_filename: string
  extracted_data: Record<string, unknown> | null
  overall_confidence: number | string | null
  user_email: string | null
  user_id: string | null
}

interface CamFlagsEmailRow {
  document_filename: string
  red_flags: readonly Record<string, unknown>[] | null
  show_camaudit: boolean | null
  user_email: string | null
  user_id: string | null
}

interface AnonymousNotifyRow {
  anonymous_session_id: string | null
  document_filename: string
  notify_email: string | null
  user_id: string | null
}

interface SessionTokenRow {
  session_token: string | null
}

function query(pool: DbPoolLike): NonNullable<DbPoolLike['query']> {
  if (!pool.query) {
    throw new Error('Database pool does not support query')
  }
  return pool.query.bind(pool)
}

function configuredDb(dependencies: EmailConsumerDependencies, env: Env): DbPoolLike {
  return dependencies.createDb?.(env) ?? createConfiguredDb(env)
}

function fieldCount(value: Record<string, unknown> | null): number {
  return value === null ? 0 : Object.keys(value).length
}

function confidenceSummary(value: number | string | null): string {
  if (value === null) {
    return 'N/A'
  }
  const numeric = Number(value)
  return Number.isFinite(numeric)
    ? `${Math.round(numeric * 100)}% overall confidence`
    : 'N/A'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function resultUrl(env: Env, extractionId: string, sessionToken?: string): string {
  const base = `${env.FRONTEND_URL.replace(/\/+$/u, '')}/results/${extractionId}`
  return sessionToken === undefined
    ? base
    : `${base}?${new URLSearchParams({ session_token: sessionToken }).toString()}`
}

function extractionCompletePayload(
  row: CompleteEmailRow,
  env: Env,
  extractionId: string,
): EmailSendInput {
  const count = fieldCount(row.extracted_data)
  const confidence = confidenceSummary(row.overall_confidence)
  const url = resultUrl(env, extractionId)
  const documentName = escapeHtml(row.document_filename)
  return {
    html: `<p>Your lease extraction is ready for ${documentName}.</p><p><a href="${url}">View results</a></p>`,
    subject: 'Your lease extraction is ready',
    text: [
      `Your lease extraction is ready - ${row.document_filename}`,
      '',
      `Fields extracted: ${count}`,
      `Confidence: ${confidence}`,
      '',
      `View results: ${url}`,
      `Manage email preferences: ${env.FRONTEND_URL}/settings/notifications`,
    ].join('\n'),
    to: [row.user_email ?? ''],
  }
}

function camFlagsPayload(row: CamFlagsEmailRow, env: Env): EmailSendInput {
  const flags = row.red_flags ?? []
  const names = flags.map((flag) =>
    typeof flag.name === 'string' ? flag.name : 'Unknown flag',
  )
  const documentName = escapeHtml(row.document_filename)
  return {
    html: `<p>${flags.length} potential CAM issues found in ${documentName}.</p><p><a href="${CAMAUDIT_URL}">Review CAM recovery options</a></p>`,
    subject: `${flags.length} potential CAM issues found`,
    text: [
      `${flags.length} potential issues found in ${row.document_filename}`,
      '',
      'Red flags detected:',
      ...names.map((name) => `  - ${name}`),
      '',
      `Review CAM recovery options with CAMAudit: ${CAMAUDIT_URL}`,
      `Manage email preferences: ${env.FRONTEND_URL}/settings/notifications`,
    ].join('\n'),
    to: [row.user_email ?? ''],
  }
}

function anonymousNotifyPayload(
  row: AnonymousNotifyRow,
  env: Env,
  extractionId: string,
  sessionToken?: string,
): EmailSendInput {
  const url = resultUrl(env, extractionId, sessionToken)
  const documentName = escapeHtml(row.document_filename)
  return {
    html: `<p>Your Lextract results are ready for ${documentName}.</p><p><a href="${url}">View your results</a></p>`,
    subject: 'Your Lextract results are ready',
    text: [
      `Your Lextract results are ready for ${row.document_filename}.`,
      '',
      `View your results: ${url}`,
    ].join('\n'),
    to: [row.notify_email ?? ''],
  }
}

function isEmailMessage(value: unknown): value is EmailQueueMessage {
  if (typeof value !== 'object' || value === null || !('kind' in value)) {
    return false
  }
  const message = value as { extractionId?: unknown; kind?: unknown }
  return (
    typeof message.extractionId === 'string' &&
    (message.kind === 'extraction-complete' ||
      message.kind === 'cam-flags' ||
      message.kind === 'anonymous-notify')
  )
}

export async function sendExtractionCompleteEmail(
  extractionId: string,
  env: Env,
  dependencies: EmailConsumerDependencies = {},
): Promise<boolean> {
  const pool = configuredDb(dependencies, env)
  try {
    const rows = await query(pool)<CompleteEmailRow>(
      `SELECT e.user_id, e.document_filename, e.overall_confidence,
              e.extracted_data, u.email AS user_email
       FROM extractions e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.id = $1
       LIMIT 1`,
      [extractionId],
    )
    const row = rows.rows[0]
    if (row === undefined || !row.user_id || !row.user_email) {
      return false
    }
    await (dependencies.sendEmail ?? sendEmail)(
      extractionCompletePayload(row, env, extractionId),
      env,
    )
    return true
  } finally {
    await pool.end()
  }
}

export async function sendCamFlagsEmail(
  extractionId: string,
  env: Env,
  dependencies: EmailConsumerDependencies = {},
): Promise<boolean> {
  const pool = configuredDb(dependencies, env)
  try {
    const rows = await query(pool)<CamFlagsEmailRow>(
      `SELECT e.user_id, e.document_filename, e.show_camaudit,
              e.red_flags, u.email AS user_email
       FROM extractions e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.id = $1
       LIMIT 1`,
      [extractionId],
    )
    const row = rows.rows[0]
    const redFlags = row?.red_flags ?? []
    if (
      row === undefined ||
      !row.user_id ||
      !row.user_email ||
      row.show_camaudit !== true ||
      redFlags.length === 0
    ) {
      return false
    }
    await (dependencies.sendEmail ?? sendEmail)(camFlagsPayload(row, env), env)
    return true
  } finally {
    await pool.end()
  }
}

export async function sendAnonymousNotifyEmail(
  extractionId: string,
  env: Env,
  dependencies: EmailConsumerDependencies = {},
): Promise<boolean> {
  const pool = configuredDb(dependencies, env)
  try {
    const rows = await query(pool)<AnonymousNotifyRow>(
      `SELECT user_id, notify_email, anonymous_session_id, document_filename
       FROM extractions
       WHERE id = $1
       LIMIT 1`,
      [extractionId],
    )
    const row = rows.rows[0]
    if (row === undefined || row.user_id !== null || !row.notify_email) {
      return false
    }
    let sessionToken: string | undefined
    if (row.anonymous_session_id !== null) {
      const sessions = await query(pool)<SessionTokenRow>(
        `SELECT session_token
         FROM anonymous_sessions
         WHERE id = $1
         LIMIT 1`,
        [row.anonymous_session_id],
      )
      const token = sessions.rows[0]?.session_token
      sessionToken = typeof token === 'string' && token.length > 0 ? token : undefined
    }
    await (dependencies.sendEmail ?? sendEmail)(
      anonymousNotifyPayload(row, env, extractionId, sessionToken),
      env,
    )
    return true
  } finally {
    await pool.end()
  }
}

export async function handleEmailBatch(
  batch: MessageBatch,
  env: Env,
  dependencies: EmailConsumerDependencies = {},
): Promise<void> {
  for (const message of batch.messages) {
    if (!isEmailMessage(message.body)) {
      message.ack()
      continue
    }
    if (message.body.kind === 'extraction-complete') {
      await sendExtractionCompleteEmail(message.body.extractionId, env, dependencies)
    } else if (message.body.kind === 'cam-flags') {
      await sendCamFlagsEmail(message.body.extractionId, env, dependencies)
    } else {
      await sendAnonymousNotifyEmail(message.body.extractionId, env, dependencies)
    }
    message.ack()
  }
}
