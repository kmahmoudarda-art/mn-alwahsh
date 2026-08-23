// Minimal Supabase Auth (email + password) client — plain fetch, no SDK,
// to match the rest of this codebase's style (see supabaseClient.js).
//
// Session is persisted under a `mn_alwahsh_v3_` key on purpose: the startup
// cleanup routine in supabaseClient.js wipes every localStorage key that
// does NOT start with that prefix on every app launch. Any other prefix
// here would get silently deleted the moment the app reloads.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

const SESSION_KEY = 'mn_alwahsh_v3_auth_session';

// Access tokens expire in ~1 hour — refresh a bit before that so a signed-in
// person never sees a category lock itself back up just because their token
// went stale. _savedAt is when we stored this session, not a field GoTrue sends.
function saveSession(session) {
  const enriched = { ...session, _savedAt: Date.now() };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(enriched)); } catch {}
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

function isExpiringSoon(session) {
  if (!session?.expires_in || !session?._savedAt) return false; // unknown shape — let the API be the judge
  const expiresAtMs = session._savedAt + session.expires_in * 1000;
  return Date.now() > expiresAtMs - 60_000; // refresh a minute early
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

export async function refreshSession() {
  const session = getSession();
  if (!session?.refresh_token) return null;
  try {
    const data = await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    saveSession(data);
    return getSession();
  } catch {
    signOut(); // refresh token itself expired/invalid (e.g. unused for a long time) — nothing to do but sign out
    return null;
  }
}

// What entitlements.js (and anything else hitting the Supabase REST API)
// should call instead of getSession() directly — refreshes first if the
// current access token is stale, so a genuinely signed-in person never gets
// treated as logged out just because an hour passed.
export async function getValidSession() {
  let session = getSession();
  if (!session?.access_token) return null;
  if (isExpiringSoon(session)) {
    session = await refreshSession();
  }
  return session;
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

// Call once at app startup (see main.jsx). Supabase's email confirmation
// link redirects back to whatever "Site URL" is set in the Supabase
// project's Auth settings, landing with tokens in the URL hash, e.g.
//   https://yoursite.com/#access_token=...&refresh_token=...&type=signup
// This reads that, establishes the session, and strips the hash from the
// address bar. Returns true if it actually found and consumed a redirect.
//
// NOTE: this only helps once "Site URL" in Supabase → Authentication →
// URL Configuration is set to the real site domain. If that's still the
// default (localhost, or unset), the confirmation link never reaches this
// site at all — the error happens on Supabase's side before this code runs.
export async function handleAuthRedirect() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) return false;

  const params = new URLSearchParams(hash.slice(1));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token) return false;

  let user = null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${access_token}` },
    });
    if (res.ok) user = await res.json();
  } catch {}

  saveSession({
    access_token,
    refresh_token,
    expires_in: parseInt(params.get('expires_in') || '3600', 10),
    token_type: params.get('token_type') || 'bearer',
    user,
  });

  // Remove the tokens from the visible URL/history without a reload
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return true;
}

