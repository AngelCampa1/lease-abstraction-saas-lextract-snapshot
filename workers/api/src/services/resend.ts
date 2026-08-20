import type { Env } from '../types'

export interface EmailSendInput {
  from?: string
  to: readonly string[]
  subject: string
  html: string
  text: string
}

export interface EmailSendResult {
  id: string
}

export async function sendEmail(
  input: EmailSendInput,
  env: Env,
  fetchImpl: typeof fetch = fetch,
): Promise<EmailSendResult> {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required')
  }
  const response = await fetchImpl('https://api.resend.com/emails', {
    body: JSON.stringify({
      from: input.from ?? env.RESEND_FROM_ADDRESS ?? 'Lextract <hello@lextract.io>',
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to,
    }),
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Resend request failed with status ${response.status}`)
  }
  const data = (await response.json()) as { id?: unknown }
  return { id: typeof data.id === 'string' ? data.id : '' }
}
