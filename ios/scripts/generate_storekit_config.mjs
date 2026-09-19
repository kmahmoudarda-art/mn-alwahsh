#!/usr/bin/env node
// Generates ios/App/Configuration.storekit from playProducts.js, so local
// Xcode testing (Product > Scheme > Options > StoreKit Configuration) has
// every one of the 71 products without hand-typing them in Xcode's UI.
//
// This is for LOCAL TESTING ONLY — it has no effect on TestFlight or the
// App Store. The real products still need to be created in App Store
// Connect (Monetization > In-App Purchases) with these exact product IDs
// before a TestFlight or production build can sell them — see
// ios/README.md.
//
// Re-run if playProducts.js's catalogue ever changes:
//   node ios/scripts/generate_storekit_config.mjs
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  PLAY_PRODUCT_MAP,
  ALL_CATEGORIES_SKU,
  TRIAL_SKU,
} from '../../mn-alwahsh-updated/src/utils/playProducts.js';
import { ALL_CATEGORIES_PRICE, TRIAL_PRICE_ANDROID } from '../../mn-alwahsh-updated/src/utils/premiumConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../App/Configuration.storekit');

// AED reference prices in playProducts.js don't map to a currency
// StoreKit's local tester understands directly, so each is rounded to the
// nearest of Apple's standard USD price-tier points for local testing
// only — App Store Connect's own price picker (in AED or any storefront
// currency) is what actually sets real charged prices for production.
function priceTierUSD(aed) {
  const usd = aed / 3.67; // AED peg, close enough for a test-only price
  const tiers = [0.99, 1.99, 2.99, 3.99, 4.99, 5.99, 6.99, 7.99, 9.99, 11.99, 14.99, 19.99, 24.99];
  return tiers.reduce((best, t) => (Math.abs(t - usd) < Math.abs(best - usd) ? t : best), tiers[0]);
}

function product({ productID, referenceName, displayName, type, price }) {
  return {
    displayPrice: price.toFixed(2),
    familyShareable: false,
    internalID: randomUUID(),
    localizations: [
      {
        description: `${displayName} — من الوحش`,
        displayName,
        locale: 'ar',
      },
    ],
    productID,
    referenceName,
    type,
  };
}

const products = [];

for (const [sku, info] of Object.entries(PLAY_PRODUCT_MAP)) {
  products.push(
    product({
      productID: sku,
      referenceName: info.label,
      displayName: info.label,
      type: 'NonConsumable',
      price: priceTierUSD(info.price),
    })
  );
}

products.push(
  product({
    productID: ALL_CATEGORIES_SKU,
    referenceName: 'Unlock all categories',
    displayName: 'فتح جميع الفئات',
    type: 'NonConsumable',
    price: priceTierUSD(ALL_CATEGORIES_PRICE),
  })
);

products.push(
  product({
    productID: TRIAL_SKU,
    referenceName: 'One-game trial pass',
    displayName: 'تجربة لعبة واحدة',
    type: 'Consumable',
    price: priceTierUSD(TRIAL_PRICE_ANDROID),
  })
);

const config = {
  identifier: randomUUID(),
  nonRenewingSubscriptions: [],
  products,
  settings: {
    _applicationInternalID: '0',
    _developerTeamID: '0000000000',
    _lastSynchronizedDate: 0,
  },
  subscriptionGroups: [],
  version: { major: 3, minor: 0 },
};

writeFileSync(OUT_PATH, JSON.stringify(config, null, 2) + '\n');
console.log(`wrote ${products.length} products to ${OUT_PATH}`);
