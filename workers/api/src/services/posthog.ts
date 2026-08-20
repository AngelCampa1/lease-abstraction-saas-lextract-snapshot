import type { Env } from '../types'

export interface CaptureEventInput {
  distinctId: string
  event: string
  properties: Record<string, unknown>
}

export async function captureBackendEvent(
  _input: CaptureEventInput,
  _env: Env,
): Promise<void> {
  return Promise.resolve()
}
