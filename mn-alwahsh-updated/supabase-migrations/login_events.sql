-- Run this once in the Supabase SQL Editor.
--
-- Tracks which platform each sign-in came from, tied to the email used —
-- kept as a separate table from app_opens (which is deliberately
-- anonymous/unidentified) since this one does record who signed in.
--
-- Query for "did my testers sign in from Android or web":
--   select email, platform, count(*) as sign_ins, max(logged_at) as last_sign_in
--   from login_events
--   where logged_at >= now() - interval '14 days'
--   group by email, platform
--   order by last_sign_in desc;

CREATE TABLE IF NOT EXISTS login_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  logged_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL,
  platform text NOT NULL          -- 'android_app' or 'web'
);

ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log their own sign-in"
  ON login_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
