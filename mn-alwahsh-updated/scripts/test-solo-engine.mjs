import assert from 'node:assert/strict';
import * as E from '../src/utils/soloEngine.js';

// Tier mapping
assert.equal(E.tierPoints(0), 200); assert.equal(E.tierPoints(29), 200);
assert.equal(E.tierPoints(30), 400); assert.equal(E.tierPoints(59), 400);
assert.equal(E.tierPoints(60), 600); assert.equal(E.tierPoints(89), 600);

// Perfect run = MAX_SCORE
let r = E.newRun({ mode: 'pick' });
for (let i = 0; i < 90; i++) r = E.resolveQuestion(r, { correct: true }).run;
assert.ok(r.finished);
assert.equal(E.finalScore(r), E.MAX_SCORE);
assert.equal(E.MAX_SCORE, 36000 + 9000);
assert.equal(E.levelsCompleted(r), 90);

// 200 loss: back 3 (floored at 0), points of those levels removed
r = E.newRun({ mode: 'pick' });
for (let i = 0; i < 5; i++) r = E.resolveQuestion(r, { correct: true }).run;
let res = E.resolveQuestion(r, { correct: false });
assert.equal(res.run.level, 2); assert.equal(res.run.losses, 1);
assert.equal(E.baseScore(res.run), 400);
res = E.resolveQuestion(E.resolveQuestion(E.newRun({ mode: 'pick' }), { correct: true }).run, { correct: false });
assert.equal(res.run.level, 0); assert.equal(E.baseScore(res.run), 0);

// 400 loss: back 10
r = E.newRun({ mode: 'pick' });
for (let i = 0; i < 35; i++) r = E.resolveQuestion(r, { correct: true }).run;
assert.equal(r.level, 35);
res = E.resolveQuestion(r, { correct: false });
assert.equal(res.run.level, 25);
assert.equal(E.baseScore(res.run), 25 * 200);

// 600 loss: game over
r = E.newRun({ mode: 'pick' });
for (let i = 0; i < 62; i++) r = E.resolveQuestion(r, { correct: true }).run;
res = E.resolveQuestion(r, { correct: false });
assert.ok(res.run.gameOver); assert.equal(res.outcome.type, 'gameOver');

// Help cost + bonuses
r = E.newRun({ mode: 'pick' });
r = E.applyLifeline(r, 'removeOne');
assert.equal(r.helpsUsed, 1);
assert.equal(E.applyLifeline(r, 'removeOne'), r); // once only
res = E.resolveQuestion(r, { correct: true, helps: 1 });
assert.equal(res.outcome.earned, 150);
// double: not a help, ×2, wrong costs extra
let d = E.applyLifeline(E.newRun({ mode: 'pick' }), 'double');
assert.equal(d.helpsUsed, 0);
assert.equal(E.resolveQuestion(d, { correct: true, doubled: true }).outcome.earned, 400);
// bonuses shrink with helps and losses, never negative
let b = { ...E.newRun({ mode: 'pick' }), finished: true, levelPoints: [], helpsUsed: 99, losses: 99 };
assert.equal(E.finalScore(b), 0);
// ── Mystery box ──
r = E.newRun({ mode: 'pick' });
for (let i = 0; i < 9; i++) r = E.resolveQuestion(r, { correct: true }).run;
assert.equal(r.boxPending, null);
r = E.resolveQuestion(r, { correct: true }).run;        // finished level 10
assert.equal(r.level, 10); assert.equal(r.boxPending, 10);
// skip
let sk = E.openBox(r, false);
assert.equal(sk.run.boxPending, null); assert.deepEqual(sk.run.boxesSeen, [10]);
// deterministic outcomes via rng (table order: removeOne 0-20, twoAnswers 20-35, points 35-55, shield 55-70, lose 70-88, rollback 88-100)
const at = (x) => () => x;
let o = E.openBox(r, true, at(0.05)); assert.equal(o.run.bonusLifelines.removeOne, 1);
o = E.openBox(r, true, at(0.25)); assert.equal(o.run.bonusLifelines.twoAnswers, 1);
o = E.openBox(r, true, at(0.4)); assert.equal(o.run.bonusPoints, 400); assert.equal(E.baseScore(o.run), 2000 + 400);
o = E.openBox(r, true, at(0.6)); assert.ok(o.run.shield);
o = E.openBox(r, true, at(0.8)); assert.equal(o.run.bonusPoints, -200);
const seq = [0.95, 0.4]; let k = 0;
o = E.openBox(r, true, () => seq[k++]); assert.equal(o.result.type, 'rollback'); assert.equal(o.run.level, 9); assert.equal(o.run.losses, 0);
// loss never drives score below zero
let z = E.newRun({ mode: 'pick' }); z.boxPending = 10; z = E.openBox(z, true, at(0.8)).run; assert.equal(E.baseScore(z), 0); assert.equal(z.bonusPoints, 0);
// once per milestone: replaying level 10 after a rollback does not re-offer
let again = sk.run;
again = E.resolveQuestion({ ...again, level: 9, levelPoints: again.levelPoints.slice(0, 9) }, { correct: true }).run;
assert.equal(again.boxPending, null);
// bonus lifeline reusable after the free use is spent
let L = E.applyLifeline({ ...E.newRun({ mode: 'pick' }), bonusLifelines: { removeOne: 1, twoAnswers: 0 } }, 'removeOne');
assert.ok(!E.canUseLifeline(L, 'removeOne') === false); // bonus still available
L = E.applyLifeline(L, 'removeOne'); assert.ok(!E.canUseLifeline(L, 'removeOne')); assert.equal(L.helpsUsed, 2);
// shield cancels a loss (any tier), no rollback, no loss counted
let sh = { ...E.newRun({ mode: 'pick' }), level: 65, shield: true };
const sres = E.resolveQuestion(sh, { correct: false });
assert.equal(sres.outcome.type, 'shielded'); assert.equal(sres.run.level, 65); assert.equal(sres.run.losses, 0); assert.ok(!sres.run.shield);
// ── Call a friend / switch ──
let right = 0; const N = 20000;
for (let i = 0; i < N; i++) if (E.friendSuggestion('B', ['A', 'B', 'C', 'D']) === 'B') right++;
assert.ok(Math.abs(right / N - 0.7) < 0.02, 'friend accuracy ~70%: ' + right / N);
assert.equal(E.friendSuggestion('B', ['B'], () => 0.99), 'B'); // only the right one left
let f = E.applyLifeline(E.newRun({ mode: 'pick' }), 'friend'); assert.equal(f.helpsUsed, 1); assert.ok(!E.canUseLifeline(f, 'friend'));
let sw = E.applyLifeline(E.newRun({ mode: 'pick' }), 'switch'); assert.equal(sw.helpsUsed, 1); assert.ok(!E.canUseLifeline(sw, 'switch'));
// ── Category modes ──
assert.equal(E.modeMultiplier(E.newRun()), 1.5);
assert.equal(E.modeMultiplier(E.newRun({ mode: 'pick', categories: ['a'] })), 1);
assert.equal(E.modeMultiplier({ level: 0 }), 1); // legacy save without a mode
let allRun = E.newRun({ mode: 'all' });
assert.equal(E.resolveQuestion(allRun, { correct: true }).outcome.earned, 300); // 200 × 1.5
assert.equal(E.resolveQuestion(E.applyLifeline(allRun, 'removeOne'), { correct: true, helps: 1 }).outcome.earned, 225); // (200−50) × 1.5
console.log('solo engine: all tests passed');
