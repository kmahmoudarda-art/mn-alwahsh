// Solo mode — one player, 90 levels (30 × 200, 30 × 400, 30 × 600 points),
// random free categories, no stealing / passing to a rival.
// Rules live in utils/soloEngine.js; the leaderboard in utils/soloLeaderboard.js.
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { fetchCategories, fetchQuestion } from '../utils/supabaseClient';
import { fetchAndCacheImage, getCachedImageUrl } from '../utils/questionGenerator';
import { displayName, getIcon } from '../utils/categoryIcons';
import { isSoloExcluded } from '../utils/soloExcluded';
import { isHiddenCategory } from '../utils/hiddenCategories';
import { isPremiumCategory, isTestAccount } from '../utils/premiumConfig';
import { fetchUnlockedCategories } from '../utils/entitlements';
import { getCurrentUser } from '../utils/authClient';
import { sounds } from '../utils/soundEffects';
import { fetchLeaderboard, submitRun, syncDisplayName, displayNameFor } from '../utils/soloLeaderboard';
import SongPlayer from '../components/game/SongPlayer';
import UnlockPrompt from '../components/game/UnlockPrompt';
import LevelTrack from '../components/solo/LevelTrack';
import CountUp from '../components/solo/CountUp';
import ShareResult from '../components/solo/ShareResult';
import { setScreenSecure } from '../utils/nativeBridge';
import SoloBackdrop from '../components/solo/SoloBackdrop';
import { springs, TIER, STAGGER, ease } from '../components/solo/soloMotion';
import {
  TOTAL_LEVELS, MAX_SCORE, DOUBLE_MULT, HELP_COST_RATE,
  newRun, tierPoints, resolveQuestion, applyLifeline,
  baseScore, levelSum, helpBonus, lossBonus, finalScore, levelsCompleted,
  canUseLifeline, isTrap, openBox, BOX_EVERY, friendSuggestion, FRIEND_ACCURACY,
  ALL_CATEGORIES_MULT, PICK_COUNT, modeMultiplier,
} from '../utils/soloEngine';

// Key must start with "mn_alwahsh_v3_" — supabaseClient wipes every other
// localStorage key on app start.
const SAVE_KEY = 'mn_alwahsh_v3_solo_run';

const LIFELINES = [
  { id: 'removeOne', label: '🗑️ احذف إجابة', desc: `يحذف خياراً خاطئاً — يخصم ${HELP_COST_RATE * 100}% من نقاط السؤال` },
  { id: 'twoAnswers', label: '✌️ جاوب جوابين', desc: `محاولتان للإجابة — يخصم ${HELP_COST_RATE * 100}% من نقاط السؤال` },
  { id: 'switch', label: '🔄 بدّل السؤال', desc: `سؤال جديد بدل الحالي — مرة واحدة في الجولة كلها، ويخصم ${HELP_COST_RATE * 100}%` },
  { id: 'friend', label: '📞 اتصل بصديق', desc: `صديقك يقترح إجابة: صحيحة بنسبة ${FRIEND_ACCURACY * 100}% وخاطئة بنسبة ${100 - FRIEND_ACCURACY * 100}%` },
  { id: 'double', label: '🎯 دبل يا كبير', desc: `نقاط السؤال ×${DOUBLE_MULT} إن أصبت، وإن أخطأت تخسر نقاطه من المرحلة السابقة` },
];

// Every solo question this player has been shown, kept on this device per
// account, so a new run avoids questions from earlier runs too. When that pool
// runs dry the game allows repeats (never inside the same run).
const HISTORY_CAP = 6000;
const historyKey = (u) => `mn_alwahsh_v3_solo_seen_${u?.id || 'guest'}`;
function loadHistory(u) {
  try { return new Set(JSON.parse(localStorage.getItem(historyKey(u)) || '[]')); } catch { return new Set(); }
}
function saveHistory(u, set) {
  try { localStorage.setItem(historyKey(u), JSON.stringify([...set].slice(-HISTORY_CAP))); } catch { /* storage full or blocked */ }
}

function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
function writeSave(data) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const qKey = (q) => `${q.source_table}:${q.id ?? q.question}`;
const validQuestion = (q) =>
  q && q.question && q.options && q.correct &&
  Object.values(q.options).filter(Boolean).length >= 3 && q.options[q.correct];

const font = { fontFamily: 'var(--font-cairo)' };
const card = {
  background: 'linear-gradient(180deg, rgba(26,7,10,0.92), rgba(12,3,5,0.92))',
  border: '1px solid rgba(196,22,28,0.35)', borderRadius: 16, padding: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
};
const redBtn = {
  ...font, fontWeight: 800, fontSize: 16, color: '#FFE9E9', cursor: 'pointer', width: '100%',
  background: 'linear-gradient(180deg, #D4202A 0%, #8E0F16 100%)',
  border: '1px solid rgba(255,90,90,0.45)', borderRadius: 14, padding: '14px 20px',
  boxShadow: '0 6px 20px rgba(196,22,28,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
};
const ghostBtn = {
  ...font, fontWeight: 700, fontSize: 14, color: '#FFE4E4', cursor: 'pointer',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,22,28,0.5)',
  borderRadius: 12, padding: '10px 16px',
};
// The app is landscape-first (manifest + Android lock), so landscape is the
// primary layout; portrait falls back to a single column.
const LAYOUT_CSS = `
.solo-shell{position:relative;z-index:1;max-width:560px;margin:0 auto;padding:14px 14px 40px}
.solo-two{display:flex;flex-direction:column;gap:14px}
.solo-col{display:flex;flex-direction:column;gap:12px;min-width:0}
.solo-play{display:flex;flex-direction:column;gap:12px}
.solo-head,.solo-main,.solo-tools{display:flex;flex-direction:column;gap:12px;min-width:0}
.solo-options{display:grid;gap:9px}
@media (orientation: landscape){
  .solo-shell{max-width:1120px;padding:10px max(16px,env(safe-area-inset-right)) 14px max(16px,env(safe-area-inset-left))}
  .solo-two{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
  .solo-play{display:grid;grid-template-columns:1fr minmax(310px,38%);grid-template-areas:"main head" "main tools";grid-template-rows:auto 1fr;gap:10px 14px;align-items:start}
  .solo-head{grid-area:head}.solo-main{grid-area:main}.solo-tools{grid-area:tools}
  .solo-options{grid-template-columns:1fr 1fr}
}
@media (orientation: landscape) and (max-height:520px){
  .solo-shell{padding-top:6px;padding-bottom:8px}
  .solo-play{gap:8px 12px}
  .solo-q{font-size:17px!important;line-height:1.6!important}
  .solo-opt{padding:8px 10px!important;font-size:15px!important;gap:8px!important}
  .solo-opt>span:first-child{width:26px!important;height:26px!important}
  .solo-title{font-size:34px!important}
  .solo-head-card{padding:8px 12px 6px!important}
  .solo-parch{padding:12px!important}
  .solo-page{gap:6px!important;padding-top:0!important;padding-bottom:0!important}
  .solo-shell{padding-bottom:4px!important}
  .solo-page h2{font-size:20px!important}
  .solo-hero{padding:0!important}
  .solo-hero p{font-size:13px!important;margin-top:0!important}
  .solo-page .solo-col{gap:7px}
  .solo-page .solo-col button{padding:8px 14px!important;font-size:14px!important}
  .solo-rules{gap:5px!important;padding:10px 12px!important}
  .solo-rules>p{font-size:12.5px!important;line-height:1.5!important}
  .solo-rules span{font-size:13px!important}
  .solo-rules div{font-size:12px!important;line-height:1.55!important;padding-top:6px!important}
  .solo-rules div p{margin-bottom:2px}
  .solo-page .solo-two button{padding:10px 12px!important}
}
`;

