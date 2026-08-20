DROP INDEX IF EXISTS marketing_leads_nurture_due_idx;
DROP INDEX IF EXISTS nurture_deliveries_lead_step_idx;
DROP TABLE IF EXISTS nurture_deliveries;
ALTER TABLE marketing_leads DROP COLUMN nurture_step;
ALTER TABLE marketing_leads DROP COLUMN nurture_next_send_at;
