import { afterEach, describe, expect, it } from 'vitest'

import { OpenRouterClient } from '../src/index.js'

describe('OpenRouterClient', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('posts PDF-native chat requests and maps response content and usage', async () => {
    const requests: { url: string; init: RequestInit }[] = []
    const client = new OpenRouterClient({
      apiKey: 'sk-test',
      baseUrl: 'https://openrouter.test/api/v1',
      fetcher: (url, init) => {
        requests.push({ init: init ?? {}, url: String(url) })
        return Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: '{"fields":{}}' } }],
              usage: {
                completion_tokens: 20,
                cost: 0.12,
                prompt_tokens: 10,
              },
            }),
            { headers: { 'Content-Type': 'application/json' } },
          ),
        )
      },
    })

    await expect(
      client.complete({
        fileName: 'lease.pdf',
        model: 'google/gemini',
        passKind: 'pass1',
        pdfBytes: new TextEncoder().encode('%PDF-1.7').buffer,
        prompt: 'extract',
      }),
    ).resolves.toEqual({
      content: '{"fields":{}}',
      costCents: 12,
      inputTokens: 10,
      model: 'google/gemini',
      outputTokens: 20,
    })
    expect(requests[0]?.url).toBe('https://openrouter.test/api/v1/chat/completions')
    expect(requests[0]?.init.headers).toMatchObject({
      Authorization: 'Bearer sk-test',
      'Content-Type': 'application/json',
    })
    const body = JSON.parse(String(requests[0]?.init.body)) as {
      messages: { content: { file?: { file_data?: string } }[] }[]
      model: string
      reasoning?: { effort?: string; exclude?: boolean }
    }
    expect(body.model).toBe('google/gemini')
    expect(body.reasoning).toEqual({ effort: 'low', exclude: true })
    expect(body.messages[0]?.content[1]?.file?.file_data).toContain(
      'data:application/pdf;base64,',
    )
  })

  it('calls the default fetch with the global receiver', async () => {
    const receiverCheckingFetch = function (
      this: typeof globalThis,
      ..._args: Parameters<typeof fetch>
    ): ReturnType<typeof fetch> {
      expect(this).toBe(globalThis)
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"fields":{}}' } }],
            usage: {},
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      )
    } as typeof fetch
    globalThis.fetch = receiverCheckingFetch

    const client = new OpenRouterClient({
      apiKey: 'sk-test',
      baseUrl: 'https://openrouter.test/api/v1',
    })

    await expect(
      client.complete({
        fileName: 'lease.pdf',
        model: 'google/gemini',
        passKind: 'pass1',
        pdfBytes: new ArrayBuffer(1),
        prompt: 'extract',
      }),
    ).resolves.toMatchObject({
      content: '{"fields":{}}',
    })
  })

  it('throws for provider errors and missing content', async () => {
    const failing = new OpenRouterClient({
      apiKey: 'sk-test',
      fetcher: () => Promise.resolve(new Response('bad', { status: 502 })),
    })
    await expect(
      failing.complete({
        fileName: 'lease.pdf',
        model: 'model',
        passKind: 'pass1',
        pdfBytes: new ArrayBuffer(1),
        prompt: 'extract',
      }),
    ).rejects.toThrow('status 502')

    const missingContent = new OpenRouterClient({
      apiKey: 'sk-test',
      fetcher: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ finish_reason: 'length', message: {} }],
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        ),
    })
    await expect(
      missingContent.complete({
        fileName: 'lease.pdf',
        model: 'model',
        passKind: 'pass1',
        pdfBytes: new ArrayBuffer(1),
        prompt: 'extract',
      }),
    ).rejects.toThrow(
      'OpenRouter response did not include message content (body_type=object; has_error=false; error_status=undefined; error_code=undefined; choices=1; finish_reason=length; content_type=undefined)',
    )
  })

  it.each([
    {
      expected:
        'OpenRouter response did not include message content (body_type=object; has_error=false; error_status=undefined; error_code=undefined; choices=1; finish_reason=array; content_type=object)',
      finishReason: ['tenant text or secret'],
    },
    {
      expected:
        'OpenRouter response did not include message content (body_type=object; has_error=false; error_status=undefined; error_code=undefined; choices=1; finish_reason=empty; content_type=object)',
      finishReason: '',
    },
    {
      expected:
        'OpenRouter response did not include message content (body_type=object; has_error=false; error_status=undefined; error_code=undefined; choices=1; finish_reason=null; content_type=object)',
      finishReason: null,
    },
    {
      expected:
        'OpenRouter response did not include message content (body_type=object; has_error=false; error_status=undefined; error_code=undefined; choices=1; finish_reason=undefined; content_type=object)',
      finishReason: undefined,
    },
    {
      expected:
        'OpenRouter response did not include message content (body_type=object; has_error=false; error_status=undefined; error_code=undefined; choices=1; finish_reason=unknown_string; content_type=object)',
      finishReason: 'tenant_source_text',
    },
  ])(
    'classifies malformed missing-content detail $finishReason without echoing provider data',
    async ({ expected, finishReason }) => {
      const client = new OpenRouterClient({
        apiKey: 'sk-test',
        fetcher: () =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                choices: [
                  {
                    finish_reason: finishReason,
                    message: { content: { raw: 'provider text' } },
                  },
                ],
              }),
              {
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          ),
      })

      await expect(
        client.complete({
          fileName: 'lease.pdf',
          model: 'model',
          passKind: 'pass1',
          pdfBytes: new ArrayBuffer(1),
          prompt: 'extract',
        }),
      ).rejects.toThrow(expected)
    },
  )

  it('classifies non-array choices without echoing provider data', async () => {
    const client = new OpenRouterClient({
      apiKey: 'sk-test',
      fetcher: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              choices: { length: 'raw provider text or secret' },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        ),
    })

    await expect(
      client.complete({
        fileName: 'lease.pdf',
        model: 'model',
        passKind: 'pass1',
        pdfBytes: new ArrayBuffer(1),
        prompt: 'extract',
      }),
    ).rejects.toThrow(
      'OpenRouter response did not include message content (body_type=object; has_error=false; error_status=undefined; error_code=undefined; choices=non_array; finish_reason=undefined; content_type=undefined)',
    )
  })

  it('does not echo malformed provider JSON in thrown errors', async () => {
    const client = new OpenRouterClient({
      apiKey: 'sk-test',
      fetcher: () =>
        Promise.resolve(
          new Response('{"tenant source text"', {
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
    })

    await expect(
      client.complete({
        fileName: 'lease.pdf',
        model: 'model',
        passKind: 'pass1',
        pdfBytes: new ArrayBuffer(1),
        prompt: 'extract',
      }),
    ).rejects.toThrow('OpenRouter response was not valid JSON')
  })

  it('classifies valid JSON null as missing content', async () => {
    const client = new OpenRouterClient({
      apiKey: 'sk-test',
      fetcher: () =>
        Promise.resolve(
          new Response('null', {
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
    })

    await expect(
      client.complete({
        fileName: 'lease.pdf',
        model: 'model',
        passKind: 'pass1',
        pdfBytes: new ArrayBuffer(1),
        prompt: 'extract',
      }),
    ).rejects.toThrow(
      'OpenRouter response did not include message content (body_type=null; has_error=false; error_status=undefined; error_code=undefined; choices=non_array; finish_reason=undefined; content_type=undefined)',
    )
  })

  it('reports only safe body shape when provider returns an error object without choices', async () => {
    const client = new OpenRouterClient({
      apiKey: 'sk-test',
      fetcher: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: 'context_length_exceeded',
                message: 'tenant source text or secret',
                status: 413,
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        ),
    })

    await expect(
      client.complete({
        fileName: 'lease.pdf',
        model: 'model',
        passKind: 'pass1',
        pdfBytes: new ArrayBuffer(1),
        prompt: 'extract',
      }),
    ).rejects.toThrow(
      'OpenRouter response did not include message content (body_type=object; has_error=true; error_status=413; error_code=context_length_exceeded; choices=non_array; finish_reason=undefined; content_type=undefined)',
    )
  })

  it('classifies unknown provider error codes without echoing them', async () => {
    const client = new OpenRouterClient({
      apiKey: 'sk-test',
      fetcher: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: 'tenant_source_text',
                message: 'provider secret',
                status: 'not-a-number',
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        ),
    })

    await expect(
      client.complete({
        fileName: 'lease.pdf',
        model: 'model',
        passKind: 'pass1',
        pdfBytes: new ArrayBuffer(1),
        prompt: 'extract',
      }),
    ).rejects.toThrow(
      'OpenRouter response did not include message content (body_type=object; has_error=true; error_status=non_number; error_code=unknown_string; choices=non_array; finish_reason=undefined; content_type=undefined)',
    )
  })

  it.each([
    {
      code: undefined,
      expectedCode: 'undefined',
      expectedStatus: 'undefined',
      status: undefined,
    },
    {
      code: ['provider text'],
      expectedCode: 'array',
      expectedStatus: 'non_number',
      status: ['provider status'],
    },
    {
      code: null,
      expectedCode: 'null',
      expectedStatus: 'non_number',
      status: null,
    },
    {
      code: 12,
      expectedCode: '12',
      expectedStatus: 'non_number',
      status: 200.5,
    },
  ])(
    'classifies provider error code $expectedCode and status $expectedStatus',
    async ({ code, expectedCode, expectedStatus, status }) => {
      const client = new OpenRouterClient({
        apiKey: 'sk-test',
        fetcher: () =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                error: { code, status },
              }),
              {
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          ),
      })

      await expect(
        client.complete({
          fileName: 'lease.pdf',
          model: 'model',
          passKind: 'pass1',
          pdfBytes: new ArrayBuffer(1),
          prompt: 'extract',
        }),
      ).rejects.toThrow(
        `OpenRouter response did not include message content (body_type=object; has_error=true; error_status=${expectedStatus}; error_code=${expectedCode}; choices=non_array; finish_reason=undefined; content_type=undefined)`,
      )
    },
  )
})
