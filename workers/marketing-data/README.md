# Lextract Marketing Data Worker

Dedicated Cloudflare Worker for marketing-only persistence, lead-magnet fulfillment,
and forwarding follow-up enrollment to Ventora Sequencer.

## Setup

1. Create the D1 database:

   ```bash
   cd workers/marketing-data
   npx wrangler d1 create lextract-marketing
   ```

2. Put the returned database id in `wrangler.jsonc`.

3. Apply migrations:

   ```bash
   npx wrangler d1 migrations apply lextract-marketing --remote
   ```

4. Configure secrets:

   ```bash
   npx wrangler secret put MARKETING_WORKER_SECRET
   npx wrangler secret put RESEND_API_KEY
   ```

5. Backfill existing Neon leads:

   ```bash
   NEON_DATABASE_URL="postgresql://..." \
     python scripts/backfill_neon_leads_to_d1.py --output /tmp/lextract-marketing-backfill.sql
   npx wrangler d1 execute lextract-marketing --remote --file /tmp/lextract-marketing-backfill.sql
   npx wrangler d1 execute lextract-marketing --remote --command "SELECT COUNT(*) AS count FROM marketing_leads;"
   ```

Only apply `backend/neon/migrations/00011_drop_marketing_leads.sql` after
production traffic is writing to D1 and D1 counts have been verified against
the Neon source table.
