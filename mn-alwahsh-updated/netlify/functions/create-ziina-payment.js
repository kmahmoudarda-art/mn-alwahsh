// Creates a Ziina payment intent for one of the three purchase options on
// the unlock prompt (see CategoryPicker.jsx): a single category, the
// all-categories bundle, or the per-game 1 AED trial.
//
// Runs server-side so the Ziina access token (ZIINA_ACCESS_TOKEN) never
// reaches the browser, and so the price actually charged is looked up
// here from premiumConfig.js — not trusted from whatever the client sends.
//
// REQUIRED Netlify environment variables (Site settings -> Environment
// variables in the Netlify dashboard):
//   ZIINA_ACCESS_TOKEN — from Ziina's dashboard, "Custom integration" ->
//     generate access token. Needs the write_payment_intents scope.
//   SITE_URL — e.g. https://mnalwahsh.com (no trailing slash). Used to
//     build the success/cancel/failure redirect URLs.

import { PREMIUM_CATEGORIES, ALL_CATEGORIES_PRICE, TRIAL_PRICE, isPremiumCategory } from '../../src/utils/premiumConfig.js';

const ZIINA_API = 'https://api-v2.ziina.com/api/payment_intent';

function priceInFilsFor(kind, category) {
  if (kind === 'all') return ALL_CATEGORIES_PRICE * 100;
  if (kind === 'trial') return TRIAL_PRICE * 100;
  if (kind === 'category') {
    if (!isPremiumCategory(category)) return null;
    return PREMIUM_CATEGORIES[category] * 100;
  }
  return null;
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

  const { kind, category, userId } = body || {};
  if (!userId || !['category', 'all', 'trial'].includes(kind)) {
    return new Response(JSON.stringify({ error: 'missing-fields' }), { status: 400 });
  }
  if (kind === 'category' && !category) {
    return new Response(JSON.stringify({ error: 'missing-category' }), { status: 400 });
  }

  const amount = priceInFilsFor(kind, category);
  if (!amount) {
    return new Response(JSON.stringify({ error: 'unknown-price' }), { status: 400 });
  }

  const siteUrl = process.env.SITE_URL || 'https://mnalwahsh.com';
  const returnParams = new URLSearchParams({ kind, uid: userId, ...(category ? { category } : {}) });
  // {PAYMENT_INTENT_ID} is a Ziina placeholder — it substitutes the real id
  // into the URL it redirects the browser to.
  const successUrl = `${siteUrl}/payment-result?intent={PAYMENT_INTENT_ID}&status=success&${returnParams.toString()}`;
  const cancelUrl = `${siteUrl}/payment-result?status=cancelled`;
  const failureUrl = `${siteUrl}/payment-result?status=failed`;

  const messageMap = {
    category: `فتح فئة: ${category}`,
    all: 'فتح جميع الفئات المميزة',
    trial: `تجربة فئة لهذه اللعبة: ${category}`,
  };

  try {
    const ziinaRes = await fetch(ZIINA_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ZIINA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency_code: 'AED',
        message: messageMap[kind],
        success_url: successUrl,
        cancel_url: cancelUrl,
        failure_url: failureUrl,
      }),
    });

    if (!ziinaRes.ok) {
      const errText = await ziinaRes.text();
      console.error('[create-ziina-payment] Ziina error:', ziinaRes.status, errText);
      return new Response(JSON.stringify({ error: 'ziina-request-failed' }), { status: 502 });
    }

    const intent = await ziinaRes.json();
    return new Response(JSON.stringify({ redirect_url: intent.redirect_url, id: intent.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[create-ziina-payment] failed:', e);
    return new Response(JSON.stringify({ error: 'internal-error' }), { status: 500 });
  }
};
