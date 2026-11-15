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
// Every 10 levels (10, 20 … 80) a mystery box is offered once: the player
// chooses to open it or skip it WITHOUT knowing what's inside (see openBox).
//
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

// Mystery box
export const BOX_EVERY = 10;
export const BOX_BONUS_MULT = 2;  // ⭐ gain  = tier points × 2
export const BOX_LOSS_MULT = 1;   // 💸 loss  = tier points × 1 (never below 0 total)
export const BOX_TABLE = [        // weights sum to 100 → ~70% good / 30% bad
  { type: 'removeOne', w: 20 },
  { type: 'twoAnswers', w: 15 },
  { type: 'points', w: 20 },
  { type: 'shield', w: 15 },
  { type: 'losePoints', w: 18 },
  { type: 'rollback', w: 12 },
];

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
    bonusLifelines: { removeOne: 0, twoAnswers: 0 }, // extra uses won from boxes
    bonusPoints: 0,      // net points won/lost from boxes
    shield: false,       // cancels the next lost question
    boxesSeen: [],       // milestone levels already offered (once each)
    boxPending: null,    // milestone level whose box awaits a decision
    finished: false,
    gameOver: false,     // true right after losing a 600 (run must restart)
  };
}

export function helpCost(points) {
  return Math.round(points * HELP_COST_RATE);
}

export function levelSum(run) {
  return run.levelPoints.reduce((a, b) => a + (b || 0), 0);
}

// Level points plus box winnings/losses, never below zero.
export function baseScore(run) {
  return Math.max(0, levelSum(run) + (run.bonusPoints || 0));
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
  const isHelp = id !== 'double';
  const bonus = run.bonusLifelines?.[id] || 0;
  if (run.lifelinesUsed[id] && bonus <= 0) return run;
  return {
    ...run,
    lifelinesUsed: { ...run.lifelinesUsed, [id]: true },
    // the free once-per-run use is spent first; extras from boxes after that
    bonusLifelines: run.lifelinesUsed[id]
      ? { ...run.bonusLifelines, [id]: bonus - 1 }
      : run.bonusLifelines,
    helpsUsed: run.helpsUsed + (isHelp ? 1 : 0),
  };
}

export function canUseLifeline(run, id) {
  return !run.lifelinesUsed[id] || (run.bonusLifelines?.[id] || 0) > 0;
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
    const boxDue = !finished && nextLevel % BOX_EVERY === 0 && !run.boxesSeen.includes(nextLevel);
    return {
      run: {
        ...run, levelPoints, level: finished ? run.level : nextLevel, finished,
        boxPending: boxDue ? nextLevel : null,
      },
      outcome: { type: finished ? 'finished' : 'correct', earned, points },
    };
  }

  // Wrong answer — a shield cancels the loss entirely.
  if (run.shield) {
    return {
      run: { ...run, shield: false },
      outcome: { type: 'shielded', points },
    };
  }
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

// Mystery box. `open=false` skips it. Returns { run, result } where result
// describes what the player got (for the UI). rng is injectable for tests.
export function openBox(run, open, rng = Math.random) {
  const level = run.boxPending;
  const settled = { ...run, boxPending: null, boxesSeen: [...run.boxesSeen, level] };
  if (!open) return { run: settled, result: { type: 'skipped' } };

  const points = tierPoints(run.level);
  const total = BOX_TABLE.reduce((a, b) => a + b.w, 0);
  let roll = rng() * total;
  let type = BOX_TABLE[BOX_TABLE.length - 1].type;
  for (const row of BOX_TABLE) { if ((roll -= row.w) < 0) { type = row.type; break; } }

  switch (type) {
    case 'removeOne':
    case 'twoAnswers':
      return { run: { ...settled, bonusLifelines: { ...settled.bonusLifelines, [type]: (settled.bonusLifelines[type] || 0) + 1 } }, result: { type } };
    case 'points': {
      const amount = points * BOX_BONUS_MULT;
      return { run: { ...settled, bonusPoints: settled.bonusPoints + amount }, result: { type, amount } };
    }
    case 'shield':
      return { run: { ...settled, shield: true }, result: { type } };
    case 'losePoints': {
      const amount = Math.min(points * BOX_LOSS_MULT, baseScore(settled));
      return { run: { ...settled, bonusPoints: settled.bonusPoints - amount }, result: { type, amount } };
    }
    default: { // rollback: 1 or 2 levels, their points are removed (not counted as a loss)
      const back = rng() < 0.5 ? 1 : 2;
      const newLevel = Math.max(0, settled.level - back);
      return {
        run: { ...settled, level: newLevel, levelPoints: settled.levelPoints.slice(0, newLevel) },
        result: { type: 'rollback', back: settled.level - newLevel, newLevel },
      };
    }
  }
}
