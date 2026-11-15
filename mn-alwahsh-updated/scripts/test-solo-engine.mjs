import assert from 'node:assert/strict';
import * as E from '../src/utils/soloEngine.js';

// Tier mapping
assert.equal(E.tierPoints(0), 200); assert.equal(E.tierPoints(29), 200);
assert.equal(E.tierPoints(30), 400); assert.equal(E.tierPoints(59), 400);
assert.equal(E.tierPoints(60), 600); assert.equal(E.tierPoints(89), 600);

// Perfect run = MAX_SCORE
let r = E.newRun();
for (let i = 0; i < 90; i++) r = E.resolveQuestion(r, { correct: true }).run;
assert.ok(r.finished);
assert.equal(E.finalScore(r), E.MAX_SCORE);
assert.equal(E.MAX_SCORE, 36000 + 9000);
assert.equal(E.levelsCompleted(r), 90);

// 200 loss: back 3 (floored at 0), points of those levels removed
r = E.newRun();
for (let i = 0; i < 5; i++) r = E.resolveQuestion(r, { correct: true }).run;
let res = E.resolveQuestion(r, { correct: false });
assert.equal(res.run.level, 2); assert.equal(res.run.losses, 1);
assert.equal(E.baseScore(res.run), 400);
res = E.resolveQuestion(E.resolveQuestion(E.newRun(), { correct: true }).run, { correct: false });
assert.equal(res.run.level, 0); assert.equal(E.baseScore(res.run), 0);

// 400 loss: back 10
r = E.newRun();
for (let i = 0; i < 35; i++) r = E.resolveQuestion(r, { correct: true }).run;
assert.equal(r.level, 35);
res = E.resolveQuestion(r, { correct: false });
assert.equal(res.run.level, 25);
assert.equal(E.baseScore(res.run), 25 * 200);

// 600 loss: game over
r = E.newRun();
for (let i = 0; i < 62; i++) r = E.resolveQuestion(r, { correct: true }).run;
res = E.resolveQuestion(r, { correct: false });
assert.ok(res.run.gameOver); assert.equal(res.outcome.type, 'gameOver');

// Help cost + bonuses
r = E.newRun();
r = E.applyLifeline(r, 'removeOne');
assert.equal(r.helpsUsed, 1);
assert.equal(E.applyLifeline(r, 'removeOne'), r); // once only
res = E.resolveQuestion(r, { correct: true, helps: 1 });
assert.equal(res.outcome.earned, 150);
// double: not a help, ×2, wrong costs extra
let d = E.applyLifeline(E.newRun(), 'double');
assert.equal(d.helpsUsed, 0);
assert.equal(E.resolveQuestion(d, { correct: true, doubled: true }).outcome.earned, 400);
// bonuses shrink with helps and losses, never negative
let b = { ...E.newRun(), finished: true, levelPoints: [], helpsUsed: 99, losses: 99 };
assert.equal(E.finalScore(b), 0);
console.log('solo engine: all tests passed');
