import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const configPath = resolve(scriptDir, '..', 'wrangler.jsonc')
const configText = readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '')
const config = JSON.parse(configText)
const vars = config.vars ?? {}

function report(message) {
  console.error(message)
  process.exitCode = 1
}

function splitOrigins(value) {
  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

const allowedOrigins = splitOrigins(vars.ALLOWED_ORIGINS)

if (vars.ENVIRONMENT !== 'production') {
  report('Root wrangler vars must set ENVIRONMENT=production')
}

if (vars.FRONTEND_URL !== 'https://lextract.io') {
  report('Root wrangler vars must set FRONTEND_URL=https://lextract.io')
}

if (
  typeof vars.NEON_AUTH_BASE_URL !== 'string' ||
  !vars.NEON_AUTH_BASE_URL.startsWith('https://') ||
  !vars.NEON_AUTH_BASE_URL.endsWith('/auth')
) {
  report('Root wrangler vars must set NEON_AUTH_BASE_URL to the Neon Auth /auth endpoint')
}

if (!allowedOrigins.includes('https://lextract.io')) {
  report('Root wrangler ALLOWED_ORIGINS must include https://lextract.io')
}

if (!allowedOrigins.includes('https://www.lextract.io')) {
  report('Root wrangler ALLOWED_ORIGINS must include https://www.lextract.io')
}

if (allowedOrigins.some((origin) => origin.includes('localhost'))) {
  report('Root wrangler ALLOWED_ORIGINS must not include localhost')
}
