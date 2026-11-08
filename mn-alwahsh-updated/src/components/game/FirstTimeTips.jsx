import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Short step-by-step tips shown once per device for each screen
// (remembered in localStorage under `storageKey`). Never blocks the game:
// "تخطي" dismisses all tips for that screen.
const TIPS_PREF_KEY = 'mn_tips_pref_v1';
const CARD_STYLE = {
  position: 'fixed', left: 16, right: 16, bottom: 'max(24px, env(safe-area-inset-bottom))',
  maxWidth: 420, margin: '0 auto', zIndex: 9999,
  background: 'linear-gradient(160deg, #1a0000, #050000)', border: '1.5px solid #CC0000',
  borderRadius: 18, padding: '18px 18px 14px', boxShadow: '0 0 30px rgba(204,0,0,0.45)',
  color: '#FFE4E4', fontFamily: 'var(--font-cairo)', textAlign: 'center',
};
const BTN_GHOST = { flex: 1, padding: '10px 0', borderRadius: 12, background: 'transparent',
  color: 'rgba(255,228,228,0.7)', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'inherit', fontSize: 14, touchAction: 'manipulation' };
const BTN_MAIN = { flex: 2, padding: '10px 0', borderRadius: 12,
  background: 'linear-gradient(135deg, #8B0000, #CC0000)', color: '#fff', border: 'none',
  fontFamily: 'inherit', fontWeight: 800, fontSize: 15, touchAction: 'manipulation' };

export default function FirstTimeTips({ storageKey, tips }) {
  // One shared opt-in for every screen: 'yes' | 'no' | null (not asked yet).
  const readPref = () => { try { return localStorage.getItem(TIPS_PREF_KEY); } catch { return 'no'; } };
  const [pref, setPref] = useState(readPref);
  const [step, setStep] = useState(() => {
    try { return localStorage.getItem(storageKey) ? -1 : 0; } catch { return -1; }
  });

  const close = () => {
    try { localStorage.setItem(storageKey, '1'); } catch {}
    setStep(-1);
  };
  const choose = (v) => {
    try { localStorage.setItem(TIPS_PREF_KEY, v); } catch {}
    setPref(v);
    if (v === 'no') close();
  };

  if (step < 0 || !tips?.length || pref === 'no') return null;

  if (pref !== 'yes') {
    return createPortal(
      <>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998 }} />
        <motion.div
          dir="rtl"
          initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25 }}
          style={{ ...CARD_STYLE }}
        >
          <div style={{ fontSize: 34, lineHeight: 1 }}>👋</div>
          <div style={{ fontWeight: 800, fontSize: 17, margin: '8px 0 4px', color: '#FFD700' }}>أول مرة تلعب من الوحش؟</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.92, marginBottom: 14 }}>تبي نعرض لك نصائح سريعة عن طريقة اللعب؟</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => choose('no')} style={{ ...BTN_GHOST }}>لا، شكراً</button>
            <button onClick={() => choose('yes')} style={{ ...BTN_MAIN }}>نعم، اعرض النصائح</button>
          </div>
        </motion.div>
      </>,
      document.body
    );
  }
  const tip = tips[step];
  const last = step === tips.length - 1;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="ftt-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={close}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9998 }}
      />
      <motion.div
        key={`ftt-${step}`}
        dir="rtl"
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'fixed', left: 16, right: 16, bottom: 'max(24px, env(safe-area-inset-bottom))',
          maxWidth: 420, margin: '0 auto', zIndex: 9999,
          background: 'linear-gradient(160deg, #1a0000, #050000)', border: '1.5px solid #CC0000',
          borderRadius: 18, padding: '18px 18px 14px', boxShadow: '0 0 30px rgba(204,0,0,0.45)',
          color: '#FFE4E4', fontFamily: 'var(--font-cairo)', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 34, lineHeight: 1 }}>{tip.emoji}</div>
        <div style={{ fontWeight: 800, fontSize: 17, margin: '8px 0 4px', color: '#FFD700' }}>{tip.title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.92 }}>{tip.text}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '12px 0' }}>
          {tips.map((_, i) => (
            <span key={i} style={{ width: i === step ? 18 : 7, height: 7, borderRadius: 4,
              background: i === step ? '#CC0000' : 'rgba(255,255,255,0.25)', transition: 'all .2s' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={close} style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: 'transparent',
            color: 'rgba(255,228,228,0.7)', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'inherit', fontSize: 14, touchAction: 'manipulation' }}>
            تخطي
          </button>
          <button onClick={() => (last ? close() : setStep(step + 1))} style={{ flex: 2, padding: '10px 0', borderRadius: 12,
            background: 'linear-gradient(135deg, #8B0000, #CC0000)', color: '#fff', border: 'none',
            fontFamily: 'inherit', fontWeight: 800, fontSize: 15, touchAction: 'manipulation' }}>
            {last ? 'يلا نلعب!' : 'التالي'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export const SETUP_TIPS = [
  { emoji: '👋', title: 'أهلاً في من الوحش!', text: 'لعبة أسئلة بين فريقين — الفريق اللي يجمع نقاط أكثر يفوز.' },
  { emoji: '✍️', title: 'سمّ فريقك', text: 'اكتب اسم لكل فريق، أو اتركه فاضي ونسميه لك.' },
  { emoji: '🗂️', title: 'اختار ٣ فئات لكل فريق', text: 'الفئات الست تكوّن لوحة اللعبة. 🔒 الفئات المقفلة تحتاج تسجيل دخول أو شراء.' },
  { emoji: '▶️', title: 'ابدأ اللعبة', text: 'لما يختار كل فريق ٣ فئات، يتفعّل زر "ابدأ اللعبة".' },
];

export const BOARD_TIPS = [
  { emoji: '🎲', title: 'اختار خلية', text: 'الفريق اللي دوره يختار سؤال من اللوحة: ٢٠٠ أو ٤٠٠ أو ٦٠٠ نقطة — كل ما زادت النقاط صعب السؤال.' },
  { emoji: '⏱️', title: '٣٠ ثانية للإجابة', text: 'إذا غلطتوا أو خلص الوقت، الفريق الثاني عنده ١٠ ثواني يسرق النقاط!' },
  { emoji: '💡', title: 'وسائل المساعدة', text: 'احذف إجابة، جاوب جوابين، ودبل يا كبير — كل وسيلة مرة وحدة لكل فريق.' },
  { emoji: '☠️', title: 'انتبه للخلايا الخاصة', text: 'خلايا المضاعفة تزيد النقاط، والجمجمة سؤال فخ: +٦٠٠ أو -٦٠٠!' },
  { emoji: '🔄', title: 'سؤال مكرر؟', text: 'اضغط "تغيير سؤال مكرر" داخل السؤال، أو 🚩 للإبلاغ عن خطأ.' },
];
