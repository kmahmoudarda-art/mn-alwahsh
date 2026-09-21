#!/usr/bin/env node
// Creates all 71 In-App Purchase products in App Store Connect via Apple's
// own App Store Connect API, instead of clicking through the "+" form 71
// times by hand. Uses the same API key you already created for CI
// (Phase 4 step 4 / "Building without a Mac" step 3 in ios/README.md) —
// it needs the App Manager role, which can create/edit in-app purchases.
//
// What this automates: product ID, type (Non-Consumable/Consumable),
// reference name, and one Arabic localization (display name + description)
// for every SKU in playProducts.js. It also attempts to set a starting
// price close to each product's AED reference price.
//
// What it does NOT do (do these manually afterwards, in App Store Connect):
//   - Review screenshot — required before "Add for Review", not before
//     save. Apple's screenshot upload is a multi-step binary upload API;
//     not worth scripting for 71 identical placeholder screenshots. Add
//     one screenshot per product (same image is fine) before submitting.
//   - "Add for Review" — leave everything at "Prepare for Submission"
//     (this script's created state) until you submit the whole app for
//     review together (see ios/README.md Phase 8). Apple requires the
//     first non-consumable IAP to be submitted together with an app
//     version anyway.
//
// Pricing is the flakiest part of Apple's API (their price-point/schedule
// endpoints are notoriously under-documented). This script tries, but
// logs and continues past any product it can't price — you'd only need
// to set price tiers manually for anything in that "needs manual pricing"
// list it prints at the end, which is much faster than doing everything
// by hand.
//
// This makes real, non-reversible changes to your App Store Connect app —
// review the log output as it runs. It's fully safe to re-run: it looks up
// which products already exist first, and for those, only (re)attempts
// localization and pricing rather than skipping them outright — so a
// re-run after a partial failure (e.g. only pricing failed last time)
// finishes the job instead of reporting "already exists" and moving on.
//
// Usage:
//   APPLE_ISSUER_ID=... APPLE_KEY_ID=... APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXX.p8 \
//   APPLE_APP_ID=6814543685 \
//   node ios/scripts/create_iap_products.mjs

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  PLAY_PRODUCT_MAP,
  ALL_CATEGORIES_SKU,
  TRIAL_SKU,
} from '../../mn-alwahsh-updated/src/utils/playProducts.js';
import { ALL_CATEGORIES_PRICE, TRIAL_PRICE_ANDROID } from '../../mn-alwahsh-updated/src/utils/premiumConfig.js';

const ISSUER_ID = process.env.APPLE_ISSUER_ID;
const KEY_ID = process.env.APPLE_KEY_ID;
const PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH;
const APP_ID = process.env.APPLE_APP_ID;

if (!ISSUER_ID || !KEY_ID || !PRIVATE_KEY_PATH || !APP_ID) {
  console.error(
    'Missing env vars. Required: APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY_PATH, APPLE_APP_ID'
  );
  process.exit(1);
}

const PRIVATE_KEY = readFileSync(PRIVATE_KEY_PATH, 'utf8');
const API_BASE = 'https://api.appstoreconnect.apple.com';

