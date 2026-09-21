#!/usr/bin/env node
// Uploads one review screenshot to every in-app purchase product that
// doesn't have one yet, via the App Store Connect API — the last manual
// step create_iap_products.mjs left for you to do by hand (Review
// Information → Screenshot, 71 times). Same screenshot is reused for
// every product, since they all unlock through the same category picker.
//
// This is a genuinely different, more involved API flow than product
// creation (reserve -> upload file bytes -> commit with a checksum), and
// hasn't been exercised against the real API before — if Apple rejects a
// step the same way they rejected the price schedule's id format, this
// will print the exact error and stop on that product; re-run afterward
// (it's idempotent — already-uploaded products are skipped) once fixed.
//
// Usage:
//   APPLE_ISSUER_ID=... APPLE_KEY_ID=... APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXX.p8 \
//   APPLE_APP_ID=6814543685 \
//   APPLE_SCREENSHOT_PATH=/path/to/screenshot.png \
//   node ios/scripts/upload_iap_screenshots.mjs

import { createSign, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import {
  PLAY_PRODUCT_MAP,
  ALL_CATEGORIES_SKU,
  TRIAL_SKU,
} from '../../mn-alwahsh-updated/src/utils/playProducts.js';

const ISSUER_ID = process.env.APPLE_ISSUER_ID;
const KEY_ID = process.env.APPLE_KEY_ID;
const PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH;
const APP_ID = process.env.APPLE_APP_ID;
const SCREENSHOT_PATH = process.env.APPLE_SCREENSHOT_PATH;

if (!ISSUER_ID || !KEY_ID || !PRIVATE_KEY_PATH || !APP_ID || !SCREENSHOT_PATH) {
  console.error(
    'Missing env vars. Required: APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY_PATH, APPLE_APP_ID, APPLE_SCREENSHOT_PATH'
  );
  process.exit(1);
}

const PRIVATE_KEY = readFileSync(PRIVATE_KEY_PATH, 'utf8');
const SCREENSHOT = readFileSync(SCREENSHOT_PATH);
const SCREENSHOT_NAME = basename(SCREENSHOT_PATH);
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

async function fetchExistingProducts() {
  const map = new Map();
  let url = `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`;
  while (url) {
    const res = await api('GET', url);
    for (const item of res.data) map.set(item.attributes.productId, item.id);
    url = res.links?.next ? res.links.next.replace(API_BASE, '') : null;
  }
  return map;
}

// --- The upload itself: reserve -> PUT file bytes -> commit -----------
// This is Apple's standard "Uploading Assets to App Store Connect"
// pattern, used the same way for build files, screenshots, and app
// previews elsewhere in their API — reserve a slot (get back one or more
// byte-range upload operations), PUT each range to its given URL with
// its given headers, then PATCH the resource to mark it uploaded with an
// MD5 checksum of the whole file.
async function reserveScreenshot(iapId) {
  const res = await api('POST', '/v1/inAppPurchaseAppStoreReviewScreenshots', {
    data: {
      type: 'inAppPurchaseAppStoreReviewScreenshots',
      attributes: { fileName: SCREENSHOT_NAME, fileSize: SCREENSHOT.length },
      relationships: {
        inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iapId } },
      },
    },
  });
  return res.data;
}

async function uploadBytes(uploadOperations) {
  for (const op of uploadOperations) {
    const chunk = SCREENSHOT.subarray(op.offset, op.offset + op.length);
    const headers = {};
    for (const h of op.requestHeaders || []) headers[h.name] = h.value;
    const res = await fetch(op.url, { method: op.method, headers, body: chunk });
    if (!res.ok) throw new Error(`chunk upload failed: ${res.status} ${await res.text()}`);
  }
}

async function commitScreenshot(screenshotId) {
  const checksum = createHash('md5').update(SCREENSHOT).digest('hex');
  await api('PATCH', `/v1/inAppPurchaseAppStoreReviewScreenshots/${screenshotId}`, {
    data: {
      type: 'inAppPurchaseAppStoreReviewScreenshots',
      id: screenshotId,
      attributes: { uploaded: true, sourceFileChecksum: checksum },
    },
  });
}

async function hasScreenshot(iapId) {
  try {
    const res = await api('GET', `/v1/inAppPurchases/${iapId}/appStoreReviewScreenshot`);
    return !!res?.data;
  } catch (err) {
    if (err.status === 404) return false;
    throw err;
  }
}

async function main() {
  const skus = [
    ...Object.keys(PLAY_PRODUCT_MAP),
    ALL_CATEGORIES_SKU,
    TRIAL_SKU,
  ];

  console.log(`Looking up product ids for app ${APP_ID}...`);
  const existing = await fetchExistingProducts();

  const missing = skus.filter((sku) => !existing.has(sku));
  if (missing.length) {
    console.error(`These products don't exist yet, run create_iap_products.mjs first: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`Uploading "${SCREENSHOT_NAME}" (${SCREENSHOT.length} bytes) to ${skus.length} products...\n`);

  const failed = [];
  for (const [i, sku] of skus.entries()) {
    const tag = `[${i + 1}/${skus.length}] ${sku}`;
    const iapId = existing.get(sku);
    try {
      if (await hasScreenshot(iapId)) {
        console.log(`${tag}: already has a screenshot, skipping`);
        continue;
      }
      const reservation = await reserveScreenshot(iapId);
      await uploadBytes(reservation.attributes.uploadOperations);
      await commitScreenshot(reservation.id);
      console.log(`${tag}: uploaded`);
    } catch (err) {
      console.error(`${tag}: FAILED — ${err.message}`);
      failed.push(sku);
    }
  }

  console.log('\n--- Done ---');
  if (failed.length) {
    console.log(`\nThese failed — check the errors above:`);
    console.log(failed.join(', '));
  } else {
    console.log('\nAll products now have a review screenshot.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
