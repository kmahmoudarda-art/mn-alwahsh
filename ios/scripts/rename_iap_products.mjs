#!/usr/bin/env node
// Replaces brand / celebrity / show names in the App Store in-app purchase
// names with neutral, genre-based ones (App Review Guideline 5.2 —
// intellectual property). create_iap_products.mjs named each product after
// its category label ("Real Madrid", "Netflix", "عمرو دياب", ...), which
// Apple can flag as using trademarks and people's names without permission.
//
// Only the App Store product names change: the display name + description
// every customer sees on Apple's purchase sheet (all localizations), and
// the internal reference name. Product ids (cat001...) and the in-app
// category names stay the same, so nothing in the app or the Supabase
// purchase records is affected.
//
// Categories whose label is already generic ("حيوانات", "رياضيات", ...)
// keep their name. Safe to re-run — it just writes the same names again.
//
// Usage:
//   APPLE_ISSUER_ID=... APPLE_KEY_ID=... APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXX.p8 \
//   APPLE_APP_ID=6814543685 \
//   node ios/scripts/rename_iap_products.mjs

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

// Products whose category label names a brand, club, competition, show,
// company or real person, grouped into a neutral genre. Each gets
// "<genre> <n>", numbered in product order so every name stays unique.
const BRANDED_GENRES = {
  'أسئلة كرة القدم': ['cat002', 'cat003', 'cat004', 'cat005', 'cat006', 'cat009', 'cat010', 'cat012', 'cat013', 'cat014'],
  'أسئلة ألعاب إلكترونية': ['cat008', 'cat011', 'cat015'],
  'أسئلة مسلسلات وأفلام': ['cat017', 'cat018', 'cat019', 'cat021', 'cat022', 'cat023', 'cat024', 'cat025', 'cat026', 'cat027', 'cat028', 'cat029', 'cat030', 'cat031'],
  'أسئلة فنانين وأغاني': ['cat032', 'cat033', 'cat034', 'cat035', 'cat036'],
  'أسئلة موضة وجمال': ['cat048', 'cat049', 'cat050', 'cat051', 'cat052'],
  'أسئلة كرتون وأطفال': ['cat047', 'cat053', 'cat054', 'cat055', 'cat056', 'cat057', 'cat058'],
};

function buildNames() {
  const names = {};
  for (const [genre, skus] of Object.entries(BRANDED_GENRES)) {
    skus.forEach((sku, i) => { names[sku] = `${genre} ${i + 1}`; });
  }
  for (const [sku, info] of Object.entries(PLAY_PRODUCT_MAP)) {
    if (!names[sku]) names[sku] = info.label;
  }
  names[ALL_CATEGORIES_SKU] = 'فتح جميع الفئات';
  names[TRIAL_SKU] = 'تجربة فئة للعبة واحدة';
  return names;
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

async function renameProduct(iapId, sku, name) {
  // Reference name — internal only, but App Review sees it. Must be unique
  // per app, hence the product id prefix.
  await api('PATCH', `/v2/inAppPurchases/${iapId}`, {
    data: { type: 'inAppPurchases', id: iapId, attributes: { name: `${sku} ${name}`.slice(0, 64) } },
  });

  // Display name + description shown to customers, in every localization.
  const localizations = await fetchAllPages(`/v2/inAppPurchases/${iapId}/inAppPurchaseLocalizations?limit=50`);
  for (const loc of localizations) {
    await api('PATCH', `/v1/inAppPurchaseLocalizations/${loc.id}`, {
      data: {
        type: 'inAppPurchaseLocalizations',
        id: loc.id,
        attributes: {
          name: name.slice(0, 30),
          description: `فتح فئة ${name} في لعبة من الوحش`.slice(0, 45),
        },
      },
    });
  }
  return localizations.length;
}

async function main() {
  const names = buildNames();
  const skus = Object.keys(names);

  console.log(`Looking up product ids for app ${APP_ID}...`);
  const existing = await fetchExistingProducts();

  const missing = skus.filter((sku) => !existing.has(sku));
  if (missing.length) {
    console.error(`These products don't exist yet, run create_iap_products.mjs first: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`Renaming ${skus.length} products...\n`);

  const failed = [];
  for (const [i, sku] of skus.entries()) {
    const tag = `[${i + 1}/${skus.length}] ${sku}`;
    try {
      const count = await renameProduct(existing.get(sku), sku, names[sku]);
      console.log(`${tag}: "${names[sku]}" (${count} localization${count === 1 ? '' : 's'})`);
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
  console.log('\nAll products renamed.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
