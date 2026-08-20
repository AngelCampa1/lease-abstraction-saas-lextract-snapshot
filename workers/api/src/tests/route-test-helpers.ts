import type { Env } from '../types'

export const routeTestEnv: Env = {
  ENVIRONMENT: 'test',
  FRONTEND_URL: 'https://lextract.io',
}

export async function jsonBody<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export function bearerRequest(
  path: string,
  init: RequestInit = {},
): Request {
  return new Request(`https://api.lextract.io${path}`, {
    ...init,
    headers: {
      Authorization: 'Bearer valid-jwt',
      ...(init.headers ?? {}),
    },
  })
}
