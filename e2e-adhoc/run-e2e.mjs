/**
 * Throwaway prod E2E for lextract AI-CS widget verification.
 * DO NOT COMMIT — no secrets are printed in output.
 */

import { chromium } from 'playwright'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load env from .env.e2e.local
const envPath = path.join(__dirname, '..', '.env.e2e.local')
const envRaw = fs.readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envRaw.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx < 0) continue
  env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
}

const BASE_URL = env.LEXTRACT_E2E_BASE_URL // https://lextract.io
const EMAIL = env.LEXTRACT_E2E_EMAIL
const PASSWORD = env.LEXTRACT_E2E_PASSWORD

if (!BASE_URL || !EMAIL || !PASSWORD) {
  console.error('FAIL: Missing required env vars in .env.e2e.local')
  process.exit(1)
}

function redact(s) {
  if (!s) return '[empty]'
  return s.slice(0, 4) + '****'
}

console.log('=== Lextract AI-CS Prod E2E ===')
console.log(`Base URL : ${BASE_URL}`)
console.log(`Email    : ${redact(EMAIL)}`)
console.log()

const networkLog = []

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  // ── Track network requests ────────────────────────────────────────────────
  page.on('response', async (resp) => {
    const url = resp.url()
    if (
      url.includes('/api/auth/') ||
      url.includes('/api/ai-cs/') ||
      url.includes('ai-cs-worker') ||
      url.includes('/v1/sessions') ||
      url.includes('/v1/chat')
    ) {
      networkLog.push({ url: url.replace(/https:\/\/[^/]+/, '[origin]'), status: resp.status() })
    }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: Authenticate via the app's own sign-in API proxy
  // ──────────────────────────────────────────────────────────────────────────
  console.log('STEP 1: Sign in via /api/auth/sign-in/email ...')

  // Navigate first so the browser context has the correct origin for cookies
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })

  const signInResp = await page.evaluate(
    async ({ email, password, baseUrl }) => {
      const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      let body
      try {
        body = await res.json()
      } catch {
        body = null
      }
      return { status: res.status, body }
    },
    { email: EMAIL, password: PASSWORD, baseUrl: BASE_URL },
  )

  console.log(`  Sign-in HTTP status: ${signInResp.status}`)

  if (signInResp.status !== 200) {
    console.log('FAIL: Sign-in failed.')
    console.log('  Response body keys:', signInResp.body ? Object.keys(signInResp.body) : 'null')
    await browser.close()
    process.exit(1)
  }

  const hasToken = signInResp.body && typeof signInResp.body.token === 'string' && signInResp.body.token.length > 0
  console.log(`  Sign-in returned token: ${hasToken ? 'YES' : 'NO'}`)
  console.log(`  User id in response: ${signInResp.body?.user?.id ? 'YES' : 'NO'}`)

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: Navigate to an authenticated in-app route (dashboard)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nSTEP 2: Navigate to authenticated dashboard ...')
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  // Wait a bit for client-side hydration / auth redirect
  await page.waitForTimeout(4000)

  const finalUrl = page.url()
  console.log(`  Final URL: ${finalUrl}`)

  const isOnApp = !finalUrl.includes('/login') && !finalUrl.includes('/signup')
  console.log(`  Logged in (not redirected to login): ${isOnApp ? 'YES' : 'NO'}`)

  if (!isOnApp) {
    console.log('FAIL: Redirected to login — session cookie not set correctly.')
    // Try /dashboard with cookies explicitly
    const cookies = await context.cookies()
    console.log(`  Cookies in context: ${cookies.map(c => c.name).join(', ')}`)
    await browser.close()
    process.exit(1)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: Check widget launcher rendered
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nSTEP 3: Check AI-CS widget launcher ...')

  // The launcher has data-aics-launcher attribute
  let launcherVisible = false
  let launcherText = null
  try {
    await page.waitForSelector('[data-aics-launcher]', { timeout: 10000 })
    launcherVisible = true
    launcherText = await page.textContent('[data-aics-launcher]')
    console.log(`  Launcher found: YES`)
    console.log(`  Launcher text: "${launcherText?.trim()}"`)
  } catch {
    console.log('  Launcher found: NO')
    // Try by text content
    try {
      const btn = page.getByRole('button', { name: /get help/i })
      await btn.waitFor({ timeout: 5000 })
      launcherVisible = true
      launcherText = await btn.textContent()
      console.log(`  Launcher found by role text: YES — "${launcherText?.trim()}"`)
    } catch {
      console.log('  Launcher not found by role either.')
    }
  }

  if (!launcherVisible) {
    console.log('\nFAIL: AI-CS widget launcher not rendered.')
    // Capture page source snippet
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.slice(0, 2000))
    console.log('  Page body snippet:', bodyHtml.slice(0, 500))
    await browser.close()
    process.exit(1)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4: Click launcher, wait for panel
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nSTEP 4: Click launcher, wait for chat panel ...')
  await page.click('[data-aics-launcher]')

  let panelOpen = false
  try {
    // Panel likely has a role=dialog or data-aics-panel
    await page.waitForSelector('[data-aics-panel], [role="dialog"], [data-aics-chat]', { timeout: 8000 })
    panelOpen = true
    console.log('  Panel opened: YES')
  } catch {
    // Try a broader check for any visible textarea/input in widget
    try {
      await page.waitForSelector('textarea[placeholder], input[type="text"]', { timeout: 5000 })
      panelOpen = true
      console.log('  Panel opened (found input): YES')
    } catch {
      console.log('  Panel opened: NO')
    }
  }

  if (!panelOpen) {
    console.log('FAIL: Chat panel did not open after clicking launcher.')
    await browser.close()
    process.exit(1)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 5: Type question and send
  // ──────────────────────────────────────────────────────────────────────────
  const question = 'How do I extract fields from a lease?'
  console.log(`\nSTEP 5: Type and send question: "${question}"`)

  // Find the textarea in the widget
  let inputSelector = null
  for (const sel of ['[data-aics-panel] textarea', '[data-aics-chat] textarea', 'textarea']) {
    const el = page.locator(sel).first()
    try {
      await el.waitFor({ timeout: 3000 })
      inputSelector = sel
      break
    } catch {
      // try next
    }
  }

  if (!inputSelector) {
    console.log('FAIL: Could not find textarea in chat panel.')
    await browser.close()
    process.exit(1)
  }

  await page.locator(inputSelector).first().fill(question)
  await page.keyboard.press('Enter')
  console.log('  Message sent.')

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 6: Wait for assistant reply
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nSTEP 6: Wait for assistant reply (up to 30s) ...')

  let replyText = null
  try {
    // Wait for a reply element — the widget likely uses data-aics-message or similar
    await page.waitForFunction(
      () => {
        // Look for assistant messages in the panel
        const msgs = document.querySelectorAll('[data-aics-message], [data-aics-role="assistant"], [data-message-role="assistant"]')
        if (msgs.length > 0) return true
        // Fallback: any non-empty text in a chat bubble area
        const panel = document.querySelector('[data-aics-panel], [data-aics-chat], [role="dialog"]')
        if (!panel) return false
        const text = panel.textContent ?? ''
        // Check for response content (longer than the question + UI chrome)
        return text.length > 200
      },
      { timeout: 30000 },
    )

    // Capture reply text
    const msgs = await page.$$('[data-aics-message], [data-aics-role="assistant"], [data-message-role="assistant"]')
    if (msgs.length > 0) {
      replyText = await msgs[msgs.length - 1].textContent()
    } else {
      // Fallback: grab all text from the panel
      const panel = await page.$('[data-aics-panel], [data-aics-chat], [role="dialog"]')
      if (panel) {
        const allText = await panel.textContent()
        // Strip out the input area — grab everything before it
        replyText = allText?.slice(0, 500)
      }
    }

    console.log(`  Reply received: YES`)
    console.log(`  Reply text (first 300 chars): "${replyText?.trim().slice(0, 300)}"`)
  } catch (err) {
    console.log(`  FAIL: No reply within 30s. Error: ${err.message}`)
    // Try to grab whatever is in the panel
    try {
      const panel = await page.$('[data-aics-panel], [data-aics-chat], [role="dialog"]')
      if (panel) {
        const allText = await panel.textContent()
        console.log(`  Panel text at timeout: "${allText?.slice(0, 400)}"`)
      }
    } catch {
      // ignore
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 7: Console errors
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nSTEP 7: Console errors ...')
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })
  // Give it a moment
  await page.waitForTimeout(1000)
  if (consoleErrors.length > 0) {
    console.log(`  Console errors (${consoleErrors.length}):`)
    for (const e of consoleErrors.slice(0, 10)) {
      console.log(`    ${e}`)
    }
  } else {
    console.log('  No console errors captured after reply.')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n=== NETWORK LOG (AI-CS + Auth requests) ===')
  for (const entry of networkLog) {
    const flag = entry.status >= 400 ? ' *** ERROR ***' : ''
    console.log(`  [${entry.status}] ${entry.url}${flag}`)
  }

  console.log('\n=== RESULT ===')
  const pass =
    isOnApp &&
    launcherVisible &&
    panelOpen &&
    replyText != null &&
    replyText.trim().length > 10

  if (pass) {
    console.log('PASS')
  } else {
    console.log('FAIL')
    console.log(`  isOnApp=${isOnApp} launcherVisible=${launcherVisible} panelOpen=${panelOpen} hasReply=${replyText != null}`)
  }

  await browser.close()
  process.exit(pass ? 0 : 1)
})().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
