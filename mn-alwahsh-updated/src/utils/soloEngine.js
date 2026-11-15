// Solo mode rules — pure functions, no React / network, so they can be tested
// on their own (see scripts/test-solo-engine.mjs).
//
// A run is 90 levels in fixed difficulty order:
//   levels  1–30  → 200-point questions
//   levels 31–60  → 400-point questions
//   levels 61–90  → 600-point questions
// Which category/question appears at each level is random (handled by the page).
//
// One attempt per question. A wrong answer sends you back:
//   200 → 3 levels, 400 → 10 levels, 600 → all the way to level 1 (new run).
// Points earned on the levels you fall back over are taken away (you replay
// them), but help/loss counters keep counting for the whole run.

export const TIER_SIZE = 30;
export const TOTAL_LEVELS = TIER_SIZE * 3;
export const ROLLBACK = { 200: 3, 400: 10, 600: Infinity };

// Each help used on a question costs this share of the question's points.
export const HELP_COST_RATE = 0.25;
// "دبل يا كبير": correct = ×2, wrong = also lose that question's points again.
export const DOUBLE_MULT = 2;

// End-of-run bonuses (only when all 90 levels are finished).
export const MAX_HELP_BONUS = 4000;   // −400 per help used in the run
export const HELP_BONUS_STEP = 400;
export const MAX_LOSS_BONUS = 5000;   // −1000 per question lost in the run
export const LOSS_BONUS_STEP = 1000;

export const LIFELINE_IDS = ['removeOne', 'twoAnswers', 'double'];

export function tierPoints(levelIndex) {
  if (levelIndex < TIER_SIZE) return 200;
  if (levelIndex < TIER_SIZE * 2) return 400;
  return 600;
}

export function newRun() {
  return {
    level: 0,            // 0-based index of the level being played
    levelPoints: [],     // points banked for each finished level (index = level)
    helpsUsed: 0,        // total helps used in this run (never decreases)
    losses: 0,           // total questions lost in this run (never decreases)
    lifelinesUsed: {},   // { removeOne: true, ... } — each once per run
    finished: false,
    gameOver: false,     // true right after losing a 600 (run must restart)
  };
}

export function helpCost(points) {
  return Math.round(points * HELP_COST_RATE);
}

export function baseScore(run) {
  return run.levelPoints.reduce((a, b) => a + b, 0);
}

export function helpBonus(run) {
  return Math.max(0, MAX_HELP_BONUS - HELP_BONUS_STEP * run.helpsUsed);
}

export function lossBonus(run) {
  return Math.max(0, MAX_LOSS_BONUS - LOSS_BONUS_STEP * run.losses);
}

// Final score: banked points, plus bonuses only for a completed run.
export function finalScore(run) {
  const base = baseScore(run);
  if (!run.finished) return base;
  return base + helpBonus(run) + lossBonus(run);
}

export const MAX_SCORE = 30 * 200 + 30 * 400 + 30 * 600 + MAX_HELP_BONUS + MAX_LOSS_BONUS;

// Use a lifeline. Returns the updated run, or the same run if it was already
// used. `helpsOnThisQuestion` is the cost (in points) charged to the current
// question, tracked by the caller and applied when the question is resolved.
export function applyLifeline(run, id) {
  if (run.lifelinesUsed[id]) return run;
  const isHelp = id !== 'double';
  return {
    ...run,
    lifelinesUsed: { ...run.lifelinesUsed, [id]: true },
    helpsUsed: run.helpsUsed + (isHelp ? 1 : 0),
  };
}

// Resolve the current question.
//   correct  — whether the player answered right
//   helps    — how many helps (removeOne / twoAnswers) were used on it
//   doubled  — whether "double" was active on it
// Returns { run, outcome } where outcome describes what happened for the UI.
export function resolveQuestion(run, { correct, helps = 0, doubled = false }) {
  const points = tierPoints(run.level);

  if (correct) {
    let earned = Math.max(0, points - helps * helpCost(points));
    if (doubled) earned *= DOUBLE_MULT;
    const levelPoints = [...run.levelPoints];
    levelPoints[run.level] = earned;
    const nextLevel = run.level + 1;
    const finished = nextLevel >= TOTAL_LEVELS;
    return {
      run: { ...run, levelPoints, level: finished ? run.level : nextLevel, finished },
      outcome: { type: finished ? 'finished' : 'correct', earned, points },
    };
  }

  // Wrong answer.
  const back = ROLLBACK[points];
  const losses = run.losses + 1;
  if (back === Infinity) {
    return {
      run: { ...run, losses, gameOver: true },
      outcome: { type: 'gameOver', points, reachedLevels: run.level },
    };
  }
  const newLevel = Math.max(0, run.level - back);
  const fellBack = run.level - newLevel;
  // Take away the points of the levels we fall back over (they're replayed),
  // plus the extra penalty if "double" was riding on this question.
  const levelPoints = run.levelPoints.slice(0, newLevel);
  let penalty = 0;
  if (doubled && levelPoints.length) {
    penalty = Math.min(points, levelPoints[levelPoints.length - 1] ?? 0);
    levelPoints[levelPoints.length - 1] -= penalty;
  }
  return {
    run: { ...run, losses, level: newLevel, levelPoints },
    outcome: { type: 'fellBack', points, fellBack, newLevel, penalty },
  };
}

// How many levels the player has completed in this run (for the leaderboard).
export function levelsCompleted(run) {
  return run.finished ? TOTAL_LEVELS : run.level;
}
