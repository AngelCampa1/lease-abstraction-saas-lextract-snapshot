# Lextract Deployment Guide

> [!IMPORTANT]
> **Status: retired.** The Cloudflare Workers, custom domains, Neon project and third-party
> accounts described here have been torn down, and the hostnames below no longer resolve to the
> product. This guide is kept as the record of how the stack was deployed, and as the runbook
> anyone rebuilding it from this repository would follow.

This was the production deployment path for the Cloudflare-native Lextract stack.

- **Frontend**: Cloudflare Workers via OpenNext
- **Backend API**: Cloudflare Worker at `api.lextract.io`
- **Background extraction**: Cloudflare Workflows
- **Async email and cleanup**: Cloudflare Queues
- **Database**: Neon Postgres through Cloudflare Hyperdrive
- **Storage**: Cloudflare R2 bucket binding

There is no Railway service, Redis broker, Celery worker, or Celery beat service in the production
architecture.

---

## Prerequisites

- Neon account
- Cloudflare account with Workers, Workflows, Queues, Hyperdrive, and R2 enabled
- Stripe account
- Resend account
- OpenRouter account
- Optional Sentry account
- Optional PostHog account

---

## 1. Neon Database

### 1.1 Create Project

1. Create a Neon project named `lextract`.
2. Create a database named `lextract`, or keep the default database name and use it consistently.
3. Copy the pooled connection string for runtime traffic.
4. Copy the direct connection string for migrations only.

### 1.2 Run Migrations

Run each migration in `backend/neon/migrations/` in order through the current head:

```sql
-- 00001_initial_schema.sql
-- 00002_rls_policies.sql
-- 00003_seed.sql      -- development only; skip in production
-- 00004_payments_unique_session.sql
-- 00005_extraction_token_columns.sql
-- 00006_anonymous_session_email.sql
-- 00007_drop_textract_columns.sql
-- 00008_leads.sql
-- 00009_rename_document_object_key.sql
-- 00010_extraction_pipeline_events.sql
-- 00011_drop_marketing_leads.sql
-- 00012_extraction_guest_notify_emails.sql
-- 00013_webhook_payment_idempotency.sql
```

Marketing leads cutover gate: run `00011_drop_marketing_leads.sql` only after the Cloudflare D1
marketing Worker is deployed, production marketing routes are writing to D1, `MARKETING_WORKER_URL`
and `MARKETING_WORKER_SECRET` are configured, and any legacy lead rows have been backfilled or
intentionally discarded.

### 1.3 Enable Neon Auth

1. Enable Neon Auth in the Neon project.
2. Copy the Auth base URL for `NEON_AUTH_BASE_URL`.
3. Configure optional OAuth providers.
4. Generate a 32+ character `NEON_AUTH_COOKIE_SECRET` for the frontend Worker.

---

## 2. Cloudflare Storage And Database Bindings

### 2.1 R2

1. Create or reuse the `lextract-documents` R2 bucket.
2. Bind it to the API Worker as `DOCUMENTS_BUCKET`.
3. Keep object keys private; the API Worker returns signed document/export routes when users are
   authorized.

### 2.2 Hyperdrive

1. Create a Hyperdrive config that points at the Neon pooled connection string.
2. Bind it to the API Worker as `HYPERDRIVE`.
3. Use the direct Neon connection string only for migrations, not for Worker runtime traffic.

### 2.3 Queues

Create two queues and bind producers/consumers in `workers/api/wrangler.jsonc`:

| Queue | Binding | Purpose |
|-------|---------|---------|
| `lextract-email` | `EMAIL_QUEUE` | Extraction complete, CAM flags, and anonymous notify email dispatch |
| `lextract-cleanup` | `CLEANUP_QUEUE` | Best-effort R2 cleanup for soft-deleted user data |

Configure dead-letter queues before production launch so poison messages are retained for
inspection.

### 2.4 Workflows

Create these Workflow bindings:

| Binding | Class | Purpose |
|---------|-------|---------|
| `EXTRACTION_WORKFLOW` | `ExtractionWorkflow` | PDF extraction, scoring, red flags, completion |
| `EXPORT_WORKFLOW` | `ExportWorkflow` | Document, spreadsheet, and PDF export generation |

---

## 3. Backend API Worker

The Worker source lives in `workers/api`.

### 3.1 Required Vars And Secrets

Set non-secret vars in `workers/api/wrangler.jsonc` or with Cloudflare dashboard environment
variables:

```bash
ENVIRONMENT=production
FRONTEND_URL=https://lextract.io
PUBLIC_API_ORIGIN=https://api.lextract.io
ALLOWED_ORIGINS=https://lextract.io,https://www.lextract.io
```

Set secrets with `wrangler secret put`:

