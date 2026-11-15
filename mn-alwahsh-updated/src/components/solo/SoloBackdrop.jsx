// Atmosphere behind the game: a glow tinted by the current tier (cross-fades
// when the tier changes) and a red edge flash when an answer is wrong.
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { TIER } from './soloMotion';

export default function SoloBackdrop({ points = 600, flash = 0 }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: '#0A0305' }}>
      {[200, 400, 600].map(p => (
        <motion.div
          key={p}
          initial={false}
          animate={{ opacity: p === points ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 1.2 }}
          style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 60% at 50% -10%, ${TIER[p].glow}, transparent 70%)` }}
        />
      ))}
      <AnimatePresence>
        {flash > 0 && !reduce && (
          <motion.div
            key={flash}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 120px 30px rgba(229,30,40,0.85)' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
