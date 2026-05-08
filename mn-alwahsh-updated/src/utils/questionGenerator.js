import { fetchQuestion, fetchSwapQuestion } from './supabaseClient';
export { fetchSwapQuestion };

// Cache: "category|points" → [question, ...]
const questionCache = new Map();

function cacheKey(category, points) {
  return `${category}|${points}`;
}

function preloadImage(url) {
  if (!url || typeof url !== 'string') return;
  try {
    const img = new Image();
    img.src = url;
  } catch (_) {}
}

export function resetQuestionCache() {
  questionCache.clear();
}

export async function prefetchWikipedia() {}

export async function pregenerateAllTiles(categories, pointValues, onTileReady) {
  const tasks = categories.flatMap(cat =>
    pointValues.map(pts =>
      fetchQuestion(cat, pts)
        .then(q => {
          if (q) {
            const key = cacheKey(cat, pts);
            const list = questionCache.get(key) || [];
            list.push(q);
            questionCache.set(key, list);
            preloadImage(q.image_url);
          }
        })
        .catch(() => {})
        .finally(() => onTileReady?.(cat, pts))
    )
  );
  await Promise.all(tasks);
}

export async function generateQuestion(category, points) {
  const key = cacheKey(category, points);
  const cached = questionCache.get(key) || [];

  if (cached.length > 0) {
    const q = cached.shift();
    questionCache.set(key, cached);
    // Refill cache in background for the next click on the same (cat, pts)
    fetchQuestion(category, points)
      .then(next => {
        if (next) {
          const list = questionCache.get(key) || [];
          list.push(next);
          questionCache.set(key, list);
          preloadImage(next.image_url);
        }
      })
      .catch(() => {});
    return q;
  }

  // Cache miss — fetch live (fallback)
  const q = await fetchQuestion(category, points);
  if (q) {
    preloadImage(q.image_url);
    // Kick off a refill in background
    fetchQuestion(category, points)
      .then(next => {
        if (next) {
          const list = questionCache.get(key) || [];
          list.push(next);
          questionCache.set(key, list);
          preloadImage(next.image_url);
        }
      })
      .catch(() => {});
  }
  return q;
}
