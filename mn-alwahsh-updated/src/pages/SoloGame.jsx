// Solo mode — one player, 90 levels (30 × 200, 30 × 400, 30 × 600 points),
// random free categories, no stealing / passing to a rival.
// Rules live in utils/soloEngine.js; the leaderboard in utils/soloLeaderboard.js.
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCategories, fetchQuestion } from '../utils/supabaseClient';
import { fetchAndCacheImage, getCachedImageUrl } from '../utils/questionGenerator';
import { isHiddenCategory } from '../utils/hiddenCategories';
import { isPremiumCategory } from '../utils/premiumConfig';
import { getCurrentUser } from '../utils/authClient';
import { sounds } from '../utils/soundEffects';
import { fetchLeaderboard, submitRun } from '../utils/soloLeaderboard';
import SongPlayer from '../components/game/SongPlayer';
import {
  TOTAL_LEVELS, TIER_SIZE, MAX_SCORE, DOUBLE_MULT, HELP_COST_RATE,
  newRun, tierPoints, resolveQuestion, applyLifeline,
  baseScore, levelSum, helpBonus, lossBonus, finalScore, levelsCompleted,
  canUseLifeline, openBox, BOX_EVERY,
} from '../utils/soloEngine';

// Key must start with "mn_alwahsh_v3_" — supabaseClient wipes every other
// localStorage key on app start.
const SAVE_KEY = 'mn_alwahsh_v3_solo_run';

const TIER_STYLE = {
  200: { name: 'سهل', color: '#3DDC84' },
  400: { name: 'متوسط', color: '#FFB020' },
  600: { name: 'صعب', color: '#FF4040' },
};

const LIFELINES = [
  { id: 'removeOne', label: '🗑️ احذف إجابة', desc: `يحذف خياراً خاطئاً — يخصم ${HELP_COST_RATE * 100}% من نقاط السؤال` },
  { id: 'twoAnswers', label: '✌️ جاوب جوابين', desc: `محاولتان للإجابة — يخصم ${HELP_COST_RATE * 100}% من نقاط السؤال` },
  { id: 'double', label: '🎯 دبل يا كبير', desc: `نقاط السؤال ×${DOUBLE_MULT} إن أصبت، وإن أخطأت تخسر نقاطه من المرحلة السابقة` },
];

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
  background: 'rgba(5,0,0,0.78)', border: '1.5px solid rgba(139,0,0,0.45)',
  borderRadius: 18, padding: 18, backdropFilter: 'blur(10px)',
};
const redBtn = {
  ...font, fontWeight: 800, fontSize: 16, color: '#FFE4E4', cursor: 'pointer',
  background: 'linear-gradient(135deg, #6B0000 0%, #CC0000 50%, #6B0000 100%)',
  border: '1px solid rgba(255,60,60,0.4)', borderRadius: 14, padding: '13px 20px',
  boxShadow: '0 0 18px rgba(139,0,0,0.5)', width: '100%',
};
const ghostBtn = {
  ...font, fontWeight: 700, fontSize: 14, color: '#FFE4E4', cursor: 'pointer',
  background: 'rgba(10,0,0,0.7)', border: '1px solid rgba(139,0,0,0.7)',
  borderRadius: 12, padding: '10px 16px',
};

