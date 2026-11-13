-- Run once in the Supabase SQL Editor. Safe to re-run.
-- "Guess the song" now plays Apple's official 30s preview, looked up at play
-- time by iTunes track id. (The old youtube_id/audio_* columns are unused.)
ALTER TABLE "Fanan" ADD COLUMN IF NOT EXISTS itunes_id bigint;
