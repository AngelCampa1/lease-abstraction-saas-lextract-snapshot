import { describe, expect, it } from 'vitest'

import {
  handleEmailBatch,
  sendAnonymousNotifyEmail,
  sendCamFlagsEmail,
  sendExtractionCompleteEmail,
} from '../queues/email-consumer'
import { sendEmail } from '../services/resend'
import type { EmailSendInput } from '../services/resend'
import type { DbPoolLike, DbQueryResult } from '../repositories/db'
import type { Env } from '../types'
import { routeTestEnv } from './route-test-helpers'

class SequencePool implements DbPoolLike {
  readonly queries: { text: string; values?: readonly unknown[] }[] = []

  constructor(private readonly results: readonly (readonly unknown[])[]) {}

  async end(): Promise<void> {}

  async query<Row>(
    text: string,
    values?: readonly unknown[],
  ): Promise<DbQueryResult<Row>> {
    this.queries.push(values === undefined ? { text } : { text, values })
    const next = this.results[this.queries.length - 1] ?? []
    return { rows: next as Row[] }
  }
}

function message(body: unknown): Message {
  return {
    ack() {},
    attempts: 1,
    body,
    id: crypto.randomUUID(),
    retry() {},
    timestamp: new Date('2026-06-12T00:00:00.000Z'),
  }
}

function batch(messages: readonly Message[]): MessageBatch {
  return {
    ackAll() {},
    messages,
    metadata: {
      metrics: {
        backlogBytes: 0,
        backlogCount: 0,
      },
    },
    queue: 'lextract-email',
    retryAll() {},
  }
}

const env: Env = {
  ...routeTestEnv,
  FRONTEND_URL: 'https://lextract.io',
  RESEND_API_KEY: 're_test',
}

