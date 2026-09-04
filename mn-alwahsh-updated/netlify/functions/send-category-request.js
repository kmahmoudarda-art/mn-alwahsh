// Sends a "request a new category" submission to the admin's email via
// Resend, and records it in Supabase's `category_requests` table using
// the requesting user's own access token (RLS-scoped — same pattern as
// entitlements.js, no service-role key needed for the DB write).
//
// Payment (25 AED) is NOT collected automatically here — the request form
// tells the player payment is arranged separately. The admin follows up
// with the requester directly, then once the category is actually added
// to the game, manually grants it to that specific user for free via a
// direct Supabase insert into `purchases` (category name, user_id from
// category_requests) — see the table's admin notes.
//
// REQUIRED Netlify environment variable: RESEND_API_KEY
// REQUIRED Supabase setup — run once in the SQL editor:
//
//   create table if not exists public.category_requests (
//     id uuid primary key default gen_random_uuid(),
//     user_id uuid not null references auth.users(id) on delete cascade,
//     user_email text,
//     category_name text not null,
//     details text,
//     status text not null default 'pending',
//     created_at timestamptz not null default now()
//   );
//
//   alter table public.category_requests enable row level security;
//
//   create policy "Users can insert own requests"
//     on public.category_requests for insert
//     with check (auth.uid() = user_id);
//
//   create policy "Users can view own requests"
//     on public.category_requests for select
//     using (auth.uid() = user_id);

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

  const { userId, accessToken, userEmail, categoryName, details } = body || {};
  if (!userId || !accessToken || !categoryName?.trim()) {
    return new Response(JSON.stringify({ error: 'missing-fields' }), { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'email-not-configured' }), { status: 500 });
  }

  // 1. Record it in Supabase FIRST — this is the durable record; if the
  // email fails afterward, the request itself isn't lost.
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/category_requests`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      user_email: userEmail || null,
      category_name: categoryName.trim(),
      details: details?.trim() || null,
    }),
  });
  if (!dbRes.ok) {
    const txt = await dbRes.text();
    console.error('[send-category-request] db insert failed:', txt);
    return new Response(JSON.stringify({ error: 'db-insert-failed' }), { status: 500 });
  }

  // 2. Email the admin — best-effort; the request is already saved above
  // even if this fails, so a flaky email send doesn't lose the request.
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Swap to a verified mnalwahsh.com sender once that domain is set
        // up in Resend — onboarding@resend.dev only works for testing.
        from: 'من الوحش <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `🎯 طلب فئة جديدة: ${categoryName.trim()}`,
        html: `
          <div style="font-family: Tahoma, Arial, sans-serif; direction: rtl; max-width: 480px; margin: 0 auto;">
            <h2 style="color:#8B0000;">🎯 طلب فئة جديدة</h2>
            <p><strong>الفئة المطلوبة:</strong> ${categoryName.trim()}</p>
            <p><strong>التفاصيل:</strong><br/>${(details || 'لا يوجد').trim().replace(/\n/g, '<br/>')}</p>
            <hr/>
            <p><strong>بريد المستخدم:</strong> ${userEmail || 'غير معروف'}</p>
            <p><strong>معرّف المستخدم (لازم لمنحه الفئة مجانًا لاحقًا):</strong><br/><code>${userId}</code></p>
            <p style="color:#888; font-size:12px;">السعر المتفق عليه: 25 درهم — يُرتّب الدفع يدويًا مع المستخدم مباشرة.</p>
          </div>
        `,
      }),
    });
    if (!emailRes.ok) {
      console.error('[send-category-request] email failed:', await emailRes.text());
    }
  } catch (e) {
    console.error('[send-category-request] email exception:', e);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
