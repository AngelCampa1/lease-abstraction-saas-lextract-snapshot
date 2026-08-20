-- Add email column to anonymous_sessions for email gate lead capture.
-- Nullable so existing sessions are unaffected.
ALTER TABLE public.anonymous_sessions ADD COLUMN email TEXT;
