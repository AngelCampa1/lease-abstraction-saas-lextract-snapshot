CREATE TABLE IF NOT EXISTS marketing_leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  primary_source TEXT,
  first_magnet_slug TEXT,
  apollo_contact_id TEXT,
  nurture_step INTEGER NOT NULL DEFAULT 0,
  nurture_next_send_at TEXT,
  unsubscribed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketing_leads_nurture_due_idx
  ON marketing_leads (nurture_next_send_at)
  WHERE unsubscribed_at IS NULL AND nurture_next_send_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS marketing_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source TEXT,
  magnet_slug TEXT,
  tool_slug TEXT,
  utm_json TEXT NOT NULL DEFAULT '{}',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS marketing_events_lead_created_idx
  ON marketing_events (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS marketing_events_type_created_idx
  ON marketing_events (event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS nurture_deliveries (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  magnet_slug TEXT NOT NULL,
  status TEXT NOT NULL,
  message_id TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS nurture_deliveries_lead_step_idx
  ON nurture_deliveries (lead_id, step);
