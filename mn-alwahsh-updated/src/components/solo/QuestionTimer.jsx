// Countdown for one question: big number, draining bar, and the speed points
// you'd earn if you answered right now (1 per whole second left).
import { motion, useReducedMotion } from 'framer-motion';

export default function QuestionTimer({ secondsLeft, total = 30, waiting = false }) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(1, secondsLeft / total));
  const low = secondsLeft <= 10;
  const color = low ? '#FF3B3B' : secondsLeft <= 20 ? '#F2A93B' : '#46C98B';
  const shown = Math.ceil(secondsLeft);
  return (
    <div role="timer" aria-label={`${shown} ثانية متبقية`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <motion.span
        animate={low && !waiting && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={low && !waiting ? { duration: 0.8, repeat: Infinity } : { duration: 0.2 }}
        style={{ fontWeight: 900, fontSize: 22, minWidth: 34, textAlign: 'center', color, fontVariantNumeric: 'tabular-nums' }}
      >
        {shown}
      </motion.span>
      <div style={{ flex: 1, height: 8, borderRadius: 6, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: color, boxShadow: `0 0 10px ${color}`, transition: 'width .12s linear, background .3s' }} />
      </div>
      <span style={{ fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap', color: waiting ? '#FFE9E9' : '#FFD700' }}>
        {waiting ? 'يبدأ عند التشغيل' : `+${Math.floor(secondsLeft)} نقطة`}
      </span>
    </div>
  );
}
