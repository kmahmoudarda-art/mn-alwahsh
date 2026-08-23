// Premium ("paid") categories — one config, no scattered hardcoding.
//
// Add category names here EXACTLY as they appear in Supabase's `category`
// column (see CategoryPicker.jsx / supabaseClient.js) to make them premium.
//
// This file only defines WHICH categories are premium. For whether a given
// signed-in user has actually unlocked one, see entitlements.js — that's
// backed by a real Supabase table so an unlock survives across devices and
// works on both the website and the packaged app.
export const PREMIUM_CATEGORIES = [
  // 'IQ',
  // 'الغاز محيرة',
  // 'أفلام إنجليزية',
];

// Price shown in the unlock prompt. Purely display — the real price lives
// in the Google Play product listing / Stripe price once real billing is wired in.
export const PREMIUM_PRICE_LABEL = '4.99 AED';

export function isPremiumCategory(name) {
  return PREMIUM_CATEGORIES.includes(name);
}