const tap = { whileTap: { scale: 0.97 }, transition: springs.snappy };

export default function SoloGame() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const reduce = useReducedMotion();

  // Android app only (no-op elsewhere): no screenshots or screen recording while the solo game is open.
  useEffect(() => { setScreenSecure(true); return () => setScreenSecure(false); }, []);

  const [view, setView] = useState('intro'); // intro | mode | pick | play | box | end | board
  const [boxResult, setBoxResult] = useState(null);
  const [opening, setOpening] = useState(false);
  const [allCats, setAllCats] = useState(null); // every visible category, locked ones included
  const [catsError, setCatsError] = useState(false);
  const [unlockFor, setUnlockFor] = useState(null); // premium category whose purchase prompt is open
  const trialRef = useRef([]);                    // premium categories borrowed for this run (trial SKU)
  const [picked, setPicked] = useState([]);
  const [search, setSearch] = useState('');
  const [flash, setFlash] = useState(0);
  const [run, setRun] = useState(newRun);
  const [hasSave, setHasSave] = useState(false);
  const [saveInfo, setSaveInfo] = useState(null); // { level, score, mode } of the saved run

  const [pool, setPool] = useState(null);     // categories this account can play
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [outcome, setOutcome] = useState(null);

  // Per-question help state
  const [removed, setRemoved] = useState([]);
  const [twoMode, setTwoMode] = useState(false);
  const [firstWrong, setFirstWrong] = useState(null);
  const [doubled, setDoubled] = useState(false);
  const [friendKey, setFriendKey] = useState(null);
  const helpsOnQ = useRef(0);

  const [submitInfo, setSubmitInfo] = useState(null);
  const [board, setBoard] = useState(null);

  const seen = useRef(new Set());       // questions shown in THIS run
  const history = useRef(null);         // questions shown in every run on this device (see loadHistory)
  const deadCombos = useRef(new Set());
  const songSwapped = useRef(false);
  const songFails = useRef(0);          // unplayable clips in a row; after 2 we stop serving songs until an answer
  const submittedRef = useRef(false);   // this finished run is already on the leaderboard
  const loadTok = useRef(0);            // newest loadQuestion wins; stale ones stop quietly
  const boxTimer = useRef(null);
  const runRef = useRef(run);
  runRef.current = run;
  const liveRun = useRef(false);        // a run is on screen, so auto-save may write

  // ── auto-save ───────────────────────────────────────────────────────
  // The run AND the question on screen (with the helps already used on it) are
  // saved after every change, so leaving, refreshing or a killed app brings the
  // player back to the same question — nothing is lost and nothing can be rerolled.
  const latest = useRef({});
  latest.current = { run, question, removed, twoMode, firstWrong, doubled, friendKey, answered, loading };
  const saveNow = useCallback(() => {
    if (!liveRun.current) return;
    const L = latest.current;
    let qs = null;
    if (L.question && !L.answered) {
      qs = { question: L.question, removed: L.removed, twoMode: L.twoMode, firstWrong: L.firstWrong, doubled: L.doubled, friendKey: L.friendKey, helps: helpsOnQ.current };
    } else if (L.loading) {
      qs = { carry: { helps: helpsOnQ.current, doubled: L.doubled } };
    }
    writeSave({ run: L.run, seen: [...seen.current].slice(-400), qs, submitted: submittedRef.current });
  }, []);

  useEffect(() => { saveNow(); }, [run, question, removed, twoMode, firstWrong, doubled, friendKey, answered, loading, view, saveNow]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') saveNow(); };
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', onHide);
      saveNow();
      loadTok.current += 1;             // cancel any question still loading
      clearTimeout(boxTimer.current);   // and a box still opening
    };
  }, [saveNow]);

  useEffect(() => {
    const s = loadSave();
    if (s?.run && !(s.run.level === 0 && !s.run.levelPoints?.length && !s.run.losses && !s.run.gameOver && !s.qs)) {
      setHasSave(true);
      const sr = { ...newRun({ mode: 'pick' }), ...s.run };
      setSaveInfo({ level: sr.level, score: baseScore(sr), mode: sr.mode, over: sr.gameOver || sr.finished });
    }
  }, []);

  // ── question fetching ───────────────────────────────────────────────
  // Playable = free categories + premium ones this account owns ('__ALL__' means
  // the whole bundle) + any borrowed for this run. Locked premium categories
  // are still listed in the picker, with a lock and the purchase prompt.
  const computePlayable = (visible, unlockedList) => {
    const owned = new Set(unlockedList);
    const everything = owned.has('__ALL__') || isTestAccount(getCurrentUser());
    return visible.filter(c => !isPremiumCategory(c) || everything || owned.has(c) || trialRef.current.includes(c));
  };

  const ensurePool = useCallback(async () => {
    if (pool) return pool;
    const cats = await fetchCategories();
    if (!cats.length) throw new Error('no-categories');
    const visible = cats.filter(c => !isHiddenCategory(c) && !isSoloExcluded(c));
    setAllCats(visible);
    const unlockedList = await fetchUnlockedCategories().catch(() => []);
    const playable = computePlayable(visible, unlockedList);
    setPool(playable);
    return playable;
  }, [pool]);

  // Re-read what the account owns (after a purchase / sign-in / restore).
  const refreshAccess = async () => {
    if (!allCats) return [];
    const unlockedList = await fetchUnlockedCategories().catch(() => []);
    const playable = computePlayable(allCats, unlockedList);
    setPool(playable);
    return playable;
  };

  const onAccessChanged = async (ev) => {
    if (ev.type === 'trial') trialRef.current = [...new Set([...trialRef.current, ev.category])];
    const playable = await refreshAccess();
    const nowOpen = playable.includes(ev.category);
    if (ev.type === 'single' || ev.type === 'trial' || nowOpen) {
      setPicked(prev => (prev.includes(ev.category) || prev.length >= PICK_COUNT ? prev : [...prev, ev.category]));
      setUnlockFor(null);
    } else if (ev.type === 'all') {
      setUnlockFor(null);
    }
  };

  const loadQuestion = useCallback(async (level, carry) => {
    const tok = ++loadTok.current;
    setLoading(true); setLoadError(false);
    setQuestion(null); setSelected(null); setAnswered(false); setOutcome(null);
    setRemoved([]); setTwoMode(false); setFirstWrong(null); setDoubled(!!carry?.doubled); setFriendKey(null);
    // a swapped question keeps the help cost / double already committed on the old one
    helpsOnQ.current = carry?.helps || 0; songSwapped.current = false;
    const points = tierPoints(level);
    try {
      const base = await ensurePool();
      if (tok !== loadTok.current) return;
      const cur = runRef.current;
      const chosen = (cur.categories || []).filter(c => base.includes(c) || (cur.trial || []).includes(c)); // drops anything excluded since an older save
      const cats = cur.mode === 'pick' && chosen.length ? chosen : base;
      if (!history.current) history.current = loadHistory(user);
      const hist = history.current;
      // First pass skips everything this player has ever seen in solo; only if that
      // finds nothing do we allow repeats from older runs (never within this run).
      for (const strict of [true, false]) {
        for (let i = 0; i < 25; i++) {
          const avail = cats.filter(c => !deadCombos.current.has(`${c}|${points}`));
          if (!avail.length) break;
          const cat = pick(avail);
          const q = await fetchQuestion(cat, points);
          if (tok !== loadTok.current) return;
          if (!q) { deadCombos.current.add(`${cat}|${points}`); continue; }
          const k = qKey(q);
          if (!validQuestion(q) || seen.current.has(k) || (strict && hist.has(k))) continue;
          if (q.itunes_id && songFails.current >= 2) continue; // clips keep failing: serve other questions
          if (q.image_url) await Promise.race([fetchAndCacheImage(q.image_url), new Promise(r => setTimeout(r, 2500))]);
          if (tok !== loadTok.current) return;
          seen.current.add(k); hist.add(k); saveHistory(user, hist);
          setQuestion({ ...q, category: cat });
          setLoading(false);
          return;
        }
      }
      setLoadError(true);
    } catch {
      if (tok === loadTok.current) setLoadError(true);
    }
    if (tok === loadTok.current) setLoading(false);
  }, [ensurePool, user]);

  // ── run lifecycle ───────────────────────────────────────────────────
  const endRun = useCallback(async (r) => {
    setView('end');
    setSubmitInfo(null);
    if (submittedRef.current) { setSubmitInfo({ saved: true, newBest: false, signedIn: true }); return; }
    submittedRef.current = true;          // set first, so tapping twice can't submit twice
    const info = await submitRun({
      score: finalScore(r), levels: levelsCompleted(r), finished: r.finished, user,
    });
    setSubmitInfo(info);
    if (!info.saved && !info.skipped) submittedRef.current = false; // failed or signed out: try again next time
    saveNow();
  }, [user, saveNow]);

  const startNew = (mode = 'all', categories = []) => {
    const trial = categories.filter(c => trialRef.current.includes(c)); // borrowed premium categories live only in this run
    seen.current = new Set();
    deadCombos.current = new Set();
    songFails.current = 0;
    submittedRef.current = false;
    const r = newRun({ mode, categories, trial });
    runRef.current = r;            // loadQuestion reads the mode from here
    liveRun.current = true;
    setRun(r); setBoxResult(null); setView('play');
    loadQuestion(0);
  };

  const loadPicker = async () => {
    setCatsError(false);
    try { await ensurePool(); } catch { setCatsError(true); }
  };

  const chooseMode = (mode) => {
    if (mode === 'all') { startNew('all'); return; }
    setPicked([]); setSearch(''); setView('pick');
    loadPicker();
  };

  const resume = () => {
    const s = loadSave();
    if (!s?.run) return startNew();
    seen.current = new Set(s.seen || []);
    deadCombos.current = new Set();
    songFails.current = 0;
    submittedRef.current = !!s.submitted;
    const r = { ...newRun({ mode: 'pick' }), ...s.run }; // saves from before modes behave like 'pick', ×1
    runRef.current = r;
    liveRun.current = true;
    setRun(r);
    if (r.gameOver || r.finished) { endRun(r); return; }
    if (r.boxPending) { setBoxResult(null); setView('box'); return; }
    setView('play');
    const qs = s.qs;
    if (qs?.question) {
      // Same question, same helps: leaving and coming back costs nothing and can't be used to reroll.
      helpsOnQ.current = qs.helps || 0;
      setQuestion(qs.question); setRemoved(qs.removed || []); setTwoMode(!!qs.twoMode); setFirstWrong(qs.firstWrong || null);
      setDoubled(!!qs.doubled); setFriendKey(qs.friendKey || null);
      setSelected(null); setAnswered(false); setOutcome(null); setLoading(false); setLoadError(false);
      if (qs.question.image_url) fetchAndCacheImage(qs.question.image_url).catch(() => {});
      return;
    }
    loadQuestion(r.level, qs?.carry);
  };

  // ── answering ───────────────────────────────────────────────────────
  const resolve = (correct) => {
    const res = resolveQuestion(runRef.current, { correct, helps: helpsOnQ.current, doubled });
    setRun(res.run);
    setOutcome(res.outcome);
    setAnswered(true);
    songFails.current = 0;
    if (correct) sounds?.correct?.(); else { sounds?.wrong?.(); if (res.outcome.type !== 'shielded') setFlash(f => f + 1); }
  };

  const onPick = (key) => {
    if (answered || removed.includes(key) || key === firstWrong || !question) return;
    setSelected(key);
    const correct = key === question.correct;
    if (!correct && twoMode && !firstWrong) {
      setFirstWrong(key); setSelected(null); // second chance
      return;
    }
    resolve(correct);
  };

  const onLifeline = (id) => {
    if (answered || !question || !canUseLifeline(run, id) || isTrap(runRef.current)) return; // no helps on a trap
    const next = applyLifeline(run, id);
    setRun(next);
    if (id === 'removeOne') {
      helpsOnQ.current += 1;
      const wrong = Object.keys(question.options).filter(k => k !== question.correct && question.options[k] && !removed.includes(k) && k !== firstWrong);
      if (wrong.length) setRemoved(prev => [...prev, pick(wrong)]);
    } else if (id === 'twoAnswers') {
      helpsOnQ.current += 1;
      setTwoMode(true);
    } else if (id === 'friend') {
      helpsOnQ.current += 1;
      const keys = Object.keys(question.options).filter(k => question.options[k] && !removed.includes(k) && k !== firstWrong);
      setFriendKey(friendSuggestion(question.correct, keys));
    } else if (id === 'switch') {
      // new question at the same level; this help's cost carries over to it
      loadQuestion(next.level, { helps: helpsOnQ.current + 1, doubled });
    } else if (id === 'double') {
      setDoubled(true);
    }
  };

  const onContinue = () => {
    if (!outcome) return;
    if (outcome.type === 'gameOver' || outcome.type === 'finished' || outcome.finished) { endRun(run); return; }
    if (run.boxPending) { setBoxResult(null); setView('box'); return; }
    loadQuestion(run.level);
  };

  const onBox = (open) => {
    if (opening) return;
    if (!open) {
      const res = openBox(run, false);
      setRun(res.run);
      setView('play'); loadQuestion(res.run.level);
      return;
    }
    // shake first, then reveal — the result is only decided at reveal time
    setOpening(true);
    boxTimer.current = setTimeout(() => {
      const res = openBox(runRef.current, true);
      setRun(res.run);
      setBoxResult(res.result);
      setOpening(false);
    }, reduce ? 0 : 700);
  };

  const afterBox = () => { setView('play'); loadQuestion(runRef.current.level); };

  // A "guess the song" clip that can't play is swapped silently — no penalty.
  const onSongFailed = useCallback(() => {
    if (songSwapped.current || answered) return;
    songSwapped.current = true;
    songFails.current += 1;
    loadQuestion(runRef.current.level, { helps: helpsOnQ.current, doubled });
  }, [answered, doubled, loadQuestion]);

  const openBoard = async () => {
    setView('board'); setBoard(null);
    const rows = await fetchLeaderboard();
    // show the player's own row with the current name right away, and fix the stored one in the background
    const wanted = user ? displayNameFor(user) : null;
    setBoard(rows.map(r => (user && r.user_id === user.id ? { ...r, display_name: wanted } : r)));
    if (user) syncDisplayName(user, rows);
  };

  // ── views ───────────────────────────────────────────────────────────
  const backdropPoints = view === 'play' ? tierPoints(run.level) : 600;
  const shell = (children) => (
    <div className="min-h-screen" dir="rtl" style={{ background: '#0A0305', color: '#FFE9E9', ...font, position: 'relative' }}>
      <SoloBackdrop points={backdropPoints} flash={flash} />
      <style>{LAYOUT_CSS}</style>
      <div className="solo-shell">{children}</div>
    </div>
  );

  if (view === 'intro') return shell(
    <div className="solo-page" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
      <button onClick={() => navigate('/')} style={{ ...ghostBtn, alignSelf: 'flex-start', padding: '6px 12px', fontSize: 13 }}>→ رجوع</button>
      <div className="solo-two">
      <div className="solo-col">
      <div className="solo-hero" style={{ textAlign: 'center', padding: '10px 0 2px' }}>
        <motion.h1
          initial={reduce ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={springs.gentle}
          className="solo-title" style={{ fontSize: 46, fontWeight: 900, lineHeight: 1.15, color: '#FF3B3B', textShadow: '0 0 24px rgba(229,30,40,0.55)' }}>
          ٩٠ مرحلة
        </motion.h1>
        <p style={{ fontSize: 16, fontWeight: 700, opacity: 0.85, marginTop: 4 }}>محاولة واحدة لكل سؤال</p>
      </div>
      <div style={{ ...card, padding: '18px 16px 12px' }}>
        <LevelTrack level={saveInfo && !saveInfo.over ? saveInfo.level : 0} idle />
      </div>
      {!user && (
        <p style={{ fontSize: 13, textAlign: 'center', color: '#F2A93B' }}>
          سجّل دخولك من الشاشة الرئيسية حتى تدخل نتيجتك قائمة المتصدّرين.
        </p>
      )}
      {hasSave && (
        <motion.button {...tap} style={redBtn} onClick={resume}>
          <span style={{ display: 'block' }}>{saveInfo?.over ? 'عرض نتيجة جولتك' : 'تابع جولتك'}</span>
          {saveInfo && !saveInfo.over && (
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, opacity: 0.9, marginTop: 2 }}>
              أنت في المرحلة {saveInfo.level + 1} من {TOTAL_LEVELS} · {saveInfo.score.toLocaleString('en')} نقطة{saveInfo.mode === 'all' ? ' · كل الفئات ×' + ALL_CATEGORIES_MULT : ''}
            </span>
          )}
        </motion.button>
      )}
      <motion.button {...tap} style={hasSave ? ghostBtn : redBtn} onClick={() => {
        if (hasSave && !window.confirm('سيُحذف تقدّمك الحالي. متأكد؟')) return;
        setView('mode');
      }}>{hasSave ? 'ابدأ جولة جديدة' : 'ابدأ التحدّي'}</motion.button>
      <motion.button {...tap} style={ghostBtn} onClick={openBoard}>🏆 المتصدّرون</motion.button>
      </div>
      <div className="solo-col">
      <div className="solo-rules" style={{ ...card, display: 'grid', gap: 10 }}>
        <p style={{ fontWeight: 800, fontSize: 14, opacity: 0.8 }}>إذا أخطأت</p>
        {[[200, 'ترجع 3 مراحل'], [400, 'ترجع 10 مراحل'], [600, 'تبدأ من الصفر']].map(([pts, text]) => (
          <div key={pts} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700 }}>
            <span style={{ minWidth: 92, padding: '3px 10px', borderRadius: 8, textAlign: 'center', fontWeight: 900, background: `${TIER[pts].color}22`, color: TIER[pts].color, border: `1px solid ${TIER[pts].color}66` }}>
              سؤال {pts}
            </span>
            <span>{text}</span>
          </div>
        ))}
        <p style={{ fontSize: 13, color: '#F2A93B', lineHeight: 1.7 }}>وإذا لم يكن خلفك مراحل كافية لترجع إليها (في أول 3 مراحل)، فأي خطأ يُنهي الجولة.</p>
        <div style={{ borderTop: '1px solid rgba(196,22,28,0.3)', paddingTop: 10, fontSize: 13.5, lineHeight: 1.9, opacity: 0.9 }}>
          <p>🛟 خمس وسائل مساعدة: حذف إجابة، جوابان، تبديل السؤال، اتصل بصديق (يصيب 70%)، ودبل. <b>كل وسيلة تُستخدم مرة واحدة فقط في الجولة كلها (٩٠ مرحلة)</b>، وتخصم 25% من نقاط السؤال وتنقص المكافأة النهائية.</p>
          <p>☠️ في كل 30 مرحلة سؤال فخ واحد: خطؤه يخصم نقاطاً فقط دون رجوع، ولا تعمل فيه وسائل المساعدة.</p>
          <p>🎁 بعد كل {BOX_EVERY} مراحل صندوق مفاجأة: تفتحه أو تتخطاه دون أن ترى ما بداخله.</p>
          <p>⭐ بعد المرحلة {TOTAL_LEVELS}: مكافأة بلا مساعدات ومكافأة بلا خسارات. أعلى نتيجة بلا صناديق {MAX_SCORE.toLocaleString('en')} (وفي نمط «كل الفئات» نقاط المراحل ×{ALL_CATEGORIES_MULT}).</p>
        </div>
      </div>
      </div>
      </div>
    </div>
  );

  if (view === 'mode') return shell(
    <div className="solo-page" style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16 }}>
      <button onClick={() => setView('intro')} style={{ ...ghostBtn, alignSelf: 'flex-start', padding: '6px 12px', fontSize: 13 }}>→ رجوع</button>
      <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 900 }}>من أين تأتي الأسئلة؟</h2>

      <div className="solo-two" style={{ alignItems: 'stretch' }}>
      <motion.button {...tap} onClick={() => chooseMode('all')}
        style={{ ...card, textAlign: 'right', cursor: 'pointer', color: 'inherit', ...font, padding: 18, border: '2px solid #FFD700', boxShadow: '0 0 28px rgba(255,215,0,0.22)', position: 'relative' }}>
        <span style={{ position: 'absolute', top: -13, insetInlineStart: 14, background: '#FFD700', color: '#0A0305', fontWeight: 900, fontSize: 14, padding: '3px 12px', borderRadius: 999 }}>
          نقاط ×{ALL_CATEGORIES_MULT} على كل مرحلة
        </span>
        <p style={{ fontSize: 21, fontWeight: 900, marginTop: 6 }}>🌍 كل الفئات</p>
        <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.8, marginTop: 4 }}>
          أسئلة عشوائية من جميع الفئات المجانية، وتغامر بما لا تعرف. مقابل ذلك كل إجابة صحيحة تعطيك {ALL_CATEGORIES_MULT} ضعف نقاطها (200 تصبح {200 * ALL_CATEGORIES_MULT}).
        </p>
      </motion.button>

      <motion.button {...tap} onClick={() => chooseMode('pick')}
        style={{ ...card, textAlign: 'right', cursor: 'pointer', color: 'inherit', ...font, padding: 18 }}>
        <p style={{ fontSize: 21, fontWeight: 900 }}>🎯 اختر {PICK_COUNT} فئات</p>
        <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.8, marginTop: 4 }}>
          تختار فئاتك المفضلة والأسئلة تأتي منها فقط. النقاط عادية بلا مضاعفة.
        </p>
      </motion.button>
      </div>
    </div>
  );

  if (view === 'pick') {
    const playable = new Set(pool || []);
    const list = (allCats || [])
      .filter(c => displayName(c).includes(search.trim()))
      .sort((x, y) => Number(playable.has(y)) - Number(playable.has(x))); // open ones first
    const toggle = (c) => {
      if (!playable.has(c)) { setUnlockFor(c); return; } // premium and not owned: same purchase options as the main picker
      setPicked(prev => prev.includes(c) ? prev.filter(x => x !== c) : prev.length < PICK_COUNT ? [...prev, c] : prev);
    };
    const ready = picked.length === PICK_COUNT;
    return shell(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, paddingBottom: 90 }}>
        <button onClick={() => setView('mode')} style={{ ...ghostBtn, alignSelf: 'flex-start', padding: '6px 12px', fontSize: 13 }}>→ رجوع</button>
        <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 900 }}>اختر {PICK_COUNT} فئات</h2>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن فئة"
          style={{ ...font, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(196,22,28,0.5)', borderRadius: 12, padding: '11px 14px', color: '#FFE9E9', fontSize: 15, outline: 'none' }} />
        {allCats === null && !catsError && <p style={{ textAlign: 'center', opacity: 0.8, padding: 20 }}>جاري تحميل الفئات…</p>}
        {catsError && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <p style={{ marginBottom: 10 }}>تعذّر تحميل الفئات. تحقّق من اتصالك ثم أعد المحاولة.</p>
            <motion.button {...tap} style={{ ...redBtn, maxWidth: 260 }} onClick={loadPicker}>إعادة المحاولة</motion.button>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {list.map(c => {
            const on = picked.includes(c);
            const locked = !playable.has(c);
            const full = !on && !locked && picked.length >= PICK_COUNT;
            return (
              <motion.button key={c} whileTap={{ scale: 0.95 }} transition={springs.snappy} onClick={() => toggle(c)} aria-pressed={on}
                style={{
                  ...font, fontWeight: 700, fontSize: 14, padding: '8px 14px', borderRadius: 999, cursor: full ? 'default' : 'pointer',
                  color: on ? '#0A0305' : '#FFE9E9', background: on ? '#FFD700' : 'rgba(255,255,255,0.05)',
                  border: `1.5px ${locked ? 'dashed' : 'solid'} ${on ? '#FFD700' : 'rgba(196,22,28,0.5)'}`, opacity: full ? 0.35 : locked ? 0.55 : 1,
                }}>
                {locked ? '🔒' : getIcon ? getIcon(c) : ''} {displayName(c)}
              </motion.button>
            );
          })}
        </div>
        <div style={{ position: 'fixed', insetInline: 0, bottom: 0, padding: '12px 14px 16px', background: 'linear-gradient(180deg, transparent, #0A0305 40%)', zIndex: 5 }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <motion.button {...tap} disabled={!ready} onClick={() => startNew('pick', picked)}
              style={{ ...redBtn, opacity: ready ? 1 : 0.45 }}>
              {ready ? 'ابدأ بهذه الفئات' : `اخترت ${picked.length} من ${PICK_COUNT}`}
            </motion.button>
          </div>
        </div>
        <AnimatePresence>
          {unlockFor && (
            <UnlockPrompt key="unlock" category={unlockFor} onClose={() => setUnlockFor(null)} onChanged={onAccessChanged} />
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (view === 'board') return shell(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
      <button onClick={() => setView(run.gameOver || run.finished ? 'end' : 'intro')} style={{ ...ghostBtn, alignSelf: 'flex-start', padding: '6px 12px', fontSize: 13 }}>→ رجوع</button>
      <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 900, color: '#FFD700' }}>🏆 المتصدّرون</h2>
      <div style={{ ...card, padding: 8 }}>
        {board === null && <p style={{ textAlign: 'center', padding: 20, opacity: 0.8 }}>جاري التحميل…</p>}
        {board && board.length === 0 && <p style={{ textAlign: 'center', padding: 20 }}>لا توجد نتائج بعد. كن الأول!</p>}
        {board && board.map((row, i) => {
          const mine = user && row.user_id === user.id;
          return (
            <motion.div key={row.user_id}
              initial={reduce ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }}
              transition={{ ...springs.gentle, delay: Math.min(i, 8) * STAGGER }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 8px',
                borderBottom: '1px solid rgba(196,22,28,0.2)',
                background: mine ? 'rgba(255,215,0,0.1)' : 'transparent', borderRadius: 10,
              }}>
              <span style={{ width: 30, textAlign: 'center', fontWeight: 900, fontSize: i < 3 ? 20 : 15, color: '#FF8A8A' }}>
                {['🥇', '🥈', '🥉'][i] || i + 1}
              </span>
              <span style={{ flex: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.display_name}{mine ? ' (أنت)' : ''}
              </span>
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                {row.best_levels}/{TOTAL_LEVELS}{row.completed_runs > 0 ? ` · أنهى ${row.completed_runs}` : ''}
              </span>
              <span style={{ fontWeight: 900, fontSize: 17, color: '#FFD700', minWidth: 60, textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
                {row.best_score.toLocaleString('en')}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  if (view === 'box') {
    const lvl = run.level;
    const R = boxResult;
    const good = '#46C98B', bad = '#E5333A';
    const msg = !R ? null : {
      removeOne: ['🗑️', 'مساعدة "احذف إجابة" إضافية', good],
      twoAnswers: ['✌️', 'مساعدة "جاوب جوابين" إضافية', good],
      points: ['⭐', `+${R.amount} نقطة إضافية`, good],
      shield: ['🛡️', 'درع! يلغي أول سؤال تخسره', good],
      losePoints: ['💸', R.amount ? `خسرت ${R.amount} نقطة` : 'حظ سيئ، لكن لا نقاط لتخسرها', bad],
      rollback: ['⏪', `رجعت ${R.back} ${R.back === 1 ? 'مرحلة' : 'مراحل'} إلى المرحلة ${R.newLevel + 1}`, bad],
    }[R.type];
    return shell(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 16, textAlign: 'center' }}>
        <button onClick={() => navigate('/')} style={{ ...ghostBtn, alignSelf: 'flex-start', padding: '5px 10px', fontSize: 12 }}>حفظ وخروج</button>
        <div className="solo-two" style={{ alignItems: 'center' }}>
        <div style={{ position: 'relative', height: 130, display: 'grid', placeItems: 'center' }}>
          {R && !reduce && (
            <motion.span key="ring" initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 2.6, opacity: 0 }} transition={{ duration: 0.8, ease }}
              style={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', border: `4px solid ${msg[2]}` }} />
          )}
          <AnimatePresence mode="wait">
            {R ? (
              <motion.div key="res" initial={reduce ? false : { scale: 0.2, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={springs.pop} style={{ fontSize: 88 }}>
                {msg[0]}
              </motion.div>
            ) : (
              <motion.div key="box"
                animate={reduce ? {} : opening ? { rotate: [0, -14, 14, -18, 18, -10, 10, 0], scale: [1, 1.08, 1.08, 1.14, 1.14, 1.2, 1.2, 1.25] } : { rotate: [-4, 4, -4] }}
                transition={opening ? { duration: 0.7 } : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ fontSize: 88 }}>
                🎁
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="solo-col">
        {!R ? (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#FFD700' }}>صندوق المفاجأة</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.9, opacity: 0.9 }}>
              أنهيت {lvl} مراحل. تفتح الصندوق؟<br />
              قد تجد مساعدة أو نقاطاً أو درعاً، وقد يخونك الحظ فتخسر نقاطاً أو ترجع مرحلة.<br />
              <b>لن ترى ما بداخله قبل أن تقرّر، والقرار نهائي.</b>
            </p>
            <motion.button {...tap} style={redBtn} disabled={opening} onClick={() => onBox(true)}>افتح الصندوق</motion.button>
            <motion.button {...tap} style={ghostBtn} disabled={opening} onClick={() => onBox(false)}>تخطَّ، لا أريد المخاطرة</motion.button>
          </>
        ) : (
          <>
            <motion.h2 initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.gentle, delay: 0.15 }}
              style={{ fontSize: 24, fontWeight: 900, color: msg[2] }}>{msg[1]}</motion.h2>
            <p style={{ fontSize: 14, opacity: 0.8 }}>نقاطك الآن: <b><CountUp value={baseScore(run)} from={baseScore(run) - (R.type === 'points' ? R.amount : R.type === 'losePoints' ? -R.amount : 0)} /></b></p>
            <motion.button {...tap} style={redBtn} onClick={afterBox}>تابع</motion.button>
          </>
        )}
        </div>
        </div>
      </div>
    );
  }

  if (view === 'end') {
    const score = finalScore(run);
    const lines = [
      ['نقاط المراحل', levelSum(run)],
      ...(run.bonusPoints !== 0 ? [['صناديق المفاجأة', run.bonusPoints]] : []),
      ...(run.finished ? [[`مكافأة بلا مساعدات (استخدمت ${run.helpsUsed})`, helpBonus(run)], [`مكافأة بلا خسارات (خسرت ${run.losses})`, lossBonus(run)]] : []),
    ];
    return shell(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 26 }}>
        <div className="solo-two">
        <div className="solo-col">
        <motion.h2 initial={reduce ? false : { opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={springs.pop}
          style={{ textAlign: 'center', fontSize: 32, fontWeight: 900, color: run.finished ? '#46C98B' : '#FF3B3B', textShadow: `0 0 22px ${run.finished ? 'rgba(70,201,139,0.5)' : 'rgba(229,30,40,0.5)'}` }}>
          {run.finished ? 'أنهيت التحدّي!' : 'انتهت الجولة'}
        </motion.h2>
        {!run.finished && (
          <p style={{ textAlign: 'center', fontSize: 14, opacity: 0.85 }}>أخطأت في سؤال {run.lostAt || 600} نقطة بعد {levelsCompleted(run)} مرحلة.{run.lostAt && run.lostAt < 600 ? ' ولم تكن هناك مراحل كافية لترجع إليها.' : ''}</p>
        )}
        <div style={{ ...card, textAlign: 'center' }}>
          <p style={{ fontSize: 13, opacity: 0.7 }}>مجموع نقاطك</p>
          <p style={{ fontSize: 54, fontWeight: 900, lineHeight: 1.2, color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.3)' }}>
            <CountUp value={score} from={0} duration={1.4} />
          </p>
          <div style={{ marginTop: 10, textAlign: 'start' }}>
            {lines.map(([label, value], i) => (
              <motion.div key={label} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.gentle, delay: 0.6 + i * STAGGER }}>
                <Row label={label} value={value} />
              </motion.div>
            ))}
          </div>
          <p style={{ fontSize: 12, opacity: 0.65, marginTop: 8 }}>
            المراحل المنجزة: {levelsCompleted(run)} / {TOTAL_LEVELS}
            {!run.finished && ' · المكافآت تُحتسب عند إنهاء المراحل كلها'}
          </p>
        </div>
        </div>
        <div className="solo-col">
        <p style={{ fontSize: 13, textAlign: 'center', minHeight: 20 }}>
          {!user ? '⚠️ لم تُسجَّل النتيجة في المتصدّرين لأنك لم تسجّل دخولك.'
            : submitInfo === null ? 'جاري حفظ نتيجتك…'
            : submitInfo.saved ? (submitInfo.newBest ? '🏆 رقم قياسي جديد! حُفظت نتيجتك.' : '✔ حُفظت نتيجتك.')
            : '⚠️ تعذّر حفظ النتيجة، تحقّق من الاتصال.'}
        </p>
        <ShareResult run={run} />
        <motion.button {...tap} style={redBtn} onClick={() => setView('mode')}>جولة جديدة</motion.button>
        <motion.button {...tap} style={ghostBtn} onClick={openBoard}>🏆 المتصدّرون</motion.button>
        <motion.button {...tap} style={ghostBtn} onClick={() => { setHasSave(false); setView('intro'); navigate('/'); }}>الشاشة الرئيسية</motion.button>
        </div>
        </div>
      </div>
    );
  }

  // ── playing ─────────────────────────────────────────────────────────
  const points = tierPoints(run.level);
  const tier = TIER[points];
  const hero = question?.image_url && !question?.itunes_id ? getCachedImageUrl(question.image_url) : null;
  const isGood = outcome && ['correct', 'finished', 'shielded'].includes(outcome.type);
  // The trap flag must be read from the run the question was shown with; after answering the
  // run has already moved on, so use the outcome then.
  const trapNow = !answered && !!question && isTrap(run);
  const trapPenalty = Math.min(Math.round(points * modeMultiplier(run)), baseScore(run));

  return shell(
    <div className="solo-play">
      <div className="solo-head">
      {/* header: score + track */}
      <div className="solo-head-card" style={{ ...card, padding: '12px 14px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button onClick={() => navigate('/')} style={{ ...ghostBtn, padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap' }}>خروج (يُحفظ تلقائياً)</button>
          <span style={{ fontWeight: 900, fontSize: 15, whiteSpace: 'nowrap' }}>المرحلة {run.level + 1}<span style={{ opacity: 0.5, fontWeight: 600 }}> / {TOTAL_LEVELS}</span></span>
          <span style={{ fontWeight: 900, fontSize: 17, color: '#FFD700', whiteSpace: 'nowrap' }}>⭐ <CountUp value={baseScore(run)} /></span>
        </div>
        <LevelTrack level={run.level} boxesSeen={run.boxesSeen} />
        <p style={{ fontSize: 11.5, opacity: 0.6, marginTop: 6, textAlign: 'center' }}>
          {run.mode === 'all' ? <b style={{ color: '#FFD700' }}>🌍 كل الفئات · نقاط ×{ALL_CATEGORIES_MULT} · </b> : null}{run.shield ? '🛡️ درع مفعّل · ' : ''}مساعدات {run.helpsUsed} · خسارات {run.losses}
        </p>
      </div>

      </div>

      <div className="solo-main">
      {loading && (
        <div style={{ ...card, textAlign: 'center', padding: 36 }}>
          <motion.div animate={reduce ? {} : { scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ fontSize: 34 }}>👁</motion.div>
          <p style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>جاري تحضير السؤال…</p>
        </div>
      )}

      {loadError && !loading && (
        <div style={{ ...card, textAlign: 'center' }}>
          <p style={{ marginBottom: 10 }}>تعذّر تحميل سؤال. تحقّق من اتصالك ثم أعد المحاولة.</p>
          <motion.button {...tap} style={redBtn} onClick={() => loadQuestion(run.level)}>إعادة المحاولة</motion.button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {question && !loading && (
          <motion.div key={qKey(question)}
            initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }} transition={springs.gentle}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {trapNow && (
              <motion.div role="alert" initial={reduce ? false : { scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springs.pop}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: 'linear-gradient(135deg, #5a0000, #2a0000)', border: '1.5px solid #FF3B3B', boxShadow: '0 0 18px rgba(255,59,59,0.35)' }}>
                <motion.span animate={reduce ? {} : { scale: [1, 1.18, 1] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ fontSize: 26 }}>☠️</motion.span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 900, fontSize: 15, color: '#fff', lineHeight: 1.2 }}>سؤال فخ!</p>
                  <p style={{ fontWeight: 600, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                    الخطأ يخصم {trapPenalty} نقطة فقط ولا يرجعك للخلف. لا وسائل مساعدة هنا.
                  </p>
                </div>
              </motion.div>
            )}
            {modeMultiplier(run) > 1 && (
              <div style={{ alignSelf: 'center', background: 'rgba(255,215,0,0.12)', border: '1px solid #FFD700', color: '#FFD700', borderRadius: 999, padding: '3px 14px', fontSize: 13, fontWeight: 800 }}>
                هذا السؤال بـ {Math.round(points * modeMultiplier(run))} نقطة (×{modeMultiplier(run)})
              </div>
            )}
            {/* parchment: the only light surface on the page, so the question is what you read first */}
            <div className="solo-parch" style={{
              background: 'linear-gradient(180deg, #F3EAD7, #E4D7BA)', color: '#1d1410', borderRadius: 14, padding: 16,
              border: `2px solid ${tier.color}`, boxShadow: `0 0 0 3px #0A0305, 0 10px 30px rgba(0,0,0,0.5), 0 0 24px ${tier.glow}`,
            }}>
              {hero && <img src={hero} alt="" style={{ width: '100%', maxHeight: 'min(240px, 36vh)', objectFit: 'contain', borderRadius: 10, marginBottom: 10 }} />}
              {question.itunes_id && (
                <SongPlayer key={question.id ?? question.itunes_id} itunesId={question.itunes_id} solo onFailed={onSongFailed} />
              )}
              <p className="solo-q" style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.75, textAlign: 'right' }}>{question.question}</p>
            </div>

            <motion.div className="solo-options"
              initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : STAGGER, delayChildren: 0.1 } } }}>
              {Object.entries(question.options).map(([key, value]) => {
                if (!value) return null;
                const isRemoved = removed.includes(key);
                const isFirstWrong = key === firstWrong;
                const isRight = key === question.correct;
                const isWrongPick = answered && key === selected && !isRight;
                let bg = 'linear-gradient(180deg, rgba(48,12,16,0.95), rgba(26,6,9,0.95))', border = 'rgba(196,22,28,0.55)', op = 1, badge = tier.color;
                if (answered) {
                  if (isRight) { bg = 'linear-gradient(180deg, rgba(28,120,72,0.65), rgba(18,76,46,0.65))'; border = '#46C98B'; badge = '#46C98B'; }
                  else if (isWrongPick) { bg = 'linear-gradient(180deg, rgba(160,28,34,0.7), rgba(100,16,20,0.7))'; border = '#FF4A4A'; badge = '#FF4A4A'; }
                  else op = 0.4;
                }
                if (isRemoved || isFirstWrong) op = 0.22;
                const celebrate = answered && isRight && selected === question.correct;
                return (
                  <motion.button key={key} className="solo-opt"
                    variants={{ hidden: { opacity: 0, x: 18 }, show: { opacity: op, x: 0, transition: springs.gentle } }}
                    animate={isWrongPick ? { x: reduce ? 0 : [0, -10, 10, -7, 7, 0], opacity: op } : celebrate ? { x: 0, scale: reduce ? 1 : [1, 1.04, 1], opacity: op } : (answered || isRemoved || isFirstWrong) ? { x: 0, opacity: op } : undefined}
                    transition={isWrongPick ? { duration: 0.45 } : celebrate ? { duration: 0.5, ease } : undefined}
                    whileTap={!answered ? { scale: 0.98 } : undefined}
                    onClick={() => onPick(key)} disabled={answered || isRemoved || isFirstWrong}
                    style={{
                      ...font, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right', fontWeight: 700, fontSize: 16.5, color: '#FFE9E9',
                      padding: '12px 14px', borderRadius: 14, background: bg, border: `1.5px solid ${border}`,
                      cursor: answered ? 'default' : 'pointer', opacity: op,
                      textDecoration: isRemoved || isFirstWrong ? 'line-through' : 'none',
                    }}>
                    <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 14, background: badge, color: '#0A0305' }}>{key}</span>
                    <span style={{ flex: 1 }}>{value}</span>
                    {friendKey === key && !answered && <span aria-label="اقتراح الصديق">📞</span>}
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <div className="solo-tools">
      {question && !loading && !answered && (
        <div>
          <AnimatePresence>
            {friendKey && (
              <motion.p key="friend" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', fontWeight: 800, color: '#FFD700', fontSize: 14, marginBottom: 8 }}>
                📞 صديقك يظن أن الإجابة {friendKey}، لكنه قد يخطئ
              </motion.p>
            )}
          </AnimatePresence>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#FFD700', marginBottom: 6 }}>
            وسائل المساعدة · المتبقية {LIFELINES.filter(l => canUseLifeline(run, l.id)).length} من {LIFELINES.length}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {LIFELINES.map(l => {
              const used = !canUseLifeline(run, l.id) || trapNow;
              const extra = run.bonusLifelines?.[l.id] || 0;
              const [icon, ...rest] = l.label.split(' ');
              return (
                <motion.button key={l.id} {...(used ? {} : tap)} onClick={() => onLifeline(l.id)} disabled={used} title={l.desc}
                  style={{
                    ...ghostBtn, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 66, padding: '8px 8px 6px',
                    opacity: used ? 0.4 : 1,
                  }}>
                  <span style={{ fontSize: 20, lineHeight: 1, filter: used ? 'grayscale(1)' : 'none' }}>{icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{rest.join(' ')}{extra > 0 ? ` +${extra}` : ''}</span>
                  {used && <span style={{ fontSize: 10, fontWeight: 800, color: '#FF8A8A' }}>استُخدمت</span>}
                </motion.button>
              );
            })}
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, opacity: 0.7, marginTop: 8, lineHeight: 1.6 }}>
            {twoMode && !firstWrong ? '✌️ لديك محاولتان لهذا السؤال. ' : ''}
            {doubled ? `🎯 دبل مفعّل: ×${DOUBLE_MULT} إن أصبت. ` : ''}
            كل وسيلة مرة واحدة فقط في الجولة كلها (٩٠ مرحلة). وتخصم {HELP_COST_RATE * 100}% من نقاط السؤال الذي تستخدمها فيه (عدا الدبل).
          </p>
        </div>
      )}

      <AnimatePresence>
        {question && !loading && answered && outcome && (
          <motion.div key="outcome" initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={springs.pop}
            style={{ ...card, textAlign: 'center', borderColor: isGood ? '#46C98B' : '#FF4A4A', boxShadow: `0 0 28px ${isGood ? 'rgba(70,201,139,0.25)' : 'rgba(229,30,40,0.3)'}` }}>
            {outcome.type === 'correct' || outcome.type === 'finished' ? (
              <p style={{ fontSize: 34, fontWeight: 900, color: '#46C98B', lineHeight: 1.3 }}>
                <CountUp value={outcome.earned} from={0} duration={0.7} signed />
                <span style={{ fontSize: 15, marginRight: 8, fontWeight: 700 }}>إجابة صحيحة</span>
              </p>
            ) : (
              <p style={{ fontSize: 24, fontWeight: 900, color: isGood ? '#46C98B' : '#FF4A4A' }}>
                {outcome.type === 'shielded' ? 'إجابة خاطئة، لكن…' : 'إجابة خاطئة'}
              </p>
            )}
            {outcome.type === 'fellBack' && (
              <p style={{ fontSize: 14, color: '#F2A93B', fontWeight: 700, marginTop: 4 }}>
                رجعت {outcome.fellBack} {outcome.fellBack === 1 ? 'مرحلة' : 'مراحل'} إلى المرحلة {outcome.newLevel + 1}
                {outcome.penalty ? ` · وخسرت ${outcome.penalty} نقطة بسبب الدبل` : ''}
              </p>
            )}
            {outcome.type === 'trapLost' && (
              <p style={{ fontSize: 14, color: '#F2A93B', fontWeight: 700, marginTop: 4 }}>
                ☠️ كان فخاً! {outcome.penalty ? `خُصمت ${outcome.penalty} نقطة` : 'لا نقاط لتُخصم'}، وتكمل إلى السؤال التالي دون رجوع.
              </p>
            )}
            {outcome.trap && outcome.type === 'correct' && (
              <p style={{ fontSize: 14, color: '#46C98B', fontWeight: 700, marginTop: 4 }}>☠️ نجوت من الفخ!</p>
            )}
            {outcome.type === 'shielded' && (
              <p style={{ fontSize: 14, color: '#46C98B', fontWeight: 700, marginTop: 4 }}>🛡️ الدرع حماك. لم تخسر شيئاً وتبقى في مرحلتك.</p>
            )}
            {outcome.type === 'gameOver' && (
              <p style={{ fontSize: 14, color: '#FF6666', fontWeight: 700, marginTop: 4 }}>{outcome.noRoom
                  ? `لا توجد ${outcome.back} مراحل قبلك لترجع إليها، فتنتهي الجولة.`
                  : 'سؤال 600 نقطة، فتبدأ الجولة من الصفر.'}</p>
            )}
            {question.explanation && <p style={{ fontSize: 14, margin: '8px 0', opacity: 0.85, lineHeight: 1.7 }}>{question.explanation}</p>}
            <motion.button {...tap} style={{ ...redBtn, marginTop: 8 }} onClick={onContinue} autoFocus>
              {outcome.type === 'gameOver' || outcome.type === 'finished' || outcome.finished ? 'عرض النتيجة' : 'المرحلة التالية'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

    </div>
  );
}

function Row({ label, value, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: big ? 20 : 14, fontWeight: big ? 900 : 600, fontVariantNumeric: 'tabular-nums' }}>
      <span>{label}</span>
      <span style={{ color: '#FFD700' }}>{value.toLocaleString('en')}</span>
    </div>
  );
}
