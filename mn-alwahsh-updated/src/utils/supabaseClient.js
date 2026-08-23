const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cqqeyvhofbnvjemoihca.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcWV5dmhvZmJudmplbW9paGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDg5ODIsImV4cCI6MjA5MjQ4NDk4Mn0.y_1B1Gy8EIEFpVrJu9TKX1fPSBfR1jFVrcgO1PA1-hs';
export { SUPABASE_URL, SUPABASE_ANON_KEY };

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

// Per-table cache of the working "used" filter string — resolved once, reused forever
// Values: '&used=not.is.true' | '&used=neq.true' | '' (no filter)
const tableUsedFilterCache = new Map();

// Questions this device has reported (see reportQuestion below) never get
// served again to it — same localStorage list QuestionModal.jsx uses to
// stop someone reporting the same question twice, reused here to actually
// exclude those ids from selection. Keyed "table:id" per entry.
const REPORTED_KEY = 'mn_alwahsh_reported_qs';

function getReportedIdsForTable(table) {
  try {
    const all = JSON.parse(localStorage.getItem(REPORTED_KEY) || '[]');
    return all.filter(e => e.startsWith(`${table}:`)).map(e => e.slice(table.length + 1));
  } catch {
    return [];
  }
}

// PostgREST id=not.in.(...) fragment excluding this device's reported ids
// for the table. Empty for Fam, whose rows have no real id column (see
// normalizeRow/reportQuestion) — Fam is excluded via client-side filtering
// instead, in fetchOneRandom/fetchRowsFromTable below.
function reportedIdFilter(table) {
  if (table === TABLE_FAM) return '';
  const ids = getReportedIdsForTable(table);
  if (!ids.length) return '';
  return `&id=not.in.(${ids.map(encodeURIComponent).join(',')})`;
}

// Composite key for a Fam/Kids row, matching how reportQuestion() and
// QuestionModal's reportedIds set identify a question — used to filter
// reported rows out of the client-side batch these two tables fetch.
function rowReportKey(table, row) {
  if (table === TABLE_FAM) return `${row.category}|${row.points}|${row.slot}`;
  return String(row.id ?? row.question_id ?? row.ID ?? row.rowid ?? '');
}

