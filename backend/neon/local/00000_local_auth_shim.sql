-- LOCAL DEVELOPMENT ONLY. Do not apply to Neon.
--
-- Neon's Data API provides the `auth` schema and `auth.user_id()` natively, so
-- the migrations in ../migrations/ reference them without creating them (see
-- the note at the top of 00001_initial_schema.sql). Plain Postgres has no such
-- schema, which makes 00002_rls_policies.sql and
-- 00010_extraction_pipeline_events.sql fail with `schema "auth" does not exist`.
--
-- This shim reproduces just enough of that surface for a local stack. It must
-- be applied BEFORE the numbered migrations:
--
--   psql "$LOCAL_DATABASE_URL" -f backend/neon/local/00000_local_auth_shim.sql
--   for f in backend/neon/migrations/*.sql; do psql "$LOCAL_DATABASE_URL" -f "$f"; done

CREATE SCHEMA IF NOT EXISTS auth;

-- Mirrors Neon's contract: returns the JWT `sub` claim as TEXT, or NULL when
-- there is no authenticated request context. RLS policies cast the result with
-- `auth.user_id()::uuid`, so returning NULL correctly denies access rather than
-- erroring.
-- NULLIF wraps current_setting BEFORE the ::json cast: an unset GUC returns
-- the empty string, and ''::json raises rather than yielding NULL.
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'sub';
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_id() TO authenticated;
