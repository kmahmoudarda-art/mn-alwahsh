// The list of categories (and which table owns each) is found by reading the category of
// ~28,000 question rows, which took 10+ seconds on a phone and was repeated on every visit.
// This keeps the result on the device and starts from a small snapshot shipped with the site
// (public/solo-categories.json), then refreshes the real list in the background.
import { fetchCategories, seedCategoryTableMap, getCategoryTableEntries } from './supabaseClient';

// The key must start with "mn_alwahsh_v3_" or supabaseClient wipes it on app start.
const KEY = 'mn_alwahsh_v3_cats_cache';
const FRESH_MS = 6 * 60 * 60 * 1000;

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function write(cats) {
  try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), cats, map: getCategoryTableEntries() })); } catch { /* storage full */ }
}
async function refresh() {
  const cats = await fetchCategories(); // also rebuilds the category → table map
  if (cats.length) write(cats);
  return cats;
}

export async function loadCategoriesFast() {
  const cached = read();
  if (cached?.cats?.length && cached?.map?.length) {
    seedCategoryTableMap(cached.map);
    if (Date.now() - cached.t > FRESH_MS) refresh().catch(() => {});
    return cached.cats;
  }
  try {
    const r = await fetch('/solo-categories.json');
    if (r.ok) {
      const snap = await r.json();
      if (snap?.cats?.length && snap?.map?.length) {
        seedCategoryTableMap(snap.map);
        write(snap.cats);
        refresh().catch(() => {});
        return snap.cats;
      }
    }
  } catch { /* fall through to the slow path */ }
  return refresh();
}
