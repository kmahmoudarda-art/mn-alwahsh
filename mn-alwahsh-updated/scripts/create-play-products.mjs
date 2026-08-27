#!/usr/bin/env node
// One-time script: creates all 71 in-app products (69 categories + the
// all-categories bundle + the trial) in Google Play Console via the
// Android Publisher API, so you don't have to click through the UI 71
// times. Safe to re-run — products that already exist are just updated
// in place (upserted), not duplicated.
//
// REWRITTEN to use monetization.onetimeproducts instead of the older
// inappproducts endpoint. The old endpoint (what this script originally
// used) now returns a 403 "Please migrate to the new publishing API" for
// newer developer accounts — Google has been migrating "in-app products"
// (renamed "one-time products" in the Play Console UI) onto a new,
// significantly more complex data model: instead of one defaultPrice +
// autoConvertMissingPrices, each product now needs an explicit
// PurchaseOption with a REGIONAL price for every supported country. This
// script calls monetization.convertRegionPrices once per distinct AED
// price (converting to every region Play supports) and reuses that
// result across every product sharing that price, then PATCHes each
// product as a create-or-update (allowMissing=true).
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
//   export GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="$(node -e "process.stdout.write(require('/path/to/downloaded-key.json').private_key)")"
//   export ANDROID_PACKAGE_NAME="com.mnalwahsh.twa"
//   node scripts/create-play-products.mjs
//
// Use process.stdout.write, NOT JSON.stringify or `node -p` — both of
// those wrap the value in an extra pair of literal quote characters that
// corrupts the PEM and fails with a cryptic "DECODER routines::unsupported"
// error that has nothing to do with the key itself being wrong.
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

function moneyFromAed(aed) {
  // AED prices here are all whole numbers, so nanos is always 0 — if you
  // ever add a fractional AED price, this needs updating to split the
  // decimal part into nanos (billionths of the currency unit).
  return { currencyCode: 'AED', units: String(Math.trunc(aed)), nanos: 0 };
}

// Converts one AED price into a full per-region pricing table via Play's
// own conversion endpoint (today's exchange rates + regional pricing
// patterns) — this replaces the old autoConvertMissingPrices flag, which
// doesn't exist in the new API.
async function convertPrice(accessToken, aed) {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/pricing:convertRegionPrices`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: moneyFromAed(aed) }),
  });
  if (!res.ok) {
    throw new Error(`convertRegionPrices(${aed} AED) failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Builds the regionalPricingAndAvailabilityConfigs + newRegionsConfig
// pair every purchase option needs, from one convertRegionPrices result.
function pricingConfigsFrom(conversion) {
  const regionalPricingAndAvailabilityConfigs = Object.entries(conversion.convertedRegionPrices).map(
    ([regionCode, { price }]) => ({ regionCode, price, availability: 'AVAILABLE' })
  );
  const newRegionsConfig = {
    usdPrice: conversion.convertedOtherRegionsPrice.usdPrice,
    eurPrice: conversion.convertedOtherRegionsPrice.eurPrice,
    availability: 'AVAILABLE',
  };
  return { regionalPricingAndAvailabilityConfigs, newRegionsConfig, regionsVersion: conversion.regionVersion.version };
}

// English label is always present in PLAY_PRODUCT_MAP; pulls in an Arabic
// listing too when one of the category's variant strings is non-Latin.
function listingsFor(label, arabicVariant, description_en, description_ar) {
  const listings = [{ languageCode: 'en-US', title: label.slice(0, 55), description: description_en.slice(0, 200) }];
  if (arabicVariant && arabicVariant !== label) {
    listings.push({ languageCode: 'ar', title: arabicVariant.slice(0, 55), description: description_ar.slice(0, 200) });
  }
  return listings;
}

function buildProductSpecs() {
  const specs = [];

  for (const [sku, info] of Object.entries(PLAY_PRODUCT_MAP)) {
    const arabicVariant = info.categories.find((c) => !/^[\x00-\x7F]*$/.test(c));
    specs.push({
      sku,
      price: info.price,
      listings: listingsFor(
        info.label,
        arabicVariant,
        `Unlock the "${info.label}" category in Man Al Wahsh (من الوحش).`,
        `فتح فئة "${arabicVariant || info.label}" في لعبة من الوحش.`
      ),
    });
  }

  specs.push({
    sku: ALL_CATEGORIES_SKU,
    price: 100,
    listings: listingsFor(
      'Unlock All Categories',
      'فتح جميع الفئات',
      'Permanently unlock every category in Man Al Wahsh.',
      'فتح جميع الفئات بشكل دائم في لعبة من الوحش.'
    ),
  });

  specs.push({
    sku: TRIAL_SKU,
    price: 1,
    listings: listingsFor(
      'Try One Category (1 Game)',
      'تجربة فئة واحدة',
      'Unlock any one locked category for a single game.',
      'فتح أي فئة مقفلة لمدة لعبة واحدة فقط.'
    ),
  });

  return specs;
}

async function upsertProduct(accessToken, spec, pricing) {
  const oneTimeProduct = {
    packageName: PACKAGE_NAME,
    productId: spec.sku,
    listings: spec.listings,
    purchaseOptions: [
      {
        purchaseOptionId: 'buy',
        buyOption: { legacyCompatible: true, multiQuantityEnabled: false },
        regionalPricingAndAvailabilityConfigs: pricing.regionalPricingAndAvailabilityConfigs,
        newRegionsConfig: pricing.newRegionsConfig,
      },
    ],
  };

  const params = new URLSearchParams({
    updateMask: 'listings,purchaseOptions',
    'regionsVersion.version': pricing.regionsVersion,
    allowMissing: 'true',
  });
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/onetimeproducts/${spec.sku}?${params}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(oneTimeProduct),
  });

  if (res.ok) {
    return { sku: spec.sku, status: 'created/updated' };
  }
  const text = await res.text();
  return { sku: spec.sku, status: `FAILED (${res.status}): ${text}` };
}

