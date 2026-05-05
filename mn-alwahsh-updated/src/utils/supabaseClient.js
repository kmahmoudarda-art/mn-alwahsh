const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cqqeyvhofbnvjemoihca.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWV5dmhvZmJudmplbW9paGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDg5ODIsImV4cCI6MjA5MjQ4NDk4Mn0.y_1B1Gy8EIEFpVrJu9TKX1fPSBfR1jFVrcgO1PA1-hs';

const TABLE_MAIN = 'Sin-Jim1';
const TABLE_FLAGS = 'Flags';
const TABLE_FANAN = 'Fanan';
const TABLE_FAM = 'Fam';
const TABLE_FALSAFA = 'falsafa';
const TABLE_LOGO1 = 'logo1';
const TABLE_LOGOO = 'logoo';


const BASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: 'application/json',
};

// On startup: clear ALL local/session storage to bust any caches
try {
  localStorage.clear();
  sessionStorage.clear();
  console.log('[Supabase] Cleared localStorage and sessionStorage');
} catch (e) { /* ignore */ }

// On startup: reset all tables, log row counts per table
(async () => {
  try {
    await resetAllQuestions();
    console.log('[Supabase] All 4 tables reset on startup');

    // Log row counts for all 4 tables
    const allTables = [TABLE_MAIN, TABLE_FLAGS, TABLE_FANAN, TABLE_FAM, TABLE_FALSAFA,TABLE_LOGO1,TABLE_LOGOO];
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
  await Promise.all([reset(TABLE_MAIN), reset(TABLE_FLAGS), reset(TABLE_FANAN), reset(TABLE_FAM), reset(TABLE_FALSAFA), reset(TABLE_LOGO1), reset(TABLE_LOGOO)]);
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

// Fetch distinct categories from ALL 4 tables merged — always fresh, no cache
export async function fetchCategories() {
  const [mainRows, flagRows, fananRows, famRows, falsafaRows, logo1Rows , logooRows] = await Promise.all([
    fetchAllRows(TABLE_MAIN, 'category'),
    fetchAllRows(TABLE_FLAGS, 'category'),
    fetchAllRows(TABLE_FANAN, 'category'),
    fetchAllRows(TABLE_FAM, 'category'),
    fetchAllRows(TABLE_FALSAFA, 'category'),
    fetchAllRows(TABLE_LOGO1, 'category'),
    fetchAllRows(TABLE_LOGOO, 'category'),

  ]);
  const allRows = [...mainRows, ...flagRows, ...fananRows, ...famRows, ...falsafaRows, ...logo1Rows, ...logooRows];
  const unique = [...new Set(allRows.map(r => r.category).filter(Boolean))];
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Total categories loaded:', unique.length);
  console.log('All categories:', unique);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return unique;
}

// Fetch rows from a table by category+points (unused only)
// Category is filtered server-side via eq (URL-encoded) for accuracy across large tables
async function fetchRowsFromTable(table, category, points) {
  const intPoints = parseInt(points, 10);
  const encodedCategory = encodeURIComponent(category);
  // Use neq.true to catch both used=false AND used=NULL (default state in Sin-Jim1)
  const usedFilter = table === TABLE_FAM ? '' : '&used=neq.true';
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&points=eq.${intPoints}&category=eq.${encodedCategory}${usedFilter}&limit=1000`;
  const res = await fetch(url, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache' } });
  if (!res.ok) return [];
  const allData = await res.json();

  // For Fam: also filter out used=true rows client-side (in case encoding slips through)
  if (table === TABLE_FAM) {
    return allData.filter(r => r.used !== true);
  }
  return allData;
}

// Mark a question as used in the correct table
async function markQuestionUsed(row, table) {
  let filter;
  if (table === TABLE_FAM) {
    // Fam has no id column — use composite key
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

// Fetch question — tries all tables in order, returns first match
// If a table is exhausted, resets it and retries once
export async function fetchQuestion(category, points) {
  const tables = [TABLE_MAIN, TABLE_FLAGS, TABLE_FANAN, TABLE_FAM, TABLE_FALSAFA,TABLE_LOGO1,TABLE_LOGOO];

  for (const table of tables) {
    console.log(`[fetchQuestion] Trying ${table} for "${category}" ${parseInt(points, 10)}pts`);
    let rows = await fetchRowsFromTable(table, category, points);
    console.log(`[fetchQuestion] ${table} → ${rows.length} rows`);

    // If no unused rows found, reset this table and retry once
    if (rows.length === 0) {
      await resetTable(table);
      rows = await fetchRowsFromTable(table, category, points);
      console.log(`[fetchQuestion] ${table} after reset → ${rows.length} rows`);
    }

    if (rows.length > 0) {
      const row = rows[Math.floor(Math.random() * rows.length)];
      markQuestionUsed(row, table).catch(e => console.warn('[Supabase] markUsed failed:', e));
      console.log(`[fetchQuestion] Found in: ${table}`);
      return normalizeRow(row, table);
    }
  }

  console.warn(`[fetchQuestion] No questions found for "${category}" at ${parseInt(points, 10)}pts in any table`);
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
    question: row.question,
    options: shuffledOptions,
    correct: keys[correctPos],
    explanation: row.explanation || '',
    points: row.points,
    image_url: row.image_url || null,
  };
}