// --- App Store Connect API auth (ES256 JWT, 20-minute max lifetime) ----
function makeToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const claims = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 60 * 15, // 15 minutes — comfortably under Apple's 20-minute cap
    aud: 'appstoreconnect-v1',
  };
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64url(header)}.${b64url(claims)}`;
  const signer = createSign('SHA256');
  signer.update(unsigned);
  signer.end();
  const derSignature = signer.sign(PRIVATE_KEY);
  const signature = derToJose(derSignature).toString('base64url');
  return `${unsigned}.${signature}`;
}

// ES256 JWTs need the raw (r||s) signature format, not the DER format
// Node's crypto.sign produces by default — this converts between them.
function derToJose(der) {
  let offset = 2; // skip SEQUENCE tag + length
  function readInt() {
    if (der[offset] !== 0x02) throw new Error('expected INTEGER in DER signature');
    offset++;
    let len = der[offset++];
    let bytes = der.subarray(offset, offset + len);
    offset += len;
    while (bytes.length > 32 && bytes[0] === 0) bytes = bytes.subarray(1);
    return Buffer.concat([Buffer.alloc(32 - bytes.length), bytes]);
  }
  const r = readInt();
  const s = readInt();
  return Buffer.concat([r, s]);
}

let cachedToken = null;
let cachedTokenExpiry = 0;
function getToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken;
  cachedToken = makeToken();
  cachedTokenExpiry = Date.now() + 1000 * 60 * 10; // refresh a bit before the 15-min exp
  return cachedToken;
}

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

// --- Build the product list from playProducts.js (single source of
// truth shared with Android/iOS/Netlify — see ios/README.md) -----------
const products = [];
for (const [sku, info] of Object.entries(PLAY_PRODUCT_MAP)) {
  products.push({ sku, type: 'NON_CONSUMABLE', name: info.label, price: info.price });
}
products.push({
  sku: ALL_CATEGORIES_SKU,
  type: 'NON_CONSUMABLE',
  name: 'Unlock all categories',
  price: ALL_CATEGORIES_PRICE,
});
products.push({
  sku: TRIAL_SKU,
  type: 'CONSUMABLE',
  name: 'One-game trial pass',
  price: TRIAL_PRICE_ANDROID,
});

// Builds productId -> inAppPurchase id for everything already created in
// this app, so a re-run can pick up exactly where a previous run left off
// instead of erroring on "already exists" and skipping useful follow-up
// work (localization, pricing) for those products.
async function fetchExistingProducts() {
  const map = new Map();
  let url = `/v2/apps/${APP_ID}/inAppPurchases?limit=200&fields[inAppPurchases]=productId`;
  while (url) {
    const res = await api('GET', url);
    for (const item of res.data) map.set(item.attributes.productId, item.id);
    url = res.links?.next ? res.links.next.replace(API_BASE, '') : null;
  }
  return map;
}

async function createProduct({ sku, type, name }) {
  const res = await api('POST', '/v2/inAppPurchases', {
    data: {
      type: 'inAppPurchases',
      attributes: {
        name: name.slice(0, 64),
        productId: sku,
        inAppPurchaseType: type,
        reviewNote: `${name} — unlocks one quiz category in من الوحش. See screenshot.`,
        familySharable: false,
      },
      relationships: {
        app: { data: { type: 'apps', id: APP_ID } },
      },
    },
  });
  return res.data.id;
}

// Returns 'created', 'already-exists', or throws. Apple returns a 409
// (CONFLICT / STATE_ERROR-ish) if this locale is already localized for
// this product, which a re-run hits every time for already-processed
// products — treated as success, not a failure to report.
async function createLocalization(iapId, name) {
  try {
    await api('POST', '/v1/inAppPurchaseLocalizations', {
      data: {
        type: 'inAppPurchaseLocalizations',
        attributes: {
          name: name.slice(0, 30),
          description: `فتح فئة ${name} في لعبة من الوحش`.slice(0, 45),
          locale: 'ar-SA',
        },
        relationships: {
          inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iapId } },
        },
      },
    });
    return 'created';
  } catch (err) {
    if (err.status === 409) return 'already-exists';
    throw err;
  }
}

// Picks the cheapest US price point whose customerPrice (USD) is >= the
// AED price converted to USD — "cheapest that's still enough" rather
// than an exact match, since Apple's tiers are discrete. Close enough for
// a starting price; adjust later in the UI if you want it exact.
async function findPricePoint(iapId, aedPrice) {
  const targetUsd = aedPrice / 3.67;
  let url = `/v2/inAppPurchases/${iapId}/pricePoints?filter[territory]=USA&limit=200`;
  let best = null;
  while (url) {
    const res = await api('GET', url);
    for (const point of res.data) {
      const price = parseFloat(point.attributes.customerPrice);
      if (price >= targetUsd && (!best || price < parseFloat(best.attributes.customerPrice))) {
        best = point;
      }
    }
    url = res.links?.next ? res.links.next.replace(API_BASE, '') : null;
  }
  return best;
}

async function createPriceSchedule(iapId, pricePointId) {
  // Apple's JSON:API "inline creation" convention requires locally-scoped
  // ids in POST bodies to be wrapped as '${...}' — a bare string like
  // 'manualPrice1' is rejected with ENTITY_ERROR.INCLUDED.INVALID_ID even
  // though it looks like exactly what their own docs/README examples show.
  const localId = '${manualPrice1}';
  try {
    await api('POST', '/v1/inAppPurchasePriceSchedules', {
      data: {
        type: 'inAppPurchasePriceSchedules',
        relationships: {
          inAppPurchase: { data: { type: 'inAppPurchases', id: iapId } },
          baseTerritory: { data: { type: 'territories', id: 'USA' } },
          manualPrices: { data: [{ type: 'inAppPurchasePrices', id: localId }] },
        },
      },
      included: [
        {
          type: 'inAppPurchasePrices',
          id: localId,
          attributes: { startDate: null },
          relationships: {
            inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: pricePointId } },
          },
        },
      ],
    });
  } catch (err) {
    if (err.status === 409) return; // a price schedule already exists — fine
    throw err;
  }
}

async function main() {
  console.log(`Looking up already-created products for app ${APP_ID}...`);
  const existing = await fetchExistingProducts();
  console.log(`Found ${existing.size} already created. Processing ${products.length} total...\n`);

  const needsManualPricing = [];
  const failed = [];

  for (const [i, product] of products.entries()) {
    const tag = `[${i + 1}/${products.length}] ${product.sku}`;
    let iapId = existing.get(product.sku);

    try {
      if (iapId) {
        console.log(`${tag}: already exists (id ${iapId})`);
      } else {
        iapId = await createProduct(product);
        console.log(`${tag}: created (id ${iapId})`);
      }

      const localizationResult = await createLocalization(iapId, product.name);
      console.log(`${tag}: localization ${localizationResult}`);

      try {
        const pricePoint = await findPricePoint(iapId, product.price);
        if (!pricePoint) throw new Error('no matching price point found');
        await createPriceSchedule(iapId, pricePoint.id);
        console.log(`${tag}: price set (${pricePoint.attributes.customerPrice} USD)`);
      } catch (priceErr) {
        console.warn(`${tag}: pricing FAILED (${priceErr.message}) — set manually later`);
        needsManualPricing.push(product.sku);
      }
    } catch (err) {
      console.error(`${tag}: FAILED — ${err.message}`);
      failed.push(product.sku);
    }
  }

  console.log('\n--- Done ---');
  if (needsManualPricing.length) {
    console.log(`\nSet these manually in App Store Connect (pricing failed):`);
    console.log(needsManualPricing.join(', '));
  }
  if (failed.length) {
    console.log(`\nThese failed entirely — check the errors above and retry:`);
    console.log(failed.join(', '));
  }
  console.log(
    `\nRemaining for every product before "Add for Review": a review screenshot ` +
      `(Review Information → Screenshot). Do that in the UI — see ios/README.md Phase 8.`
  );
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
