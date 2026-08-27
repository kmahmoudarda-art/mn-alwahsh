// Consumes a Google Play purchase token directly, with no grant/Supabase
// step — used only as a self-healing step before re-purchasing TRIAL_SKU:
// if Digital Goods API's listPurchases() shows an existing, unconsumed
// trial_pass purchase (e.g. from earlier testing, or a player who
// force-closed the app mid-flow before the previous purchase got
// consumed), this clears it so Play will let them buy the trial again.
//
// Deliberately does NOT touch Supabase — the trial was never persisted
// there in the first place (see entitlements.js / CategoryPicker.jsx),
// so there's nothing to grant here, only Google's own "already owned"
// state to clear.
//
// Shares the same service-account JWT approach as verify-play-purchase.js
// — see that file for the fuller explanation of each piece.

import { TRIAL_SKU } from '../../src/utils/playProducts.js';

const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || 'com.mnalwahsh.twa';
const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

async function getGoogleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) throw new Error('missing-google-service-account-env');
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

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

async function consumePurchase(accessToken, productId, purchaseToken) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}:consume`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: '{}',
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

  const { sku, purchaseToken } = body || {};
  // Deliberately restricted to TRIAL_SKU only — this endpoint has no auth
  // beyond that restriction, so it must never be usable to consume (and
  // thus quietly re-open for repurchase) a permanent category or the
  // all-categories bundle.
  if (sku !== TRIAL_SKU || !purchaseToken) {
    return new Response(JSON.stringify({ error: 'invalid-request' }), { status: 400 });
  }

  try {
    const googleAccessToken = await getGoogleAccessToken();
    const consumed = await consumePurchase(googleAccessToken, sku, purchaseToken);
    return new Response(JSON.stringify({ ok: consumed }), { status: consumed ? 200 : 502 });
  } catch (e) {
    console.error('[consume-stale-trial] failed:', e);
    return new Response(JSON.stringify({ error: 'internal-error' }), { status: 500 });
  }
};
