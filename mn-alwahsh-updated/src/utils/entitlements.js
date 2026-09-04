// Which premium categories the signed-in user has unlocked — backed by a
// real Supabase table (`purchases`), scoped to their account via Row Level
// Security. This is what makes an unlock survive across devices and work
// wherever the signed-in user plays.
//
// STATUS — purchasing is Google Play Billing only now (see
// playProducts.js, playBillingClient.js). CategoryPicker.jsx's unlock flow
// calls buyAndGrant(), which purchases via Play Billing then hits
// netlify/functions/verify-play-purchase.js — that function independently
// verifies the purchase against the real Google Play Developer API
// (status + acknowledgement) before inserting into `purchases`, using the
// signed-in user's OWN access token against the RLS policy below — no
// service-role key needed.
//
// grantCategoryToCurrentUser() and grantAllCategoriesToCurrentUser() below
// are UNUSED by the main flow, kept only as a manual/admin-style escape
// hatch. They still have NO payment check — calling either one yourself
// instantly grants a category — so don't wire them back into any unlock UI
// without the same verification step verify-play-purchase.js does.
//
// REQUIRED SETUP — run this once in the Supabase SQL editor:
//
//   create table if not exists public.purchases (
//     id uuid primary key default gen_random_uuid(),
//     user_id uuid not null references auth.users(id) on delete cascade,
//     category text not null,
//     platform text default 'web',
//     purchased_at timestamptz not null default now(),
//     unique (user_id, category)
//   );
//
//   alter table public.purchases enable row level security;
//
//   create policy "Users can view own purchases"
//     on public.purchases for select
//     using (auth.uid() = user_id);
//
//   create policy "Users can insert own purchases"
//     on public.purchases for insert
//     with check (auth.uid() = user_id);
//
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';
import { getValidSession } from './authClient';

// Returns the list of premium category names this signed-in user owns.
// Empty array if not signed in, table doesn't exist yet, or on any error —
// callers should treat that as "nothing unlocked", not throw up an error screen.
export async function fetchUnlockedCategories() {
  const session = await getValidSession(); // refreshes the token first if it's gone stale
  if (!session?.access_token || !session?.user?.id) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/purchases?select=category&user_id=eq.${session.user.id}`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` } }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows.map(r => r.category) : [];
  } catch {
    return [];
  }
}

// TEMPORARY — see the security note above. Grants immediately, no payment.
export async function grantCategoryToCurrentUser(category) {
  const session = await getValidSession();
  if (!session?.access_token || !session?.user?.id) throw new Error('not-signed-in');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ user_id: session.user.id, category, platform: 'web' }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'unlock-failed');
  }
}

// TEMPORARY — same caveat as above, no payment verification yet. Grants a
// single '__ALL__' sentinel row (see verify-play-purchase.js for why —
// this makes the grant automatically cover any category added later, not
// just what exists in PREMIUM_CATEGORIES right now).
export async function grantAllCategoriesToCurrentUser() {
  const session = await getValidSession();
  if (!session?.access_token || !session?.user?.id) throw new Error('not-signed-in');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ user_id: session.user.id, category: '__ALL__', platform: 'web' }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'unlock-all-failed');
  }
}
