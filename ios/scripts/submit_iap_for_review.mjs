#!/usr/bin/env node
// Adds every in-app purchase that's complete but not yet submitted
// (App Store Connect state READY_TO_SUBMIT, shown as "Prepare for
// Submission" in the UI) to the app's draft review submission — the API
// equivalent of opening each product and clicking "Add for Review", which
// App Store Connect otherwise requires one product at a time. Products
// already in a submission, or not complete, are left alone.
//
// Optional ONLY_SKU=cat003 limits it to one product (for a first test).
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



async function main() {
  const only = process.env.ONLY_SKU || '';
  const items = await fetchAllPages(`/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`);
  const todo = items.filter((i) => i.attributes.state === 'READY_TO_SUBMIT'
    && (!only || i.attributes.productId === only));
  console.log(`${todo.length} in-app purchase(s) to add to the review submission${only ? ` (only ${only})` : ''}.\n`);

  const failed = [];
  for (const [n, item] of todo.entries()) {
    const tag = `[${n + 1}/${todo.length}] ${item.attributes.productId}`;
    try {
      await api('POST', '/v1/inAppPurchaseSubmissions', {
        data: {
          type: 'inAppPurchaseSubmissions',
          relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: item.id } } },
        },
      });
      console.log(`${tag}: added`);
    } catch (err) {
      console.error(`${tag}: FAILED — ${err.message}`);
      failed.push(item.attributes.productId);
    }
  }

  console.log('\n--- Done ---');
  if (failed.length) {
    console.log(`\nThese failed — check the errors above:\n${failed.join(', ')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