describe('email queue consumer', () => {
  it('sends extraction complete emails from an ID-only queue message', async () => {
    const pool = new SequencePool([
      [
        {
          document_filename: '<lease>.pdf',
          extracted_data: { landlord_legal_name: { value: 'ACME' } },
          overall_confidence: 0.92,
          user_email: 'owner@example.com',
          user_id: 'user-id',
        },
      ],
    ])
    const sent: EmailSendInput[] = []

    await handleEmailBatch(
      batch([message({ extractionId: 'extraction-id', kind: 'extraction-complete' })]),
      env,
      {
        createDb: () => pool,
        sendEmail: (input) => {
          sent.push(input)
          return Promise.resolve({ id: 'msg_1' })
        },
      },
    )

    expect(pool.queries[0]?.values).toEqual(['extraction-id'])
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      subject: 'Your lease extraction is ready',
      to: ['owner@example.com'],
    })
    expect(sent[0]?.text).toContain('92% overall confidence')
    expect(sent[0]?.html).toContain('&lt;lease&gt;.pdf')
    expect(sent[0]?.html).not.toContain('<lease>.pdf')
    expect(sent[0]?.text).toContain('https://lextract.io/results/extraction-id')
  })

  it('sends CAM flag follow-up only when the extraction is eligible', async () => {
    const pool = new SequencePool([
      [
        {
          document_filename: 'lease.pdf',
          red_flags: [{ name: 'Missing CAM cap' }, { name: 'Audit issue' }],
          show_camaudit: true,
          user_email: 'owner@example.com',
          user_id: 'user-id',
        },
      ],
    ])
    const sent: EmailSendInput[] = []

    await handleEmailBatch(
      batch([message({ extractionId: 'extraction-id', kind: 'cam-flags' })]),
      env,
      {
        createDb: () => pool,
        sendEmail: (input) => {
          sent.push(input)
          return Promise.resolve({ id: 'msg_2' })
        },
      },
    )

    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      subject: '2 potential CAM issues found',
      to: ['owner@example.com'],
    })
    expect(sent[0]?.text).toContain('Missing CAM cap')
    expect(sent[0]?.text).toContain('https://partner.camaudit.io')
  })

  it('sends anonymous notify emails with the session token when present', async () => {
    const pool = new SequencePool([
      [
        {
          anonymous_session_id: 'session-id',
          document_filename: 'lease.pdf',
          notify_email: 'guest@example.com',
          user_id: null,
        },
      ],
      [{ session_token: 'session-token' }],
    ])
    const sent: EmailSendInput[] = []

    await handleEmailBatch(
      batch([message({ extractionId: 'extraction-id', kind: 'anonymous-notify' })]),
      env,
      {
        createDb: () => pool,
        sendEmail: (input) => {
          sent.push(input)
          return Promise.resolve({ id: 'msg_3' })
        },
      },
    )

    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      subject: 'Your Lextract results are ready',
      to: ['guest@example.com'],
    })
    expect(sent[0]?.text).toContain(
      'https://lextract.io/results/extraction-id?session_token=session-token',
    )
  })

  it('skips email messages that do not meet delivery preconditions', async () => {
    const noUserPool = new SequencePool([[{ user_id: null, user_email: null }]])
    const noFlagsPool = new SequencePool([
      [
        {
          document_filename: 'lease.pdf',
          red_flags: [],
          show_camaudit: true,
          user_email: 'owner@example.com',
          user_id: 'user-id',
        },
      ],
    ])
    const noNotifyPool = new SequencePool([
      [
        {
          anonymous_session_id: null,
          document_filename: 'lease.pdf',
          notify_email: null,
          user_id: null,
        },
      ],
    ])
    const sent: EmailSendInput[] = []

    await expect(
      sendExtractionCompleteEmail('extraction-id', env, {
        createDb: () => noUserPool,
        sendEmail: (input) => {
          sent.push(input)
          return Promise.resolve({ id: 'msg' })
        },
      }),
    ).resolves.toBe(false)
    await expect(
      sendCamFlagsEmail('extraction-id', env, {
        createDb: () => noFlagsPool,
        sendEmail: (input) => {
          sent.push(input)
          return Promise.resolve({ id: 'msg' })
        },
      }),
    ).resolves.toBe(false)
    await expect(
      sendAnonymousNotifyEmail('extraction-id', env, {
        createDb: () => noNotifyPool,
        sendEmail: (input) => {
          sent.push(input)
          return Promise.resolve({ id: 'msg' })
        },
      }),
    ).resolves.toBe(false)
    await handleEmailBatch(batch([message({ kind: 'unknown' })]), env, {
      createDb: () => noUserPool,
    })

    expect(sent).toEqual([])
  })

  it('sends Resend API payloads and maps adapter errors', async () => {
    const requests: { input: RequestInfo | URL; init: RequestInit | undefined }[] = []
    const okFetch: typeof fetch = (input, init) => {
      requests.push({ input, init })
      return Promise.resolve(Response.json({ id: 'msg_resend' }))
    }
    const failingFetch: typeof fetch = () =>
      Promise.resolve(Response.json({ error: 'bad' }, { status: 500 }))

    await expect(
      sendEmail(
        {
          html: '<p>Hi</p>',
          subject: 'Subject',
          text: 'Hi',
          to: ['owner@example.com'],
        },
        env,
        okFetch,
      ),
    ).resolves.toEqual({ id: 'msg_resend' })
    expect(String(requests[0]?.input)).toBe('https://api.resend.com/emails')
    expect(requests[0]?.init?.headers).toMatchObject({
      Authorization: 'Bearer re_test',
      'Content-Type': 'application/json',
    })
    await expect(
      sendEmail(
        {
          html: '<p>Hi</p>',
          subject: 'Subject',
          text: 'Hi',
          to: ['owner@example.com'],
        },
        { ...routeTestEnv },
        okFetch,
      ),
    ).rejects.toThrow('RESEND_API_KEY is required')
    await expect(
      sendEmail(
        {
          from: 'Ops <ops@example.com>',
          html: '<p>Hi</p>',
          subject: 'Subject',
          text: 'Hi',
          to: ['owner@example.com'],
        },
        env,
        failingFetch,
      ),
    ).rejects.toThrow('Resend request failed')
  })
})
