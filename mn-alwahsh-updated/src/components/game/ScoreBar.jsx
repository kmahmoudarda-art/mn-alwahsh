import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, Minus, X } from 'lucide-react';
import PayPalDonateButton from './PayPalDonateButton';

const MILESTONES = [1000, 2000, 3000, 4000, 5000, 6000];

function getBadge(score) {
  if (score >= 6000) return { text: 'Unreal ⚡', color: '#00ccff', glow: '#00eeff' };
  if (score >= 5000) return { text: 'Legend 🏆', color: '#FFD700', glow: '#FFD700' };
  if (score >= 4000) return { text: 'امبراطور 👑', color: '#8B6914', glow: '#FFD700' };
  if (score >= 3000) return { text: 'اسطورة 🌟', color: '#cc5500', glow: '#FF8C00' };
  if (score >= 2000) return { text: 'ملك 🔥', color: '#cc0000', glow: '#FF4444' };
  if (score >= 1000) return { text: 'وحش 💪', color: '#8B0000', glow: '#CC0000' };
  return null;
}

export default function ScoreBar({ team1, team2, currentTeam, onAdjust, onBack, modalOpen }) {

  return (
    <>
      <style>{`
        @keyframes activeCardGlowRed {
          0%,100% { box-shadow: 0 0 0 2.5px #CC0000, 0 4px 24px rgba(204,0,0,0.35); }
          50%      { box-shadow: 0 0 0 3px #FF2222, 0 6px 32px rgba(255,0,0,0.5); }
        }
        @keyframes activeCardGlowBlue {
          0%,100% { box-shadow: 0 0 0 2.5px #1a6fff, 0 4px 24px rgba(30,100,255,0.35); }
          50%      { box-shadow: 0 0 0 3px #4488ff, 0 6px 32px rgba(60,130,255,0.5); }
        }
        @keyframes shimmerBarRed {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes shimmerBarBlue {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes screenShake {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          7%      { transform: translate(-12px,-6px) rotate(-2deg); }
          14%     { transform: translate(12px,6px) rotate(2deg); }
          21%     { transform: translate(-12px,6px) rotate(-1.5deg); }
          28%     { transform: translate(12px,-6px) rotate(1.5deg); }
          35%     { transform: translate(-10px,4px) rotate(-1deg); }
          42%     { transform: translate(10px,-4px) rotate(1deg); }
          50%     { transform: translate(-8px,4px) rotate(-1deg); }
          57%     { transform: translate(8px,-3px) rotate(0.5deg); }
          64%     { transform: translate(-5px,3px) rotate(-0.5deg); }
          71%     { transform: translate(5px,-2px) rotate(0.5deg); }
          85%     { transform: translate(-2px,2px) rotate(-0.2deg); }
          92%     { transform: translate(2px,-1px) rotate(0deg); }
        }
        .screen-shake { animation: screenShake 1.5s ease !important; }
      `}</style>

      <div
        dir="rtl"
        className="relative flex items-center justify-between gap-3 px-3 overflow-hidden"
        style={{
          paddingTop: 'max(10px, env(safe-area-inset-top))',
          paddingBottom: 10,
          background: 'transparent',
          zIndex: 20,
        }}
      >
        <div className="relative z-10 flex items-center justify-between gap-3 w-full">
          <TeamScore teamNum={1} name={team1.name} score={team1.score} isActive={currentTeam === 1} scoreKey={team1.scoreKey} onAdjust={d => onAdjust(1, d)} align="right" modalOpen={modalOpen} />

          {/* Centre */}
          <div className="flex flex-col items-center shrink-0 gap-0.5">
            <div className="relative">
              <Trophy className="w-6 h-6" style={{ color: '#FF4444', filter: 'drop-shadow(0 0 6px #FF0000)' }} />
              <span className="absolute -top-1 -right-1 text-xs">💀</span>
            </div>
            <span className="text-[10px] font-cairo font-black tracking-widest" style={{ color: '#FF4444', textShadow: '0 0 6px #FF0000' }}>من الوحش</span>
            <PayPalDonateButton />
            <div className="flex gap-1 mt-0.5">
              <button onClick={onBack} className="w-6 h-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <TeamScore teamNum={2} name={team2.name} score={team2.score} isActive={currentTeam === 2} scoreKey={team2.scoreKey} onAdjust={d => onAdjust(2, d)} align="left" reverse modalOpen={modalOpen} />
        </div>
      </div>
    </>
  );
}

