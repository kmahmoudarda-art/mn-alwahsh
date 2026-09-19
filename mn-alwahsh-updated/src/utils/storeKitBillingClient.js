// Purchases an App Store in-app product from inside the iOS app.
//
// Mirrors playBillingClient.js exactly, but for Apple: the iOS app is a
// native WKWebView (see ios/App/MainViewController.swift), which injects a
// small JavaScript bridge, window.WebkitBilling, backed by real StoreKit 2
// code running in Swift (ios/App/StoreKitBillingBridge.swift). This file
// just calls that bridge; all the actual App Store purchase calls happen
// natively.
//
// Product IDs are shared 1:1 with playProducts.js (the same "catNNN" /
// "unlock_all_categories" / "trial_pass" strings must also exist as
// In-App Purchases in App Store Connect — see ios/README.md) so both
// platforms can keep using one product/category map with zero drift.
//
// IMPORTANT — this purchases and returns a signed transaction id; it does
// NOT grant anything by itself. The id must be sent to
// netlify/functions/verify-apple-purchase.js, which looks the transaction
// up against Apple's own App Store Server API server-side (never trust a
// client-side "purchase succeeded" on its own) before writing to Supabase.

import { TRIAL_SKU } from './playProducts.js';

export function isStoreKitBillingAvailable() {
  return typeof window !== 'undefined' && typeof window.WebkitBilling !== 'undefined';
}

// Returns { transactionId, productId } on success, throws on cancel/failure.
// `sku` must already exist as an active In-App Purchase in App Store
// Connect — see playProducts.js / ios/README.md.
export async function purchaseWithStoreKit(sku) {
  if (!isStoreKitBillingAvailable()) {
    throw new Error('storekit-billing-unavailable');
  }
  const transactionId = await window.WebkitBilling.purchase(sku);
  if (!transactionId) throw new Error('storekit-no-transaction');
  return { transactionId, productId: sku };
}

// Best-effort details lookup (localized price/title from the App Store),
// used only for display — never trust this for granting anything.
export async function getStoreKitProductDetails(skus) {
  if (!isStoreKitBillingAvailable()) return [];
  try {
    return await window.WebkitBilling.getDetails(skus);
  } catch {
    return [];
  }
}

// Full flow: purchase the SKU, then have verify-apple-purchase.js confirm
// it against Apple's own App Store Server API and grant it. This is what
// CategoryPicker.jsx actually calls on iOS — it never talks to
// purchaseWithStoreKit() or the Netlify function directly, so the
// purchase+verify sequencing lives in exactly one place (mirrors
// buyAndGrant() in playBillingClient.js).
//
// `trialCategory` is required only when sku === TRIAL_SKU — see
// verify-apple-purchase.js.
export async function buyAndGrantWithStoreKit({ sku, userId, accessToken, trialCategory }) {
  const { transactionId } = await purchaseWithStoreKit(sku);

  const res = await fetch('/.netlify/functions/verify-apple-purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku, transactionId, userId, accessToken, trialCategory }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || 'verify-failed');
  }
  const data = await res.json();
  if (data.error || data.ok === false) {
    throw new Error(data.error || 'purchase-not-completed');
  }
  return data; // { ok: true, granted: [...] } or { ok: true, trial: category }
}

// Required by Apple (Guideline 3.1.2) for non-consumable/permanent
// products: lets a signed-in user re-grant purchases they already paid
// for, e.g. after reinstalling the app or on a new device, without paying
// again. Trial passes are consumable and deliberately excluded — a
// consumed trial has nothing left to restore.
export async function restoreStoreKitPurchases({ userId, accessToken }) {
  if (!isStoreKitBillingAvailable()) return { ok: false, restored: [] };
  const transactionIds = await window.WebkitBilling.restore();
  const restored = [];
  for (const { transactionId, productId } of transactionIds || []) {
    if (productId === TRIAL_SKU) continue;
    try {
      const res = await fetch('/.netlify/functions/verify-apple-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: productId, transactionId, userId, accessToken }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) restored.push(productId);
    } catch {
      // best-effort per transaction — one failure shouldn't stop the rest
    }
  }
  return { ok: true, restored };
}
