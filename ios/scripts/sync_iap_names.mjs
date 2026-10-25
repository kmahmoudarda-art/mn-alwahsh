#!/usr/bin/env node
// Pushes src/utils/appStoreCategoryNames.js to App Store Connect as both
// each product's Reference Name AND its ar-SA Display Name localization —
// so whatever App Store Connect currently has (hand-edited over time,
// possibly inconsistent) gets forced to exactly match the small in-app
// label CategoryPicker.jsx now shows on every locked category tile and
// on the unlock/purchase screen.
//
// WHY THIS EXISTS: Apple's Guideline 2.1(b) rejection on this submission
// happened because the registered product names (generic, e.g. "أسئلة
// كرة القدم 1") never appeared anywhere in the running app, which only
// showed the real category label (e.g. "CR7"). CategoryPicker.jsx was
// just updated to surface the registered name too — this script is the
// other half: it makes App Store Connect's own records provably match
// appStoreCategoryNames.js, rather than trusting whatever was typed in
// by hand previously. Safe to re-run any time the two need re-syncing.
//
// Unlike ios/scripts/create_iap_products.mjs (which creates new products),
// this script only UPDATES existing ones — it does nothing for a SKU that
// doesn't already exist in App Store Connect, and never creates, deletes,
// or re-prices anything.
//
// Usage (same credentials as create_iap_products.mjs):
//   APPLE_ISSUER_ID=... APPLE_KEY_ID=... APPLE_PRIVATE_KEY_PATH=/path/to/AuthKey_XXXX.p8 \
//   APPLE_APP_ID=6814543685 \
//   node ios/scripts/sync_iap_names.mjs
//
// Add DRY_RUN=1 to only print what would change, without writing anything.

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { APP_STORE_CATEGORY_NAMES } from '../../mn-alwahsh-updated/src/utils/appStoreCategoryNames.js';

const ISSUER_ID = process.env.APPLE_ISSUER_ID;
const KEY_ID = process.env.APPLE_KEY_ID;
const PRIVATE_KEY_PATH = process.env.APPLE_PRIVATE_KEY_PATH;
const APP_ID = process.env.APPLE_APP_ID;
const DRY_RUN = !!process.env.DRY_RUN;

if (!ISSUER_ID || !KEY_ID || !PRIVATE_KEY_PATH || !APP_ID) {
  console.error(
    'Missing env vars. Required: APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY_PATH, APPLE_APP_ID'
  );
  process.exit(1);
}

const PRIVATE_KEY = readFileSync(PRIVATE_KEY_PATH, 'utf8');
const API_BASE = 'https://api.appstoreconnect.apple.com';

// --- App Store Connect API auth (ES256 JWT, 20-minute max lifetime) ----
// (identical to create_iap_products.mjs — see that file for comments)
function makeToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const claims = { iss: ISSUER_ID, iat: now, exp: now + 60 * 15, aud: 'appstoreconnect-v1' };
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64url(header)}.${b64url(claims)}`;
  const signer = createSign('SHA256');
  signer.update(unsigned);
  signer.end();
  const derSignature = signer.sign(PRIVATE_KEY);
  const signature = derToJose(derSignature).toString('base64url');
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
  const r = readInt();
  const s = readInt();
  return Buffer.concat([r, s]);
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
    const err = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function fetchExistingProducts() {
  const map = new Map(); // productId -> inAppPurchase id
  let url = `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`;
  while (url) {
    const res = await api('GET', url);
    for (const item of res.data) map.set(item.attributes.productId, item.id);
    url = res.links?.next ? res.links.next.replace(API_BASE, '') : null;
  }
  return map;
}

// Finds the ar-SA localization id for a product, if one exists.
async function findArabicLocalizationId(iapId) {
  let url = `/v2/inAppPurchases/${iapId}/inAppPurchaseLocalizations?limit=50`;
  while (url) {
    const res = await api('GET', url);
    const hit = res.data.find((l) => l.attributes.locale === 'ar-SA');
    if (hit) return hit.id;
    url = res.links?.next ? res.links.next.replace(API_BASE, '') : null;
  }
  return null;
}

async function updateReferenceName(iapId, name) {
  await api('PATCH', `/v2/inAppPurchases/${iapId}`, {
    data: { type: 'inAppPurchases', id: iapId, attributes: { name: name.slice(0, 64) } },
  });
}

async function updateLocalizationName(localizationId, name) {
  await api('PATCH', `/v1/inAppPurchaseLocalizations/${localizationId}`, {
    data: {
      type: 'inAppPurchaseLocalizations',
      id: localizationId,
      attributes: { name: name.slice(0, 30) },
    },
  });
}

async function createLocalization(iapId, name) {
  await api('POST', '/v1/inAppPurchaseLocalizations', {
    data: {
      type: 'inAppPurchaseLocalizations',
      attributes: {
        name: name.slice(0, 30),
        description: `فتح فئة ${name} في لعبة من الوحش`.slice(0, 45),
        locale: 'ar-SA',
      },
      relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iapId } } },
    },
  });
}

async function main() {
  console.log(`Looking up existing products for app ${APP_ID}...`);
  const existing = await fetchExistingProducts();
  const skus = Object.keys(APP_STORE_CATEGORY_NAMES);
  console.log(`Found ${existing.size} products in App Store Connect. Syncing names for ${skus.length} known SKUs...${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const missing = [];
  const changed = [];
  const failed = [];

  for (const [i, sku] of skus.entries()) {
    const tag = `[${i + 1}/${skus.length}] ${sku}`;
    const iapId = existing.get(sku);
    const targetName = APP_STORE_CATEGORY_NAMES[sku];

    if (!iapId) {
      console.warn(`${tag}: not found in App Store Connect — skipped (nothing to sync)`);
      missing.push(sku);
      continue;
    }

    try {
      if (!DRY_RUN) await updateReferenceName(iapId, targetName);
      console.log(`${tag}: reference name -> "${targetName}"${DRY_RUN ? ' (dry run)' : ''}`);

      const localizationId = await findArabicLocalizationId(iapId);
      if (localizationId) {
        if (!DRY_RUN) await updateLocalizationName(localizationId, targetName);
        console.log(`${tag}: ar-SA display name -> "${targetName}"${DRY_RUN ? ' (dry run)' : ''}`);
      } else {
        console.log(`${tag}: no ar-SA localization yet — creating it`);
        if (!DRY_RUN) await createLocalization(iapId, targetName);
      }
      changed.push(sku);
    } catch (err) {
      console.error(`${tag}: FAILED — ${err.message}`);
      failed.push(sku);
    }
  }

  console.log('\n--- Done ---');
  console.log(`Synced: ${changed.length}`);
  if (missing.length) console.log(`\nNot found in App Store Connect (nothing to sync):\n${missing.join(', ')}`);
  if (failed.length) console.log(`\nFailed — check errors above and retry:\n${failed.join(', ')}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
