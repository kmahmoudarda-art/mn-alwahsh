-- Run this once in the Supabase SQL Editor (Supabase dashboard -> SQL Editor -> New query).
-- Run AFTER report_questions.sql, which adds the report_count column these
-- policies protect.
--
-- Why this is needed: reportQuestion() in supabaseClient.js PATCHes
-- report_count (and, once a question crosses REPORT_THRESHOLD, DELETEs the
-- row) directly from the client using the anon key — there is no server
-- function in between. These question tables already have Row Level
-- Security enabled (so anon can SELECT questions but nothing else by
-- default), so without an explicit UPDATE/DELETE policy every report
-- silently fails with a 403/empty result and the "🚩 إبلاغ عن خطأ" button
-- never actually does anything — see reportQuestion()'s !getRes.ok /
-- !patchRes.ok paths, which is exactly what the app was hitting.
--
-- This mirrors the trust level the app already has elsewhere: anon already
-- has full read access to every question in these tables, so letting it
-- bump a report counter (and delete a question that's collected 50 reports)
-- isn't a bigger exposure than what already exists.
--
-- Deliberately does NOT touch ALTER TABLE ... ENABLE/DISABLE ROW LEVEL
-- SECURITY: these tables already serve reads to the app today, so RLS is
-- either already on (with a SELECT policy this migration leaves alone) or
-- off (in which case these policies are simply inert and something else is
-- blocking the report). Flipping RLS on blind here could lock out the
-- existing SELECT policy checks are wired around and break the game.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Sin-Jim1', 'Flags', 'Fanan', 'Fam', 'falsafa', 'logo1', 'logoo', 'kids']
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "anyone can report a question" ON %I', t
    );
    EXECUTE format(
      'CREATE POLICY "anyone can report a question" ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', t
    );

    EXECUTE format(
      'DROP POLICY IF EXISTS "anyone can remove an over-reported question" ON %I', t
    );
    EXECUTE format(
      'CREATE POLICY "anyone can remove an over-reported question" ON %I FOR DELETE TO anon, authenticated USING (true)', t
    );
  END LOOP;
END $$;
