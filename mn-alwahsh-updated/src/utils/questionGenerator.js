import { fetchQuestion, fetchSwapQuestion } from './supabaseClient';
export { fetchSwapQuestion };

// No-op kept for API compat
export function resetQuestionCache() {}
export async function prefetchWikipedia() {}
export async function pregenerateAllTiles(categories, pointValues, onTileReady) {
  // No pre-generation — questions are fetched live from Supabase
  for (const cat of categories) {
    for (const pts of pointValues) {
      onTileReady?.(cat, pts);
    }
  }
}

// Fetch one question live from Supabase
export async function generateQuestion(category, points) {
  const q = await fetchQuestion(category, points);
  if (!q) {
    console.warn(`[generateQuestion] No unused questions for "${category}" at ${points}pts`);
  }
  return q;
}