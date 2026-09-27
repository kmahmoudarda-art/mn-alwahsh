#!/usr/bin/env node
// Read-only: prints every in-app purchase's App Store Connect state
// (READY_TO_SUBMIT, MISSING_METADATA, ...) plus which parts look missing
// (localization, review screenshot, price schedule, availability), so a
// product stuck outside "Ready to Submit" can be diagnosed without opening
// all 71 in the UI. Changes nothing.
//
// Usage: same env vars as set_iap_availability.mjs.

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

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


async function has(path) {
  try {
    const res = await api('GET', path);
    return Array.isArray(res?.data) ? res.data.length > 0 : !!res?.data;
  } catch (err) {
    if (err.status === 404) return false;
    return null; // couldn't tell — shown as "name?"
  }
}

async function check(missing, name, path) {
  const ok = await has(path);
  if (ok === false) missing.push(name);
  else if (ok === null) missing.push(`${name}?`);
}

async function main() {
  const items = await fetchAllPages(`/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`);
  const counts = {};
  const problems = [];
  for (const item of items) {
    const { productId, state } = item.attributes;
    counts[state] = (counts[state] || 0) + 1;
    if (state === 'READY_TO_SUBMIT' || state === 'APPROVED' || state === 'WAITING_FOR_REVIEW' || state === 'IN_REVIEW') continue;
    const missing = [];
    await check(missing, 'localization', `/v2/inAppPurchases/${item.id}/inAppPurchaseLocalizations?limit=1`);
    await check(missing, 'review screenshot', `/v2/inAppPurchases/${item.id}/appStoreReviewScreenshot`);
    await check(missing, 'price', `/v2/inAppPurchases/${item.id}/iapPriceSchedule`);
    await check(missing, 'availability', `/v2/inAppPurchases/${item.id}/inAppPurchaseAvailability`);
    problems.push(`${productId}: ${state}${missing.length ? ' — missing: ' + missing.join(', ') : ''}`);
  }
  console.log(`${items.length} in-app purchases by state:`);
  for (const [state, n] of Object.entries(counts)) console.log(`  ${state}: ${n}`);
  if (problems.length) {
    console.log('\nNot ready:');
    for (const p of problems) console.log('  ' + p);
  } else {
    console.log('\nAll in-app purchases are ready.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
