// Which premium categories the signed-in user has unlocked — backed by a
// real Supabase table (`purchases`), scoped to their account via Row Level
// Security. This is what makes an unlock survive across devices and work
// on both the website and the packaged app, unlike the old localStorage-only
// version.
//
// STATUS — web purchases are now real, Android app purchases are not yet:
// As of the Ziina integration (netlify/functions/create-ziina-payment.js +
// confirm-ziina-payment.js), the website's unlock flow (CategoryPicker.jsx)
// no longer calls the two grant functions below directly — it redirects to
// Ziina's hosted checkout, and only inserts into `purchases` after
// confirm-ziina-payment.js has independently verified the payment
// server-side (via Ziina's API, checking both status AND amount). That
// insert still uses the signed-in user's OWN access token against the same
// RLS policy below — no service-role key needed, since the security fix
// was "gate the insert on a verified payment", not "bypass RLS".
//
// grantCategoryToCurrentUser() and grantAllCategoriesToCurrentUser() below
// are now unused by the main flow, kept only as a manual/admin-style
// escape hatch. They still have NO payment check — calling either one
// yourself instantly grants a category — so don't wire them back into any
// unlock UI without the same payment-verification step confirm-ziina-payment
// does.
//
// The Android app's Google Play Billing purchases still need the
// equivalent of confirm-ziina-payment.js — verifying the purchase token
// server-side via the Google Play Developer API before inserting.
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
import { PREMIUM_CATEGORIES } from './premiumConfig';

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

// TEMPORARY — same caveat as above, no payment verification yet. Grants
// every category currently in PREMIUM_CATEGORIES (premiumConfig.js) to
// this account in one batch insert, for the ALL_CATEGORIES_PRICE bundle.
export async function grantAllCategoriesToCurrentUser() {
  const session = await getValidSession();
  if (!session?.access_token || !session?.user?.id) throw new Error('not-signed-in');
  const rows = Object.keys(PREMIUM_CATEGORIES).map((category) => ({
    user_id: session.user.id, category, platform: 'web',
  }));
  const res = await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'unlock-all-failed');
  }
}