function TeamScore({ teamNum, name, score, isActive, scoreKey, reverse, onAdjust, align, modalOpen }) {
  const [shaking, setShaking] = useState(false);
  const [blastScore, setBlastScore] = useState(null);
  const [blastBadge, setBlastBadge] = useState(null);
  const prevScoreRef = useRef(score);
  const pendingShakeRef = useRef(null);

  const isRed = teamNum === 1;
  const C = isRed
    ? { primary: '#CC0000', bright: '#FF2222', dark: '#8B0000', glow: 'rgba(204,0,0,0.35)', shimmer: 'linear-gradient(90deg, #8B0000, #FF0000, #CC0000, #FF0000, #8B0000)', cardGlowAnim: 'activeCardGlowRed', shimmerAnim: 'shimmerBarRed' }
    : { primary: '#1a6fff', bright: '#4488ff', dark: '#0044cc', glow: 'rgba(30,100,255,0.35)', shimmer: 'linear-gradient(90deg, #0033aa, #4488ff, #1a6fff, #4488ff, #0033aa)', cardGlowAnim: 'activeCardGlowBlue', shimmerAnim: 'shimmerBarBlue' };

  const badge = getBadge(score);

  useEffect(() => {
    const prev = prevScoreRef.current;
    const hitMilestone = MILESTONES.some(m => prev < m && score >= m);
    if (hitMilestone) {
      pendingShakeRef.current = { score, badge: getBadge(score) };
    }
    prevScoreRef.current = score;
  }, [score]);

  useEffect(() => {
    if (modalOpen) return;
    if (!pendingShakeRef.current) return;

    const { score: blastScoreVal, badge: newBadge } = pendingShakeRef.current;
    pendingShakeRef.current = null;

    setShaking(true);
    setBlastScore(blastScoreVal);
    // Apply shake to body instead of html to avoid breaking fixed-position children
    document.body.classList.add('screen-shake');

    setTimeout(() => {
      setBlastScore(null);
      if (newBadge) setBlastBadge(newBadge);
    }, 800);

    setTimeout(() => {
      setBlastBadge(null);
      document.body.classList.remove('screen-shake');
      setShaking(false);
    }, 2800);
  }, [modalOpen]);

  // Portals render directly in document.body — unaffected by any ancestor transforms
  const scoreBlastPortal = blastScore !== null ? createPortal(
    <AnimatePresence>
      <motion.div
        key="score-blast"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', pointerEvents: 'none',
        }}
      >
        <motion.span
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: [0.2, 1.4, 1.1], opacity: [0, 1, 1] }}
          exit={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.6, times: [0, 0.5, 1] }}
          style={{
            fontFamily: 'var(--font-cairo)', fontWeight: 900,
            fontSize: 'clamp(80px, 22vw, 240px)',
            color: '#ffffff',
            textShadow: `0 0 60px ${C.primary}, 0 0 120px ${C.bright}`,
            lineHeight: 1,
          }}
        >
          {blastScore}
        </motion.span>
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  const badgeBlastPortal = blastBadge !== null ? createPortal(
    <AnimatePresence>
      <motion.div
        key="badge-blast"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.4 } }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)', pointerEvents: 'none',
        }}
      >
        <motion.span
          initial={{ scale: 0.1, opacity: 0, rotate: -20 }}
          animate={{
            scale:  [0.1, 1.5, 1.1, 1.25, 0.95, 1.15, 1.0, 1.1, 1.0],
            opacity:[0,   1,   1,   1,    1,    1,    1,   1,   1  ],
            rotate: [-20, 8,   -5,  6,    -4,   5,    -3,  3,   0  ],
            y:      [0,   0,  -25,  0,   -18,   0,   -12,  0,   0  ],
          }}
          exit={{ scale: 2.2, opacity: 0, transition: { duration: 0.35 } }}
          transition={{ duration: 2, times: [0, 0.12, 0.28, 0.42, 0.56, 0.68, 0.80, 0.90, 1.0], ease: 'easeInOut' }}
          style={{
            fontFamily: 'var(--font-cairo)', fontWeight: 900,
            fontSize: 'clamp(56px, 14vw, 140px)',
            color: blastBadge.color,
            textShadow: `0 0 40px ${blastBadge.glow}, 0 0 80px ${blastBadge.glow}88, 0 0 120px ${blastBadge.glow}44`,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
        >
          {blastBadge.text}
        </motion.span>
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <>
      {scoreBlastPortal}
      {badgeBlastPortal}

      {/* Score card */}
      <motion.div
        layout
        animate={shaking ? { x: [0, -14, 14, -12, 12, -8, 8, -4, 4, 0] } : {}}
        transition={shaking ? { duration: 1.5, ease: 'easeInOut' } : {}}
        className="flex-1 max-w-[330px] rounded-2xl overflow-hidden"
        style={
          isActive
            ? { background: '#ffffff', animation: `${C.cardGlowAnim} 1.6s ease-in-out infinite` }
            : { background: '#ffffff', boxShadow: '0 2px 12px rgba(0,0,0,0.45)' }
        }
      >
        {/* Top accent bar */}
        <div style={{
          height: 5,
          backgroundImage: isActive ? C.shimmer : 'none',
          backgroundColor: isActive ? 'transparent' : '#e5e5e5',
          backgroundSize: isActive ? '300% 100%' : 'auto',
          animation: isActive ? `${C.shimmerAnim} 2.5s linear infinite` : 'none',
        }} />

        <div className={`px-3 py-2 ${align === 'left' ? 'text-left' : 'text-right'}`}>
          <p className="text-[11px] font-cairo font-bold truncate" style={{ color: isActive ? C.dark : '#555' }}>
            {name}
            {isActive && <span className="text-[9px] mr-1" style={{ color: C.primary }}>● دورهم</span>}
          </p>

          <div className={`flex items-center gap-2 mt-0.5 ${reverse ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className={`flex-1 flex items-center gap-2 ${align === 'left' ? 'flex-row' : 'flex-row-reverse'}`}>
              <motion.p
                key={scoreKey}
                className="text-4xl md:text-5xl font-cairo font-black leading-none"
                style={{ color: isActive ? C.dark : '#1a1a1a' }}
                initial={{ scale: 1.3, color: C.primary }}
                animate={{ scale: 1, color: isActive ? C.dark : '#1a1a1a' }}
                transition={{ type: 'spring', stiffness: 350 }}
              >
                {score}
              </motion.p>

              <AnimatePresence mode="wait">
                {badge && (
                  <motion.span
                    key={badge.text}
                    initial={{ scale: 0, opacity: 0, rotate: -15 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                    style={{
                      fontSize: 22, fontFamily: 'var(--font-cairo)', fontWeight: 900,
                      color: badge.color,
                      textShadow: `0 0 8px ${badge.glow}55`,
                      whiteSpace: 'nowrap', lineHeight: 1,
                    }}
                  >
                    {badge.text}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => onAdjust(100)} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold shadow-sm"
                style={{ background: '#22c55e', color: '#fff' }}>
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onAdjust(-100)} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold shadow-sm"
                style={{ background: C.primary, color: '#fff' }}>
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
