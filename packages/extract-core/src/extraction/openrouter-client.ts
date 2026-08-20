import type {
  ModelClient,
  ModelCompletionInput,
  ModelCompletionResult,
} from './orchestrator.js'

interface OpenRouterChoice {
  finish_reason?: unknown
  message?: { content?: unknown }
}

interface OpenRouterUsage {
  prompt_tokens?: unknown
  completion_tokens?: unknown
  cost?: unknown
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[]
  usage?: OpenRouterUsage
}

export interface OpenRouterClientOptions {
  apiKey: string
  baseUrl?: string
  fetcher?: typeof fetch
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function toBase64(bytes: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

const SAFE_FINISH_REASONS = new Set([
  'length',
  'stop',
  'content_filter',
  'tool_calls',
  'function_call',
])

const SAFE_ERROR_CODES = new Set([
  'context_length_exceeded',
  'invalid_request_error',
  'rate_limit_exceeded',
  'provider_error',
  'insufficient_quota',
])

interface OpenRouterErrorShape {
  code?: unknown
  status?: unknown
}

function errorShape(body: OpenRouterResponse): OpenRouterErrorShape | null {
  if (
    typeof body === 'object' &&
    body !== null &&
    !Array.isArray(body) &&
    'error' in body &&
    typeof body.error === 'object' &&
    body.error !== null &&
    !Array.isArray(body.error)
  ) {
    return body.error as OpenRouterErrorShape
  }
  return null
}

function safeErrorStatus(value: unknown): string {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return String(value)
  }
  return value === undefined ? 'undefined' : 'non_number'
}

function safeErrorCode(value: unknown): string {
  if (typeof value === 'string') {
    return SAFE_ERROR_CODES.has(value) ? value : 'unknown_string'
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return String(value)
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  if (value === null) {
    return 'null'
  }
  return typeof value
}

function safeFinishReason(value: unknown): string {
  if (typeof value === 'string') {
    if (value.length === 0) {
      return 'empty'
    }
    return SAFE_FINISH_REASONS.has(value) ? value : 'unknown_string'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  if (value === null) {
    return 'null'
  }
  return typeof value
}

function missingContentMessage(body: OpenRouterResponse): string {
  const bodyType = Array.isArray(body)
    ? 'array'
    : body === null
      ? 'null'
      : typeof body
  const hasError =
    typeof body === 'object' && body !== null && !Array.isArray(body) && 'error' in body
      ? 'true'
      : 'false'
  const error = errorShape(body)
  const choices =
    typeof body === 'object' && body !== null && Array.isArray(body.choices)
      ? body.choices
      : null
  const choice = choices?.[0]
  const content = choice?.message?.content
  const contentType = Array.isArray(content) ? 'array' : typeof content
  const choiceCount = choices === null ? 'non_array' : String(choices.length)
  return [
    'OpenRouter response did not include message content',
    `(body_type=${bodyType};`,
    `has_error=${hasError};`,
    `error_status=${safeErrorStatus(error?.status)};`,
    `error_code=${safeErrorCode(error?.code)};`,
    `choices=${choiceCount};`,
    `finish_reason=${safeFinishReason(choice?.finish_reason)};`,
    `content_type=${contentType})`,
  ].join(' ')
}

export class OpenRouterClient implements ModelClient {
  private readonly baseUrl: string
  private readonly fetcher: typeof fetch

  constructor(private readonly options: OpenRouterClientOptions) {
    this.baseUrl = options.baseUrl ?? 'https://openrouter.ai/api/v1'
    this.fetcher = options.fetcher ?? ((...args) => globalThis.fetch(...args))
  }

  async complete(input: ModelCompletionInput): Promise<ModelCompletionResult> {
    const response = await this.fetcher(`${this.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        messages: [
          {
            content: [
              { text: input.prompt, type: 'text' },
              {
                file: {
                  filename: input.fileName,
                  file_data: `data:application/pdf;base64,${toBase64(input.pdfBytes)}`,
                },
                type: 'file',
              },
            ],
            role: 'user',
          },
        ],
        model: input.model,
        reasoning: {
          effort: 'low',
          exclude: true,
        },
      }),
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`OpenRouter request failed with status ${response.status}`)
    }
    let body: OpenRouterResponse
    try {
      body = (await response.json()) as OpenRouterResponse
    } catch {
      throw new Error('OpenRouter response was not valid JSON')
    }
    const choices =
      typeof body === 'object' && body !== null && Array.isArray(body.choices)
        ? body.choices
        : null
    const content = choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new Error(missingContentMessage(body))
    }
    const usage = body.usage ?? {}
    const costDollars = toNumber(usage.cost)
    return {
      content,
      costCents: Math.round(costDollars * 100),
      inputTokens: toNumber(usage.prompt_tokens),
      model: input.model,
      outputTokens: toNumber(usage.completion_tokens),
    }
  }
}
