-- Lead magnet email captures and nurture scheduling
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL,
  magnet_slug TEXT NOT NULL,
  first_name TEXT,
  company TEXT,
  source TEXT,
  utm JSONB DEFAULT '{}',
  apollo_contact_id TEXT,
  nurture_step INT NOT NULL DEFAULT 0,
  nurture_next_send_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leads_email_magnet_uniq UNIQUE (email, magnet_slug)
);

CREATE INDEX IF NOT EXISTS leads_nurture_idx
  ON leads (nurture_next_send_at)
  WHERE unsubscribed_at IS NULL AND nurture_next_send_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_email_idx ON leads (email);
