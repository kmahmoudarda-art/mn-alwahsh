const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cqqeyvhofbnvjemoihca.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWV5dmhvZmJudmplbW9paGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDg5ODIsImV4cCI6MjA5MjQ4NDk4Mn0.y_1B1Gy8EIEFpVrJu9TKX1fPSBfR1jFVrcgO1PA1-hs';

const TABLE = 'game_sessions';
const SESSION_TTL_HOURS = 24;
// Bump this version when categories/questions change to auto-invalidate old sessions
const SESSION_VERSION = 2;

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Prefer: 'return=minimal',
  };
}

function sessionId(gameName) {
  return gameName.trim().toLowerCase();
}

export async function saveSession(gameName, data) {
  const id = sessionId(gameName);
  const payload = {
    id,
    data: JSON.stringify({ ...data, _v: SESSION_VERSION }),
    saved_at: new Date().toISOString(),
  };
  // Upsert: insert or update by id
  await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      ...headers(),
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(payload),
  });
}

export async function loadSession(gameName) {
  const id = sessionId(gameName);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&limit=1`,
    { headers: headers() }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows.length) return null;
  const row = rows[0];
  // Check TTL
  if (row.saved_at) {
    const age = Date.now() - new Date(row.saved_at).getTime();
    if (age > SESSION_TTL_HOURS * 60 * 60 * 1000) {
      await clearSession(gameName);
      return null;
    }
  }
  try {
    const parsed = JSON.parse(row.data);
    // Invalidate sessions from older versions
    if (parsed._v !== SESSION_VERSION) {
      await clearSession(gameName);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearSession(gameName) {
  const id = sessionId(gameName);
  await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: headers() }
  );
}