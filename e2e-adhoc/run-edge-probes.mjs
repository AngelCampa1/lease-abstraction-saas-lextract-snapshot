import { chromium } from 'playwright'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const envPath = path.join(repoRoot, '.env.e2e.local')

function readEnv() {
  const env = {}
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }
  return env
}

function mustEnv(env, key) {
  const value = env[key]
  if (!value) throw new Error(`Missing ${key} in .env.e2e.local`)
  return value
}

async function jsonFetch(url, init = {}) {
  const res = await fetch(url, init)
  let body = null
  try {
    body = await res.json()
  } catch {}
  return { res, body }
}

async function signIn(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  const signInResult = await page.evaluate(
    async ({ baseUrl, email, password }) => {
      const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      return { status: res.status }
    },
    { baseUrl, email, password },
  )
  if (signInResult.status !== 200) throw new Error(`sign-in failed: ${signInResult.status}`)
  const tokenResult = await page.evaluate(async ({ baseUrl }) => {
    const res = await fetch(`${baseUrl}/api/auth/token`, { credentials: 'include' })
    let body = null
    try {
      body = await res.json()
    } catch {}
    return { status: res.status, token: body?.token ?? null }
  }, { baseUrl })
  if (tokenResult.status !== 200 || typeof tokenResult.token !== 'string') {
    throw new Error(`token fetch failed: ${tokenResult.status}`)
  }
  return tokenResult.token
}

function tinyValidPdf(pageCount = 1) {
  const pages = Array.from({ length: pageCount }, (_, index) => `${index + 1} 0 obj
<< /Type /Page >>
endobj`).join('\n')
  return new TextEncoder().encode(`%PDF-1.7
${pages}
%%EOF`)
}

async function upload(apiBase, token, file) {
  const form = new FormData()
  if (file) form.append('file', file)
  return jsonFetch(`${apiBase}/extractions/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
}

function caseResult(name, actual, expectedStatuses) {
  const ok = expectedStatuses.includes(actual.status)
  return {
    name,
    ok,
    status: actual.status,
    expectedStatuses,
    detail: actual.body?.detail ?? actual.body?.message ?? null,
  }
}

async function main() {
  const env = readEnv()
  const baseUrl = mustEnv(env, 'LEXTRACT_E2E_BASE_URL').replace(/\/$/, '')
  const email = mustEnv(env, 'LEXTRACT_E2E_EMAIL')
  const password = mustEnv(env, 'LEXTRACT_E2E_PASSWORD')
  const apiBase = env.LEXTRACT_E2E_API_URL ?? 'https://api.lextract.io/api/v1'

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    const token = await signIn(page, baseUrl, email, password)
    const results = []

    const missingAuth = await jsonFetch(`${apiBase}/payments/credits`)
    results.push(caseResult('missing auth credits', {
      status: missingAuth.res.status,
      body: missingAuth.body,
    }, [401]))

    const invalidToken = await jsonFetch(`${apiBase}/user/profile`, {
      headers: { Authorization: 'Bearer invalid-token' },
    })
    results.push(caseResult('invalid bearer profile', {
      status: invalidToken.res.status,
      body: invalidToken.body,
    }, [401]))

    const missingFile = await upload(apiBase, token, null)
    results.push(caseResult('upload missing file', {
      status: missingFile.res.status,
      body: missingFile.body,
    }, [400]))

    const wrongType = await upload(
      apiBase,
      token,
      new File([new TextEncoder().encode('hello')], 'lease.txt', { type: 'text/plain' }),
    )
    results.push(caseResult('upload wrong content type', {
      status: wrongType.res.status,
      body: wrongType.body,
    }, [400]))

    const fakePdf = await upload(
      apiBase,
      token,
      new File([new TextEncoder().encode('not a real pdf')], 'fake.pdf', { type: 'application/pdf' }),
    )
    results.push(caseResult('upload fake pdf bytes', {
      status: fakePdf.res.status,
      body: fakePdf.body,
    }, [400]))

    const overPageLimit = await upload(
      apiBase,
      token,
      new File([tinyValidPdf(501)], 'too-many-pages.pdf', { type: 'application/pdf' }),
    )
    results.push(caseResult('upload over page limit', {
      status: overPageLimit.res.status,
      body: overPageLimit.body,
    }, [422]))

    const oversized = await upload(
      apiBase,
      token,
      new File([new Uint8Array(50 * 1024 * 1024 + 1).fill(37)], 'too-large.pdf', {
        type: 'application/pdf',
      }),
    )
    results.push(caseResult('upload over size limit', {
      status: oversized.res.status,
      body: oversized.body,
    }, [400, 413]))

    const unknownStatus = await jsonFetch(`${apiBase}/extractions/00000000-0000-4000-8000-000000000000/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    results.push(caseResult('unknown extraction status', {
      status: unknownStatus.res.status,
      body: unknownStatus.body,
    }, [404]))

    for (const result of results) console.log(JSON.stringify(result))
    console.log(`summary=${JSON.stringify(results)}`)
    if (results.some((result) => !result.ok)) process.exitCode = 1
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
