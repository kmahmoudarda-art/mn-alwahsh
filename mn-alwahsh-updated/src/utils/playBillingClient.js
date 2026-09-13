// Purchases a Google Play in-app product from inside the Android app.
//
// The app is a native WebView (not a Trusted Web Activity), so the web
// platform's Payment Request / Digital Goods APIs aren't available —
// WebView doesn't implement them. Instead, MainActivity.kt injects a
// small JavaScript bridge, window.AndroidBilling, backed by the real
// Google Play Billing Library running in Kotlin. This file just calls
// that bridge; all the actual Play Billing calls happen natively.
//
// isPlayBillingAvailable() also still recognizes the old TWA-style
// Digital Goods API, in case this code ever runs inside a Trusted Web
// Activity again — but the shipped Android app is the WebView bridge.
//
// IMPORTANT — this purchases and returns a token; it does NOT grant
// anything by itself. The token must be sent to
// netlify/functions/verify-play-purchase.js, which checks it against the
// real Google Play Developer API server-side (never trust a client-side
// "purchase succeeded" on its own) before writing to Supabase.

import { TRIAL_SKU } from './playProducts.js';

export function isPlayBillingAvailable() {
  if (typeof window === 'undefined') return false;
  return typeof window.AndroidBilling !== 'undefined' || 'getDigitalGoodsService' in window;
}

// Self-heal step for TRIAL_SKU only: if Play still shows an existing,
// unconsumed trial_pass purchase (e.g. left over from earlier testing, or
// a player who closed the app before the previous purchase finished being
// consumed), clear it server-side so Play will allow buying it again.
// Silently does nothing if there's no stale purchase to clear, or if sku
// isn't the trial — categories/the bundle must never be auto-consumed,
// see consume-stale-trial.js.
async function clearStaleTrialIfAny(sku) {
  if (sku !== TRIAL_SKU) return;
  let existing;
  try {
    existing = await listExistingPurchases();
  } catch {
    return; // listing purchases isn't universally supported — fine to skip
  }
  const stale = existing.find((p) => p.itemId === sku || p.productId === sku);
  if (!stale?.purchaseToken) return;

  await fetch('/.netlify/functions/consume-stale-trial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, purchaseToken: stale.purchaseToken }),
  }).catch(() => {}); // best-effort — if this fails, the purchase attempt below will just fail with the same "already owned" error as before, no worse off
}

async function listExistingPurchases() {
  if (window.AndroidBilling) return window.AndroidBilling.listPurchases();
  if ('getDigitalGoodsService' in window) {
    const service = await window.getDigitalGoodsService('https://play.google.com/billing');
    if (typeof service.listPurchases === 'function') return service.listPurchases();
  }
  return [];
}

// Returns { purchaseToken, productId } on success, throws on cancel/failure.
// `sku` must already exist as an active in-app product in Play Console —
// see playProducts.js / PLAY_BILLING_SETUP.md.
export async function purchaseWithPlayBilling(sku) {
  if (!isPlayBillingAvailable()) {
    throw new Error('play-billing-unavailable');
  }

  await clearStaleTrialIfAny(sku);

  if (window.AndroidBilling) {
    const purchaseToken = await window.AndroidBilling.purchase(sku);
    if (!purchaseToken) throw new Error('play-billing-no-token');
    return { purchaseToken, productId: sku };
  }

  // Legacy TWA path (Digital Goods API + Payment Request), kept only in
  // case this code ever runs inside a Trusted Web Activity again.
  const digitalGoodsService = await window.getDigitalGoodsService('https://play.google.com/billing');
  const paymentMethods = [{ supportedMethods: 'https://play.google.com/billing', data: { sku } }];
  const paymentDetails = {
    total: { label: 'Total', amount: { currency: 'USD', value: '0' } },
  };
  const request = new PaymentRequest(paymentMethods, paymentDetails);
  const canMakePayment = await request.canMakePayment().catch(() => false);
  if (!canMakePayment) {
    throw new Error('play-billing-cannot-pay');
  }
  const response = await request.show();
  const { purchaseToken } = response.details || {};
  if (!purchaseToken) {
    await response.complete('fail').catch(() => {});
    throw new Error('play-billing-no-token');
  }
  await response.complete('success');
  void digitalGoodsService; // only needed to confirm availability above
  return { purchaseToken, productId: sku };
}

// Best-effort details lookup (localized price/title from Play), used only
// for display — never trust this for granting anything.
export async function getPlayProductDetails(skus) {
  if (!isPlayBillingAvailable()) return [];
  try {
    if (window.AndroidBilling) return await window.AndroidBilling.getDetails(skus);
    const service = await window.getDigitalGoodsService('https://play.google.com/billing');
    return await service.getDetails(skus);
  } catch {
    return [];
  }
}

// Full flow: purchase the SKU, then have verify-play-purchase.js confirm it
// against Google's own API and grant it. This is what CategoryPicker.jsx
// actually calls — it never talks to purchaseWithPlayBilling() or the
// Netlify function directly, so the purchase+verify sequencing lives in
// exactly one place.
//
// `trialCategory` is required only when sku === TRIAL_SKU — see
// verify-play-purchase.js.
export async function buyAndGrant({ sku, userId, accessToken, trialCategory }) {
  const { purchaseToken } = await purchaseWithPlayBilling(sku);

  const res = await fetch('/.netlify/functions/verify-play-purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, purchaseToken, userId, accessToken, trialCategory }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || 'verify-failed');
  }
  const data = await res.json();
  if (data.error || data.ok === false) {
    throw new Error(data.error || `purchase-not-completed:${data.purchaseState}`);
  }
  return data; // { ok: true, granted: [...] } or { ok: true, trial: category }
}
