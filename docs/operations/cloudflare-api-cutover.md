# Cloudflare API Cutover Runbook

Use this checklist when moving `api.lextract.io` from the legacy backend to the Cloudflare-native API Worker.

## Pre-Cutover Checks

- Confirm all Neon migrations are applied through the current head.
- Confirm `NEXT_PUBLIC_API_URL=https://api.lextract.io/api/v1` is configured for the frontend Worker.
- Confirm Stripe is in live mode and the webhook signing secret is available.
- Confirm Cloudflare logs are enabled for the API Worker.
- Confirm rollback ownership: DNS/custom domain, Stripe webhook endpoint, and Worker deploy access.

## Cutover Checklist

1. Create Hyperdrive for the Neon pooled connection.
2. Create the R2 bucket binding to the existing `lextract-documents` bucket.
3. Create Workflows bindings for `EXTRACTION_WORKFLOW` and `EXPORT_WORKFLOW`.
4. Create Queues and DLQs for `lextract-email` and `lextract-cleanup`.
5. Set Worker secrets with `wrangler secret put` for auth, OpenRouter, Stripe, Resend, marketing Worker, observability, and optional CamAudit integration.
6. Deploy the `lextract-api` Worker with `cd workers/api && npm run check && wrangler deploy`.
7. Move the `api.lextract.io` custom domain to the Worker.
8. Update the Stripe webhook endpoint if required so events post to `https://api.lextract.io/api/v1/webhooks/stripe`.
9. Run smoke tests:
   - `curl https://api.lextract.io/health`
   - signup/login through `https://lextract.io`
   - upload one lease PDF
   - verify the extraction Workflow completes
   - download one export
   - run one Stripe test-mode payment in staging before live cutover
10. Stop Railway web, worker, and Redis services.
11. Confirm no requests hit Railway for 24 hours.
12. Delete Railway project/resources.

## Rollback

Rollback should be DNS/webhook based:

- Repoint `api.lextract.io` to the previous backend target if the API Worker has a blocker.
- Repoint the Stripe webhook endpoint to the previous backend URL if payment webhooks fail.
- Keep the Cloudflare Worker deployed during rollback so logs and failed requests remain inspectable.

Do not roll back database migrations during the first response window unless a migration is the confirmed root cause.
