-- Run once in the Supabase SQL Editor.
-- Adds YouTube-embed fields for the "خمن الأغنية" (Guess the Song) category.
-- Song rows live in the existing "Fanan" (music) table, so no app plumbing for
-- a new table is needed. Safe to re-run.
--   youtube_id     : the 11-char YouTube video id (the part after v=)
--   audio_start    : second to start playing from
--   audio_duration : how many seconds to play (player stops after this)

ALTER TABLE "Fanan" ADD COLUMN IF NOT EXISTS youtube_id text;
ALTER TABLE "Fanan" ADD COLUMN IF NOT EXISTS audio_start integer NOT NULL DEFAULT 0;
ALTER TABLE "Fanan" ADD COLUMN IF NOT EXISTS audio_duration integer NOT NULL DEFAULT 12;

-- Example row (replace the id/start with a real song, then add 3 wrong answers).
-- Match the columns your Fanan table already uses for options/correct answer
-- (look at an existing row in the Table Editor and copy its shape):
--
-- INSERT INTO "Fanan" (category, points, question, option_a, option_b, option_c, option_d, correct_answer,
--                      youtube_id, audio_start, audio_duration, used)
-- VALUES ('خمن الأغنية', 200, 'ما اسم هذه الأغنية؟', 'Song A', 'Song B', 'Song C', 'Song D', 'Song A',
--         'VIDEO_ID_HERE', 30, 12, false);
