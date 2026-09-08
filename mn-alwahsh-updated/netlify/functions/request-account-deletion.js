// Sends an account-deletion request to the admin's email via Resend, and
// logs it in a new `account_deletion_requests` Supabase table (RLS-scoped
// insert using the requester's own access token — same pattern as
// send-category-request.js and entitlements.js).
//
// This does NOT delete the account automatically — Google Play's Account
// Deletion policy requires an in-app way to INITIATE a deletion request,
// which this satisfies; the admin follows through on the actual deletion
// (removing the Supabase auth user + purchases rows) within a reasonable
// window, matching the message shown to the player.
//
// REQUIRED Netlify environment variable: RESEND_API_KEY (already set up
// for send-category-request.js)
// REQUIRED Supabase setup — run once in the SQL editor:
//
//   create table if not exists public.account_deletion_requests (
//     id uuid primary key default gen_random_uuid(),
//     user_id uuid not null references auth.users(id) on delete cascade,
//     user_email text,
//     status text not null default 'pending',
//     created_at timestamptz not null default now()
//   );
//
//   alter table public.account_deletion_requests enable row level security;
//
//   create policy "Users can insert own deletion request"
//     on public.account_deletion_requests for insert
//     with check (auth.uid() = user_id);
//
// To actually fulfil a request once it arrives, run in Supabase:
//   delete from purchases where user_id = 'their-user-id';
//   delete from auth.users where id = 'their-user-id';  -- cascades to profile-linked data

const ADMIN_EMAIL = 'kmahmoudarda@gmail.com';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cqqeyvhofbnvjemoihca.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWV5dmhvZmJudmplbW9paGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDg5ODIsImV4cCI6MjA5MjQ4NDk4Mn0.y_1B1Gy8EIEFpVrJu9TKX1fPSBfR1jFVrcgO1PA1-hs';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method-not-allowed' }), { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid-json' }), { status: 400 });
  }

  const { userId, accessToken, userEmail } = body || {};
  if (!userId || !accessToken) {
    return new Response(JSON.stringify({ error: 'missing-fields' }), { status: 400 });
  }

  // 1. Record it in Supabase FIRST — durable record even if email fails.
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/account_deletion_requests`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId, user_email: userEmail || null }),
  });
  if (!dbRes.ok) {
    console.error('[request-account-deletion] db insert failed:', await dbRes.text());
    // Still try the email below — the request shouldn't silently vanish
    // just because the DB write failed.
  }

  // 2. Email the admin — best-effort.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'من الوحش <onboarding@resend.dev>',
          to: [ADMIN_EMAIL],
          subject: '🗑️ طلب حذف حساب',
          html: `
            <div style="font-family: Tahoma, Arial, sans-serif; direction: rtl; max-width: 480px; margin: 0 auto;">
              <h2 style="color:#8B0000;">🗑️ طلب حذف حساب</h2>
              <p>مستخدم طلب حذف حسابه وجميع بياناته من داخل التطبيق.</p>
              <hr/>
              <p><strong>بريد المستخدم:</strong> ${userEmail || 'غير معروف'}</p>
              <p><strong>معرّف المستخدم:</strong><br/><code>${userId}</code></p>
              <p style="color:#888; font-size:12px;">احذف حسابه من Supabase (auth.users) وأي صفوف مرتبطة به في purchases خلال أيام قليلة.</p>
            </div>
          `,
        }),
      });
      if (!emailRes.ok) {
        console.error('[request-account-deletion] email failed:', await emailRes.text());
      }
    } catch (e) {
      console.error('[request-account-deletion] email exception:', e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
