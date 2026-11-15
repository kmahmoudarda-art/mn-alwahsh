import assert from 'node:assert/strict';
import * as E from '../src/utils/soloEngine.js';

// Tier mapping
assert.equal(E.tierPoints(0), 200); assert.equal(E.tierPoints(29), 200);
assert.equal(E.tierPoints(30), 400); assert.equal(E.tierPoints(59), 400);
assert.equal(E.tierPoints(60), 600); assert.equal(E.tierPoints(89), 600);

// Perfect run = MAX_SCORE
let r = E.newRun({ mode: 'pick', traps: [] });
for (let i = 0; i < 90; i++) r = E.resolveQuestion(r, { correct: true }).run;
assert.ok(r.finished);
assert.equal(E.finalScore(r), E.MAX_SCORE - 90 * 30); // the perfect run in these tests answers with no time left
assert.equal(E.MAX_SCORE, 36000 + 9000 + 90 * 30);
assert.equal(E.levelsCompleted(r), 90);

// 200 loss: back 3 (floored at 0), points of those levels removed
r = E.newRun({ mode: 'pick', traps: [] });
for (let i = 0; i < 5; i++) r = E.resolveQuestion(r, { correct: true }).run;
let res = E.resolveQuestion(r, { correct: false });
assert.equal(res.run.level, 2); assert.equal(res.run.losses, 1);
assert.equal(E.baseScore(res.run), 400);
// not enough levels behind to fall back 3 → the run ends (questions 1–3)
for (const lvl of [0, 1, 2]) {
  const r0 = { ...E.newRun({ mode: 'pick', traps: [] }), level: lvl, levelPoints: Array(lvl).fill(200) };
  const g = E.resolveQuestion(r0, { correct: false });
  assert.ok(g.run.gameOver, 'level ' + lvl); assert.equal(g.outcome.type, 'gameOver'); assert.ok(g.outcome.noRoom); assert.equal(g.run.lostAt, 200);
}
// exactly 3 levels behind is enough
const r3 = { ...E.newRun({ mode: 'pick', traps: [] }), level: 3, levelPoints: Array(3).fill(200) };
const ok3 = E.resolveQuestion(r3, { correct: false });
assert.ok(!ok3.run.gameOver); assert.equal(ok3.run.level, 0);
// a shield still saves you there
const sh0 = E.resolveQuestion({ ...E.newRun({ mode: 'pick', traps: [] }), shield: true }, { correct: false });
assert.equal(sh0.outcome.type, 'shielded'); assert.ok(!sh0.run.gameOver);

// 400 loss: back 10
r = E.newRun({ mode: 'pick', traps: [] });
for (let i = 0; i < 35; i++) r = E.resolveQuestion(r, { correct: true }).run;
assert.equal(r.level, 35);
res = E.resolveQuestion(r, { correct: false });
assert.equal(res.run.level, 25);
assert.equal(E.baseScore(res.run), 25 * 200);

// 600 loss: game over
r = E.newRun({ mode: 'pick', traps: [] });
for (let i = 0; i < 62; i++) r = E.resolveQuestion(r, { correct: true }).run;
res = E.resolveQuestion(r, { correct: false });
assert.ok(res.run.gameOver); assert.equal(res.outcome.type, 'gameOver');

