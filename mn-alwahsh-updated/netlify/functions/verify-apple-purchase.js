// Verifies an App Store (StoreKit 2) in-app purchase actually happened,
// then grants it — the Apple equivalent of verify-play-purchase.js. See
// that file for the fuller explanation of the overall grant flow; this
// mirrors it as closely as Apple's API shape allows.
//
// Called from the client right after purchaseWithStoreKit() in
// storeKitBillingClient.js returns a transactionId. Deliberately
// re-verifies against Apple's own App Store Server API rather than
// trusting the client's "it worked" — a transactionId on its own proves
// nothing until Apple confirms it.
//
// Unlike Google Play, Apple has no "unacknowledged purchase gets
// auto-refunded" rule — ios/App/StoreKitBillingBridge.swift calls
// Transaction.finish() itself right after a purchase completes, so there
// is no acknowledge/consume step to perform here.
//
// REQUIRED Netlify environment variables:
//   APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY — from an
//     App Store Connect API key with the "App Manager" (or narrower,
//     in-app purchase) role: Users and Access > Integrations >
//     In-App Purchase. APPLE_PRIVATE_KEY is the full contents of the
//     downloaded .p8 file (keep the "-----BEGIN PRIVATE KEY-----" header).
//   APPLE_BUNDLE_ID — must match ios/project.yml's bundle id,
//     e.g. com.mnalwahsh.ios
//   SUPABASE_URL, SUPABASE_ANON_KEY — same values already used by
//     verify-play-purchase.js.
//
// See ios/README.md for how to obtain these.

import {
  AppStoreServerAPIClient,
  SignedDataVerifier,
  Environment,
} from '@apple/app-store-server-library';
import { PLAY_PRODUCT_MAP, ALL_CATEGORIES_SKU, TRIAL_SKU } from '../../src/utils/playProducts.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cqqeyvhofbnvjemoihca.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWV5dmhvZmJudmplbW9paGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDg5ODIsImV4cCI6MjA5MjQ4NDk4Mn0.y_1B1Gy8EIEFpVrJu9TKX1fPSBfR1jFVrcgO1PA1-hs';
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.mnalwahsh.ios';

// Apple's own three root certificates, fetched once per warm function
// instance and cached in memory rather than vendored into the repo — this
// self-heals if Apple ever rotates or adds a root, instead of silently
// verifying against stale pinned bytes. A fetch failure here means
// purchases fail closed (nothing gets granted), which is the safe
// default — never fall back to skipping verification.
// See "Obtaining Apple Root Certificates" in the app-store-server-library
// README: https://github.com/apple/app-store-server-library-node
const APPLE_ROOT_CA_URLS = [
  'https://www.apple.com/certificateauthority/AppleRootCA-G3.cer',
  'https://www.apple.com/certificateauthority/AppleComputerRootCertificate.cer',
  'https://www.apple.com/certificateauthority/AppleIncRootCertificate.cer',
];

let cachedRootCAs = null;
async function getAppleRootCAs() {
  if (cachedRootCAs) return cachedRootCAs;
  const buffers = await Promise.all(
    APPLE_ROOT_CA_URLS.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`apple-root-ca-fetch-failed: ${url} (${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    })
  );
  cachedRootCAs = buffers;
  return buffers;
}

// Tries production first (real purchases), then sandbox (TestFlight /
// Xcode-signed builds, and Play Console-style license testers) — mirrors
// Apple's own recommended "try prod, fall back to sandbox on 404" pattern
// (there is no way to know which environment a transaction id came from
// ahead of time).
async function fetchSignedTransaction(transactionId) {
  const signingKey = (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const keyId = process.env.APPLE_KEY_ID;
  const issuerId = process.env.APPLE_ISSUER_ID;
  if (!signingKey || !keyId || !issuerId) throw new Error('missing-apple-api-key-env');

  for (const environment of [Environment.PRODUCTION, Environment.SANDBOX]) {
    const client = new AppStoreServerAPIClient(signingKey, keyId, issuerId, APPLE_BUNDLE_ID, environment);
    try {
      const { signedTransactionInfo } = await client.getTransactionInfo(transactionId);
      return { signedTransactionInfo, environment };
    } catch (e) {
      if (e?.httpStatusCode === 404) continue; // not in this environment — try the other
      throw e;
    }
  }
  throw new Error('transaction-not-found');
}

// --- Supabase insert (identical shape to verify-play-purchase.js, just a
// different `platform` value so the two can be told apart later) --------
async function insertPurchases(accessToken, userId, categories) {
  const rows = categories.map((category) => ({ user_id: userId, category, platform: 'ios' }));
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
  // Same sentinel-row approach as verify-play-purchase.js's
  // categoriesForSku() — see that file's comment for why.
  if (sku === ALL_CATEGORIES_SKU) {
    return ['__ALL__'];
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

  const { sku, transactionId, userId, accessToken, trialCategory } = body || {};
  if (!sku || !transactionId || !userId) {
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
    const { signedTransactionInfo, environment } = await fetchSignedTransaction(transactionId);

    const appleRootCAs = await getAppleRootCAs();
    const verifier = new SignedDataVerifier(appleRootCAs, true, environment, APPLE_BUNDLE_ID);
    const transaction = await verifier.verifyAndDecodeTransaction(signedTransactionInfo);

    // Belt-and-braces checks beyond signature verification — a valid
    // signature only proves Apple signed *some* transaction, not that
    // it's the one this request claims, for this app, still valid.
    if (transaction.bundleId !== APPLE_BUNDLE_ID) {
      return new Response(JSON.stringify({ error: 'bundle-id-mismatch' }), { status: 400 });
    }
    if (transaction.transactionId !== transactionId) {
      return new Response(JSON.stringify({ error: 'transaction-id-mismatch' }), { status: 400 });
    }
    if (transaction.productId !== sku) {
      return new Response(JSON.stringify({ error: 'product-id-mismatch' }), { status: 400 });
    }
    if (transaction.revocationDate) {
      return new Response(JSON.stringify({ ok: false, revoked: true }), { status: 200 });
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
    console.error('[verify-apple-purchase] failed:', e);
    return new Response(JSON.stringify({ error: 'internal-error' }), { status: 500 });
  }
};
