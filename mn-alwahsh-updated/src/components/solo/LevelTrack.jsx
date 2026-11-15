// The signature element: one track for all 90 levels, three tier segments,
// a glowing marker that springs to the current level (and visibly slides
// back after a loss), and a gift tick at every 10th level.
import { motion, useReducedMotion } from 'framer-motion';
import { springs, TIER } from './soloMotion';

const TIERS = [200, 400, 600];

export default function LevelTrack({ level, total = 90, tierSize = 30, boxEvery = 10, boxesSeen = [], idle = false }) {
  const reduce = useReducedMotion();
  const pct = Math.min(100, (level / total) * 100);
  const current = level < tierSize ? 200 : level < tierSize * 2 ? 400 : 600;
  const color = TIER[current].color;
  const boxes = [];
  for (let n = boxEvery; n < total; n += boxEvery) boxes.push(n);

  return (
    <div dir="rtl" role="img" aria-label={`المرحلة ${level + 1} من ${total}`}>
      <div style={{ position: 'relative', height: 22 }}>
        {/* segments + fill (RTL: the track starts on the right) */}
        <div style={{ position: 'absolute', insetInline: 0, top: 7, height: 8, display: 'flex', borderRadius: 6, overflow: 'hidden' }}>
          {TIERS.map((pts, i) => {
            const frac = Math.max(0, Math.min(1, (level - i * tierSize) / tierSize));
            return (
              <div key={pts} style={{
                flex: 1, position: 'relative', background: 'rgba(255,255,255,0.07)',
                borderInlineStart: i ? '2px solid #0A0305' : 'none',
              }}>
                <motion.div
                  initial={false}
                  animate={{ width: `${frac * 100}%` }}
                  transition={reduce ? { duration: 0 } : springs.gentle}
                  style={{ height: '100%', background: TIER[pts].color, boxShadow: `0 0 10px ${TIER[pts].color}` }}
                />
              </div>
            );
          })}
        </div>

        {/* gift ticks: filled once their box has been offered */}
        {boxes.map(n => (
          <span key={n} aria-hidden style={{
            position: 'absolute', right: `${(n / total) * 100}%`, top: 3, width: 8, height: 8,
            transform: 'translateX(50%) rotate(45deg)', background: boxesSeen.includes(n) ? '#FFD700' : '#0A0305',
            border: '1.5px solid #FFD700', opacity: boxesSeen.includes(n) ? 1 : 0.7,
          }} />
        ))}

        {/* marker */}
        <motion.span
          initial={false}
          animate={{ right: `${pct}%` }}
          transition={reduce ? { duration: 0 } : springs.snappy}
          style={{ position: 'absolute', top: 2, width: 18, height: 18, marginRight: -9, borderRadius: '50%', background: color, border: '3px solid #0A0305', boxShadow: `0 0 14px 3px ${color}` }}
        >
          {idle && !reduce && (
            <motion.span
              animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${color}` }}
            />
          )}
        </motion.span>
      </div>

      {/* tier labels, current one lit */}
      <div style={{ display: 'flex', marginTop: 4 }}>
        {TIERS.map(pts => (
          <span key={pts} style={{
            flex: 1, textAlign: 'center', fontSize: 11, fontWeight: current === pts ? 900 : 600,
            color: current === pts ? TIER[pts].color : 'rgba(255,228,228,0.4)',
          }}>
            {TIER[pts].name} · {pts}
          </span>
        ))}
      </div>
    </div>
  );
}
