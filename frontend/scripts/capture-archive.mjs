#!/usr/bin/env node
/**
 * Sweep every public route against a running dev server and archive a
 * screenshot of each, in every viewport/theme variant.
 *
 * The route inventory is not hand-maintained here -- it is read from the URL
 * lists already tracked at the repo root (`lextract-urls.txt` and friends), so
 * the sweep automatically follows the site as routes are added or pruned.
 *
 * Console errors and failed requests are recorded per page as a by-product, so
 * a capture run doubles as a crawl-wide smoke test. The report lands next to
 * the images as `report.json`.
 *
 * Playwright is intentionally NOT a dependency of this package -- it is heavy,
 * and nobody running the app needs it. Install it just for a capture run:
 *
 *   cd frontend
 *   npm install --no-save playwright && npx playwright install chromium
 *
 * Usage (with the dev server already running):
 *   node scripts/capture-archive.mjs
 *   node scripts/capture-archive.mjs --limit 25 --variants desktop-light
 *   node scripts/capture-archive.mjs --urls non-pseo-pages.txt --base http://localhost:3000
 *
 * Set CAPTURE_STORAGE_STATE to a Playwright storage-state file to sweep the
 * authenticated surfaces (/dashboard, /billing, /profile) in the same run.
 */

import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Viewport + colour-scheme combinations captured for every route. */
const VARIANTS = {
  'desktop-light': { viewport: { width: 1440, height: 900 }, colorScheme: 'light' },
  'desktop-dark': { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' },
  'mobile-light': {
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
}

function parseArgs(argv) {
  const args = {
    base: 'http://localhost:3000',
    out: path.join(REPO_ROOT, 'docs', 'screenshots', 'archive'),
    urls: ['lextract-urls.txt', 'non-pseo-pages.txt', 'pseo-pages.txt'],
    paths: [],
    variants: Object.keys(VARIANTS),
    limit: Infinity,
    concurrency: 4,
    fullPage: true,
  }
  // A missing value used to sail through as `undefined` and produce silent
  // nonsense -- `--concurrency` with no value gave NaN, which made the worker
  // pool empty and the script report success having captured nothing.
  const requireValue = (flag, value) => {
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${flag} requires a value`)
    }
    return value
  }
  const requirePositiveInt = (flag, value) => {
    const n = Number(requireValue(flag, value))
    if (!Number.isInteger(n) || n < 1) {
      throw new Error(`${flag} requires a positive integer, got: ${value}`)
    }
    return n
  }

  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i]
    const value = argv[i + 1]
    switch (flag) {
      case '--base':
        args.base = requireValue(flag, value)
        i += 1
        break
      case '--out':
        args.out = path.resolve(requireValue(flag, value))
        i += 1
        break
      case '--urls':
        args.urls = requireValue(flag, value).split(',')
        i += 1
        break
      case '--paths':
        // Ad-hoc paths, for app routes that are absent from the marketing URL
        // lists (e.g. /results/sample).
        args.paths = requireValue(flag, value).split(',')
        i += 1
        break
      case '--variants':
        args.variants = requireValue(flag, value).split(',')
        i += 1
        break
      case '--limit':
        args.limit = requirePositiveInt(flag, value)
        i += 1
        break
      case '--concurrency':
        args.concurrency = requirePositiveInt(flag, value)
        i += 1
        break
      case '--above-fold':
        args.fullPage = false
        break
      default:
        throw new Error(`Unknown argument: ${flag}`)
    }
  }
  const unknown = args.variants.filter((v) => !(v in VARIANTS))
  if (unknown.length > 0) {
    throw new Error(`Unknown variant(s): ${unknown.join(', ')}`)
  }
  return args
}

/**
 * Read the tracked URL lists and reduce them to unique pathnames.
 *
 * The lists hold absolute production URLs; only the path matters here because
 * the sweep runs against a local origin.
 */
async function collectPaths(files, limit) {
  const paths = new Set()
  for (const file of files) {
    const full = path.join(REPO_ROOT, file)
    if (!existsSync(full)) {
      console.warn(`  ! skipping missing URL list: ${file}`)
      continue
    }
    const text = await readFile(full, 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (trimmed === '' || trimmed.startsWith('#')) continue
      try {
        paths.add(new URL(trimmed).pathname || '/')
      } catch {
        // Tolerate bare paths in case a list is ever written that way.
        if (trimmed.startsWith('/')) paths.add(trimmed)
      }
    }
  }
  return [...paths].sort().slice(0, limit)
}

/** Turn a pathname into a flat, filesystem-safe basename. */
function slugify(pathname) {
  const cleaned = pathname.replace(/^\/+|\/+$/g, '')
  return cleaned === '' ? 'home' : cleaned.replace(/[^a-zA-Z0-9._-]+/g, '_')
}

/**
 * Noise the dev server produces that says nothing about the app.
 *
 * Prefer capturing against a production build (`npm run build && npm start`),
 * where none of this appears; this filter only keeps a dev-server run readable.
 */
const DEV_ONLY_NOISE = [/query-devtools/, /__nextjs/, /\/_next\/static\/chunks\/.*devtools/]

function isDevOnlyNoise(text) {
  return DEV_ONLY_NOISE.some((re) => re.test(text))
}

async function capturePage(context, { base, pathname, variant, outDir, fullPage }) {
  const consoleErrors = []
  const failedRequests = []
  const result = { path: pathname, variant, status: null, error: null, consoleErrors, failedRequests }

  let page
  try {
    page = await context.newPage()
  } catch (err) {
    // Record rather than throw: one page failing must not reject the pool
    // and abandon the remaining routes.
    result.error = err instanceof Error ? err.message.slice(0, 300) : String(err)
    return result
  }

  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isDevOnlyNoise(msg.text())) {
      consoleErrors.push(msg.text().slice(0, 500))
    }
  })
  page.on('requestfailed', (req) => {
    if (isDevOnlyNoise(req.url())) return
    failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText ?? 'unknown'}`)
  })

  try {
    // 'load' rather than 'networkidle': analytics beacons and the dev server's
    // HMR socket keep the network busy indefinitely, so networkidle times out
    // on pages that are in fact fully rendered.
    const response = await page.goto(`${base}${pathname}`, {
      waitUntil: 'load',
      timeout: 45_000,
    })
    result.status = response?.status() ?? null

    // Let fonts land and entrance animations finish so captures are
    // deterministic rather than catching elements mid-transition.
    await page.evaluate(() => document.fonts.ready).catch(() => {})
    await page.waitForTimeout(700)

    await page.screenshot({
      path: path.join(outDir, `${slugify(pathname)}.png`),
      fullPage,
      animations: 'disabled',
    })
  } catch (err) {
    result.error = err instanceof Error ? err.message.slice(0, 300) : String(err)
  } finally {
    await page.close()
  }

  return result
}

