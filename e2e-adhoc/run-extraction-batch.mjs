import { chromium } from 'playwright'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const envPath = path.join(repoRoot, '.env.e2e.local')
const fixturesDir = path.join(
  repoRoot,
  'packages',
  'extract-sdk',
  'tests',
  'fixtures',
  'real-leases',
)
const outputDir = path.join(repoRoot, 'e2e-artifacts', 'prod')

const CASES = [
  {
    id: 'movella_cobot_office',
    filename: '03_office_movella.htm',
    expectedTenant: /movella/i,
    expectedLandlord: /incubator/i,
  },
  {
    id: 'northann_warehouse',
    filename: '06_warehouse_northann.htm',
    expectedTenant: /northann/i,
    expectedLandlord: /sky sc/i,
  },
  {
    id: 'oysterpoint_nnn',
    filename: '10_nnn_oysterpoint.htm',
    expectedTenant: /pliant/i,
    expectedLandlord: /hcp/i,
  },
  {
    id: 'intevac_amendment',
    filename: '22_amendment_intevac.htm',
    expectedTenant: /intevac/i,
    expectedLandlord: /hgit/i,
  },
]

const MORE_CASES = [
  {
    id: 'ground_lease_salvation_army',
    filename: '12_ground_lease.htm',
    expectedTenant: /impossible math/i,
    expectedLandlord: /salvation army/i,
  },
  {
    id: 'sublease_nyc_zixcorp',
    filename: '20_sublease_nyc.htm',
    expectedTenant: /zixcorp/i,
    expectedLandlord: /intelligent photonics|elk/i,
  },
  {
    id: 'sublease_infoblox',
    filename: '19_sublease_commercial.htm',
    expectedTenant: /infoblox/i,
    expectedLandlord: /blue coat|sunnyvale/i,
  },
  {
    id: 'amendment_nve',
    filename: '21_amendment_nve.htm',
    expectedTenant: /nve/i,
    expectedLandlord: /gre|bryant lake/i,
  },
  {
    id: 'retail_trees_corp',
    filename: '15_retail_trees_corp.htm',
    expectedTenant: /beddor|chronic therapy/i,
    expectedLandlord: /streamline/i,
  },
  {
    id: 'retail_atx',
    filename: '16_retail_commercial.htm',
    expectedTenant: /atx/i,
    expectedLandlord: /freeport/i,
  },
  {
    id: 'datacenter_danger',
    filename: '17_datacenter_turnkey.htm',
    expectedTenant: /danger/i,
    expectedLandlord: /digital phoenix/i,
  },
  {
    id: 'specialty_broken_arrow',
    filename: '18_specialty_nnn.htm',
    expectedTenant: /broken arrow/i,
    expectedLandlord: /chino valley/i,
  },
  {
    id: 'massive_reit_ta',
    filename: '13_ground_svc_reit.htm',
    expectedTenant: /ta operating|travelcenters/i,
    expectedLandlord: /service properties|svc|hpt/i,
  },
]

const RUN_SET = process.argv.includes('--more') ? MORE_CASES : CASES
const SINGLE_CASE = process.argv.find((arg) => arg.startsWith('--case='))?.slice('--case='.length)
const ACTIVE_CASES =
  SINGLE_CASE === undefined
    ? RUN_SET
    : [...CASES, ...MORE_CASES].filter((testCase) => testCase.id === SINGLE_CASE)
const MAX_POLLS = process.argv.includes('--long') ? 180 : 75
const KEEP_FAILED = process.argv.includes('--keep-failed')

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
  return teaser?.visible_fields?.find((field) => field.field_name === name)?.value ?? null
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
      let body = null
      try {
        body = await res.json()
      } catch {}
      return { status: res.status, hasToken: typeof body?.token === 'string' }
    },
    { baseUrl, email, password },
  )
  if (signInResult.status !== 200) {
    throw new Error(`sign-in failed: ${signInResult.status}`)
  }
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

async function htmlToPdf(page, testCase) {
  const html = fs.readFileSync(path.join(fixturesDir, testCase.filename), 'utf8')
  const pdfPath = path.join(outputDir, `${testCase.id}.pdf`)
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  await page.pdf({
    format: 'Letter',
    margin: { top: '0.35in', right: '0.35in', bottom: '0.35in', left: '0.35in' },
    path: pdfPath,
    printBackground: true,
  })
  return { bytes: fs.readFileSync(pdfPath), pdfPath }
}

