// Which premium categories the signed-in user has unlocked — backed by a
// real Supabase table (`purchases`), scoped to their account via Row Level
// Security. This is what makes an unlock survive across devices and work
// on both the website and the packaged app, unlike the old localStorage-only
// version.
//
// ⚠️ SECURITY NOTE — read before relying on this for real money:
// grantCategoryToCurrentUser() below inserts a row directly from the
// browser once the person is signed in. RLS only checks "is this your own
// row", not "did you actually pay" — so right now, any signed-in user could
// call this for any premium category and get it for free (e.g. via browser
// devtools). This is fine for testing the account/unlock flow, but before
// this handles real payments:
//   - Web: a Stripe webhook (running server-side, e.g. a Supabase Edge
//     Function) should verify the payment, THEN insert the row — not the
//     browser.
//   - App: after a Google Play Billing purchase, verify the purchase token
//     server-side (Google Play Developer API) before inserting.
// Once that's in place, remove the client "insert" RLS policy (see the SQL
// below) so only the server can write to this table.
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
