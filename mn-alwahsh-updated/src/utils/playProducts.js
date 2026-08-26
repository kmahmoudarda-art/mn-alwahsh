// Maps Google Play in-app product IDs (SKUs) to the exact Supabase
// `category` string(s) they unlock, plus the AED reference price shown
// in-app before the Play purchase sheet opens (Play itself localises the
// real charged price/currency based on the Play Console product price).
//
// One SKU can map to MULTIPLE category strings only when those strings are
// true case/typo duplicates of the exact same category (see the small
// `variants` arrays below) — e.g. 'guess fashion' vs 'Guess Fashion' are the
// same real category stored under different casing in Supabase, so buying
// one SKU unlocks all of its variants at once. Distinct categories that
// happen to cover similar content (e.g. برشلونة vs Barcelona) are separate
// question tables and therefore separate SKUs on purpose.
//
// Product IDs must exist in Play Console (Monetise with Play > Products >
// In-app products) BEFORE a purchase for them will work — see
// PLAY_BILLING_SETUP.md for the full list to create there, with prices.
export const PLAY_PRODUCT_MAP = {
  cat001: { categories: ["football logo", "football Logo", "Football Logo", "FOOTBALL LOGO"], price: 11, label: "football logo" },
  cat002: { categories: ["CR7"], price: 15, label: "CR7" },
  cat003: { categories: ["ميسي"], price: 15, label: "ميسي" },
  cat004: { categories: ["كأس العرب"], price: 13, label: "كأس العرب" },
  cat005: { categories: ["كأس آسيا"], price: 11, label: "كأس آسيا" },
  cat006: { categories: ["Champions League"], price: 15, label: "Champions League" },
  cat007: { categories: ["المنتخب الأردني"], price: 7, label: "المنتخب الأردني" },
  cat008: { categories: ["League of Legends"], price: 13, label: "League of Legends" },
  cat009: { categories: ["Real Madrid"], price: 15, label: "Real Madrid" },
  cat010: { categories: ["Barcelona"], price: 15, label: "Barcelona" },
  cat011: { categories: ["WildRift"], price: 11, label: "WildRift" },
  cat012: { categories: ["ريال مدريد"], price: 15, label: "ريال مدريد" },
  cat013: { categories: ["برشلونة"], price: 15, label: "برشلونة" },
  cat014: { categories: ["برشلونه"], price: 15, label: "برشلونه" },
  cat015: { categories: ["وايلد ريفت"], price: 11, label: "وايلد ريفت" },
  cat016: { categories: ["محترف كرة"], price: 9, label: "محترف كرة" },
  cat017: { categories: ["جيم اوف ثرونز"], price: 15, label: "جيم اوف ثرونز" },
  cat018: { categories: ["جميل وهناء"], price: 9, label: "جميل وهناء" },
  cat019: { categories: ["جميل و هناء"], price: 9, label: "جميل و هناء" },
  cat020: { categories: ["أفلام إنجليزية"], price: 9, label: "أفلام إنجليزية" },
  cat021: { categories: ["نتفليكس"], price: 13, label: "نتفليكس" },
  cat022: { categories: ["بريكينج باد"], price: 13, label: "بريكينج باد" },
  cat023: { categories: ["بيكي بلايندرز"], price: 13, label: "بيكي بلايندرز" },
  cat024: { categories: ["بريزون بريك"], price: 11, label: "بريزون بريك" },
  cat025: { categories: ["Friends"], price: 15, label: "Friends" },
  cat026: { categories: ["Arab Idol"], price: 11, label: "Arab Idol" },
  cat027: { categories: ["Arab Got Talent"], price: 11, label: "Arab Got Talent" },
  cat028: { categories: ["Game of Thrones"], price: 15, label: "Game of Thrones" },
  cat029: { categories: ["باب الحارة"], price: 9, label: "باب الحارة" },
  cat030: { categories: ["أفلام احمد حلمي"], price: 9, label: "أفلام احمد حلمي" },
  cat031: { categories: ["Who Said GOT"], price: 13, label: "Who Said GOT" },
  cat032: { categories: ["أم كلثوم"], price: 13, label: "أم كلثوم" },
  cat033: { categories: ["عبد الحليم"], price: 13, label: "عبد الحليم" },
  cat034: { categories: ["حمو بيكا"], price: 9, label: "حمو بيكا" },
  cat035: { categories: ["تامر حسني"], price: 11, label: "تامر حسني" },
  cat036: { categories: ["عمرو دياب"], price: 13, label: "عمرو دياب" },
  cat037: { categories: ["أغاني قديمة"], price: 9, label: "أغاني قديمة" },
  cat038: { categories: ["من غنى ؟"], price: 9, label: "من غنى ؟" },
  cat039: { categories: ["لمن الاغنية"], price: 9, label: "لمن الاغنية" },
  cat040: { categories: ["أعلام العالم"], price: 7, label: "أعلام العالم" },
  cat041: { categories: ["الأردن"], price: 7, label: "الأردن" },
  cat042: { categories: ["دبي"], price: 9, label: "دبي" },
  cat043: { categories: ["براندات"], price: 9, label: "براندات" },
  cat044: { categories: ["أسئلة إنجليزية"], price: 7, label: "أسئلة إنجليزية" },
  cat045: { categories: ["هواتف ذكية"], price: 9, label: "هواتف ذكية" },
  cat046: { categories: ["سيارات"], price: 9, label: "سيارات" },
  cat047: { categories: ["سبيستون"], price: 9, label: "سبيستون" },
  cat048: { categories: ["Sephora"], price: 13, label: "Sephora" },
  cat049: { categories: ["سيفورا"], price: 13, label: "سيفورا" },
  cat050: { categories: ["guess fashion", "Guess Fashion", "GUESS FASHION", "Guess fashion"], price: 11, label: "guess fashion" },
  cat051: { categories: ["Dubai Bling"], price: 15, label: "Dubai Bling" },
  cat052: { categories: ["guess fashion easy", "Guess Fashion Easy", "Guess fashion easy", "GUESS FASHION EASY"], price: 9, label: "guess fashion easy" },
  cat053: { categories: ["ديزني"], price: 13, label: "ديزني" },
  cat054: { categories: ["Disney"], price: 13, label: "Disney" },
  cat055: { categories: ["بيبي شارك"], price: 9, label: "بيبي شارك" },
  cat056: { categories: ["Baby Shark"], price: 9, label: "Baby Shark" },
  cat057: { categories: ["سبونج بوب"], price: 11, label: "سبونج بوب" },
  cat058: { categories: ["SpongeBob"], price: 11, label: "SpongeBob" },
  cat059: { categories: ["من الشخصية ؟"], price: 9, label: "من الشخصية ؟" },
  cat060: { categories: ["IQ"], price: 15, label: "IQ" },
  cat061: { categories: ["رياضيات"], price: 9, label: "رياضيات" },
  cat062: { categories: ["الغاز محيرة"], price: 13, label: "الغاز محيرة" },
  cat063: { categories: ["Logos"], price: 11, label: "Logos" },
  cat064: { categories: ["فلسفة"], price: 9, label: "فلسفة" },
  cat065: { categories: ["محاسبة"], price: 7, label: "محاسبة" },
  cat066: { categories: ["حيوانات"], price: 7, label: "حيوانات" },
  cat067: { categories: ["Dangerous Animals"], price: 11, label: "Dangerous Animals" },
  cat068: { categories: ["حيوانات خطرة"], price: 11, label: "حيوانات خطرة" },
  cat069: { categories: ["حيوانات خطيرة"], price: 11, label: "حيوانات خطيرة" },
};

