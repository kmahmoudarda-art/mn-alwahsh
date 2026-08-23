// Minimal Supabase Auth (email + password) client — plain fetch, no SDK,
// to match the rest of this codebase's style (see supabaseClient.js).
//
// Session is persisted under a `mn_alwahsh_v3_` key on purpose: the startup
// cleanup routine in supabaseClient.js wipes every localStorage key that
// does NOT start with that prefix on every app launch. Any other prefix
// here would get silently deleted the moment the app reloads.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

const SESSION_KEY = 'mn_alwahsh_v3_auth_session';

function saveSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  return getSession()?.user || null;
}

export function isSignedIn() {
  return !!getSession()?.access_token;
}

async function authRequest(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || data.error || 'Authentication failed');
  }
  return data;
}

// Returns { needsEmailConfirmation: true } if the Supabase project has
// "Confirm email" turned on (Auth settings) — in that case there's no
// session yet until the person clicks the link in their inbox.
export async function signUp(email, password) {
  const data = await authRequest('signup', { email, password });
  if (data.access_token) {
    saveSession(data);
    return { needsEmailConfirmation: false, user: data.user };
  }
  return { needsEmailConfirmation: true };
}

export async function signIn(email, password) {
  const data = await authRequest('token?grant_type=password', { email, password });
  saveSession(data);
  return data.user;
}

export function signOut() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}
