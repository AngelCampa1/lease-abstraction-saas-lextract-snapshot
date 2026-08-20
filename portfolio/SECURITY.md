# Security notes

This repository is a snapshot published for reading and evaluation. It is not a hosted service you
are invited to test. **Do not run scans, fuzzers, or exploitation attempts against lextract.io or
api.lextract.io.** Anything you want to check should come from reading the source or from running
the stack locally, which the README explains how to do.

Lextract ingested customer-uploaded commercial lease PDFs and billed through Stripe at $15 per
lease (`workers/api/src/services/stripe.ts:38`), so this document covers the auth model, tenant
isolation, document handling, and payment path directly, rather than stopping at secret hygiene.

## Authentication and session handling

Production auth is Neon Auth, verified two ways depending on caller:

- **Bearer JWT.** `verifyNeonBearerToken` (`workers/api/src/services/neon-auth.ts:104-135`) checks
  the token against Neon Auth's remote JWKS (`jose`'s `createRemoteJWKSet`/`jwtVerify`, cached per
  `NEON_AUTH_JWKS_URL`) and requires a `sub` claim.
- **Session cookie.** `verifyNeonSessionToken` (`workers/api/src/services/neon-auth.ts:137-177`)
  rejects any token containing `\r`, `\n`, or `;`, then forwards it as a `Cookie` header to
  `{NEON_AUTH_BASE_URL}/get-session` and trusts whatever user object Neon Auth's own endpoint
  returns. The API worker never validates a session cookie itself; it always round-trips to Neon
  Auth.

Both paths converge in `getAuthContext` (`workers/api/src/services/neon-auth.ts:238-292`), which
also handles an anonymous, cookie-less path for the guest upload flow via an `X-Session-Token`
header checked against the `anonymous_sessions` table. Every authenticated route is gated by
`requireUserAuth` / `createRequireUserAuth` (`workers/api/src/middleware/auth.ts:31-51`), which
returns 401 on anything that is not `kind: 'user'`.

On the frontend, `frontend/lib/neon-auth/server.ts` reads the same session cookie via Next.js
`cookies()`, forwards it to Neon Auth for validation, and proxies Neon Auth's `Set-Cookie` headers
back to the browser rather than minting sessions itself.

`scripts/local-auth-stub.mjs` replaces this whole path for local development: it answers every
request as one hardcoded demo user, binds only to `127.0.0.1`, and refuses any `Host` outside the
localhost set. The production guard,
`workers/api/scripts/assert-production-wrangler-vars.mjs:37-43`, requires `NEON_AUTH_BASE_URL` to
start with `https://` and end in `/auth` before a deploy is allowed to proceed. The stub's
documented value, `http://localhost:4000`, fails both checks, so a config pointing at the stub
cannot pass the deploy-time assertion.

## Tenant isolation

Every extraction read or write is scoped by an ownership clause built from the authenticated
context, never from a client-supplied id. `ownerClause` (`workers/api/src/repositories/
extractions.ts:254-263`) turns the caller into either `user_id = $N` or `anonymous_session_id = $N
AND user_id IS NULL`, and `ownerFromAuth` (`workers/api/src/routes/extractions.ts:219-223`) is the
only place that clause is constructed, always from `c.get('authContext')`, never from a URL
parameter or request body. `workers/api/src/tests/extractions-read.test.ts:297` asserts the
resulting behavior directly: a request for another user's extraction id returns 404, identical to
a request for an id that does not exist. R2 storage keys are namespaced the same way:
`extractionPrefix` (`workers/api/src/domain/object-keys.ts:61-65`) builds
`lextract-documents/{ownerId}/{extractionId}/`, so one user's objects do not share a prefix with
another's.

One nuance worth stating plainly: Postgres RLS policies do exist in the schema
(`backend/neon/migrations/00002_rls_policies.sql:45-60`, e.g. `extractions_select_own_user`), but
they target the `authenticated` role and read `auth.user_id()`/`request.jwt.claims`, a GUC the
Neon Data API (PostgREST) sets per request. `workers/api` never talks to the Data API. It opens a
single pooled connection straight to Postgres through Hyperdrive (`workers/api/src/repositories/
db.ts`, `connectionString: env.HYPERDRIVE.connectionString`) and sets no per-request session
variable anywhere in the codebase. RLS is real in the schema, but it is not what protects tenant
data on the path that was actually serving requests in production: the application-level
ownership clause above is.

## Uploaded lease documents: storage, encryption, retention, deletion

PDFs are stored in Cloudflare R2 (`DOCUMENTS_BUCKET` binding, `workers/api/wrangler.jsonc:22-27`)
at `lextract-documents/{ownerId}/{extractionId}/original.pdf`
(`workers/api/src/domain/object-keys.ts:67-69`). Nothing in this codebase encrypts the PDF bytes
before upload; whatever encryption-at-rest exists is R2's own platform default, not something this
repository configures, verifies, or can make a claim about beyond "the application does not add
its own layer."

