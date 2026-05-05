const PREFIX = 'mn_alwahsh_v3_';
const VERSION = 3;

function key(gameName) {
  return PREFIX + gameName.trim().toLowerCase();
}

export async function saveSession(gameName, data) {
  try {
    localStorage.setItem(
      key(gameName),
      JSON.stringify({ ...data, _v: VERSION, savedAt: Date.now(), _name: gameName.trim() })
    );
  } catch (e) {
    console.warn('[session] save failed', e);
  }
}

export async function loadSession(gameName) {
  try {
    const raw = localStorage.getItem(key(gameName));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed._v !== VERSION) { await clearSession(gameName); return null; }
    return parsed;
  } catch { return null; }
}

export async function clearSession(gameName) {
  try { localStorage.removeItem(key(gameName)); } catch {}
}

export function listSessions() {
  const sessions = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(k));
        if (parsed && parsed._v === VERSION && parsed.gamePhase) {
          sessions.push(parsed);
        }
      } catch {}
    }
  } catch {}
  return sessions.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}