// Reverse lookup: exact Supabase category string -> its Play product ID.
// Built from PLAY_PRODUCT_MAP so the two can never drift apart.
export const CATEGORY_TO_PLAY_SKU = {};
for (const [sku, info] of Object.entries(PLAY_PRODUCT_MAP)) {
  for (const cat of info.categories) CATEGORY_TO_PLAY_SKU[cat] = sku;
}

// Bundle: unlocks every category in PLAY_PRODUCT_MAP at once (mirrors
// ALL_CATEGORIES_PRICE in premiumConfig.js — keep the two in sync if the
// catalogue changes).
export const ALL_CATEGORIES_SKU = "unlock_all_categories";

// One-game-only trial — same 1 AED design as the old web trial
// (TRIAL_PRICE_ANDROID in premiumConfig.js). A single SKU regardless of
// which category the player is trying, to avoid needing a trial SKU per
// category (that would double the Play Console product count for no real
// benefit — the trial's value is 'try any one locked category for free
// once', not a per-category price point).
export const TRIAL_SKU = "trial_pass";

export function getSkuForCategory(name) {
  return CATEGORY_TO_PLAY_SKU[name] || null;
}

export function getPlayProductPriceLabel(sku) {
  const info = PLAY_PRODUCT_MAP[sku];
  return info ? `${info.price} AED` : '';
}
