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
// Hearts: the player starts with 3. A wrong answer on a 200-point question costs a
// heart instead of sending them back 3 levels; they stay on the same level with a new
// question. Only when no hearts are left does the usual rollback happen, and hearts
// refill to 3 after any rollback. 400 and 600 questions and traps ignore hearts.
//
// Trap questions: once in every block of 30 levels one question is a trap
// (shown with a warning, no helps allowed). Answer it right and it scores as
// normal; get it wrong and you only lose points — no rollback, no game over —
// and play continues with the next question.
//
// If there aren't enough levels behind you to fall back over (e.g. a 200
// question in the first 3 levels), the run ends like a 600 loss.
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

// Timer: every question has 30 seconds. Running out counts as a wrong answer;
// each whole second left when you answer correctly adds 1 point (not multiplied).
export const QUESTION_SECONDS = 30;
export function timeBonus(secondsLeft) {
  return Math.max(0, Math.min(QUESTION_SECONDS, Math.floor(secondsLeft || 0)));
}

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

// "اتصل بصديق": the friend points at an answer — right 70% of the time.
export const FRIEND_ACCURACY = 0.7;

// Picks which option the friend suggests. `keys` are the options still on
// screen; the friend is right with probability FRIEND_ACCURACY, otherwise
// suggests one of the wrong ones. rng is injectable for tests.
export function friendSuggestion(correct, keys, rng = Math.random) {
  const wrong = keys.filter(k => k !== correct);
  if (!wrong.length || rng() < FRIEND_ACCURACY) return correct;
  return wrong[Math.floor(rng() * wrong.length)];
}

// removeOne / twoAnswers / switch (new question, once per run) / friend are
// "helps" (cost points + shrink the end bonus); double is a gamble, not a help.
// Category modes: 'all' = every free category (worth more), 'pick' = the
// player's own 10 categories. Runs saved before modes existed have no mode
// and behave like 'pick' with no multiplier.
export const ALL_CATEGORIES_MULT = 1.5;
export const PICK_COUNT = 10;
export function modeMultiplier(run) {
  return run.mode === 'all' ? ALL_CATEGORIES_MULT : 1;
}

export const HEARTS_MAX = 3;

export const LIFELINE_IDS = ['removeOne', 'twoAnswers', 'switch', 'friend', 'double'];

export function tierPoints(levelIndex) {
  if (levelIndex < TIER_SIZE) return 200;
  if (levelIndex < TIER_SIZE * 2) return 400;
  return 600;
}

// One random level inside each block of 30 (levels 1–30, 31–60, 61–90).
export function pickTraps(rng = Math.random) {
  return [0, 1, 2].map(i => i * TIER_SIZE + Math.floor(rng() * TIER_SIZE));
}

export function newRun({ mode = 'all', categories = [], trial = [], traps = pickTraps(), hearts = HEARTS_MAX } = {}) {
  return {
    mode,                // 'all' | 'pick'
    categories,          // the 10 chosen names when mode === 'pick'
    trial,               // premium categories borrowed for this run only (one-game trial)
    traps,               // the 3 trap levels of this run (0-based), one per block of 30
    trapsDone: [],       // trap levels already faced (a trap never repeats after a rollback)
    level: 0,            // 0-based index of the level being played
    levelPoints: [],     // points banked for each finished level (index = level)
    helpsUsed: 0,        // total helps used in this run (never decreases)
    losses: 0,           // total questions lost in this run (never decreases)
    lifelinesUsed: {},   // { removeOne: true, ... } — each once per run
    bonusLifelines: { removeOne: 0, twoAnswers: 0 }, // extra uses won from boxes
    hearts,              // lives that absorb a wrong 200-point answer (see top of file)
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

export const MAX_SCORE = 30 * 200 + 30 * 400 + 30 * 600 + MAX_HELP_BONUS + MAX_LOSS_BONUS + TOTAL_LEVELS * QUESTION_SECONDS;

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
export function isTrap(run, level = run.level) {
  return (run.traps || []).includes(level) && !(run.trapsDone || []).includes(level);
}

// Move on to the next level after this one was settled with `earned` points.
function advance(run, earned) {
  const levelPoints = [...run.levelPoints];
  levelPoints[run.level] = earned;
  const nextLevel = run.level + 1;
  const finished = nextLevel >= TOTAL_LEVELS;
  const boxDue = !finished && nextLevel % BOX_EVERY === 0 && !run.boxesSeen.includes(nextLevel);
  return {
    ...run, levelPoints, level: finished ? run.level : nextLevel, finished,
    boxPending: boxDue ? nextLevel : null,
    trapsDone: isTrap(run) ? [...(run.trapsDone || []), run.level] : (run.trapsDone || []),
  };
}

export function resolveQuestion(run, { correct, helps = 0, doubled = false, timeLeft = 0 }) {
  const points = tierPoints(run.level);
  const trap = isTrap(run);

  if (correct) {
    let earned = Math.max(0, points - helps * helpCost(points));
    if (doubled) earned *= DOUBLE_MULT;
    earned = Math.round(earned * modeMultiplier(run));
    const speed = timeBonus(timeLeft);
    earned += speed;
    const next = advance(run, earned);
    return {
      run: next,
      outcome: { type: next.finished ? 'finished' : 'correct', earned, points, trap, timeBonus: speed },
    };
  }

  // Wrong answer — a shield cancels the loss entirely.
  if (run.shield) {
    return {
      run: { ...run, shield: false, trapsDone: trap ? [...(run.trapsDone || []), run.level] : (run.trapsDone || []) },
      outcome: { type: 'shielded', points, trap },
    };
  }
  // A trap only costs points: no rollback, no game over, not counted as a loss.
  if (trap) {
    const penalty = Math.min(Math.round(points * modeMultiplier(run)), baseScore(run));
    const next = advance(run, -penalty);
    return { run: next, outcome: { type: 'trapLost', points, penalty, finished: next.finished, trap: true } };
  }
  const back = ROLLBACK[points];
  const losses = run.losses + 1;
  // A heart absorbs a wrong 200-point answer: no rollback, same level, new question.
  const hearts = run.hearts ?? HEARTS_MAX;
  if (points === 200 && hearts > 0) {
    const levelPoints = [...run.levelPoints];
    let penalty = 0;
    if (doubled && levelPoints.length) { // "double" still costs its extra penalty
      penalty = Math.min(points, levelPoints[levelPoints.length - 1] ?? 0);
      levelPoints[levelPoints.length - 1] -= penalty;
    }
    return {
      run: { ...run, losses, hearts: hearts - 1, levelPoints },
      outcome: { type: 'heartLost', points, heartsLeft: hearts - 1, penalty },
    };
  }
  // A 600 loss always ends the run. A 200/400 loss ends it too when there
  // aren't enough levels behind the player to fall back over (e.g. 3 for 200).
  const noRoom = back !== Infinity && run.level - back < 0;
  if (back === Infinity || noRoom) {
    return {
      run: { ...run, losses, gameOver: true, lostAt: points },
      outcome: { type: 'gameOver', points, reachedLevels: run.level, noRoom, back: noRoom ? back : null },
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
    run: { ...run, losses, level: newLevel, levelPoints, hearts: HEARTS_MAX }, // a fresh start: hearts refill
    outcome: { type: 'fellBack', points, fellBack, newLevel, penalty },
  };
}

// The player gives up: the run ends right now and what they have banked is recorded.
// No completion bonuses (those are only for finishing all levels), no penalty either.
export function withdrawRun(run) {
  return { ...run, gameOver: true, withdrawn: true, boxPending: null };
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
