-- Run this once in the Supabase SQL Editor (Supabase dashboard -> SQL Editor -> New query).
-- Adds a report_count column to every question table so the "report this
-- question" button in the app has something to increment. Safe to re-run —
-- IF NOT EXISTS means it won't error if a column is already there.

ALTER TABLE "Sin-Jim1" ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;
ALTER TABLE "Flags"    ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;
ALTER TABLE "Fanan"    ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;
ALTER TABLE "Fam"      ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;
ALTER TABLE "falsafa"  ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;
ALTER TABLE "logo1"    ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;
ALTER TABLE "logoo"    ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;
ALTER TABLE "kids"     ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;