async function runCase(page, apiBase, token, testCase) {
  const { bytes, pdfPath } = await htmlToPdf(page, testCase)
  const form = new FormData()
  form.append('file', new File([bytes], `${testCase.id}.pdf`, { type: 'application/pdf' }))

  const upload = await jsonFetch(`${apiBase}/extractions/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (upload.res.status !== 201) {
    return {
      id: testCase.id,
      ok: false,
      pdfPath,
      uploadStatus: upload.res.status,
      error: JSON.stringify(upload.body),
    }
  }

  const extractionId = upload.body.extraction_id
  try {
    let statusBody = null
    for (let attempt = 1; attempt <= MAX_POLLS; attempt += 1) {
      const status = await jsonFetch(`${apiBase}/extractions/${extractionId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      statusBody = status.body
      if (statusBody?.status === 'complete' || statusBody?.status === 'failed') break
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
    if (statusBody?.status !== 'complete') {
      return {
        id: testCase.id,
        ok: false,
        extractionId,
        pdfPath,
        terminalStatus: statusBody?.status ?? 'unknown',
        errorMessage: statusBody?.error_message ?? null,
      }
    }

    const teaser = await jsonFetch(`${apiBase}/extractions/${extractionId}/teaser`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const landlord = fieldValue(teaser.body, 'landlord_legal_name')
    const tenant = fieldValue(teaser.body, 'tenant_legal_name')
    const full = await jsonFetch(`${apiBase}/extractions/${extractionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const documentUrl = await jsonFetch(`${apiBase}/extractions/${extractionId}/document-url`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const exportStart = await jsonFetch(`${apiBase}/extractions/${extractionId}/export/xlsx`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const exportDownload = await jsonFetch(`${apiBase}/extractions/${extractionId}/export/xlsx/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const fieldEdit = await jsonFetch(`${apiBase}/extractions/${extractionId}/fields`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ field_name: 'tenant_legal_name', value: tenant ?? 'Edited Tenant' }),
    })
    const result = {
      id: testCase.id,
      ok: true,
      extractionId,
      pdfPath,
      teaserStatus: teaser.res.status,
      totalFields: teaser.body?.total_field_count ?? null,
      landlord,
      tenant,
      premises: fieldValue(teaser.body, 'premises_address'),
      commencement: fieldValue(teaser.body, 'commencement_date'),
      baseRentAnnual: fieldValue(teaser.body, 'base_rent_annual'),
      redFlags: teaser.body?.red_flag_count ?? null,
      fullStatus: full.res.status,
      documentUrlStatus: documentUrl.res.status,
      exportStartStatus: exportStart.res.status,
      exportDownloadStatus: exportDownload.res.status,
      fieldEditStatus: fieldEdit.res.status,
      landlordMatches: typeof landlord === 'string' && testCase.expectedLandlord.test(landlord),
      tenantMatches: typeof tenant === 'string' && testCase.expectedTenant.test(tenant),
    }
    result.expectSeen = result.landlordMatches && result.tenantMatches
    return result
  } finally {
    if (KEEP_FAILED) {
      console.log(`cleanup ${testCase.id}: skipped due to --keep-failed extraction=${extractionId}`)
    } else {
      const del = await fetch(`${apiBase}/extractions/${extractionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const postDelete = await fetch(`${apiBase}/extractions/${extractionId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log(`cleanup ${testCase.id}: delete=${del.status} postDelete=${postDelete.status}`)
    }
  }
}

async function main() {
  const env = readEnv()
  const baseUrl = mustEnv(env, 'LEXTRACT_E2E_BASE_URL').replace(/\/$/, '')
  const email = mustEnv(env, 'LEXTRACT_E2E_EMAIL')
  const password = mustEnv(env, 'LEXTRACT_E2E_PASSWORD')
  const apiBase = env.LEXTRACT_E2E_API_URL ?? 'https://api.lextract.io/api/v1'
  fs.mkdirSync(outputDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    const token = await signIn(page, baseUrl, email, password)
    console.log(`signedIn=true cases=${ACTIVE_CASES.length} maxPolls=${MAX_POLLS}`)
    const results = []
    for (const testCase of ACTIVE_CASES) {
      console.log(`start ${testCase.id}`)
      const result = await runCase(page, apiBase, token, testCase)
      results.push(result)
      console.log(`result ${testCase.id}: ${JSON.stringify(result)}`)
    }
    console.log(`summary=${JSON.stringify(results)}`)
    if (
      results.some(
        (result) =>
          !result.ok ||
          !result.expectSeen ||
          result.fullStatus !== 403 ||
          result.documentUrlStatus !== 403 ||
          result.exportStartStatus !== 403 ||
          result.exportDownloadStatus !== 403 ||
          result.fieldEditStatus !== 403,
      )
    ) {
      process.exitCode = 1
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
