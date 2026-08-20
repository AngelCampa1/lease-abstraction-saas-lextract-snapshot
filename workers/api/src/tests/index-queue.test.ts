import { describe, expect, it } from 'vitest'

import worker from '../index'
import { routeTestEnv } from './route-test-helpers'

function trackedMessage(body: unknown): { acked(): boolean; message: Message } {
  let acked = false
  return {
    acked: () => acked,
    message: {
      ack() {
        acked = true
      },
      attempts: 1,
      body,
      id: crypto.randomUUID(),
      retry() {},
      timestamp: new Date('2026-06-12T00:00:00.000Z'),
    },
  }
}

function batch(queue: string, messages: readonly Message[]): MessageBatch {
  return {
    ackAll() {},
    messages,
    metadata: {
      metrics: {
        backlogBytes: 0,
        backlogCount: 0,
      },
    },
    queue,
    retryAll() {},
  }
}

describe('worker queue dispatch', () => {
  it('serves fetch requests through the Hono app', async () => {
    // Safe test double: this health request does not use ExecutionContext methods.
    const executionContext = {} as ExecutionContext
    const response = await worker.fetch(
      new Request('https://api.lextract.io/health'),
      routeTestEnv,
      executionContext,
    )

    expect(response.status).toBe(200)
  })

  it('routes email and cleanup queue batches by queue name', async () => {
    const emailMessage = trackedMessage({ kind: 'unknown' })
    const cleanupMessage = trackedMessage(null)

    await worker.queue(batch('lextract-email', [emailMessage.message]), routeTestEnv)
    await worker.queue(
      batch('lextract-cleanup', [cleanupMessage.message]),
      routeTestEnv,
    )

    expect(emailMessage.acked()).toBe(true)
    expect(cleanupMessage.acked()).toBe(true)
  })
})