export default function SoloGame() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [view, setView] = useState('intro'); // intro | play | box | end | board
  const [boxResult, setBoxResult] = useState(null);
  const [run, setRun] = useState(newRun);
  const [hasSave, setHasSave] = useState(false);
  const [notice, setNotice] = useState('');

  const [pool, setPool] = useState(null);     // free category names
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [outcome, setOutcome] = useState(null);

  // Per-question help state
  const [removed, setRemoved] = useState(null);
  const [twoMode, setTwoMode] = useState(false);
  const [firstWrong, setFirstWrong] = useState(null);
  const [doubled, setDoubled] = useState(false);
  const helpsOnQ = useRef(0);

  const [submitInfo, setSubmitInfo] = useState(null);
  const [board, setBoard] = useState(null);

  const seen = useRef(new Set());
  const deadCombos = useRef(new Set());
  const songSwapped = useRef(false);
  const runRef = useRef(run);
  runRef.current = run;

  // ── persistence ─────────────────────────────────────────────────────
  const persist = useCallback((r, extra = {}) => {
    writeSave({ run: r, seen: [...seen.current].slice(-400), ...extra });
  }, []);

  useEffect(() => {
    const s = loadSave();
    if (s?.run && !(s.run.level === 0 && !s.run.levelPoints?.length && !s.run.losses && !s.run.gameOver && !s.pending)) {
      setHasSave(true);
    }
  }, []);

  // ── question fetching ───────────────────────────────────────────────
  const ensurePool = useCallback(async () => {
    if (pool) return pool;
    const cats = await fetchCategories();
    const free = cats.filter(c => !isHiddenCategory(c) && !isPremiumCategory(c));
    setPool(free);
    return free;
  }, [pool]);

  const loadQuestion = useCallback(async (level) => {
    setLoading(true); setLoadError(false);
    setQuestion(null); setSelected(null); setAnswered(false); setOutcome(null);
    setRemoved(null); setTwoMode(false); setFirstWrong(null); setDoubled(false);
    helpsOnQ.current = 0; songSwapped.current = false;
    const points = tierPoints(level);
    try {
      const cats = await ensurePool();
      for (let i = 0; i < 25; i++) {
        const live = cats.filter(c => !deadCombos.current.has(`${c}|${points}`));
        if (!live.length) break;
        const cat = pick(live);
        const q = await fetchQuestion(cat, points);
        if (!q) { deadCombos.current.add(`${cat}|${points}`); continue; }
        if (!validQuestion(q) || seen.current.has(qKey(q))) continue;
        seen.current.add(qKey(q));
        if (q.image_url) await Promise.race([fetchAndCacheImage(q.image_url), new Promise(r => setTimeout(r, 2500))]);
        setQuestion({ ...q, category: cat });
        setLoading(false);
        // From here the question is on screen: leaving now counts as a loss.
        persist(runRef.current, { pending: true });
        return;
      }
      setLoadError(true);
    } catch {
      setLoadError(true);
    }
    setLoading(false);
  }, [ensurePool, persist]);

  // ── run lifecycle ───────────────────────────────────────────────────
  const endRun = useCallback(async (r) => {
    setView('end');
    setSubmitInfo(null);
    const info = await submitRun({
      score: finalScore(r), levels: levelsCompleted(r), finished: r.finished, user,
    });
    setSubmitInfo(info);
  }, [user]);

  const startNew = () => {
    seen.current = new Set();
    const r = newRun();
    setRun(r); setNotice(''); setView('play');
    persist(r, { pending: false });
    loadQuestion(0);
  };

  const resume = () => {
    const s = loadSave();
    if (!s?.run) return startNew();
    seen.current = new Set(s.seen || []);
    let r = { ...newRun(), ...s.run };
    if (r.gameOver || r.finished) { setRun(r); endRun(r); return; }
    let msg = '';
    if (s.pending) {
      // Left a question without answering — it counts as a miss (one attempt only).
      const res = resolveQuestion(r, { correct: false });
      r = res.run;
      msg = res.outcome.type === 'gameOver'
        ? 'خرجت من السؤال قبل الإجابة فاحتُسب خطأً — وكان بـ600 نقطة فانتهت الجولة.'
        : `خرجت من السؤال قبل الإجابة فاحتُسب خطأً — رجعت ${res.outcome.fellBack} مراحل.`;
    }
    setRun(r); setNotice(msg);
    persist(r, { pending: false });
    if (r.gameOver) { endRun(r); return; }
    if (r.boxPending) { setBoxResult(null); setView('box'); return; }
    setView('play');
    loadQuestion(r.level);
  };

  // ── answering ───────────────────────────────────────────────────────
  const resolve = (correct) => {
    const res = resolveQuestion(runRef.current, { correct, helps: helpsOnQ.current, doubled });
    setRun(res.run);
    setOutcome(res.outcome);
    setAnswered(true);
    if (correct) sounds?.correct?.(); else sounds?.wrong?.();
    persist(res.run, { pending: false });
  };

  const onPick = (key) => {
    if (answered || key === removed || key === firstWrong || !question) return;
    setSelected(key);
    const correct = key === question.correct;
    if (!correct && twoMode && !firstWrong) {
      setFirstWrong(key); setSelected(null); // second chance
      return;
    }
    resolve(correct);
  };

  const onLifeline = (id) => {
    if (answered || !question || !canUseLifeline(run, id)) return;
    const next = applyLifeline(run, id);
    setRun(next);
    persist(next, { pending: true });
    if (id === 'removeOne') {
      helpsOnQ.current += 1;
      const wrong = Object.keys(question.options).filter(k => k !== question.correct && question.options[k]);
      setRemoved(pick(wrong));
    } else if (id === 'twoAnswers') {
      helpsOnQ.current += 1;
      setTwoMode(true);
    } else if (id === 'double') {
      setDoubled(true);
    }
  };

  const onContinue = () => {
    if (!outcome) return;
    if (outcome.type === 'gameOver' || outcome.type === 'finished') { endRun(run); return; }
    if (run.boxPending) { setBoxResult(null); setView('box'); return; }
    loadQuestion(run.level);
  };

  const onBox = (open) => {
    const res = openBox(run, open);
    setRun(res.run);
    persist(res.run, { pending: false });
    if (!open) { setView('play'); loadQuestion(res.run.level); return; }
    setBoxResult(res.result);
  };

  const afterBox = () => { setView('play'); loadQuestion(runRef.current.level); };

  // A "guess the song" clip that can't play is swapped silently — no penalty.
  const onSongFailed = useCallback(() => {
    if (songSwapped.current || answered) return;
    songSwapped.current = true;
    loadQuestion(runRef.current.level);
  }, [answered, loadQuestion]);

  const openBoard = async () => {
    setView('board'); setBoard(null);
    setBoard(await fetchLeaderboard());
  };

  // ── views ───────────────────────────────────────────────────────────
  const shell = (children) => (
    <div className="min-h-screen" dir="rtl" style={{ background: '#050000', color: '#FFE4E4', ...font }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '14px 14px 40px' }}>{children}</div>
    </div>
  );

  if (view === 'intro') return shell(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 20 }}>
      <button onClick={() => navigate('/')} style={{ ...ghostBtn, alignSelf: 'flex-start' }}>→ رجوع</button>
      <h1 style={{ textAlign: 'center', fontSize: 34, fontWeight: 900, color: '#FF2A2A', textShadow: '0 0 14px #CC0000' }}>
        تحدّي الوحش الفردي
      </h1>
      <div style={card}>
        <p style={{ fontWeight: 800, marginBottom: 8 }}>القواعد</p>
        <ul style={{ fontSize: 14, lineHeight: 2, paddingRight: 18, listStyle: 'disc' }}>
          <li>{TOTAL_LEVELS} مرحلة: {TIER_SIZE} سهلة (200) ثم {TIER_SIZE} متوسطة (400) ثم {TIER_SIZE} صعبة (600).</li>
          <li>فئات وأسئلة عشوائية، ومحاولة واحدة لكل سؤال.</li>
          <li>خطأ في سؤال 200 ← ترجع 3 مراحل. سؤال 400 ← ترجع 10 مراحل.</li>
          <li>خطأ في سؤال 600 ← تبدأ الجولة من الصفر.</li>
          <li>كل وسيلة مساعدة تُستخدم مرة واحدة في الجولة، وتخصم من النقاط وتنقص مكافأة النهاية.</li>
          <li>عند إنهاء المراحل كلها تُضاف مكافأة بلا مساعدات ومكافأة بلا خسارات. أعلى نتيجة بلا صناديق: {MAX_SCORE.toLocaleString('en')}.</li>
          <li>🎁 بعد كل {BOX_EVERY} مراحل صندوق مفاجأة: تفتحه أو تتخطاه دون أن ترى ما بداخله — قد تربح وقد تخسر!</li>
        </ul>
      </div>
      {!user && (
        <p style={{ fontSize: 13, textAlign: 'center', color: '#FFB020' }}>
          سجّل دخولك من الشاشة الرئيسية حتى تدخل نتيجتك قائمة المتصدّرين.
        </p>
      )}
      {hasSave && <button style={redBtn} onClick={resume}>▶ تابع جولتك</button>}
      <button style={hasSave ? ghostBtn : redBtn} onClick={() => {
        if (hasSave && !window.confirm('سيُحذف تقدّمك الحالي. متأكد؟')) return;
        startNew();
      }}>{hasSave ? 'ابدأ جولة جديدة' : '🎯 ابدأ التحدّي'}</button>
      <button style={ghostBtn} onClick={openBoard}>🏆 المتصدّرون</button>
    </div>
  );

  if (view === 'board') return shell(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
      <button onClick={() => setView(run.gameOver || run.finished ? 'end' : 'intro')} style={{ ...ghostBtn, alignSelf: 'flex-start' }}>→ رجوع</button>
      <h2 style={{ textAlign: 'center', fontSize: 26, fontWeight: 900, color: '#FFD700' }}>🏆 المتصدّرون</h2>
      <div style={{ ...card, padding: 10 }}>
        {board === null && <p style={{ textAlign: 'center', padding: 20 }}>⏳ جاري التحميل…</p>}
        {board && board.length === 0 && <p style={{ textAlign: 'center', padding: 20 }}>لا توجد نتائج بعد — كن الأول!</p>}
        {board && board.map((row, i) => {
          const mine = user && row.user_id === user.id;
          return (
            <div key={row.user_id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px',
              borderBottom: '1px solid rgba(139,0,0,0.25)',
              background: mine ? 'rgba(255,215,0,0.1)' : 'transparent', borderRadius: 8,
            }}>
              <span style={{ width: 30, textAlign: 'center', fontWeight: 900, color: i < 3 ? '#FFD700' : '#FF8888' }}>
                {['🥇', '🥈', '🥉'][i] || i + 1}
              </span>
              <span style={{ flex: 1, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.display_name}{mine ? ' (أنت)' : ''}
              </span>
              <span style={{ fontSize: 12, opacity: 0.75 }}>
                {row.best_levels}/{TOTAL_LEVELS} مرحلة{row.completed_runs > 0 ? ` · ✔ ${row.completed_runs}` : ''}
              </span>
              <span style={{ fontWeight: 900, color: '#FFD700', minWidth: 56, textAlign: 'left' }}>
                {row.best_score.toLocaleString('en')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (view === 'box') {
    const lvl = run.level;
    const R = boxResult;
    const msg = !R ? null : {
      removeOne: ['🗑️', 'مساعدة "احذف إجابة" إضافية!', '#3DDC84'],
      twoAnswers: ['✌️', 'مساعدة "جاوب جوابين" إضافية!', '#3DDC84'],
      points: ['⭐', `+${R.amount} نقطة إضافية!`, '#3DDC84'],
      shield: ['🛡️', 'درع! يلغي أول سؤال تخسره.', '#3DDC84'],
      losePoints: ['💸', R.amount ? `خسرت ${R.amount} نقطة…` : 'حظ سيئ، لكن لا نقاط لتخسرها!', '#FF4040'],
      rollback: ['⏪', `رجعت ${R.back} ${R.back === 1 ? 'مرحلة' : 'مراحل'} إلى المرحلة ${R.newLevel + 1}`, '#FF4040'],
    }[R.type];
    return shell(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 50, textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ fontSize: 90 }}>
          {R ? msg[0] : '🎁'}
        </motion.div>
        {!R ? (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#FFD700' }}>صندوق المفاجأة</h2>
            <p style={{ fontSize: 14, lineHeight: 1.9 }}>
              أنهيت {lvl} مراحل. تفتح الصندوق؟<br />
              قد يحتوي على مساعدة أو نقاط أو درع… وقد يكون حظك سيئاً فتخسر نقاطاً أو ترجع مرحلة.<br />
              <b>لن تعرف ما بداخله قبل أن تقرّر، والقرار نهائي.</b>
            </p>
            <button style={redBtn} onClick={() => onBox(true)}>🎁 افتح الصندوق</button>
            <button style={ghostBtn} onClick={() => onBox(false)}>تخطَّ — لا أريد المخاطرة</button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: msg[2] }}>{msg[1]}</h2>
            <p style={{ fontSize: 13, opacity: 0.75 }}>نقاطك الآن: {baseScore(run).toLocaleString('en')}</p>
            <button style={redBtn} onClick={afterBox}>تابع ←</button>
          </>
        )}
      </div>
    );
  }

  if (view === 'end') {
    const score = finalScore(run);
    return shell(
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 30 }}>
        <h2 style={{ textAlign: 'center', fontSize: 30, fontWeight: 900, color: run.finished ? '#3DDC84' : '#FF4040' }}>
          {run.finished ? '🎉 أنهيت التحدّي!' : '💀 انتهت الجولة'}
        </h2>
        {!run.finished && (
          <p style={{ textAlign: 'center', fontSize: 14 }}>
            أخطأت في سؤال 600 نقطة بعد {levelsCompleted(run)} مرحلة.
          </p>
        )}
        <div style={card}>
          <Row label="نقاط المراحل" value={levelSum(run)} />
          {run.bonusPoints !== 0 && <Row label="صناديق المفاجأة" value={run.bonusPoints} />}
          {run.finished && <>
            <Row label={`مكافأة بلا مساعدات (استخدمت ${run.helpsUsed})`} value={helpBonus(run)} />
            <Row label={`مكافأة بلا خسارات (خسرت ${run.losses})`} value={lossBonus(run)} />
          </>}
          <div style={{ borderTop: '1px solid rgba(139,0,0,0.5)', marginTop: 8, paddingTop: 8 }}>
            <Row label="المجموع" value={score} big />
          </div>
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
            المراحل المنجزة: {levelsCompleted(run)} / {TOTAL_LEVELS}
            {!run.finished && ' — المكافآت تُحتسب عند إنهاء المراحل كلها.'}
          </p>
        </div>
        <p style={{ fontSize: 13, textAlign: 'center', minHeight: 20 }}>
          {!user ? '⚠️ لم تُسجَّل النتيجة في المتصدّرين لأنك لم تسجّل دخولك.'
            : submitInfo === null ? '⏳ جاري حفظ نتيجتك…'
            : submitInfo.saved ? (submitInfo.newBest ? '🏆 رقم قياسي جديد! حُفظت نتيجتك.' : '✔ حُفظت نتيجتك.')
            : '⚠️ تعذّر حفظ النتيجة (تحقّق من الاتصال).'}
        </p>
        <ShareButtons run={run} />
        <button style={redBtn} onClick={() => { startNew(); }}>🔁 جولة جديدة</button>
        <button style={ghostBtn} onClick={openBoard}>🏆 المتصدّرون</button>
        <button style={ghostBtn} onClick={() => { setHasSave(false); setView('intro'); navigate('/'); }}>الشاشة الرئيسية</button>
      </div>
    );
  }

  // ── playing ─────────────────────────────────────────────────────────
  const points = tierPoints(run.level);
  const tier = TIER_STYLE[points];
  const pct = (run.level / TOTAL_LEVELS) * 100;
  const hero = question?.image_url && !question?.itunes_id ? getCachedImageUrl(question.image_url) : null;

  return shell(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* header */}
      <div style={{ ...card, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/')} style={{ ...ghostBtn, padding: '6px 10px', fontSize: 12 }}>حفظ وخروج</button>
          <span style={{ fontWeight: 900 }}>المرحلة {run.level + 1} / {TOTAL_LEVELS}</span>
          <span style={{ fontWeight: 900, color: '#FFD700' }}>⭐ {baseScore(run).toLocaleString('en')}</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: tier.color, transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
          <span style={{ color: tier.color, fontWeight: 800 }}>{tier.name} · {points} نقطة</span>
          <span style={{ opacity: 0.7 }}>{run.shield ? '🛡️ · ' : ''}مساعدات: {run.helpsUsed} · خسارات: {run.losses}</span>
        </div>
        <div style={{ marginTop: 8 }}><ShareButtons run={run} compact /></div>
      </div>

      {notice && (
        <div style={{ ...card, padding: 10, borderColor: '#FFB020', fontSize: 13 }}>
          ⚠️ {notice}
          <button onClick={() => setNotice('')} style={{ ...ghostBtn, padding: '2px 8px', marginRight: 8, fontSize: 12 }}>حسناً</button>
        </div>
      )}

      {loading && <div style={{ ...card, textAlign: 'center', padding: 40 }}>⏳ جاري تحضير السؤال…</div>}

      {loadError && !loading && (
        <div style={{ ...card, textAlign: 'center' }}>
          <p style={{ marginBottom: 10 }}>تعذّر تحميل سؤال. تحقّق من اتصالك ثم أعد المحاولة.</p>
          <button style={redBtn} onClick={() => loadQuestion(run.level)}>إعادة المحاولة</button>
        </div>
      )}

      {question && !loading && (
        <>
          <div style={{ ...card, background: '#F5EFE0', color: '#1a1a1a', borderColor: '#8B0000' }}>
            {hero && <img src={hero} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 10, marginBottom: 10 }} />}
            {question.itunes_id && (
              <SongPlayer key={question.id ?? question.itunes_id} itunesId={question.itunes_id} solo onFailed={onSongFailed} />
            )}
            <p style={{ fontWeight: 800, fontSize: 19, lineHeight: 1.7, textAlign: 'right' }}>{question.question}</p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(question.options).map(([key, value]) => {
              if (!value) return null;
              const isRemoved = key === removed;
              const isFirstWrong = key === firstWrong;
              const isRight = key === question.correct;
              let bg = 'rgba(40,0,0,0.85)', border = 'rgba(139,0,0,0.6)', op = 1;
              if (answered) {
                if (isRight) { bg = 'rgba(30,140,70,0.45)'; border = '#3DDC84'; }
                else if (key === selected) { bg = 'rgba(190,30,30,0.5)'; border = '#FF4040'; }
                else op = 0.45;
              }
              if (isRemoved || isFirstWrong) op = 0.25;
              return (
                <motion.button key={key} whileTap={!answered ? { scale: 0.98 } : {}}
                  onClick={() => onPick(key)} disabled={answered || isRemoved || isFirstWrong}
                  style={{
                    ...font, textAlign: 'right', fontWeight: 700, fontSize: 16, color: '#FFE4E4',
                    padding: '13px 16px', borderRadius: 12, background: bg, opacity: op,
                    border: `2px solid ${border}`, cursor: answered ? 'default' : 'pointer',
                    textDecoration: isRemoved || isFirstWrong ? 'line-through' : 'none',
                  }}>
                  <span style={{ color: '#FF6666', marginLeft: 10 }}>{key}.</span>{value}
                </motion.button>
              );
            })}
          </div>

          {!answered && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {LIFELINES.map(l => {
                  const used = !canUseLifeline(run, l.id);
                  const extra = run.bonusLifelines?.[l.id] || 0;
                  return (
                    <button key={l.id} onClick={() => onLifeline(l.id)} disabled={used} title={l.desc}
                      style={{ ...ghostBtn, fontSize: 13, opacity: used ? 0.3 : 1, textDecoration: used ? 'line-through' : 'none' }}>
                      {l.label}{extra > 0 ? ` (+${extra})` : ''}
                    </button>
                  );
                })}
              </div>
              <p style={{ textAlign: 'center', fontSize: 11, opacity: 0.65, marginTop: 6 }}>
                {twoMode && !firstWrong ? '✌️ لديك محاولتان لهذا السؤال. ' : ''}
                {doubled ? `🎯 دبل مفعّل: ×${DOUBLE_MULT} إن أصبت. ` : ''}
                المساعدة تخصم {HELP_COST_RATE * 100}% من نقاط السؤال (للحذف والجوابين) وكل وسيلة مرة واحدة في الجولة.
              </p>
            </div>
          )}

          <AnimatePresence>
            {answered && outcome && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ ...card, textAlign: 'center', borderColor: ['correct', 'finished', 'shielded'].includes(outcome.type) ? '#3DDC84' : '#FF4040' }}>
                <p style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>
                  {outcome.type === 'correct' || outcome.type === 'finished' ? `🎉 إجابة صحيحة! +${outcome.earned}` : '❌ إجابة خاطئة'}
                </p>
                {outcome.type === 'fellBack' && (
                  <p style={{ fontSize: 14, color: '#FFB020', fontWeight: 700 }}>
                    رجعت {outcome.fellBack} {outcome.fellBack === 1 ? 'مرحلة' : 'مراحل'} إلى المرحلة {outcome.newLevel + 1}
                    {outcome.penalty ? ` · وخسرت ${outcome.penalty} نقطة بسبب الدبل` : ''}
                  </p>
                )}
                {outcome.type === 'shielded' && (
                  <p style={{ fontSize: 14, color: '#3DDC84', fontWeight: 700 }}>🛡️ الدرع حماك! لم تخسر شيئاً وتبقى في مرحلتك.</p>
                )}
                {outcome.type === 'gameOver' && (
                  <p style={{ fontSize: 14, color: '#FF6666', fontWeight: 700 }}>سؤال 600 نقطة — الجولة تبدأ من الصفر.</p>
                )}
                {question.explanation && <p style={{ fontSize: 14, margin: '8px 0', opacity: 0.9 }}>{question.explanation}</p>}
                <button style={{ ...redBtn, marginTop: 8 }} onClick={onContinue}>
                  {outcome.type === 'gameOver' || outcome.type === 'finished' ? 'عرض النتيجة' : 'المرحلة التالية ←'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// Share the current level and score — WhatsApp, Facebook, the phone's own
// share sheet (when available) or copy the text.
function ShareButtons({ run, compact = false }) {
  const [copied, setCopied] = useState(false);
  const levels = levelsCompleted(run);
  const score = finalScore(run);
  const url = `${window.location.origin}/solo`;
  const text = run.finished
    ? `🎉 أنهيت تحدّي «من الوحش» كاملاً (${TOTAL_LEVELS} مرحلة) وجمعت ${score.toLocaleString('en')} نقطة! هل تقدر تتفوق عليّ؟ 🎯`
    : `🎯 وصلت إلى المرحلة ${levels + (run.gameOver ? 0 : 1)} من ${TOTAL_LEVELS} في تحدّي «من الوحش» وجمعت ${score.toLocaleString('en')} نقطة! هل تقدر تتفوق عليّ؟`;
  const full = `${text}\n${url}`;
  const open = (href) => window.open(href, '_blank', 'noopener,noreferrer');
  const btn = { ...ghostBtn, padding: compact ? '6px 10px' : '10px 14px', fontSize: compact ? 12 : 14 };
  const canNative = typeof navigator !== 'undefined' && !!navigator.share;
  const copy = async () => {
    try { await navigator.clipboard.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
      {!compact && <span style={{ width: '100%', textAlign: 'center', fontSize: 13, opacity: 0.8 }}>📣 شارك نتيجتك</span>}
      <button style={{ ...btn, borderColor: '#25D366' }} onClick={() => open(`https://wa.me/?text=${encodeURIComponent(full)}`)}>واتساب</button>
      <button style={{ ...btn, borderColor: '#1877F2' }}
        onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`)}>فيسبوك</button>
      {canNative && <button style={btn} onClick={() => navigator.share({ text, url }).catch(() => {})}>مشاركة…</button>}
      <button style={btn} onClick={copy}>{copied ? '✔ نُسخ' : 'نسخ'}</button>
    </div>
  );
}

function Row({ label, value, big }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: big ? 20 : 14, fontWeight: big ? 900 : 600 }}>
      <span>{label}</span>
      <span style={{ color: '#FFD700' }}>{value.toLocaleString('en')}</span>
    </div>
  );
}
