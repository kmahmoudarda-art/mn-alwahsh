const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cqqeyvhofbnvjemoihca.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWV5dmhvZmJudmplbW9paGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDg5ODIsImV4cCI6MjA5MjQ4NDk4Mn0.y_1B1Gy8EIEFpVrJu9TKX1fPSBfR1jFVrcgO1PA1-hs';

const TABLE_MAIN = 'Sin-Jim1';
const TABLE_FLAGS = 'Flags';
const TABLE_FANAN = 'Fanan';
const TABLE_FAM = 'Fam';
const TABLE_FALSAFA = 'falsafa';
const TABLE_LOGO1 = 'logo1';
const TABLE_LOGOO = 'logoo';
const TABLE_KIDS = 'kids';


const BASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: 'application/json',
};

// On startup: clear only question/session caches — preserve game saves (mn_alwahsh_v3_* keys)
try {
  const GAME_SAVE_PREFIX = 'mn_alwahsh_v3_';
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && !k.startsWith(GAME_SAVE_PREFIX)) keysToRemove.push(k);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  sessionStorage.clear();
} catch (e) { /* ignore */ }

// On startup: reset all tables, log row counts per table
(async () => {
  try {
    await resetAllQuestions();
    console.log('[Supabase] All 4 tables reset on startup');

    // Log row counts for all 4 tables
    const allTables = [TABLE_MAIN, TABLE_FLAGS, TABLE_FANAN, TABLE_FAM, TABLE_FALSAFA, TABLE_LOGO1, TABLE_LOGOO, TABLE_KIDS];
    const counts = await Promise.all(allTables.map(async (table) => {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`,
        { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache', Prefer: 'count=exact' } }
      );
      const count = res.ok ? parseInt(res.headers.get('content-range')?.split('/')[1] || '0', 10) : 0;
      return { table, count };
    }));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    counts.forEach(({ table, count }) => console.log(`${table}: ${count} questions`));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (e) {
    console.error('[Supabase] Startup init error:', e);
  }
})();

// Reset used=false in all tables
export async function resetAllQuestions() {
  const reset = async (table) => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?used=not.is.null`,
      {
        method: 'PATCH',
        headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ used: false }),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      console.warn(`[Supabase] Reset failed for ${table}:`, res.status, txt);
    }
  };
  await Promise.all([reset(TABLE_MAIN), reset(TABLE_FLAGS), reset(TABLE_FANAN), reset(TABLE_FAM), reset(TABLE_FALSAFA), reset(TABLE_LOGO1), reset(TABLE_LOGOO), reset(TABLE_KIDS)]);
  console.log('[Supabase] All 7 tables reset successfully');
}

// Fetch all rows from a single table with pagination
async function fetchAllRows(table, select = 'category') {
  const batchSize = 1000;
  let allRows = [];
  let from = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}&offset=${from}&limit=${batchSize}`;
    const res = await fetch(url, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
    if (!res.ok) break;
    const data = await res.json();
    if (!data || data.length === 0) break;
    allRows = [...allRows, ...data];
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return allRows;
}

// category (lowercase) → owning table — built once at fetchCategories time
const categoryTableMap = new Map();

// Fetch distinct categories from ALL tables merged — always fresh, no cache
export async function fetchCategories() {
  const tableSets = [
    [TABLE_MAIN, 'category'],
    [TABLE_FLAGS, 'category'],
    [TABLE_FANAN, 'category'],
    [TABLE_FAM, 'category'],
    [TABLE_FALSAFA, 'category'],
    [TABLE_LOGO1, 'category'],
    [TABLE_LOGOO, 'category'],
    [TABLE_KIDS, 'category'],
  ];
  const results = await Promise.all(tableSets.map(([table, col]) => fetchAllRows(table, col).then(rows => ({ table, rows }))));

  categoryTableMap.clear();
  const seen = new Set();
  const unique = [];
  for (const { table, rows } of results) {
    for (const r of rows) {
      const cat = r.category;
      if (!cat || cat.startsWith('_hidden_')) continue;
      // Map category → first table that owns it (priority order)
      const key = cat.toLowerCase().trim();
      if (!categoryTableMap.has(key)) categoryTableMap.set(key, table);
      if (!seen.has(cat)) { seen.add(cat); unique.push(cat); }
    }
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Total categories loaded:', unique.length);
  console.log('Category→Table map built:', categoryTableMap.size, 'entries');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return unique;
}

// Get count of matching unused rows — returns total via Content-Range header (no row data)
async function getRowCount(table, category, points, usedFilter) {
  const intPoints = parseInt(points, 10);
  const encodedCategory = encodeURIComponent(category);
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id&points=eq.${intPoints}&category=eq.${encodedCategory}${usedFilter}&limit=1`;
  const res = await fetch(url, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache', Prefer: 'count=exact' } });
  if (!res.ok) return 0;
  const cr = res.headers.get('content-range');
  const total = cr ? parseInt(cr.split('/')[1], 10) : 0;
  return isNaN(total) ? 0 : total;
}

// Fetch exactly 1 random unused row from a specific table — 2 tiny requests instead of limit=1000
async function fetchOneRandom(table, category, points) {
  const intPoints = parseInt(points, 10);
  const encodedCategory = encodeURIComponent(category);
  const usedFilter = table === TABLE_FAM ? '' : '&used=not.is.true';
  const base = `${SUPABASE_URL}/rest/v1/${table}?points=eq.${intPoints}&category=eq.${encodedCategory}${usedFilter}`;

  // Step 1: count (header only, no body data)
  let total = await getRowCount(table, category, points, usedFilter);

  if (total === 0 && usedFilter) {
    // Table may not support the used filter — retry without it
    const fallbackBase = `${SUPABASE_URL}/rest/v1/${table}?select=id&points=eq.${intPoints}&category=eq.${encodedCategory}&limit=1`;
    const fbRes = await fetch(fallbackBase, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache', Prefer: 'count=exact' } });
    if (fbRes.ok) {
      const cr = fbRes.headers.get('content-range');
      total = cr ? parseInt(cr.split('/')[1], 10) : 0;
      if (isNaN(total)) total = 0;
    }
  }

  if (total === 0) return null;

  // Step 2: fetch 1 row at a random offset (tiny payload)
  const offset = Math.floor(Math.random() * total);
  const rowUrl = `${SUPABASE_URL}/rest/v1/${table}?select=*&points=eq.${intPoints}&category=eq.${encodedCategory}${usedFilter}&limit=1&offset=${offset}`;
  const res = await fetch(rowUrl, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const row = data[0];
  // For FAM: double-check client-side since API filter is skipped
  if (table === TABLE_FAM && row.used === true) return null;
  return row;
}

// Kept only for fetchSwapQuestion (needs a small set to exclude one id)
async function fetchRowsFromTable(table, category, points) {
  const intPoints = parseInt(points, 10);
  const encodedCategory = encodeURIComponent(category);
  const usedFilter = table === TABLE_FAM ? '' : '&used=not.is.true';
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&points=eq.${intPoints}&category=eq.${encodedCategory}${usedFilter}&limit=20`;
  const res = await fetch(url, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache' } });
  if (!res.ok) return [];
  const data = await res.json();
  if (table === TABLE_FAM) return data.filter(r => r.used !== true);
  return data;
}

// Mark a question as used in the correct table
async function markQuestionUsed(row, table) {
  let filter;
  if (table === TABLE_FAM || table === TABLE_KIDS) {
    // These tables use slot as key instead of id
    filter = `category=eq.${encodeURIComponent(row.category)}&points=eq.${row.points}&slot=eq.${encodeURIComponent(row.slot)}`;
  } else {
    const id = row.id ?? row.question_id ?? row.ID ?? row.rowid;
    if (!id) return;
    filter = `id=eq.${encodeURIComponent(id)}`;
  }
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ used: true }),
  });
}

// Reset used=false for a single table
async function resetTable(table) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?used=not.is.null`,
    {
      method: 'PATCH',
      headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ used: false }),
    }
  );
  if (!res.ok) console.warn(`[Supabase] resetTable failed for ${table}:`, res.status);
  else console.log(`[Supabase] ${table} reset (exhausted — recycling)`);
}

// Check if a table has ANY rows for this category (used or not) — used to detect exhaustion vs absence
async function tableHasCategory(table, category, points) {
  const intPoints = parseInt(points, 10);
  const encodedCategory = encodeURIComponent(category);
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&points=eq.${intPoints}&category=eq.${encodedCategory}&limit=1`;
  const res = await fetch(url, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache' } });
  if (!res.ok) return false;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
}

// Fetch question — 2 tiny requests (count + 1 row) instead of fetching limit=1000
export async function fetchQuestion(category, points) {
  const ALL_TABLES = [TABLE_MAIN, TABLE_FLAGS, TABLE_FANAN, TABLE_FAM, TABLE_FALSAFA, TABLE_LOGO1, TABLE_LOGOO, TABLE_KIDS];

  // Fast path: go directly to the owning table via categoryTableMap
  const ownerTable = categoryTableMap.get(category.toLowerCase().trim());
  const tablesToTry = ownerTable ? [ownerTable] : ALL_TABLES;

  for (const table of tablesToTry) {
    let row = await fetchOneRandom(table, category, points);

    if (!row) {
      // Could be exhausted or absent — only reset if the table owns this category
      const hasIt = ownerTable ? true : await tableHasCategory(table, category, points);
      if (hasIt) {
        await resetTable(table);
        row = await fetchOneRandom(table, category, points);
      } else {
        continue;
      }
    }

    if (row) {
      markQuestionUsed(row, table).catch(() => {});
      return normalizeRow(row, table);
    }
  }

  console.warn(`[fetchQuestion] No questions found for "${category}" at ${parseInt(points, 10)}pts`);
  return null;
}

// Fetch a swap question from the same table the original came from
export async function fetchSwapQuestion(category, points, excludeId, sourceTable) {
  console.log('[Swap] called with', { category, points, excludeId, sourceTable });
  const table = sourceTable || TABLE_MAIN;
  const rows = await fetchRowsFromTable(table, category, points);
  console.log('[Swap] rows returned:', rows.length);
  if (!rows.length) return null;

  const filtered = rows.filter(r => {
    const rowId = r.id ?? r.question_id ?? r.ID ?? r.rowid
      ?? (r.slot ? `${r.category}|${r.points}|${r.slot}` : null);
    return rowId == null || String(rowId) !== String(excludeId);
  });
  const pool = filtered.length ? filtered : rows;
  const row = pool[Math.floor(Math.random() * pool.length)];
  return normalizeRow(row, table);
}

function normalizeRow(row, sourceTable) {
  if (!normalizeRow._logged) { console.log('[Supabase] row keys:', Object.keys(row)); normalizeRow._logged = true; }

  const correctAnswer = (row.correct_answer || '').toUpperCase();
  const values = [row.option_a, row.option_b, row.option_c, row.option_d];
  const correctKeyMap = { A: 0, B: 1, C: 2, D: 3 };
  const correctValue = values[correctKeyMap[correctAnswer] ?? 0];

  const keys = ['A', 'B', 'C', 'D'];
  const correctPos = Math.floor(Math.random() * 4);
  const wrongValues = values.filter(v => v !== correctValue);
  for (let i = wrongValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrongValues[i], wrongValues[j]] = [wrongValues[j], wrongValues[i]];
  }

  const shuffledOptions = {};
  let wrongIdx = 0;
  for (let i = 0; i < 4; i++) {
    if (i === correctPos) {
      shuffledOptions[keys[i]] = correctValue;
    } else {
      shuffledOptions[keys[i]] = wrongValues[wrongIdx++];
    }
  }

  // For Fam: use composite key as id; for others use numeric id
  const rowId = row.id ?? row.question_id ?? row.ID ?? row.rowid
    ?? (row.slot ? `${row.category}|${row.points}|${row.slot}` : null);

  return {
    id: rowId,
    source_table: sourceTable || TABLE_MAIN,
    question: row.question || row.questions || '',
    options: shuffledOptions,
    correct: keys[correctPos],
    explanation: row.explanation || '',
    points: row.points,
    image_url: row.image_url || null,
  };
}