/** Run `worker` over `items` with a bounded number of concurrent tasks. */
async function mapPool(items, concurrency, worker) {
  const results = []
  let cursor = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

async function main() {
  const args = parseArgs(process.argv)
  const paths =
    args.paths.length > 0
      ? args.paths.slice(0, args.limit)
      : await collectPaths(args.urls, args.limit)

  if (paths.length === 0) {
    console.error('No URLs collected -- nothing to capture.')
    process.exit(1)
  }

  console.log(`Capturing ${paths.length} routes x ${args.variants.length} variants from ${args.base}`)

  const browser = await chromium.launch()
  const report = { base: args.base, capturedAt: new Date().toISOString(), variants: {} }

  try {
    for (const variant of args.variants) {
      const outDir = path.join(args.out, variant)
      await mkdir(outDir, { recursive: true })

      const context = await browser.newContext({
        ...VARIANTS[variant],
        // Storage state lets a second pass capture authenticated surfaces.
        ...(process.env.CAPTURE_STORAGE_STATE
          ? { storageState: process.env.CAPTURE_STORAGE_STATE }
          : {}),
      })

      let done = 0
      const results = await mapPool(paths, args.concurrency, async (pathname) => {
        const r = await capturePage(context, {
          base: args.base,
          pathname,
          variant,
          outDir,
          fullPage: args.fullPage,
        })
        done += 1
        if (done % 25 === 0 || done === paths.length) {
          console.log(`  ${variant}: ${done}/${paths.length}`)
        }
        return r
      })

      await context.close()
      report.variants[variant] = results

      const failed = results.filter((r) => r.error !== null || (r.status ?? 0) >= 400)
      const noisy = results.filter((r) => r.consoleErrors.length > 0)
      console.log(
        `  ${variant}: done. ${failed.length} failed, ${noisy.length} with console errors.`
      )
    }
  } finally {
    await browser.close()
  }

  await mkdir(args.out, { recursive: true })
  await writeFile(path.join(args.out, 'report.json'), JSON.stringify(report, null, 2))
  console.log(`\nReport: ${path.join(args.out, 'report.json')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
