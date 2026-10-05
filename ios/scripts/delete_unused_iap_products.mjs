#!/usr/bin/env node
// PERMANENTLY deletes the App Store in-app purchases whose categories never
// appear in the app, so App Review stops asking where to find them
// (Guideline 2.1(b)). A category doesn't appear when either:
//   - it's in HIDDEN_CATEGORIES (hiddenCategories.js), or
//   - none of the Supabase question tables has a row for it (the category
//     list in CategoryPicker.jsx is built from those rows, see
//     fetchCategories() in supabaseClient.js).
// A product is deleted only when NONE of its category variants is visible.
//
// Deleting cannot be undone, and Apple never lets a deleted product id be
// reused. Run with DRY_RUN=1 first to just print what would be deleted.
//
// Usage:
//   APPLE_ISSUER_ID=... APPLE_KEY_ID=... APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXX.p8 \
//   APPLE_APP_ID=6814543685 [DRY_RUN=1] \
//   node ios/scripts/delete_unused_iap_products.mjs

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PLAY_PRODUCT_MAP } from '../../mn-alwahsh-updated/src/utils/playProducts.js';
import { HIDDEN_CATEGORIES } from '../../mn-alwahsh-updated/src/utils/hiddenCategories.js';

const DRY_RUN = !!process.env.DRY_RUN;
const ISSUER_ID = process.env.APPLE_ISSUER_ID;
const KEY_ID = process.env.APPLE_KEY_ID;
const PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH;
const APP_ID = process.env.APPLE_APP_ID;

if (!DRY_RUN && (!ISSUER_ID || !KEY_ID || !PRIVATE_KEY_PATH || !APP_ID)) {
  console.error(
    'Missing env vars. Required: APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY_PATH, APPLE_APP_ID'
  );
  process.exit(1);
}

const PRIVATE_KEY = DRY_RUN ? null : readFileSync(PRIVATE_KEY_PATH, 'utf8');
const API_BASE = 'https://api.appstoreconnect.apple.com';

// Same project, key and tables as supabaseClient.js (the anon key is public;
// it ships in the web app).
const SUPABASE_URL = 'https://cqqeyvhofbnvjemoihca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWV5dmhvZmJudmplbW9paGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDg5ODIsImV4cCI6MjA5MjQ4NDk4Mn0.y_1B1Gy8EIEFpVrJu9TKX1fPSBfR1jFVrcgO1PA1-hs';
const QUESTION_TABLES = ['Sin-Jim1', 'Flags', 'Fanan', 'Fam', 'falsafa', 'logo1', 'logoo', 'kids'];

// Unlike the app (which silently skips a table that fails to load), this
// fails loudly: a missed table would make its categories look empty and
// get their products deleted.
async function fetchSupabaseCategories() {
  const seen = new Set();
  for (const table of QUESTION_TABLES) {
    for (let from = 0; ; from += 1000) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=category&offset=${from}&limit=1000`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) throw new Error(`Supabase ${table} -> ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const rows = await res.json();
      for (const r of rows) if (r.category && !r.category.startsWith('_hidden_')) seen.add(r.category);
      if (rows.length < 1000) break;
    }
  }
  if (seen.size === 0) throw new Error('Supabase returned no categories at all, refusing to delete anything');
  return seen;
}

function findUnusedSkus(supabaseCategories) {
  const unused = [];
  for (const [sku, info] of Object.entries(PLAY_PRODUCT_MAP)) {
    const visible = info.categories.some((c) => supabaseCategories.has(c) && !HIDDEN_CATEGORIES.includes(c));
    if (!visible) {
      const reason = info.categories.some((c) => HIDDEN_CATEGORIES.includes(c)) ? 'hidden in the app' : 'no questions in Supabase';
      unused.push({ sku, label: info.label, reason });
    }
  }
  return unused;
}

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

async function detachFromSubmissions(unusedIds) {
  const submissions = await fetchAllPages(`/v1/reviewSubmissions?filter[app]=${APP_ID}&limit=50`);
  for (const sub of submissions) {
    const state = sub.attributes.state;
    console.log(`Review submission ${sub.id}: ${state}`);
    if (state === 'COMPLETE' || state === 'CANCELING') continue;
    const items = await fetchAllPages(`/v1/reviewSubmissions/${sub.id}/items?limit=200`);
    for (const item of items) {
      const rels = item.relationships || {};
      const iapId = rels.inAppPurchaseV2?.data?.id;
      if (!iapId) continue;
      if (!unusedIds.has(iapId)) continue;
      try {
        await api('DELETE', `/v1/reviewSubmissionItems/${item.id}`);
        console.log(`  ${unusedIds.get(iapId)}: removed from submission`);
      } catch (err) {
        console.error(`  ${unusedIds.get(iapId)}: could not remove from submission — ${err.message}`);
      }
    }
  }
}

async function main() {
  console.log('Loading categories from Supabase...');
  const categories = await fetchSupabaseCategories();
  console.log(`${categories.size} categories have questions.\n`);

  const unused = findUnusedSkus(categories);
  console.log(`${unused.length} products unlock only categories that never appear:`);
  for (const u of unused) console.log(`  ${u.sku}  ${u.label}  (${u.reason})`);

  if (DRY_RUN) {
    console.log('\nDRY_RUN set, nothing deleted.');
    return;
  }

  console.log(`\nLooking up product ids for app ${APP_ID}...`);
  const existing = await fetchExistingProducts();

  // Apple refuses to delete a product that is still attached to a review
  // submission (409 IAP_DELETE_NOT_ALLOWED), so first take it out of any
  // open submission — the same as unticking it on the version page.
  const unusedIds = new Map(unused.filter((u) => existing.has(u.sku)).map((u) => [existing.get(u.sku), u.sku]));
  await detachFromSubmissions(unusedIds);

  const failed = [];
  for (const { sku } of unused) {
    const id = existing.get(sku);
    if (!id) { console.log(`${sku}: not in App Store Connect, skipping`); continue; }
    try {
      await api('DELETE', `/v2/inAppPurchases/${id}`);
      console.log(`${sku}: deleted`);
    } catch (err) {
      console.error(`${sku}: FAILED — ${err.message}`);
      failed.push(sku);
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