**Deletion is real and works at both scopes.** Deleting a single extraction
(`DELETE /extractions/:id`, `workers/api/src/routes/extractions.ts:892-908`) runs
`defaultDeleteExtraction` (`workers/api/src/routes/extractions.ts:756-795`), which deletes the
document object, every raw-pass response object, and the entire extraction's R2 prefix (exports
included) before soft-deleting the database row, not just a `deleted_at` flag with the PDF left
behind. Deleting an account (`deleteAccount`, `workers/api/src/repositories/users.ts:285-315`)
soft-deletes the user and all their extractions in one transaction, then enqueues a
`CLEANUP_QUEUE` message; `cleanupUserObjects` (`workers/api/src/queues/cleanup-consumer.ts:74-119`)
consumes it and deletes every remaining R2 object for that user.

> [!WARNING]
> **There is no automatic retention policy.** Searched for a scheduled Worker trigger, an R2
> lifecycle rule, and a TTL check anywhere in the codebase and found none:
> `workers/api/wrangler.jsonc` has no `triggers`/`scheduled` key, and `src/index.ts` exports no
> `scheduled()` handler. A PDF a user uploads and never explicitly deletes, on an account that is
> never explicitly deleted, stays in R2 indefinitely. Deletion here is entirely user-initiated;
> nothing expires it automatically. This is the weakest part of the document-handling picture and
> is stated here rather than left for a reader to discover.

## Payment data

Checkout is Stripe-hosted, not embedded. `createStripeCheckoutSession`
(`workers/api/src/services/stripe.ts:115-147`) creates a `mode: 'payment'` Checkout Session via
Stripe's `/v1/checkout/sessions` API and returns Stripe's own `checkoutUrl`. The frontend does a
full-page redirect to it, `window.location.href = data.checkout_url`
(`frontend/hooks/use-payment.ts:38`). There is no Stripe Elements integration and no card-input
form anywhere in this repository; a repository-wide search for card-number, CVV, or PAN handling
in the payment code returns nothing. Card data never reaches this application's frontend or
backend at any point: Stripe's hosted page collects it directly, which is what keeps this
codebase out of PCI scope beyond SAQ-A. Webhooks only ever see Stripe's session and payment-intent
objects and the metadata this app attached to them (`user_id`, `extraction_id`, `product_type`,
`credits`), never raw card fields, and every webhook is verified with an HMAC signature check
using a timing-safe comparison and a timestamp tolerance window
(`verifyStripeWebhookSignature`, `workers/api/src/services/stripe.ts:192-222`) before it is
trusted.

## Third-party PII in the fixture corpus

`packages/extract-sdk/tests/fixtures/real-leases/` holds 22 real commercial lease documents
(`.htm`), pulled from public SEC EDGAR filings and named after the companies they were filed for:
`01_office_karyopharm.htm`, `09_industrial_30k.htm`, `21_amendment_nve.htm`, and nineteen more (see
[TESTING.md](TESTING.md) for how they are used as ground-truth accuracy fixtures). These documents
contain real company names, signature-block contacts, and property addresses. That is public-record
material (SEC filings are public by law), retained deliberately and unredacted, because the
extraction-accuracy harness (`ground_truth.py`) needs a real, independently verifiable document to
check the pipeline's output against, not a synthetic one.

## Where this security posture stops

There is no application-level rate limiting. `workers/api/wrangler.jsonc` has no Cloudflare Rate
Limiting binding, and there is no throttling middleware anywhere in `workers/api/src/`. The only
rate-limit-shaped code in the repository recognizes OpenRouter's own `rate_limit_exceeded` error
string from the extraction pipeline; it protects nothing on Lextract's own API surface.

There is no secret-scanning tool. No `gitleaks`, `trufflehog`, or equivalent is configured anywhere
in this repository, consistent with the gates in [the root README's Testing
section](../README.md#testing) running locally rather than in CI.

**RLS is schema-present, not production-enforcing**, as detailed under Tenant isolation above: a
reader skimming only for "is RLS used" would otherwise get a falsely reassuring yes.

## What is deliberately not a vulnerability

- Values in `.env.example`, `frontend/.npmrc.example`, `workers/api/.dev.vars.example`, and
  `backend/docker-compose.local.yml`. These are placeholders and local-only development credentials.
- `NEXT_PUBLIC_*` variables. These are browser-public by design.
- `@ventora/ai-cs` resolving to a private registry URL in `frontend/package-lock.json`. It is pinned
  with an integrity hash and declared optional; the registry requires a token, and a clone without
  one skips it and falls back to `components/ai-cs/vendor-stub.tsx`.
- `scripts/local-auth-stub.mjs` accepting any request as an authenticated session. That is its
  entire purpose. It binds to loopback, refuses any Host outside the localhost set, is referenced
  only by documentation, and `workers/api/scripts/assert-production-wrangler-vars.mjs` fails the
  deploy check if a production config ever points at it.

## How secrets are handled

Secrets live in gitignored `.env` files locally and in Cloudflare Workers secrets in production.
Nothing in this snapshot carries a live credential.

Two categories of identifier do survive here, and are worth naming rather than leaving for you to
find: the Hyperdrive binding ID and Neon Auth hostname in `workers/api/wrangler.jsonc`, and the
workers.dev subdomain in `frontend/wrangler.jsonc`. Neither is a secret. Both are infrastructure
identifiers that would be replaced in any real deployment.