// Resolve the correct "used" filter for a table, trying not.is.true then neq.true
async function resolveUsedFilter(table, encodedCategory, intPoints) {
  if (tableUsedFilterCache.has(table)) return tableUsedFilterCache.get(table);

  for (const candidate of ['&used=not.is.true', '&used=neq.true']) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&points=eq.${intPoints}&category=eq.${encodedCategory}${candidate}&limit=1`;
    const res = await fetch(url, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache', Prefer: 'count=exact' } });
    if (res.ok) {
      tableUsedFilterCache.set(table, candidate);
      return candidate;
    }
    // 400 = bad filter syntax for this column type — try next candidate
  }
  // Table has no usable used filter
  tableUsedFilterCache.set(table, '');
  return '';
}

// Get count via Content-Range header — returns { total, usedFilter }
async function getRowCount(table, category, points, idFilter = '') {
  const intPoints = parseInt(points, 10);
  const encodedCategory = encodeURIComponent(category);
  const usedFilter = await resolveUsedFilter(table, encodedCategory, intPoints);

  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&points=eq.${intPoints}&category=eq.${encodedCategory}${usedFilter}${idFilter}&limit=1`;
  const res = await fetch(url, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache', Prefer: 'count=exact' } });
  if (!res.ok) return { total: 0, usedFilter };
  const cr = res.headers.get('content-range');
  const total = cr ? parseInt(cr.split('/')[1], 10) : 0;
  return { total: isNaN(total) ? 0 : total, usedFilter };
}

// Fetch exactly 1 random unused row from a specific table
async function fetchOneRandom(table, category, points) {
  const intPoints = parseInt(points, 10);
  const encodedCategory = encodeURIComponent(category);

  // FAM/KIDS: server-side used filter unreliable — fetch batch and filter client-side
  if (table === TABLE_FAM || table === TABLE_KIDS) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&points=eq.${intPoints}&category=eq.${encodedCategory}&limit=50`;
    const res = await fetch(url, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    const reportedIds = new Set(getReportedIdsForTable(table));
    const unused = data.filter(r => r.used !== true && !reportedIds.has(rowReportKey(table, r)));
    if (unused.length === 0) return null;
    return unused[Math.floor(Math.random() * unused.length)];
  }

  // All other tables: resolve the correct used filter, then count + fetch 1 row at random offset
  const idFilter = reportedIdFilter(table);
  const { total, usedFilter } = await getRowCount(table, category, points, idFilter);

  if (total === 0) {
    // Check if category is truly absent or just exhausted
    const noFilterUrl = `${SUPABASE_URL}/rest/v1/${table}?select=*&points=eq.${intPoints}&category=eq.${encodedCategory}&limit=1`;
    const noFilterRes = await fetch(noFilterUrl, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache', Prefer: 'count=exact' } });
    if (noFilterRes.ok) {
      const cr = noFilterRes.headers.get('content-range');
      const noFilterTotal = cr ? parseInt(cr.split('/')[1], 10) : 0;
      if (noFilterTotal === 0) return null; // truly absent
    }
    return null; // exhausted — caller handles reset
  }

  const offset = Math.floor(Math.random() * total);
  const rowUrl = `${SUPABASE_URL}/rest/v1/${table}?select=*&points=eq.${intPoints}&category=eq.${encodedCategory}${usedFilter}${idFilter}&limit=1&offset=${offset}`;
  const res = await fetch(rowUrl, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

// Kept only for fetchSwapQuestion (needs a small set to exclude one id)
async function fetchRowsFromTable(table, category, points) {
  const intPoints = parseInt(points, 10);
  const encodedCategory = encodeURIComponent(category);
  // Use the same resolved filter as fetchOneRandom so text-column tables work too
  const usedFilter = (table === TABLE_FAM || table === TABLE_KIDS)
    ? ''
    : await resolveUsedFilter(table, encodedCategory, intPoints);
  const idFilter = reportedIdFilter(table);
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&points=eq.${intPoints}&category=eq.${encodedCategory}${usedFilter}${idFilter}&limit=20`;
  const res = await fetch(url, { headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache' } });
  if (!res.ok) return [];
  const data = await res.json();
  if (table === TABLE_FAM || table === TABLE_KIDS) {
    const reportedIds = new Set(getReportedIdsForTable(table));
    return data.filter(r => r.used !== true && !reportedIds.has(rowReportKey(table, r)));
  }
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

// ─── Game Session Analytics ───────────────────────────────────────────────────

let _ipInfoCache = null;
async function getIpInfo() {
  if (_ipInfoCache) return _ipInfoCache;
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const data = await res.json();
    _ipInfoCache = {
      ip: data.ip || null,
      city: data.city || null,
      region: data.region || null,
      country: data.country_name || null,
    };
    return _ipInfoCache;
  } catch { return null; }
}

export async function insertGameSession({ game_name, team1_name, team2_name, categories }) {
  const ipInfo = await getIpInfo();
  const payload = {
    game_name,
    team1_name,
    team2_name,
    categories,
    status: 'started',
    team1_score: 0,
    team2_score: 0,
    ip_address: ipInfo?.ip ?? null,
    city: ipInfo?.city ?? null,
    region: ipInfo?.region ?? null,
    country: ipInfo?.country ?? null,
    started_at: new Date().toISOString(),
  };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/game_sessions`, {
      method: 'POST',
      headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0]?.id ?? null;
  } catch { return null; }
}

export async function updateGameSession(id, { status, winner, team1_score, team2_score }) {
  if (!id) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/game_sessions?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ status, winner, team1_score, team2_score, ended_at: new Date().toISOString() }),
    });
  } catch {}
}

// ─── Question reporting ────────────────────────────────────────────────────
// A question gets a "report_count" column (added via SQL migration, see
// /supabase-migrations/report_questions.sql). Once a question hits 50
// reports it's deleted outright rather than just hidden — Khalid asked for
// bad questions gone, not flagged.
//
// Fam's rows have no real primary key (see normalizeRow) — its "id" is a
// composite "category|points|slot" string, so it needs its own filter
// instead of the normal id=eq. lookup.
const REPORT_THRESHOLD = 50;

export async function reportQuestion(question) {
  if (!question || question.id == null || !question.source_table) return { ok: false };
  const { id, source_table } = question;

  let filter;
  if (source_table === TABLE_FAM && typeof id === 'string' && id.includes('|')) {
    const [fCategory, fPoints, fSlot] = id.split('|');
    filter = `category=eq.${encodeURIComponent(fCategory)}&points=eq.${encodeURIComponent(fPoints)}&slot=eq.${encodeURIComponent(fSlot)}`;
  } else {
    filter = `id=eq.${encodeURIComponent(id)}`;
  }

  try {
    const getRes = await fetch(`${SUPABASE_URL}/rest/v1/${source_table}?select=report_count&${filter}&limit=1`, {
      headers: { ...BASE_HEADERS, 'Cache-Control': 'no-cache' },
    });
    if (!getRes.ok) return { ok: false };
    const rows = await getRes.json();
    if (!rows.length) return { ok: false };

    const nextCount = (rows[0].report_count || 0) + 1;

    if (nextCount >= REPORT_THRESHOLD) {
      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/${source_table}?${filter}`, {
        method: 'DELETE',
        headers: { ...BASE_HEADERS, Prefer: 'return=minimal' },
      });
      return { ok: delRes.ok, deleted: delRes.ok, count: nextCount };
    }

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/${source_table}?${filter}`, {
      method: 'PATCH',
      headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ report_count: nextCount }),
    });
    return { ok: patchRes.ok, deleted: false, count: nextCount };
  } catch (e) {
    console.error('[reportQuestion] failed', e);
    return { ok: false };
  }
}

export async function fetchGameCount() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/game_sessions?select=id`, {
      headers: { ...BASE_HEADERS, Prefer: 'count=exact', 'Range-Unit': 'items', Range: '0-0' },
    });
    const contentRange = res.headers.get('Content-Range');
    if (contentRange) {
      const total = contentRange.split('/')[1];
      if (total && total !== '*') return parseInt(total, 10);
    }
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data.length : null;
  } catch { return null; }
}
