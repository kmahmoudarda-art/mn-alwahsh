-- Run this once in the Supabase SQL Editor (Supabase dashboard -> SQL Editor -> New query).
--
-- Creates an app_opens table: one row per time the app is actually opened
-- (fires once per app launch, from App.jsx — see logAppOpen() in
-- supabaseClient.js). This is a first-party, honest signal of real usage —
-- separate from game_sessions (which only fires if someone actually starts
-- a game) and from Play Console's own dashboards (which several sources,
-- including PrimeTestLab's own blog post, suggest can under-report or lag
-- for TWA apps). Nothing here can be faked by a third party or broken by
-- Play Console UI changes.
--
-- No PII beyond a coarse platform flag and the browser's own user-agent
-- string (the same category of info Play Console already shows you per
-- device anyway) — no IP, no account identity required.

CREATE TABLE IF NOT EXISTS app_opens (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  opened_at timestamptz NOT NULL DEFAULT now(),
  platform text NOT NULL,          -- 'android_app' or 'web'
  user_agent text
);

-- Row Level Security: anyone (including anonymous/unauthenticated visitors)
-- can INSERT an open event, but nobody can read, update, or delete via the
-- public API — you'll only ever query this yourself from the SQL Editor,
-- which bypasses RLS as the table owner.
ALTER TABLE app_opens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log an app open"
  ON app_opens FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
