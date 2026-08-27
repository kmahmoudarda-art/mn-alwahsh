// Purchases a Google Play in-app product from inside the TWA.
//
// This is NOT the native Android Billing Library (that's for real Kotlin/
// Java apps). Since this app is a Trusted Web Activity — Chrome showing
// mnalwahsh.com — purchasing goes through two web-platform APIs that Chrome
// wires up to Play Billing automatically when running inside a TWA:
//   - Payment Request API (the purchase UI/sheet)
//   - Digital Goods API (https://play.google.com/billing payment method,
//     product details, and — critically — telling Chrome/Play "this
//     purchase is done" via response.complete())
//
// Neither API exists in a normal desktop/mobile browser tab, only inside
// the packaged Android app. Always check isPlayBillingAvailable() first —
// CategoryPicker.jsx only calls into this file when isRunningInAndroidApp()
// is also true, but this file guards independently too since a TWA on an
// old Chrome version could still fail the same way.
//
// IMPORTANT — this purchases and returns a token; it does NOT grant
// anything by itself. The token must be sent to
// netlify/functions/verify-play-purchase.js, which checks it against the
// real Google Play Developer API server-side (never trust a client-side
// "purchase succeeded" on its own) before writing to Supabase.

const PLAY_BILLING_METHOD = 'https://play.google.com/billing';

export function isPlayBillingAvailable() {
  return typeof window !== 'undefined' && 'getDigitalGoodsService' in window;
}

// Returns { purchaseToken, productId } on success, throws on cancel/failure.
// `sku` must already exist as an active in-app product in Play Console —
// see playProducts.js / PLAY_BILLING_SETUP.md.
export async function purchaseWithPlayBilling(sku) {
  alert('DEBUG A: purchaseWithPlayBilling called, sku=' + sku); // TEMP_DEBUG
  if (!isPlayBillingAvailable()) {
    throw new Error('play-billing-unavailable');
  }

  // Confirms Chrome can actually reach Play's billing service right now
  // (fails fast with a clearer error than letting PaymentRequest hang).
  const digitalGoodsService = await window.getDigitalGoodsService(PLAY_BILLING_METHOD);
  alert('DEBUG B: got digital goods service'); // TEMP_DEBUG

  const paymentMethods = [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku } }];
  // Play Billing ignores this "total" — the real price is whatever was set
  // for this product ID in Play Console. Payment Request API still requires
  // a total to construct the request, so this is just a formality.
  const paymentDetails = {
    total: { label: 'Total', amount: { currency: 'USD', value: '0' } },
  };

  const request = new PaymentRequest(paymentMethods, paymentDetails);
  alert('DEBUG C: PaymentRequest created'); // TEMP_DEBUG

  const canMakePayment = await request.canMakePayment().catch((e) => { alert('DEBUG canMakePayment threw: ' + e.message); return false; }); // TEMP_DEBUG
  alert('DEBUG D: canMakePayment result = ' + canMakePayment); // TEMP_DEBUG
  if (!canMakePayment) {
    throw new Error('play-billing-cannot-pay');
  }

  alert('DEBUG E: about to call request.show()'); // TEMP_DEBUG
  const response = await request.show();
  alert('DEBUG F: request.show() resolved'); // TEMP_DEBUG
  const { purchaseToken } = response.details || {};
  if (!purchaseToken) {
    await response.complete('fail').catch(() => {});
    throw new Error('play-billing-no-token');
  }

  // Tells Chrome the purchase sheet can close. This does NOT acknowledge
  // the purchase to Google (that happens server-side in
  // verify-play-purchase.js, which is required within 3 days or Google
  // auto-refunds it) — it only finishes the UI flow.
  await response.complete('success');

  return { purchaseToken, productId: sku };
}

// Best-effort details lookup (localized price/title from Play), used only
// for display — never trust this for granting anything.
export async function getPlayProductDetails(skus) {
  if (!isPlayBillingAvailable()) return [];
  try {
    const service = await window.getDigitalGoodsService(PLAY_BILLING_METHOD);
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