```bash
cd workers/api
wrangler secret put NEON_AUTH_BASE_URL
wrangler secret put OPENROUTER_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM_ADDRESS
wrangler secret put MARKETING_WORKER_URL
wrangler secret put MARKETING_WORKER_SECRET
wrangler secret put SENTRY_DSN
wrangler secret put POSTHOG_API_KEY
wrangler secret put POSTHOG_HOST
wrangler secret put CAMAUDIT_SHARED_KEY
```

### 3.2 Deploy

```bash
cd workers/api
npm ci
npm run check
wrangler deploy
```

Attach the custom domain `api.lextract.io` to this Worker.

---

## 4. Frontend Worker

The frontend source lives in `frontend`.

Required production env:

```bash
NEXT_PUBLIC_API_URL=https://api.lextract.io/api/v1
NEON_AUTH_BASE_URL=https://<project-id>.neonauth.<region>.aws.neon.build/<database>/auth
NEON_AUTH_COOKIE_SECRET=<32+ character secret>
NEXT_PUBLIC_POSTHOG_KEY=<optional>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_SENTRY_DSN=<optional>
```

Deploy:

```bash
cd frontend
npm ci
npm run lint
npx tsc --noEmit
npm run build:cf
npm run deploy:cf
```

Attach custom domains `lextract.io` and `www.lextract.io`.

---

## 5. Stripe

1. Create products/prices for credit purchases.
2. Set `STRIPE_SECRET_KEY` on the API Worker.
3. Create or update the webhook endpoint to:

```text
https://api.lextract.io/api/v1/webhooks/stripe
```

4. Enable the checkout/payment events handled by the API Worker.
5. Set `STRIPE_WEBHOOK_SECRET` from that endpoint.

---

## 6. Verification Checklist

| Check | Command or URL | Expected |
|-------|----------------|----------|
| API health | `curl https://api.lextract.io/health` | `{"status":"ok"}` |
| Frontend | `https://lextract.io` | App loads over HTTPS |
| Signup | `https://lextract.io/signup` | Account created through Neon Auth |
| Upload | Upload a lease PDF | Extraction Workflow instance starts |
| Queue dispatch | Cloudflare Queues dashboard | Email and cleanup queues have no stuck backlog |
| Stripe webhook | Stripe dashboard | Webhook deliveries succeed with 2xx responses |
| Export | Download DOCX/XLSX/PDF | Export file is written to R2 and returned through the API |
| Logs | Cloudflare Workers logs | No repeated exceptions or poison queue messages |

---

## 7. Production Cutover

Use `docs/operations/cloudflare-api-cutover.md` for the final cutover runbook.

After cutover, keep watching Cloudflare Workers logs, Workflows, Queues, Stripe webhook deliveries,
Neon connection metrics, and R2 object operations for at least 24 hours.

---

## 8. Environment Variable Quick Reference

### API Worker

| Variable | Source | Example |
|----------|--------|---------|
| `ENVIRONMENT` | Manual | `production` |
| `FRONTEND_URL` | Manual | `https://lextract.io` |
| `PUBLIC_API_ORIGIN` | Manual | `https://api.lextract.io` |
| `ALLOWED_ORIGINS` | Manual | `https://lextract.io,https://www.lextract.io` |
| `NEON_AUTH_BASE_URL` | Neon Auth | `https://<id>.neonauth.<region>.aws.neon.build/neondb/auth` |
| `OPENROUTER_API_KEY` | OpenRouter | `sk-or-...` |
| `STRIPE_SECRET_KEY` | Stripe | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint | `whsec_...` |
| `RESEND_API_KEY` | Resend | `re_...` |
| `RESEND_FROM_ADDRESS` | Resend verified sender | `Lextract <support@lextract.io>` |
| `MARKETING_WORKER_URL` | Cloudflare Worker | `https://lextract-marketing-data.<account>.workers.dev` |
| `MARKETING_WORKER_SECRET` | Shared secret | `...` |
| `SENTRY_DSN` | Sentry | optional |
| `POSTHOG_API_KEY` | PostHog | optional |
| `POSTHOG_HOST` | PostHog | `https://us.i.posthog.com` |
| `CAMAUDIT_SHARED_KEY` | Internal shared secret | optional |

### Frontend Worker

| Variable | Source | Example |
|----------|--------|---------|
| `NEXT_PUBLIC_API_URL` | Manual | `https://api.lextract.io/api/v1` |
| `NEON_AUTH_BASE_URL` | Neon Auth | `https://<id>.neonauth.<region>.aws.neon.build/neondb/auth` |
| `NEON_AUTH_COOKIE_SECRET` | Generated secret | 32+ chars |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | optional |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry | optional |
