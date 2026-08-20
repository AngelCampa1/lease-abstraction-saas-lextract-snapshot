-- Add soft-delete support to users for account deletion (DELETE /api/v1/user).
-- Nullable so existing rows are unaffected. A partial index keeps the common
-- "active users" lookups fast while the column is mostly NULL.
ALTER TABLE public.users ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_active
  ON public.users (id)
  WHERE deleted_at IS NULL;
