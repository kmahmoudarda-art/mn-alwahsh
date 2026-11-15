-- Run this once in the Supabase SQL Editor (Supabase dashboard -> SQL Editor -> New query).
-- Leaderboard for the solo mode: one row per signed-in player holding their
-- best score and the most levels they have completed in a single run.
-- Everyone can read the board; a player can only write their own row.

create table if not exists public.solo_scores (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  best_score    integer not null default 0,
  best_levels   integer not null default 0,   -- most levels completed in one run (max 90)
  completed_runs integer not null default 0,  -- how many full 90-level runs finished
  updated_at    timestamptz not null default now()
);

create index if not exists solo_scores_rank_idx
  on public.solo_scores (best_score desc, best_levels desc);

alter table public.solo_scores enable row level security;

drop policy if exists "Anyone can read solo scores" on public.solo_scores;
create policy "Anyone can read solo scores"
  on public.solo_scores for select using (true);

drop policy if exists "Users insert own solo score" on public.solo_scores;
create policy "Users insert own solo score"
  on public.solo_scores for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own solo score" on public.solo_scores;
create policy "Users update own solo score"
  on public.solo_scores for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
