// Categories that never appear in solo mode: kids, girls & fashion, and
// حمو بيكا. Matched by exact known names, by keywords (so the many
// spelling/case variants are covered), and by the Supabase `kids` table.
import { getCategoryTable } from './supabaseClient';

const EXACT = new Set([
  // kids
  'kids', 'kids guess', 'kids easy', 'أطفال', 'عالم الأطفال', 'سبيستون', 'رسوم متحركة', 'كرتون', 'من الشخصية ؟',
  // girls & fashion
  'بنات فقط', 'سيفورا', 'sephora', 'guess fashion', 'guess fashion easy', 'dubai bling',
  // singers excluded on request
  'حمو بيكا',
]);

const KEYWORDS = /kids|أطفال|اطفال|بنات|حمو\s*بيكا|سبيستون|sephora|سيفورا|guess\s*fashion/i;

export function isSoloExcluded(category) {
  const key = String(category || '').toLowerCase().trim();
  if (EXACT.has(key) || KEYWORDS.test(key)) return true;
  return getCategoryTable(category) === 'kids';
}
