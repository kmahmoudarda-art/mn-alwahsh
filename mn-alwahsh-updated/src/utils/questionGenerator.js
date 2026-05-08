import { fetchQuestion, fetchSwapQuestion } from './supabaseClient';
export { fetchSwapQuestion };

// Question cache: "category|points" → [question, ...]
const questionCache = new Map();

// Image blob cache: original URL → object URL (bytes in memory, no network needed)
const imageCache = new Map();
// Track in-flight fetches to avoid duplicate requests
const imageFetching = new Set();

function cacheKey(category, points) {
  return `${category}|${points}`;
}

// Fetch image bytes once and store as an object URL — instant to use afterwards
export async function fetchAndCacheImage(url) {
  if (!url || typeof url !== 'string') return;
  if (imageCache.has(url) || imageFetching.has(url)) return;
  imageFetching.add(url);
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    imageCache.set(url, URL.createObjectURL(blob));
  } catch (_) {
  } finally {
    imageFetching.delete(url);
  }
}

// Return the in-memory blob URL if cached, otherwise the original (fallback)
export function getCachedImageUrl(url) {
  if (!url) return url;
  return imageCache.get(url) || url;
}

export function resetQuestionCache() {
  questionCache.clear();
  // Keep imageCache — blobs are reusable across game resets
}

export async function prefetchWikipedia() {}

export async function pregenerateAllTiles(categories, pointValues, onTileReady) {
  const tasks = categories.flatMap(cat =>
    pointValues.map(pts =>
      fetchQuestion(cat, pts)
        .then(async q => {
          if (q) {
            const key = cacheKey(cat, pts);
            const list = questionCache.get(key) || [];
            list.push(q);
            questionCache.set(key, list);
            if (q.image_url) await fetchAndCacheImage(q.image_url);
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
    // Refill cache + preload next image in background
    fetchQuestion(category, points)
      .then(async next => {
        if (next) {
          const list = questionCache.get(key) || [];
          list.push(next);
          questionCache.set(key, list);
          if (next.image_url) await fetchAndCacheImage(next.image_url);
        }
      })
      .catch(() => {});
    return q;
  }

  // Cache miss — fetch live (fallback)
  const q = await fetchQuestion(category, points);
  if (q) {
    if (q.image_url) fetchAndCacheImage(q.image_url).catch(() => {});
    fetchQuestion(category, points)
      .then(async next => {
        if (next) {
          const list = questionCache.get(key) || [];
          list.push(next);
          questionCache.set(key, list);
          if (next.image_url) await fetchAndCacheImage(next.image_url);
        }
      })
      .catch(() => {});
  }
  return q;
}
