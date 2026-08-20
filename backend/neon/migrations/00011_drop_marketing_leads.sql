-- Apply only after the Cloudflare D1 marketing Worker is deployed,
-- production marketing routes write to D1, and row counts have been verified.
DROP TABLE IF EXISTS leads;
