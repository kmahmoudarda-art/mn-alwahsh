// Solo-mode leaderboard, stored in Supabase `solo_scores`
// (see supabase-migrations/solo_leaderboard.sql). One row per signed-in
// player: best score, and the most levels completed in a single run.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';
import { getValidSession } from './authClient';

const TABLE = `${SUPABASE_URL}/rest/v1/solo_scores`;

// Shown publicly on the board: the name chosen for the account if there is one,
// otherwise the part of the email before the @ (never the domain).
export function displayNameFor(user) {
  const meta = user?.user_metadata?.name || user?.user_metadata?.full_name;
  if (meta) return String(meta).slice(0, 24);
  const local = (user?.email || '').split('@')[0];
  return (local || 'لاعب').slice(0, 24);
}

// Rows saved earlier hold the old masked name; bring the signed-in player's own row up to date.
export async function syncDisplayName(user, rows) {
  try {
    const session = await getValidSession();
    if (!session?.access_token || !session?.user?.id) return false;
    const mine = (rows || []).find(r => r.user_id === session.user.id);
    const wanted = displayNameFor(user || session.user);
    if (!mine || mine.display_name === wanted) return false;
    const res = await fetch(`${TABLE}?user_id=eq.${session.user.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ display_name: wanted }),
    });
    return res.ok;
  } catch { return false; }
}

// Top players, best score first. Returns [] if the table isn't set up yet.
export async function fetchLeaderboard(limit = 30) {
  try {
    const res = await fetch(
      `${TABLE}?select=user_id,display_name,best_score,best_levels,completed_runs&order=best_score.desc,best_levels.desc&limit=${limit}`,
      { cache: 'no-store', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

// Called when a run ends (finished all 90, or lost a 600).
// Keeps the player's best score and their furthest level separately.
// Returns { saved, signedIn, newBest }.
export async function submitRun({ score, levels, finished, user }) {
  if (!(score > 0 || levels > 0)) return { saved: false, signedIn: true, newBest: false, skipped: true }; // nothing to record
  const session = await getValidSession();
  if (!session?.access_token || !session?.user?.id) return { saved: false, signedIn: false, newBest: false };
  const uid = session.user.id;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
  try {
    const cur = await fetch(`${TABLE}?select=best_score,best_levels,completed_runs&user_id=eq.${uid}`, { cache: 'no-store', headers });
    const rows = cur.ok ? await cur.json() : [];
    const prev = rows[0] || { best_score: 0, best_levels: 0, completed_runs: 0 };
    const row = {
      user_id: uid,
      display_name: displayNameFor(user || session.user),
      best_score: Math.max(prev.best_score, score),
      best_levels: Math.max(prev.best_levels, levels),
      completed_runs: prev.completed_runs + (finished ? 1 : 0),
      updated_at: new Date().toISOString(),
    };
    const res = await fetch(`${TABLE}?on_conflict=user_id`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row),
    });
    return { saved: res.ok, signedIn: true, newBest: score > prev.best_score };
  } catch {
    return { saved: false, signedIn: true, newBest: false };
  }
}
