// Premium ("paid") categories — one config, no scattered hardcoding.
//
// Keys must match Supabase's `category` column EXACTLY (see CategoryPicker.jsx
// / supabaseClient.js). The question tables have some duplicate categories
// that only differ by case/whitespace (e.g. "Kids" / "KIDS" / "kids ") —
// those are real, separate rows in Supabase, so every variant is listed here
// with the same price. If you ever clean up that data (merge duplicates in
// Supabase), come back and trim the matching duplicate lines below.
//
// This file only defines WHICH categories are premium and at what price.
// Whether a given signed-in user has actually unlocked one lives in
// entitlements.js — backed by a real Supabase `purchases` table, so an
// unlock survives across devices and works on both the website and the app.
//
// Prices are in AED, shown directly in the unlock prompt.
export const PREMIUM_CATEGORIES = {
  // ── ⚽ رياضة (Sports) ──
  'football logo': 11, 'football Logo': 11, 'Football Logo': 11, 'FOOTBALL LOGO': 11,
  'CR7': 15,
  'ميسي': 15,
  'كأس العرب': 13,
  'كأس آسيا': 11,
  'Champions League': 15,
  'المنتخب الأردني': 7,
  'League of Legends': 13,
  'Real Madrid': 15,
  'Barcelona': 15,
  'WildRift': 11,
  'ريال مدريد': 15,
  'برشلونة': 15,
  'برشلونه': 15,
  'وايلد ريفت': 11,
  'محترف كرة': 9,

  // ── 🎬 ترفيه (Entertainment) ──
  'جيم اوف ثرونز': 15,
  'جميل وهناء': 9,
  'جميل و هناء': 9,
  'أفلام إنجليزية': 9,
  'نتفليكس': 13,
  'بريكينج باد': 13,
  'بيكي بلايندرز': 13,
  'بريزون بريك': 11,
  'Friends': 15,
  'Arab Idol': 11,
  'Arab Got Talent': 11,
  'Game of Thrones': 15,
  'باب الحارة': 9,
  'أفلام احمد حلمي': 9,
  'Who Said GOT': 13,

  // ── 🎵 موسيقى وفنانون (Music & Artists) ──
  'أم كلثوم': 13,
  'عبد الحليم': 13,
  'حمو بيكا': 9,
  'تامر حسني': 11,
  'عمرو دياب': 13,
  'أغاني قديمة': 9,
  'من غنى ؟': 9,
  'لمن الاغنية': 9,

  // ── 🌍 جغرافيا وثقافة (Geography & Culture) ──
  'أعلام العالم': 7,
  'الأردن': 7,
  'دبي': 9,
  'براندات': 9,
  'أسئلة إنجليزية': 7,

  // ── 💻 تكنولوجيا (Tech) ──
  'هواتف ذكية': 9,
  'سيارات': 9,

  // ── 👑 بنات (Girls) ──
  'سبيستون': 9,
  'Sephora': 13,
  'سيفورا': 13,
  'guess fashion': 11, 'Guess Fashion': 11, 'GUESS FASHION': 11, 'Guess fashion': 11,
  'Dubai Bling': 15,

  // ── 🧒 أطفال (Kids) — half kept free on purpose, see note in CategoryPicker ──
  'guess fashion easy': 9, 'Guess Fashion Easy': 9, 'Guess fashion easy': 9, 'GUESS FASHION EASY': 9,
  'ديزني': 13,
  'Disney': 13,
  'بيبي شارك': 9,
  'Baby Shark': 9,
  'سبونج بوب': 11,
  'SpongeBob': 11,
  'من الشخصية ؟': 9,

  // ── 🧠 تحديات (Challenges) ──
  'IQ': 15,
  'رياضيات': 9,
  'الغاز محيرة': 13,
  'Logos': 11,
  'فلسفة': 9,
  'محاسبة': 7,

  // ── 🎲 متفرقات (Misc) — دیني (Religious) categories are intentionally never premium ──
  'حيوانات': 7,
  'Dangerous Animals': 11,
  'حيوانات خطرة': 11,
  'حيوانات خطيرة': 11,
};

export function isPremiumCategory(name) {
  return Object.prototype.hasOwnProperty.call(PREMIUM_CATEGORIES, name);
}

// Per-category price label for the unlock prompt, e.g. "11 AED".
// Falls back to a generic label if a category isn't in the map (shouldn't
// happen if isPremiumCategory() is checked first, but keeps the UI safe).
export function getPremiumPriceLabel(name) {
  const price = PREMIUM_CATEGORIES[name];
  return price ? `${price} AED` : 'فئة مميزة';
}

// ── Owner's personal test account ──
// Signing in as this account unlocks every category, no purchase rows
// needed. Doesn't touch entitlements.js/the `purchases` table at all —
// this is purely a code-level override checked by email, so it works
// even before any real payment gateway is wired in. Sign up for this
// account once from the live site's normal signup form.
export const TEST_ACCOUNT_EMAIL = 'test@mnalwahsh.com';

export function isTestAccount(user) {
  return !!user && user.email === TEST_ACCOUNT_EMAIL;
}

// ── Bundle & trial pricing ──
// Shown as extra options alongside the single-category price whenever the
// unlock prompt appears (see CategoryPicker.jsx's unlock modal).
//
// ALL_CATEGORIES_PRICE — permanent unlock of every current and future
// premium category for this account. Recorded in the `purchases` table
// exactly like a single-category buy, just for every key in
// PREMIUM_CATEGORIES at once (see entitlements.js's grantAllCategoriesToCurrentUser).
//
// TRIAL_PRICE — deliberately NOT written to the purchases table. It's a
// one-game-only unlock: local React state in CategoryPicker, reset the
// moment a new game starts. Nothing to unwind server-side, nothing that
// persists across devices — that's the point, it's a taste, not a purchase.
//
// Was 1 AED originally — raised to 5 because Ziina's API has a hard 2 AED
// minimum per payment (a 1 AED charge is simply rejected), and even at
// 2 AED the ~1.05 AED fee (2.6% + 1 AED) would eat over half of it. 5 AED
// still reads as a clear discount against the 7-15 AED full-category
// prices, while leaving a real margin after fees.
export const ALL_CATEGORIES_PRICE = 100;
export const TRIAL_PRICE = 5;
