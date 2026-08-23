// Categories hidden from selection entirely — not paid, not shown at all.
//
// WHY THIS EXISTS: Google Play (and app stores generally) can flag or reject
// apps that display real photos of celebrities, sports club badges, or
// branded/trademarked logos (Real Madrid, Disney, SpongeBob, Sephora, etc.)
// without a license — this is separate from the background-music copyright
// issue and needs its own check.
//
// IMPORTANT — READ BEFORE SUBMITTING TO PLAY STORE:
// This list was built from the category NAMES only (see CATEGORY_GROUPS in
// CategoryPicker.jsx) — categories whose names strongly imply real photos of
// people, sports club badges, or branded/trademarked logos. Nobody here can
// see the actual images sitting in your Supabase tables, so:
//   1. Review the questions inside each of these categories yourself and
//      confirm they do show real branded/celebrity imagery (if a category
//      turns out to be text-only trivia, feel free to remove it below).
//   2. Also check categories NOT on this list — some innocuous-sounding
//      names (e.g. general "أفلام عربية") could still contain movie
//      poster images with actor photos.
//   3. Song/audio questions (لمن الاغنية, من غنى؟) are a related but
//      separate risk if they play copyrighted song clips — that's not
//      something hiding a "category with pictures" fixes; check those
//      question rows for audio_url/clip fields too.
//
// Add or remove category names exactly as they appear in Supabase's
// `category` column (see CATEGORY_GROUPS in CategoryPicker.jsx for the
// full known list) to change what's hidden.
export const HIDDEN_CATEGORIES = [
  // Sports — real player photos / club badges (trademarked)
  'football logo', 'football Logo', 'Football Logo', 'FOOTBALL LOGO',
  'CR7', 'ميسي',

  // Entertainment — TV/movie studio IP, real actor/character photos
  'جيم اوف ثرونز', 'Game of Thrones', 'Who Said GOT',

  // Music — real artist photos (generic "Arab artists" bucket only —
  // specific named singers were unhidden on request)
  'فنانون عرب',

  // Fashion / lifestyle brands
  'Sephora', 'سيفورا', 'guess fashion', 'Guess Fashion', 'GUESS FASHION', 'Guess fashion',
  'Dubai Bling', 'سبيستون',

  // Kids — Disney/Nickelodeon/branded characters
  'ديزني', 'Disney', 'بيبي شارك', 'Baby Shark', 'سبونج بوب', 'SpongeBob',
  'رسوم متحركة', 'كرتون', 'من الشخصية ؟',

  // Brand/logo guessing — literally trademarked logos
  'براندات', 'Logos',

  // Tech/products — likely shows real device/car brand photos
  'هواتف ذكية', 'سيارات',
];

export function isHiddenCategory(name) {
  return HIDDEN_CATEGORIES.includes(name);
}
