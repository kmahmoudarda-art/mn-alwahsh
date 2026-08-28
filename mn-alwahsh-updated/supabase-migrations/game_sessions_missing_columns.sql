-- Run this once in the Supabase SQL Editor (Supabase dashboard -> SQL Editor -> New query).
--
-- Fixes a real bug: src/utils/supabaseClient.js's insertGameSession() and
-- updateGameSession() have always tried to write these columns, but the
-- table never actually had them — every insert has been failing silently
-- (caught, returns null), so every downstream updateGameSession() call
-- has also been silently no-op-ing (it checks `if (!id) return`). This
-- means per-game outcome data (winner, final scores, rough location) has
-- never actually been recorded, even though the app has been calling
-- this code on every single game the whole time.
--
-- The "games played" counter on the main page IS real (fetchGameCount()
-- does a genuine SELECT COUNT(*) with no fabrication) — but it's been
-- driven by a separate, working autosave mechanism (game_phase, teams,
-- answered_tiles, etc. — an unrelated write path already populating this
-- same table), not by this broken insert. So the count wasn't growing
-- from this particular code path at all until this migration is run.
--
-- Safe to re-run — IF NOT EXISTS means it won't error if a column is
-- already there.

ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS game_name   text;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS team1_name  text;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS team2_name  text;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS status      text;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS winner      text;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS team1_score integer;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS team2_score integer;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS ip_address  text;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS city        text;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS region      text;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS country     text;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS started_at  timestamptz;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS ended_at    timestamptz;
