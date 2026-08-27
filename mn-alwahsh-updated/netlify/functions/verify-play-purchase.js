// Verifies a Google Play Billing purchase actually happened, acknowledges
// it, then grants it — the Play Billing equivalent of confirm-ziina-payment.js
// (removed; this replaces it as the only purchase path now that the app is
// Play-only, see PLAY_BILLING_SETUP.md).
//
// Called from the client right after purchaseWithPlayBilling() in
// playBillingClient.js returns a purchaseToken. Deliberately re-verifies
// against Google's own API rather than trusting the client's "it worked" —
// a purchaseToken on its own proves nothing until Google confirms it.
//
// For 'category' and 'all' SKUs, this inserts into Supabase's `purchases`
// table using the SIGNED-IN USER'S OWN access token (passed up from the
// client), same RLS-based approach the old Ziina function used — no
// service-role key needed.
//
// For the trial SKU, nothing is written to Supabase — it's a one-game
// unlock, so this just confirms payment and tells the client which
// category to unlock locally for this game only.
//
// CRITICAL — Google auto-refunds any unacknowledged purchase after 3 days.
// This function MUST call the Play Developer API's acknowledge endpoint on
// every successful verification, not just read the purchase state.
//
// REQUIRED Netlify environment variables:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY —
//     from a service account with access to this app in Play Console
//     (Setup > API access > link/create a service account, grant it
//     "View app information" + "Manage orders and subscriptions" —
//     Financial data permission — for this specific app).
//   ANDROID_PACKAGE_NAME — must match assetlinks.json, e.g. com.mnalwahsh.twa
//   SUPABASE_URL, SUPABASE_ANON_KEY — same values already used elsewhere.

import { PLAY_PRODUCT_MAP, ALL_CATEGORIES_SKU, TRIAL_SKU } from '../../src/utils/playProducts.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cqqeyvhofbnvjemoihca.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWV5dmhvZmJudmplbW9paGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDg5ODIsImV4cCI6MjA5MjQ4NDk4Mn0.y_1B1Gy8EIEFpVrJu9TKX1fPSBfR1jFVrcgO1PA1-hs';
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || 'com.mnalwahsh.twa';
const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

// --- Google OAuth2 (service account JWT -> access token) ---------------
// No googleapis/google-auth-library dependency — just enough hand-rolled
// JWT + token exchange to keep this function's bundle small. Node's
// built-in crypto module signs the JWT (RS256).
async function getGoogleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) throw new Error('missing-google-service-account-env');
  const privateKey = rawKey.replace(/\\n/g, '\n');

  const { createSign } = await import('node:crypto');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: email,
    scope: ANDROID_PUBLISHER_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64url(header)}.${b64url(claimSet)}`;

  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey).toString('base64url');
  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    throw new Error(`google-token-exchange-failed: ${txt}`);
  }
  const { access_token } = await tokenRes.json();
  return access_token;
}

// --- Android Publisher API calls ----------------------------------------
async function getPurchase(accessToken, productId, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`play-purchase-lookup-failed: ${res.status} ${txt}`);
  }
  return res.json();
}

async function acknowledgePurchase(accessToken, productId, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}:acknowledge`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  // Google returns 200 with an empty body on success. A 400 here often just
  // means it was already acknowledged (e.g. a retried request) — not fatal.
  return res.ok;
}

// Consuming a managed product makes it purchasable again — required for
// TRIAL_SKU specifically, since it's meant to be bought repeatedly (one
// trial per game), unlike category/bundle purchases which should stay
// permanently owned and never be consumed. Consuming also counts as
// acknowledging (Google treats a consumed purchase as acknowledged), so
// this replaces the acknowledge call for trial purchases rather than
// needing both.
async function consumePurchase(accessToken, productId, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}:consume`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  return res.ok;
}

// --- Supabase insert (mirrors entitlements.js's grant logic) -----------
async function insertPurchases(accessToken, userId, categories) {
  const rows = categories.map((category) => ({ user_id: userId, category, platform: 'android' }));
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

function categoriesForSku(sku) {
  if (sku === ALL_CATEGORIES_SKU) {
    return Object.values(PLAY_PRODUCT_MAP).flatMap((info) => info.categories);
  }
  const info = PLAY_PRODUCT_MAP[sku];
  return info ? info.categories : null;
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

  const { sku, purchaseToken, userId, accessToken, trialCategory } = body || {};
  if (!sku || !purchaseToken || !userId) {
    return new Response(JSON.stringify({ error: 'missing-fields' }), { status: 400 });
  }
  const isTrial = sku === TRIAL_SKU;
  if (!isTrial && !accessToken) {
    return new Response(JSON.stringify({ error: 'missing-access-token' }), { status: 400 });
  }
  if (isTrial && !trialCategory) {
    return new Response(JSON.stringify({ error: 'missing-trial-category' }), { status: 400 });
  }

  const categoriesToGrant = isTrial ? null : categoriesForSku(sku);
  if (!isTrial && !categoriesToGrant) {
    return new Response(JSON.stringify({ error: 'unknown-sku' }), { status: 400 });
  }

  try {
    const googleAccessToken = await getGoogleAccessToken();
    const purchase = await getPurchase(googleAccessToken, sku, purchaseToken);

    // purchaseState: 0 = purchased, 1 = canceled, 2 = pending.
    if (purchase.purchaseState !== 0) {
      return new Response(JSON.stringify({ ok: false, purchaseState: purchase.purchaseState }), { status: 200 });
    }

    // acknowledgementState: 0 = not yet acknowledged, 1 = acknowledged.
    // MUST acknowledge (or consume) within 3 days or Google auto-refunds —
    // do this before granting anything, so a failure surfaces as an error
    // rather than silently leaving the purchase to expire.
    //
    // Trial purchases are consumed instead of acknowledged: consuming both
    // satisfies the acknowledge requirement AND resets the product back to
    // purchasable, which is required since the trial can be bought
    // repeatedly (one trial per game) — a plain acknowledge would leave it
    // permanently "already owned" after the very first purchase, exactly
    // like a category/bundle purchase (which SHOULD stay permanently
    // owned, hence they use acknowledge, never consume).
    if (isTrial) {
      const consumed = await consumePurchase(googleAccessToken, sku, purchaseToken);
      if (!consumed) {
        return new Response(JSON.stringify({ error: 'consume-failed' }), { status: 502 });
      }
    } else if (purchase.acknowledgementState === 0) {
      const acked = await acknowledgePurchase(googleAccessToken, sku, purchaseToken);
      if (!acked) {
        return new Response(JSON.stringify({ error: 'acknowledge-failed' }), { status: 502 });
      }
    }

    if (isTrial) {
      return new Response(JSON.stringify({ ok: true, trial: trialCategory }), { status: 200 });
    }

    const granted = await insertPurchases(accessToken, userId, categoriesToGrant);
    if (!granted) {
      return new Response(JSON.stringify({ error: 'grant-failed' }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, granted: categoriesToGrant }), { status: 200 });
  } catch (e) {
    console.error('[verify-play-purchase] failed:', e);
    return new Response(JSON.stringify({ error: 'internal-error' }), { status: 500 });
  }
};
