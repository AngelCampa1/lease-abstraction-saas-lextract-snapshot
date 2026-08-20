#!/usr/bin/env node
/*
 * ============================================================================
 * LOCAL DEVELOPMENT ONLY. NEVER DEPLOY THIS.
 * ============================================================================
 *
 * This is a fake auth server. It does not check passwords, does not validate
 * cookies, and does not verify anything at all. Every request it receives is
 * answered as if it came from one signed-in demo user. Anyone who can reach
 * this port is that user.
 *
 * It exists for one reason: so someone who clones this repository can run the
 * signed-in parts of the app on their own machine without standing up a hosted
 * auth provider. Lextract's real auth is a thin proxy in front of one contract,
 * `GET {NEON_AUTH_BASE_URL}/get-session`, so a local stand-in for that single
 * endpoint is enough to make the whole authenticated app work offline.
 *
 * Because of that, this file must never be deployed, never be put behind a
 * public hostname, and never be reachable from anything but the loopback
 * interface. It binds to 127.0.0.1 on purpose. Do not change that to 0.0.0.0.
 *
 * Usage:
 *
 *   python scripts/seed-demo.py            # prints the demo UUIDs
 *   export DEMO_USER_ID=<uuid it printed>
 *   export DEMO_USER_EMAIL=demo@example.com
 *   node scripts/local-auth-stub.mjs
 *
 * Then point the app at it:
 *
 *   frontend/.env.local     NEON_AUTH_BASE_URL=http://localhost:4000
 *   workers/api/.dev.vars   NEON_AUTH_BASE_URL=http://localhost:4000
 *
 * DEMO_USER_ID must be a real `users.id` UUID in the local database. The API
 * worker looks the subject up with `SELECT id, email FROM users WHERE id = $1`,
 * so an id that is not in the table produces a session that authenticates but
 * owns nothing.
 * ============================================================================
 */

import { createServer } from 'node:http'

const HOST = '127.0.0.1'
const PORT = Number.parseInt(process.env.PORT ?? '4000', 10)

// Must match AUTH_TOKEN_COOKIE_NAME in frontend/lib/neon-auth/server.ts and the
// cookie header built by workers/api/src/services/neon-auth.ts.
const COOKIE_NAME = '__Secure-neon-auth.session_token'

// Opaque and unsigned, exactly like the real session cookie value. The token is
// only ever echoed back to this server, so any stable string works. It must not
// contain CR, LF or ';' because the API worker rejects those.
const SESSION_TOKEN = 'local-demo-session-token'

// Far enough out that nobody hits an expiry while demoing.
const SESSION_EXPIRES_AT = '2099-12-31T23:59:59.000Z'

const demoUserId = (process.env.DEMO_USER_ID ?? '').trim()
const demoUserEmail = (process.env.DEMO_USER_EMAIL ?? 'demo@example.com').trim()
const demoUserName = (process.env.DEMO_USER_NAME ?? 'Demo User').trim()

if (demoUserId.length === 0) {
  process.stderr.write(
    [
      'DEMO_USER_ID is not set.',
      '',
      'This stub has to hand back a user id that really exists in your local',
      'database, or the API will authenticate the session and then find no rows',
      'for it. Seed the database first and export the id it prints:',
      '',
      '  python scripts/seed-demo.py',
      '  export DEMO_USER_ID=<the uuid printed by the seed script>',
      '  export DEMO_USER_EMAIL=demo@example.com',
      '  node scripts/local-auth-stub.mjs',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

const sessionUser = {
  email: demoUserEmail,
  id: demoUserId,
  name: demoUserName,
}

const session = {
  expiresAt: SESSION_EXPIRES_AT,
  token: SESSION_TOKEN,
  userId: demoUserId,
}

/**
 * `__Secure-` prefixed cookies require the Secure attribute. Browsers treat
 * http://localhost as a trustworthy origin, so a Secure cookie is accepted
 * there even without TLS.
 */
function setCookieHeader() {
  return `${COOKIE_NAME}=${SESSION_TOKEN}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
}

function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

function sendJson(response, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
    'Content-Type': 'application/json',
    ...extraHeaders,
  })
  response.end(payload)
}

async function readBody(request) {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

// Binding to loopback stops a remote host from connecting directly, but it does
// not stop DNS rebinding: a page on any domain whose record resolves to
// 127.0.0.1 becomes same-origin with this server and can read the session. The
// stub only ever hands out a fake token for a local demo database, so the stakes
// are low, but an allowlist closes the hole for the cost of three lines.
const ALLOWED_HOSTS = new Set([
  `localhost:${PORT}`,
  `127.0.0.1:${PORT}`,
  `[::1]:${PORT}`,
])

// A rejected or aborted request must not take the server down with it. Node's
// default is to throw on an unhandled rejection, and the request stream rejects
// when a client disconnects mid-body.
function handleBody(request, response, onBody) {
  readBody(request)
    .then(onBody)
    .catch(() => {
      response.destroy()
    })
}

const server = createServer((request, response) => {
  const method = request.method ?? 'GET'
  const pathname = new URL(request.url ?? '/', `http://${HOST}:${PORT}`).pathname
  process.stdout.write(`[local-auth-stub] ${method} ${pathname}\n`)

  if (!ALLOWED_HOSTS.has(request.headers.host ?? '')) {
    sendJson(response, 403, {
      message: 'local-auth-stub only answers requests addressed to localhost',
    })
    return
  }

  if (method === 'GET' && pathname === '/get-session') {
    sendJson(response, 200, { session, user: sessionUser })
    return
  }

  if (method === 'POST' && pathname === '/sign-in/email') {
    // The submitted credentials are read and discarded. Any email and password
    // signs in as the one demo user, which is the whole point of the stub.
    handleBody(request, response, () => {
      sendJson(
        response,
        200,
        { redirect: false, token: SESSION_TOKEN, user: sessionUser },
        { 'Set-Cookie': setCookieHeader() },
      )
    })
    return
  }

  if (method === 'POST' && pathname === '/sign-out') {
    handleBody(request, response, () => {
      sendJson(response, 200, { success: true }, { 'Set-Cookie': clearCookieHeader() })
    })
    return
  }

  sendJson(response, 404, {
    message: `local-auth-stub does not implement ${method} ${pathname}`,
  })
})

server.listen(PORT, HOST, () => {
  process.stdout.write(
    [
      `[local-auth-stub] listening on http://${HOST}:${PORT}`,
      `[local-auth-stub] every request is answered as ${demoUserEmail} (${demoUserId})`,
      '[local-auth-stub] local development only. do not deploy or expose this.',
      '',
    ].join('\n'),
  )
})