// Help cost + bonuses
r = E.newRun({ mode: 'pick', traps: [] });
r = E.applyLifeline(r, 'removeOne');
assert.equal(r.helpsUsed, 1);
assert.equal(E.applyLifeline(r, 'removeOne'), r); // once only
res = E.resolveQuestion(r, { correct: true, helps: 1 });
assert.equal(res.outcome.earned, 150);
// double: not a help, ×2, wrong costs extra
let d = E.applyLifeline(E.newRun({ mode: 'pick', traps: [] }), 'double');
assert.equal(d.helpsUsed, 0);
assert.equal(E.resolveQuestion(d, { correct: true, doubled: true }).outcome.earned, 400);
// bonuses shrink with helps and losses, never negative
let b = { ...E.newRun({ mode: 'pick', traps: [] }), finished: true, levelPoints: [], helpsUsed: 99, losses: 99 };
assert.equal(E.finalScore(b), 0);
// ── Mystery box ──
r = E.newRun({ mode: 'pick', traps: [] });
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
let z = E.newRun({ mode: 'pick', traps: [] }); z.boxPending = 10; z = E.openBox(z, true, at(0.8)).run; assert.equal(E.baseScore(z), 0); assert.equal(z.bonusPoints, 0);
// once per milestone: replaying level 10 after a rollback does not re-offer
let again = sk.run;
again = E.resolveQuestion({ ...again, level: 9, levelPoints: again.levelPoints.slice(0, 9) }, { correct: true }).run;
assert.equal(again.boxPending, null);
// bonus lifeline reusable after the free use is spent
let L = E.applyLifeline({ ...E.newRun({ mode: 'pick', traps: [] }), bonusLifelines: { removeOne: 1, twoAnswers: 0 } }, 'removeOne');
assert.ok(!E.canUseLifeline(L, 'removeOne') === false); // bonus still available
L = E.applyLifeline(L, 'removeOne'); assert.ok(!E.canUseLifeline(L, 'removeOne')); assert.equal(L.helpsUsed, 2);
// shield cancels a loss (any tier), no rollback, no loss counted
let sh = { ...E.newRun({ mode: 'pick', traps: [] }), level: 65, shield: true };
const sres = E.resolveQuestion(sh, { correct: false });
assert.equal(sres.outcome.type, 'shielded'); assert.equal(sres.run.level, 65); assert.equal(sres.run.losses, 0); assert.ok(!sres.run.shield);
// ── Call a friend / switch ──
let right = 0; const N = 20000;
for (let i = 0; i < N; i++) if (E.friendSuggestion('B', ['A', 'B', 'C', 'D']) === 'B') right++;
assert.ok(Math.abs(right / N - 0.7) < 0.02, 'friend accuracy ~70%: ' + right / N);
assert.equal(E.friendSuggestion('B', ['B'], () => 0.99), 'B'); // only the right one left
let f = E.applyLifeline(E.newRun({ mode: 'pick', traps: [] }), 'friend'); assert.equal(f.helpsUsed, 1); assert.ok(!E.canUseLifeline(f, 'friend'));
let sw = E.applyLifeline(E.newRun({ mode: 'pick', traps: [] }), 'switch'); assert.equal(sw.helpsUsed, 1); assert.ok(!E.canUseLifeline(sw, 'switch'));
// ── Category modes ──
assert.equal(E.modeMultiplier(E.newRun({ traps: [] })), 1.5);
assert.equal(E.modeMultiplier(E.newRun({ mode: 'pick', categories: ['a'], traps: [] })), 1);
assert.equal(E.modeMultiplier({ level: 0 }), 1); // legacy save without a mode
let allRun = E.newRun({ mode: 'all', traps: [] });
assert.equal(E.resolveQuestion(allRun, { correct: true }).outcome.earned, 300); // 200 × 1.5
assert.equal(E.resolveQuestion(E.applyLifeline(allRun, 'removeOne'), { correct: true, helps: 1 }).outcome.earned, 225); // (200−50) × 1.5
// ── Trap questions ──
const tr = E.pickTraps(() => 0.5);
assert.deepEqual(tr, [15, 45, 75]);
for (let i = 0; i < 200; i++) { const x = E.pickTraps(); assert.ok(x[0] < 30 && x[1] >= 30 && x[1] < 60 && x[2] >= 60 && x[2] < 90); }
const base = (o) => ({ ...E.newRun({ mode: 'pick', traps: [5] }), ...o });
// trap lost: only points deducted, continue to the next level, no loss counted
let t0 = base({ level: 5, levelPoints: Array(5).fill(200) });
let tl = E.resolveQuestion(t0, { correct: false });
assert.equal(tl.outcome.type, 'trapLost'); assert.equal(tl.outcome.penalty, 200);
assert.equal(tl.run.level, 6); assert.equal(tl.run.losses, 0); assert.ok(!tl.run.gameOver);
assert.equal(E.baseScore(tl.run), 800); assert.deepEqual(tl.run.trapsDone, [5]);
// penalty never exceeds what you have (and later gains are not eaten)
let poor = base({ level: 5, levelPoints: [] });
let pl = E.resolveQuestion(poor, { correct: false });
assert.equal(pl.outcome.penalty, 0); assert.equal(E.baseScore(pl.run), 0);
assert.equal(E.baseScore(E.resolveQuestion(pl.run, { correct: true }).run), 200);
// mode multiplier applies to the penalty too
let tm = E.resolveQuestion({ ...base({ level: 5, levelPoints: Array(5).fill(300) }), mode: 'all' }, { correct: false });
assert.equal(tm.outcome.penalty, 300);
// trap answered right = normal points, marked done
let tc = E.resolveQuestion(t0, { correct: true });
assert.equal(tc.outcome.earned, 200); assert.ok(tc.outcome.trap); assert.deepEqual(tc.run.trapsDone, [5]);
// a trap never repeats after rolling back over it
assert.ok(!E.isTrap(tc.run, 5)); assert.ok(E.isTrap(t0, 5));
// shield absorbs a trap loss and the trap is spent
let ts = E.resolveQuestion({ ...t0, shield: true }, { correct: false });
assert.equal(ts.outcome.type, 'shielded'); assert.equal(ts.run.level, 5); assert.deepEqual(ts.run.trapsDone, [5]); assert.ok(!E.isTrap(ts.run));
// a trap on a 600 question does not end the run
let t6 = { ...E.newRun({ mode: 'pick', traps: [70] }), level: 70, levelPoints: Array(70).fill(600) };
let t6r = E.resolveQuestion(t6, { correct: false });
assert.ok(!t6r.run.gameOver); assert.equal(t6r.run.level, 71); assert.equal(t6r.outcome.penalty, 600);
// a trap on the very first levels does not trigger the noRoom game over
let t1 = { ...E.newRun({ mode: 'pick', traps: [0] }), level: 0 };
assert.ok(!E.resolveQuestion(t1, { correct: false }).run.gameOver);
// trap right before a milestone still offers the box
let tb = E.resolveQuestion({ ...E.newRun({ mode: 'pick', traps: [9] }), level: 9, levelPoints: Array(9).fill(200) }, { correct: false });
assert.equal(tb.run.boxPending, 10);
// last level trap finishes the run
let tf = E.resolveQuestion({ ...E.newRun({ mode: 'pick', traps: [89] }), level: 89, levelPoints: Array(89).fill(600) }, { correct: false });
assert.ok(tf.run.finished);
// ── Timer ──
assert.equal(E.QUESTION_SECONDS, 30);
assert.equal(E.timeBonus(17.9), 17); assert.equal(E.timeBonus(0), 0); assert.equal(E.timeBonus(-3), 0); assert.equal(E.timeBonus(99), 30);
let tmr = E.resolveQuestion(E.newRun({ mode: 'pick', traps: [] }), { correct: true, timeLeft: 22.4 });
assert.equal(tmr.outcome.earned, 222); assert.equal(tmr.outcome.timeBonus, 22); // 200 + 22
// bonus is flat: not doubled, not multiplied by the mode, and not charged the help cost
let tmr2 = E.resolveQuestion({ ...E.newRun({ mode: 'all', traps: [] }) }, { correct: true, helps: 1, doubled: true, timeLeft: 10 });
assert.equal(tmr2.outcome.earned, Math.round(Math.max(0, 200 - 50) * 2 * 1.5) + 10);
// a wrong answer earns no speed points
assert.ok(!('timeBonus' in E.resolveQuestion(E.newRun({ mode: 'pick', traps: [] }), { correct: false, timeLeft: 25 }).outcome));
console.log('solo engine: all tests passed');
