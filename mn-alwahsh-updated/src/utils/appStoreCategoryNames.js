// The exact Reference Name / Arabic Display Name registered for each IAP
// product in App Store Connect (and, for parity, Google Play Console).
//
// WHY THIS FILE EXISTS: `playProducts.js`'s `label` field is the real,
// specific in-app category name (e.g. "CR7", "Barcelona", "Netflix",
// "Breaking Bad") — fine to show as a quiz category, but Apple's purchase
// sheet renders the *App Store Connect product name* during an actual
// paid transaction, and turning real footballers'/studios'/brands' names
// into the official name of something you're charging money for is a much
// stronger trademark/publicity-rights claim than using them as a trivia
// topic. So every IAP whose real label names a specific real person, club,
// show, or brand was deliberately given a trademark-neutral generic name in
// App Store Connect instead (e.g. cat002's label is "CR7" but its App
// Store Connect name is "أسئلة كرة القدم 1"). Already-generic labels
// (e.g. "أعلام العالم", "IQ", "محترف كرة") were left as-is — nothing to
// rename.
//
// THE PROBLEM THIS FILE FIXES: Apple's Guideline 2.1(b) rejection on this
// submission ("we cannot locate the In-App Purchases... within the app")
// happened because the app's UI only ever shows the real `label` from
// playProducts.js — a reviewer searching the running app for an IAP
// literally named "أسئلة كرة القدم 1" never finds that text anywhere,
// because the tile says "CR7" instead. CategoryPicker.jsx now renders
// this file's name as a small secondary label on every locked/premium
// tile so the registered product name is actually visible somewhere in
// the app, without changing the primary (real, specific) category name
// shown to players.
//
// Keep this file and App Store Connect's actual product names in sync —
// see ios/scripts/sync_iap_names.mjs, which pushes exactly this table to
// App Store Connect via its API (reference name + ar-SA localization) so
// the two can never drift apart. If you ever rename a category or add a
// new catNNN in playProducts.js, add/update its entry here too, then
// re-run that script.
export const APP_STORE_CATEGORY_NAMES = {
  cat001: 'football logo',
  cat002: 'أسئلة كرة القدم 1',
  cat003: 'أسئلة كرة القدم 2',
  cat004: 'أسئلة كرة القدم 3',
  cat005: 'أسئلة كرة القدم 4',
  cat006: 'أسئلة كرة القدم 5',
  cat007: 'المنتخب الأردني',
  cat008: 'أسئلة ألعاب إلكترونية 1',
  cat009: 'أسئلة كرة القدم 6',
  cat010: 'أسئلة كرة القدم 7',
  cat011: 'أسئلة ألعاب إلكترونية 2',
  cat012: 'أسئلة كرة القدم 8',
  cat013: 'أسئلة كرة القدم 9',
  cat014: 'أسئلة كرة القدم 10',
  cat015: 'أسئلة ألعاب إلكترونية 3',
  cat016: 'محترف كرة',
  cat017: 'أسئلة مسلسلات وأفلام 1',
  cat018: 'أسئلة مسلسلات وأفلام 2',
  cat019: 'أسئلة مسلسلات وأفلام 3',
  cat020: 'أفلام إنجليزية',
  cat021: 'أسئلة مسلسلات وأفلام 4',
  cat022: 'أسئلة مسلسلات وأفلام 5',
  cat023: 'أسئلة مسلسلات وأفلام 6',
  cat024: 'أسئلة مسلسلات وأفلام 7',
  cat025: 'أسئلة مسلسلات وأفلام 8',
  cat026: 'أسئلة مسلسلات وأفلام 9',
  cat027: 'أسئلة مسلسلات وأفلام 10',
  cat028: 'أسئلة مسلسلات وأفلام 11',
  cat029: 'أسئلة مسلسلات وأفلام 12',
  cat030: 'أسئلة مسلسلات وأفلام 13',
  cat031: 'أسئلة مسلسلات وأفلام 14',
  cat032: 'أسئلة فنانين وأغاني 1',
  cat033: 'أسئلة فنانين وأغاني 2',
  cat034: 'أسئلة فنانين وأغاني 3',
  cat035: 'أسئلة فنانين وأغاني 4',
  cat036: 'أسئلة فنانين وأغاني 5',
  cat037: 'أغاني قديمة',
  cat038: 'من غنى ؟',
  cat039: 'لمن الاغنية',
  cat040: 'أعلام العالم',
  cat041: 'الأردن',
  cat042: 'دبي',
  cat043: 'براندات', // HIDDEN_CATEGORIES — never shown in-app, see hiddenCategories.js
  cat044: 'أسئلة إنجليزية',
  cat045: 'هواتف ذكية',
  cat046: 'سيارات',
  cat047: 'أسئلة كرتون وأطفال 1',
  cat048: 'أسئلة موضة وجمال 1',
  cat049: 'أسئلة موضة وجمال 2',
  cat050: 'أسئلة موضة وجمال 3', // HIDDEN_CATEGORIES
  cat051: 'أسئلة موضة وجمال 4',
  cat052: 'أسئلة موضة وجمال 5',
  cat053: 'أسئلة كرتون وأطفال 2', // HIDDEN_CATEGORIES
  cat054: 'أسئلة كرتون وأطفال 3', // HIDDEN_CATEGORIES
  cat055: 'أسئلة كرتون وأطفال 4', // HIDDEN_CATEGORIES
  cat056: 'أسئلة كرتون وأطفال 5', // HIDDEN_CATEGORIES
  cat057: 'أسئلة كرتون وأطفال 6', // HIDDEN_CATEGORIES
  cat058: 'أسئلة كرتون وأطفال 7', // HIDDEN_CATEGORIES
  cat059: 'من الشخصية ؟',
  cat060: 'IQ',
  cat061: 'رياضيات',
  cat062: 'الغاز محيرة',
  cat063: 'Logos', // HIDDEN_CATEGORIES
  cat064: 'فلسفة',
  cat065: 'محاسبة',
  cat066: 'حيوانات',
  cat067: 'Dangerous Animals',
  cat068: 'حيوانات خطرة',
  cat069: 'حيوانات خطيرة',
  unlock_all_categories: 'فتح جميع الفئات',
  trial_pass: 'تجربة فئة للعبة واحدة',
};

export function getAppStoreCategoryName(sku) {
  return APP_STORE_CATEGORY_NAMES[sku] || null;
}