async function main() {
  console.log(`Creating one-time products for ${PACKAGE_NAME}...\n`);
  const accessToken = await getAccessToken();
  const specs = buildProductSpecs();

  // Convert each distinct AED price exactly once and cache it — far fewer
  // convertRegionPrices calls than one per product, and keeps every
  // product at the same price in perfect sync with each other.
  const uniquePrices = [...new Set(specs.map((s) => s.price))];
  console.log(`Converting ${uniquePrices.length} distinct price point(s) to regional pricing...`);
  const pricingByAed = new Map();
  for (const aed of uniquePrices) {
    try {
      const conversion = await convertPrice(accessToken, aed);
      pricingByAed.set(aed, pricingConfigsFrom(conversion));
      console.log(`✓ ${aed} AED converted to ${Object.keys(conversion.convertedRegionPrices).length} regions`);
    } catch (e) {
      fail(e.message);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log('');

  const results = [];
  for (const spec of specs) {
    const pricing = pricingByAed.get(spec.price);
    const result = await upsertProduct(accessToken, spec, pricing);
    results.push(result);
    console.log(`${result.status.startsWith('FAILED') ? '✖' : '✓'} ${result.sku} — ${result.status}`);
    // Gentle pacing — avoids bursting 71 requests in the same instant.
    await new Promise((r) => setTimeout(r, 250));
  }

  const failed = results.filter((r) => r.status.startsWith('FAILED'));
  console.log(`\nDone: ${results.length - failed.length}/${results.length} succeeded.`);
  if (failed.length) {
    console.log(`\n${failed.length} failed — re-run this script after fixing the cause (upserts are safe to repeat):`);
    failed.forEach((r) => console.log(`  - ${r.sku}: ${r.status}`));
    process.exitCode = 1;
  } else {
    console.log('\nAll products created. Double check in Play Console \u2192 Monetise with Play \u2192 One-time products that they show up, then activate the "buy" purchase option on each if it isn\'t already ACTIVE.');
  }
}

main();
