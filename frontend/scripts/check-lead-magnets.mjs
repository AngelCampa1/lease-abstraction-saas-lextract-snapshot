#!/usr/bin/env node
/**
 * Lightweight prebuild guard: verifies every promoted lead magnet slug has a
 * non-zero local file on disk so a missing download asset never makes it into
 * a production build. The richer integrity checks (R2 parity, page counts,
 * sheet counts) live in scripts/verify-lead-magnets.ts and run in CI; this
 * script intentionally avoids that work so prebuild stays fast.
 *
 * Exits 0 on success, 1 on any missing/empty file.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FRONTEND_ROOT = path.resolve(__dirname, '..')

/**
 * Dumps the promoted lead magnet definitions from the TypeScript source of
 * truth via tsx so we never drift from the data file the rest of the app uses.
 */
function loadLeadMagnetDefinitions() {
  const tsxCli = path.join(
    FRONTEND_ROOT,
    'node_modules',
    'tsx',
    'dist',
    'cli.mjs',
  )
  if (!fs.existsSync(tsxCli)) {
    throw new Error(
      `tsx CLI not found at ${tsxCli}. Did dependencies install?`,
    )
  }

  const evalScript = [
    "import { PROMOTED_LEAD_MAGNETS } from '../data/lead-magnets'",
    'process.stdout.write(JSON.stringify(PROMOTED_LEAD_MAGNETS.map(m => ({ slug: m.slug, localAssetPath: m.localAssetPath }))))',
  ].join('\n')

  const tmpFile = path.join(
    FRONTEND_ROOT,
    'scripts',
    '.check-lead-magnets.entry.ts',
  )
  fs.mkdirSync(path.dirname(tmpFile), { recursive: true })
  fs.writeFileSync(tmpFile, evalScript, 'utf8')

  try {
    const output = execFileSync(process.execPath, [tsxCli, tmpFile], {
      cwd: FRONTEND_ROOT,
      stdio: ['ignore', 'pipe', 'inherit'],
      encoding: 'utf8',
    })
    return JSON.parse(output)
  } finally {
    try {
      fs.unlinkSync(tmpFile)
    } catch {
      // Best-effort cleanup; ignore.
    }
  }
}

function main() {
  const magnets = loadLeadMagnetDefinitions()
  const failures = []

  if (!Array.isArray(magnets) || magnets.length === 0) {
    console.error('check-lead-magnets: no promoted lead magnets were found')
    process.exit(1)
  }

  for (const magnet of magnets) {
    if (!magnet?.slug) {
      failures.push('Encountered a lead magnet entry without a slug')
      continue
    }
    if (
      typeof magnet.localAssetPath !== 'string' ||
      magnet.localAssetPath.length === 0
    ) {
      failures.push(`${magnet.slug}: missing localAssetPath in definition`)
      continue
    }

    const absolute = path.resolve(FRONTEND_ROOT, magnet.localAssetPath)
    if (!fs.existsSync(absolute)) {
      failures.push(
        `${magnet.slug}: file not found at ${magnet.localAssetPath}`,
      )
      continue
    }

    const stat = fs.statSync(absolute)
    if (!stat.isFile()) {
      failures.push(
        `${magnet.slug}: ${magnet.localAssetPath} is not a regular file`,
      )
      continue
    }
    if (stat.size === 0) {
      failures.push(
        `${magnet.slug}: ${magnet.localAssetPath} is empty (0 bytes)`,
      )
    }
  }

  if (failures.length > 0) {
    console.error('Lead magnet integrity check failed:')
    for (const failure of failures) {
      console.error(`  - ${failure}`)
    }
    process.exit(1)
  }

  console.log(
    `check-lead-magnets: ${magnets.length} lead magnet files present and non-empty.`,
  )
}

main()
