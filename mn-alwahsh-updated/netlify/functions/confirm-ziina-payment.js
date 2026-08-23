// Verifies a Ziina payment actually completed, then grants it. Called from
// the /payment-result page the browser lands on after Ziina's hosted
// checkout (see create-ziina-payment.js for how that URL is built, and
// src/pages/PaymentResult.jsx for the page that calls this).
//
// Deliberately re-checks the amount against premiumConfig.js server-side
// rather than trusting the "kind"/"category" query params on their own —
// those are just routing hints, not proof of what was actually paid.
//
// For 'category' and 'all', this inserts into Supabase's `purchases` table
// using the SIGNED-IN USER'S OWN access token (passed up from the client),
// not a service-role key — the existing RLS policy already lets a user
// insert their own purchase row (see entitlements.js), so no extra
// privileged credential needs to be managed here. The only thing this
// function adds is gating that insert on a real, server-verified payment.
//
// For 'trial', nothing is written to Supabase at all — it's a one-game
// unlock, so this just confirms payment and tells the client to set local
// state (see PaymentResult.jsx).
//
// REQUIRED Netlify environment variables — same ZIINA_ACCESS_TOKEN as
// create-ziina-payment.js, plus:
//   SUPABASE_URL, SUPABASE_ANON_KEY — same values already hardcoded as
//   fallbacks in src/utils/supabaseClient.js; fine to reuse those here.

import { PREMIUM_CATEGORIES, ALL_CATEGORIES_PRICE, TRIAL_PRICE, isPremiumCategory } from '../../src/utils/premiumConfig.js';

const ZIINA_API = 'https://api-v2.ziina.com/api/payment_intent';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cqqeyvhofbnvjemoihca.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWV5dmhvZmJudmplbW9paGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDg5ODIsImV4cCI6MjA5MjQ4NDk4Mn0.y_1B1Gy8EIEFpVrJu9TKX1fPSBfR1jFVrcgO1PA1-hs';

function expectedFilsFor(kind, category) {
  if (kind === 'all') return ALL_CATEGORIES_PRICE * 100;
  if (kind === 'trial') return TRIAL_PRICE * 100;
  if (kind === 'category') {
    if (!isPremiumCategory(category)) return null;
    return PREMIUM_CATEGORIES[category] * 100;
  }
  return null;
}

async function insertPurchases(accessToken, userId, categories) {
  const rows = categories.map((category) => ({ user_id: userId, category, platform: 'web' }));
  const res = await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  return res.ok;
}

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

  const { intentId, kind, category, userId, accessToken } = body || {};
  if (!intentId || !userId || !['category', 'all', 'trial'].includes(kind)) {
    return new Response(JSON.stringify({ error: 'missing-fields' }), { status: 400 });
  }
  if (kind !== 'trial' && !accessToken) {
    return new Response(JSON.stringify({ error: 'missing-access-token' }), { status: 400 });
  }

  const expectedFils = expectedFilsFor(kind, category);
  if (!expectedFils) {
    return new Response(JSON.stringify({ error: 'unknown-price' }), { status: 400 });
  }

  try {
    const ziinaRes = await fetch(`${ZIINA_API}/${intentId}`, {
      headers: { Authorization: `Bearer ${process.env.ZIINA_ACCESS_TOKEN}` },
    });
    if (!ziinaRes.ok) {
      return new Response(JSON.stringify({ error: 'ziina-lookup-failed' }), { status: 502 });
    }
    const intent = await ziinaRes.json();

    if (intent.status !== 'completed') {
      return new Response(JSON.stringify({ ok: false, status: intent.status }), { status: 200 });
    }
    if (intent.amount !== expectedFils) {
      console.error('[confirm-ziina-payment] amount mismatch', { got: intent.amount, expected: expectedFils });
      return new Response(JSON.stringify({ error: 'amount-mismatch' }), { status: 400 });
    }

    if (kind === 'trial') {
      // Nothing to persist — client sets a local, one-game-only unlock.
      return new Response(JSON.stringify({ ok: true, trial: category }), { status: 200 });
    }

    const categoriesToGrant = kind === 'all' ? Object.keys(PREMIUM_CATEGORIES) : [category];
    const granted = await insertPurchases(accessToken, userId, categoriesToGrant);
    if (!granted) {
      return new Response(JSON.stringify({ error: 'grant-failed' }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, granted: categoriesToGrant }), { status: 200 });
  } catch (e) {
    console.error('[confirm-ziina-payment] failed:', e);
    return new Response(JSON.stringify({ error: 'internal-error' }), { status: 500 });
  }
};
