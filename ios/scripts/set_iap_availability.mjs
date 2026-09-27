#!/usr/bin/env node
// Makes every in-app purchase available in every App Store country or
// region, via the App Store Connect API — the "Availability" section on
// each product's page in App Store Connect, which would otherwise have to
// be set by hand once per product. Also ticks "make available in new
// countries or regions automatically", so products stay worldwide when
// Apple adds a storefront later.
//
// Safe to re-run: Apple treats each call as "replace this product's
// availability", so running it twice just writes the same list again.
//
// Usage:
//   APPLE_ISSUER_ID=... APPLE_KEY_ID=... APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXX.p8 \
//   APPLE_APP_ID=6814543685 \
//   node ios/scripts/set_iap_availability.mjs

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  PLAY_PRODUCT_MAP,
  ALL_CATEGORIES_SKU,
  TRIAL_SKU,
} from '../../mn-alwahsh-updated/src/utils/playProducts.js';

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

// --- Same App Store Connect API auth as create_iap_products.mjs --------
function makeToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const claims = { iss: ISSUER_ID, iat: now, exp: now + 60 * 15, aud: 'appstoreconnect-v1' };
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64url(header)}.${b64url(claims)}`;
  const signer = createSign('SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = derToJose(signer.sign(PRIVATE_KEY)).toString('base64url');
  return `${unsigned}.${signature}`;
}

function derToJose(der) {
  let offset = 2;
  function readInt() {
    if (der[offset] !== 0x02) throw new Error('expected INTEGER in DER signature');
    offset++;
    let len = der[offset++];
    let bytes = der.subarray(offset, offset + len);
    offset += len;
    while (bytes.length > 32 && bytes[0] === 0) bytes = bytes.subarray(1);
    return Buffer.concat([Buffer.alloc(32 - bytes.length), bytes]);
  }
  return Buffer.concat([readInt(), readInt()]);
}

let cachedToken = null;
let cachedTokenExpiry = 0;
function getToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken;
  cachedToken = makeToken();
  cachedTokenExpiry = Date.now() + 1000 * 60 * 10;
  return cachedToken;
}

async function api(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 800)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function fetchAllPages(firstUrl) {
  const items = [];
  let url = firstUrl;
  while (url) {
    const res = await api('GET', url);
    items.push(...res.data);
    url = res.links?.next ? res.links.next.replace(API_BASE, '') : null;
  }
  return items;
}

async function fetchExistingProducts() {
  const items = await fetchAllPages(`/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`);
  return new Map(items.map((item) => [item.attributes.productId, item.id]));
}

async function setAvailability(iapId, territoryIds) {
  await api('POST', '/v1/inAppPurchaseAvailabilities', {
    data: {
      type: 'inAppPurchaseAvailabilities',
      attributes: { availableInNewTerritories: true },
      relationships: {
        inAppPurchase: { data: { type: 'inAppPurchases', id: iapId } },
        availableTerritories: {
          data: territoryIds.map((id) => ({ type: 'territories', id })),
        },
      },
    },
  });
}

async function main() {
  const skus = [
    ...Object.keys(PLAY_PRODUCT_MAP),
    ALL_CATEGORIES_SKU,
    TRIAL_SKU,
  ];

  console.log('Fetching the list of App Store countries/regions...');
  const territoryIds = (await fetchAllPages('/v1/territories?limit=200')).map((t) => t.id);
  console.log(`Found ${territoryIds.length} countries/regions.`);

  console.log(`Looking up product ids for app ${APP_ID}...`);
  const existing = await fetchExistingProducts();

  const missing = skus.filter((sku) => !existing.has(sku));
  if (missing.length) {
    console.error(`These products don't exist yet, run create_iap_products.mjs first: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`Making ${skus.length} products available everywhere...\n`);

  const failed = [];
  for (const [i, sku] of skus.entries()) {
    const tag = `[${i + 1}/${skus.length}] ${sku}`;
    try {
      await setAvailability(existing.get(sku), territoryIds);
      console.log(`${tag}: available in all ${territoryIds.length} countries/regions`);
    } catch (err) {
      console.error(`${tag}: FAILED — ${err.message}`);
      failed.push(sku);
    }
  }

  console.log('\n--- Done ---');
  if (failed.length) {
    console.log(`\nThese failed — check the errors above:`);
    console.log(failed.join(', '));
    process.exit(1);
  }
  console.log('\nAll products are now available in every country/region.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
