// Premium ("paid") categories — one config, no scattered hardcoding.
//
// Add category names here EXACTLY as they appear in Supabase's `category`
// column (see CategoryPicker.jsx / supabaseClient.js) to make them premium.
// Everything else in the app (CategoryPicker, SetupScreen) only calls the
// helpers below — nothing else needs to change when you edit this list.
export const PREMIUM_CATEGORIES = [
  // 'IQ',
  // 'الغاز محيرة',
  // 'أفلام إنجليزية',
];

// Price shown in the unlock prompt. Purely display — the real price lives in
// the Google Play product listing once billing is wired in (see unlockCategory below).
export const PREMIUM_PRICE_LABEL = '4.99 AED';

const UNLOCK_STORAGE_KEY = 'mn_alwahsh_unlocked_categories_v1';

export function isPremiumCategory(name) {
  return PREMIUM_CATEGORIES.includes(name);
}

export function getUnlockedCategories() {
  try {
    const raw = localStorage.getItem(UNLOCK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isCategoryUnlocked(name) {
  if (!isPremiumCategory(name)) return true;
  return getUnlockedCategories().includes(name);
}

function persistUnlocked(list) {
  try { localStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(list)); } catch {}
}

/**
 * TEMPORARY unlock mechanism — grants access locally, no payment involved.
 *
 * This exists so the lock/unlock UX can be built and tested end-to-end
 * before Google Play Billing is wired in. Swap the body of this function
 * for a real purchase flow once you have:
 *   1. The app packaged as a TWA (Trusted Web Activity) via Bubblewrap
 *   2. A "managed product" created per premium category in Play Console
 *   3. A call to the Digital Goods API (available inside a TWA) to launch
 *      the purchase sheet and get back a purchase token
 *   4. Ideally, a backend endpoint that verifies that purchase token with
 *      Google before calling unlockCategory — otherwise a purchase can be
 *      spoofed client-side, since this app currently has no backend of its
 *      own to verify against.
 *
 * Nothing in CategoryPicker.jsx or SetupScreen.jsx needs to change when you
 * do this — they only call isCategoryUnlocked() and unlockCategory().
 */
export function unlockCategory(name) {
  const current = getUnlockedCategories();
  if (!current.includes(name)) {
    persistUnlocked([...current, name]);
  }
}

export function unlockAllPremiumCategories() {
  persistUnlocked([...PREMIUM_CATEGORIES]);
}
