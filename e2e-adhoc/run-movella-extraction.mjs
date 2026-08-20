import { chromium } from 'playwright'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const envPath = path.join(repoRoot, '.env.e2e.local')
const fixturePath = path.join(
  repoRoot,
  'packages',
  'extract-sdk',
  'tests',
  'fixtures',
  'real-leases',
  '03_office_movella.htm',
)
const outputDir = path.join(repoRoot, 'e2e-artifacts', 'prod')
const pdfPath = path.join(outputDir, 'movella-prod-rerun.pdf')

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
  } catch {
    body = null
  }
  return { res, body }
}

function fieldValue(teaser, name) {
  return teaser.visible_fields.find((field) => field.field_name === name)?.value ?? null
}

async function main() {
  const env = readEnv()
  const baseUrl = mustEnv(env, 'LEXTRACT_E2E_BASE_URL').replace(/\/$/, '')
  const email = mustEnv(env, 'LEXTRACT_E2E_EMAIL')
  const password = mustEnv(env, 'LEXTRACT_E2E_PASSWORD')
  const apiBase = env.LEXTRACT_E2E_API_URL ?? 'https://api.lextract.io/api/v1'

  fs.mkdirSync(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    const html = fs.readFileSync(fixturePath, 'utf8')
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    await page.pdf({
      format: 'Letter',
      margin: { top: '0.35in', right: '0.35in', bottom: '0.35in', left: '0.35in' },
      path: pdfPath,
      printBackground: true,
    })
    const pdfBytes = fs.readFileSync(pdfPath)

    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const signIn = await page.evaluate(
      async ({ baseUrl, email, password }) => {
        const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        })
        let body = null
        try {
          body = await res.json()
        } catch {}
        return { status: res.status, hasToken: typeof body?.token === 'string' }
      },
      { baseUrl, email, password },
    )
    console.log(`signIn=${signIn.status} hasToken=${signIn.hasToken}`)
    if (signIn.status !== 200) throw new Error('sign-in failed')

    const tokenResult = await page.evaluate(async ({ baseUrl }) => {
      const res = await fetch(`${baseUrl}/api/auth/token`, { credentials: 'include' })
      let body = null
      try {
        body = await res.json()
      } catch {}
      return { status: res.status, token: body?.token ?? null }
    }, { baseUrl })
    console.log(`token=${tokenResult.status} hasToken=${typeof tokenResult.token === 'string'}`)
    if (tokenResult.status !== 200 || typeof tokenResult.token !== 'string') {
      throw new Error('token fetch failed')
    }

    const form = new FormData()
    form.append(
      'file',
      new File([pdfBytes], 'movella-prod-rerun.pdf', { type: 'application/pdf' }),
    )
    const upload = await jsonFetch(`${apiBase}/extractions/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenResult.token}` },
      body: form,
    })
    console.log(`upload=${upload.res.status} extraction=${upload.body?.extraction_id ?? 'none'}`)
    if (upload.res.status !== 201) throw new Error(`upload failed: ${JSON.stringify(upload.body)}`)
    const extractionId = upload.body.extraction_id

    try {
      let statusBody = null
      for (let attempt = 1; attempt <= 60; attempt += 1) {
        const status = await jsonFetch(`${apiBase}/extractions/${extractionId}/status`, {
          headers: { Authorization: `Bearer ${tokenResult.token}` },
        })
        statusBody = status.body
        console.log(`poll=${attempt} status=${status.res.status}:${statusBody?.status}`)
        if (statusBody?.status === 'complete' || statusBody?.status === 'failed') break
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
      if (statusBody?.status !== 'complete') {
        throw new Error(`terminal status was ${statusBody?.status ?? 'unknown'}`)
      }

      const teaser = await jsonFetch(`${apiBase}/extractions/${extractionId}/teaser`, {
        headers: { Authorization: `Bearer ${tokenResult.token}` },
      })
      console.log(`teaser=${teaser.res.status} total=${teaser.body?.total_field_count ?? 'unknown'}`)
      console.log(`landlord=${fieldValue(teaser.body, 'landlord_legal_name')}`)
      console.log(`tenant=${fieldValue(teaser.body, 'tenant_legal_name')}`)
      console.log(`premises=${fieldValue(teaser.body, 'premises_address')}`)
      console.log(`commencement=${fieldValue(teaser.body, 'commencement_date')}`)
      console.log(`baseRentAnnual=${fieldValue(teaser.body, 'base_rent_annual')}`)
      console.log(`redFlags=${teaser.body?.red_flag_count ?? 'unknown'}`)

      const full = await jsonFetch(`${apiBase}/extractions/${extractionId}`, {
        headers: { Authorization: `Bearer ${tokenResult.token}` },
      })
      console.log(`full=${full.res.status}`)
    } finally {
      const del = await fetch(`${apiBase}/extractions/${extractionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenResult.token}` },
      })
      console.log(`delete=${del.status}`)
      const postDelete = await fetch(`${apiBase}/extractions/${extractionId}/status`, {
        headers: { Authorization: `Bearer ${tokenResult.token}` },
      })
      console.log(`postDeleteStatus=${postDelete.status}`)
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
