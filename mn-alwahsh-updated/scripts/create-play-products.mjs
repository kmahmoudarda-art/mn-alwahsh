#!/usr/bin/env node
// One-time script: creates all 71 in-app products (69 categories + the
// all-categories bundle + the trial) in Google Play Console via the
// Android Publisher API, so you don't have to click through the UI 71
// times. Safe to re-run — products that already exist are skipped, not
// duplicated or overwritten.
//
// Run locally (never in a browser, never paste the key anywhere public):
//
//   cd mn-alwahsh-updated
//   node scripts/create-play-products.mjs
//
// Requires three env vars — the SAME THREE that verify-play-purchase.js
// needs on Netlify, so whatever you set here you'll also add there:
//
//   GOOGLE_SERVICE_ACCOUNT_EMAIL       from the downloaded JSON key's "client_email"
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY from the downloaded JSON key's "private_key"
//   ANDROID_PACKAGE_NAME               com.mnalwahsh.twa
//
// Easiest way to set them for just this one run (bash/zsh):
//
//   export GOOGLE_SERVICE_ACCOUNT_EMAIL="your-sa@your-project.iam.gserviceaccount.com"
//   export GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="$(node -pe "JSON.stringify(require('/path/to/downloaded-key.json').private_key)")"
//   export ANDROID_PACKAGE_NAME="com.mnalwahsh.twa"
//   node scripts/create-play-products.mjs
//
// The middle line reads private_key straight out of the downloaded JSON
// file and escapes its newlines correctly — simplest way to avoid
// mangling the key by pasting it manually.
//
// BEFORE RUNNING: the service account must already be invited into Play
// Console (Users and permissions) with a permission that covers managing
// in-app products (e.g. "Manage store presence" / "Manage products") —
// see PLAY_BILLING_SETUP.md. Without that grant every request below will
// fail with a 403, even with valid credentials.

import { PLAY_PRODUCT_MAP, ALL_CATEGORIES_SKU, TRIAL_SKU } from '../src/utils/playProducts.js';

const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || 'com.mnalwahsh.twa';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    fail('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY env vars.');
  }
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

  const { createSign } = await import('node:crypto');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: email,
    scope: SCOPE,
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

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    fail(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  const { access_token } = await res.json();
  return access_token;
}

function priceMicros(aed) {
  return String(Math.round(aed * 1_000_000));
}

// English label is always present in PLAY_PRODUCT_MAP; the Arabic title
// uses the first variant if it's non-Latin, otherwise falls back to the
// English label for both listings.
function listingsFor(label, arabicVariant, description_en, description_ar) {
  const listings = {
    'en-US': { title: label, description: description_en },
  };
  if (arabicVariant && arabicVariant !== label) {
    listings['ar'] = { title: arabicVariant, description: description_ar };
  }
  return listings;
}

function buildProducts() {
  const products = [];

  for (const [sku, info] of Object.entries(PLAY_PRODUCT_MAP)) {
    const arabicVariant = info.categories.find((c) => !/^[\x00-\x7F]*$/.test(c));
    products.push({
      packageName: PACKAGE_NAME,
      sku,
      status: 'active',
      purchaseType: 'managedUser',
      defaultLanguage: 'en-US',
      defaultPrice: { currency: 'AED', priceMicros: priceMicros(info.price) },
      listings: listingsFor(
        info.label,
        arabicVariant,
        `Unlock the "${info.label}" category in Man Al Wahsh (من الوحش).`,
        `فتح فئة "${arabicVariant || info.label}" في لعبة من الوحش.`
      ),
    });
  }

  products.push({
    packageName: PACKAGE_NAME,
    sku: ALL_CATEGORIES_SKU,
    status: 'active',
    purchaseType: 'managedUser',
    defaultLanguage: 'en-US',
    defaultPrice: { currency: 'AED', priceMicros: priceMicros(100) },
    listings: listingsFor(
      'Unlock All Categories',
      'فتح جميع الفئات',
      'Permanently unlock every category in Man Al Wahsh.',
      'فتح جميع الفئات بشكل دائم في لعبة من الوحش.'
    ),
  });

  products.push({
    packageName: PACKAGE_NAME,
    sku: TRIAL_SKU,
    status: 'active',
    purchaseType: 'managedUser',
    defaultLanguage: 'en-US',
    defaultPrice: { currency: 'AED', priceMicros: priceMicros(1) },
    listings: listingsFor(
      'Try One Category (1 Game)',
      'تجربة فئة واحدة',
      'Unlock any one locked category for a single game.',
      'فتح أي فئة مقفلة لمدة لعبة واحدة فقط.'
    ),
  });

  return products;
}

async function createProduct(accessToken, product) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/inappproducts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  });

  if (res.ok) {
    return { sku: product.sku, status: 'created' };
  }

  const text = await res.text();
  // Google returns 409/400-with-"already exists" style errors for a SKU
  // that's already there — treat that as a no-op, not a failure, so the
  // script is safe to re-run after fixing an unrelated error partway
  // through a batch.
  if (res.status === 409 || /already exists/i.test(text)) {
    return { sku: product.sku, status: 'skipped (already exists)' };
  }
  return { sku: product.sku, status: `FAILED (${res.status}): ${text}` };
}

async function main() {
  console.log(`Creating in-app products for ${PACKAGE_NAME}...\n`);
  const accessToken = await getAccessToken();
  const products = buildProducts();

  const results = [];
  for (const product of products) {
    const result = await createProduct(accessToken, product);
    results.push(result);
    console.log(`${result.status.startsWith('FAILED') ? '✖' : '✓'} ${result.sku} — ${result.status}`);
    // Gentle pacing — 71 requests well within quota, this just avoids
    // bursting them all in the same instant.
    await new Promise((r) => setTimeout(r, 250));
  }

  const failed = results.filter((r) => r.status.startsWith('FAILED'));
  console.log(`\nDone: ${results.length - failed.length}/${results.length} succeeded or already existed.`);
  if (failed.length) {
    console.log(`\n${failed.length} failed — re-run this script after fixing the cause; already-created products will be skipped automatically:`);
    failed.forEach((r) => console.log(`  - ${r.sku}: ${r.status}`));
    process.exitCode = 1;
  }
}

main();
