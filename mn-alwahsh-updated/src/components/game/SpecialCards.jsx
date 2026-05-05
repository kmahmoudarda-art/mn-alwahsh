import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const LUCKY_OUTCOMES = [
  { label: '🎉 سرقت 100 نقطة!', delta: 100 },
  { label: '🎉 سرقت 150 نقطة!', delta: 150 },
  { label: '🎉 سرقت 200 نقطة!', delta: 200 },
  { label: '💀 خسرت 300 نقطة!', delta: -300 },
];

function spawnStarBurst(originX, originY) {
  const stars = ['⭐', '🌟', '✨', '💫', '⚡'];
  const count = 40;

  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.innerText = stars[Math.floor(Math.random() * stars.length)];

    star.style.cssText = `
      position: fixed;
      left: ${originX}px;
      top: ${originY}px;
      font-size: ${12 + Math.random() * 24}px;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-50%, -50%);
      transition: none;
    `;
    document.body.appendChild(star);

    const angle = Math.random() * 160 - 80;
    const distance = 200 + Math.random() * 400;
    const rad = (angle - 90) * (Math.PI / 180);
    const tx = Math.cos(rad) * distance;
    const ty = Math.sin(rad) * distance;
    const duration = 0.8 + Math.random() * 0.8;
    const delay = Math.random() * 0.3;
    const rotation = (Math.random() - 0.5) * 720;

    star.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.3) rotate(0deg)', opacity: '0' },
        { transform: `translate(calc(-50% + ${tx * 0.3}px), calc(-50% + ${ty * 0.3}px)) scale(1.2) rotate(${rotation * 0.3}deg)`, opacity: '1', offset: 0.2 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0.5) rotate(${rotation}deg)`, opacity: '0' },
      ],
      { duration: duration * 1000, delay: delay * 1000, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', fill: 'forwards' }
    ).onfinish = () => star.remove();
  }

  setTimeout(() => {
    const streamStars = ['✨', '💫', '⭐'];
    for (let i = 0; i < 20; i++) {
      const star = document.createElement('div');
      star.innerText = streamStars[Math.floor(Math.random() * 3)];

      const tx = (Math.random() - 0.5) * 100;
      const ty = -(300 + Math.random() * 300);
      const duration = 0.6 + Math.random() * 0.6;
      const delay = i * 0.04;

      star.style.cssText = `
        position: fixed;
        left: ${originX}px;
        top: ${originY}px;
        font-size: ${8 + Math.random() * 14}px;
        pointer-events: none;
        z-index: 99999;
        transform: translate(-50%, -50%);
      `;
      document.body.appendChild(star);

      star.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0)', opacity: '0' },
          { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`, opacity: '0' },
        ],
        { duration: duration * 1000, delay: delay * 1000, easing: 'ease-out', fill: 'forwards' }
      ).onfinish = () => star.remove();
    }
  }, 150);
}

export default function SpecialCards({
  team1,
  team2,
  currentTeam,
  usedLucky,
  usedQuickTimer,
  onLuckyResult,
  onQuickTimer,
}) {
  const [luckyResult, setLuckyResult] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [isDoubleLuck, setIsDoubleLuck] = useState(false);
  const [showDoubleLuckPopup, setShowDoubleLuckPopup] = useState(false);
  const doubleLuckBtnRef = useRef(null);

  const team1UsedLucky = usedLucky[1];
  const team2UsedLucky = usedLucky[2];
  const team1UsedQuick = usedQuickTimer[1];
  const team2UsedQuick = usedQuickTimer[2];

  const handleLucky = (teamNum) => {
    const luckRoll = Math.random() * 100;

    if (luckRoll < 10) {
      const btn = doubleLuckBtnRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;

        btn.style.animation = 'doublePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        btn.animate(
          [
            { boxShadow: '0 0 0 0 rgba(204,0,0,0.8)', opacity: '1' },
            { boxShadow: '0 0 0 30px rgba(204,0,0,0)', opacity: '0' },
          ],
          { duration: 500, easing: 'ease-out', fill: 'forwards' }
        );

        const flash = document.createElement('div');
        flash.style.cssText = `
          position: fixed;
          inset: 0;
          background: rgba(139,0,0,0.18);
          pointer-events: none;
          z-index: 99998;
        `;
        document.body.appendChild(flash);
        flash.animate(
          [{ opacity: '1' }, { opacity: '0' }],
          { duration: 400, easing: 'ease-out', fill: 'forwards' }
        ).onfinish = () => flash.remove();

        spawnStarBurst(originX, originY);
      }

      setIsDoubleLuck(true);
      setShowDoubleLuckPopup(true);

      confetti({
        particleCount: 20,
        spread: 100,
        origin: { y: 0.5, x: 0.5 },
        colors: ['#CC0000', '#FF0000', '#8B0000'],
      });

      setTimeout(() => {
        setShowDoubleLuckPopup(false);
        spinLucky(teamNum, true);
      }, 3000);
    } else {
      spinLucky(teamNum, false);
    }
  };

  const spinLucky = (teamNum, doubleLuck) => {
    setSpinning(true);
    setTimeout(() => {
      let outcome = LUCKY_OUTCOMES[Math.floor(Math.random() * 4)];

      if (doubleLuck) {
        if (outcome.delta > 0) {
          outcome = { ...outcome, delta: outcome.delta * 2, label: outcome.label + ' (×2)' };
        } else {
          outcome = { ...outcome, delta: outcome.delta / 2, label: outcome.label + ' (÷2)' };
        }
      }

      setLuckyResult({ teamNum, ...outcome });
      onLuckyResult(teamNum, outcome.delta);
      setSpinning(false);
      setIsDoubleLuck(false);

      setTimeout(() => setLuckyResult(null), 2500);
    }, 800);
  };

  const btnActive = (isRed) => ({
    border: isRed ? '2px solid #FF4444' : '2px solid #4499ff',
    color: '#ffffff',
    background: isRed
      ? 'linear-gradient(135deg, rgba(180,0,0,0.95), rgba(120,0,0,0.95))'
      : 'linear-gradient(135deg, rgba(20,80,220,0.95), rgba(10,50,160,0.95))',
    boxShadow: isRed
      ? '0 0 12px rgba(220,0,0,0.7), 0 2px 8px rgba(0,0,0,0.6)'
      : '0 0 12px rgba(30,100,255,0.7), 0 2px 8px rgba(0,0,0,0.6)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
  });
  const btnUsed = {
    opacity: 0.25,
    textDecoration: 'line-through',
    border: '2px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.3)',
    background: 'rgba(0,0,0,0.3)',
    cursor: 'not-allowed',
    fontWeight: 700,
    fontSize: 13,
  };

  return (
    <>
      <style>{`
        @keyframes doublePop {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.25) rotate(-3deg); }
          60%  { transform: scale(0.95) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .special-btn { transition: transform 0.12s, box-shadow 0.12s; }
        .special-btn:not(:disabled):hover { transform: scale(1.08); }
        .special-btn:not(:disabled):active { transform: scale(0.95); }
      `}</style>
      <div className="flex items-center justify-center gap-3 px-4 pb-2 flex-wrap" dir="rtl" style={{ position: 'relative', zIndex: 25 }}>
        {/* Team 1 cards — red */}
        <div className="flex gap-2">
          <button
            ref={doubleLuckBtnRef}
            onClick={() => handleLucky(1)}
            disabled={team1UsedLucky || spinning}
            className="special-btn font-cairo px-3 py-1.5 rounded-xl"
            style={team1UsedLucky ? btnUsed : btnActive(true)}
            title="بطاقة الحظ - تسرق نقاط أو تخسر"
          >
            🃏 حظ
          </button>
          <button
            onClick={() => onQuickTimer(1)}
            disabled={team1UsedQuick}
            className="special-btn font-cairo px-3 py-1.5 rounded-xl"
            style={team1UsedQuick ? btnUsed : btnActive(true)}
            title="ضغط الوقت - يجعل السؤال 15 ثانية"
          >
            ⏱️ 15ث
          </button>
        </div>

        <span className="font-cairo font-black text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>⚔️</span>

        {/* Team 2 cards — blue */}
        <div className="flex gap-2">
          <button
            onClick={() => handleLucky(2)}
            disabled={team2UsedLucky || spinning}
            className="special-btn font-cairo px-3 py-1.5 rounded-xl"
            style={team2UsedLucky ? btnUsed : btnActive(false)}
            title="بطاقة الحظ - تسرق نقاط أو تخسر"
          >
            🃏 حظ
          </button>
          <button
            onClick={() => onQuickTimer(2)}
            disabled={team2UsedQuick}
            className="special-btn font-cairo px-3 py-1.5 rounded-xl"
            style={team2UsedQuick ? btnUsed : btnActive(false)}
            title="ضغط الوقت - يجعل السؤال 15 ثانية"
          >
            ⏱️ 15ث
          </button>
        </div>

        {/* Double Luck Popup */}
        <AnimatePresence>
          {showDoubleLuckPopup && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm"
              style={{ background: 'rgba(0, 0, 0, 0.85)' }}
            >
              <style>{`
                @keyframes spinCoin {
                  0%   { transform: rotateY(0deg) scale(1); }
                  50%  { transform: rotateY(180deg) scale(1.3); }
                  100% { transform: rotateY(360deg) scale(1); }
                }
                @keyframes redShimmer {
                  0%   { box-shadow: 0 0 10px #8B0000, 0 0 20px rgba(139,0,0,0.4); }
                  50%  { box-shadow: 0 0 30px #CC0000, 0 0 70px rgba(204,0,0,0.6); }
                  100% { box-shadow: 0 0 10px #8B0000, 0 0 20px rgba(139,0,0,0.4); }
                }
              `}</style>

              <motion.div
                initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.5, rotate: -10, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                style={{
                  background: 'linear-gradient(135deg, #1a0000, #0d0000)',
                  border: '2px solid #CC0000',
                  borderRadius: '24px',
                  padding: '50px 60px',
                  textAlign: 'center',
                  maxWidth: '400px',
                  animation: 'redShimmer 1s ease infinite',
                }}
              >
                <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '16px', animation: 'spinCoin 0.8s ease infinite' }}>
                  💀
                </div>
                <div
                  style={{
                    fontSize: '34px',
                    fontWeight: 'bold',
                    fontFamily: 'var(--font-tajawal)',
                    marginBottom: '12px',
                    color: '#FF0000',
                    textShadow: '0 0 20px rgba(255,0,0,0.9)',
                  }}
                >
                  حظ مضاعف!
                </div>
                <div style={{ fontSize: '18px', color: '#FF6666', fontFamily: 'var(--font-tajawal)', marginBottom: '12px', fontWeight: 'bold' }}>
                  ×2 النقاط مضاعفة!
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,100,100,0.6)', fontFamily: 'var(--font-tajawal)' }}>
                  تحذير: الخسارة = نصف النقاط ⚠️
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result popup */}
        <AnimatePresence>
          {(spinning || luckyResult) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
            >
              <div
                className="rounded-2xl px-8 py-6 shadow-2xl text-center"
                style={{ background: '#1a0000', border: '2px solid #CC0000', boxShadow: '0 0 30px rgba(204,0,0,0.5)' }}
              >
                {spinning ? (
                  <p className="text-2xl font-cairo font-black animate-pulse" style={{ color: '#CC0000', textShadow: '0 0 10px rgba(255,0,0,0.8)' }}>🎲 يتم السحب...</p>
                ) : luckyResult ? (
                  <>
                    <p className={`text-3xl font-cairo font-black mb-2 ${luckyResult.delta > 0 ? 'text-green-400' : ''}`} style={luckyResult.delta <= 0 ? { color: '#FF0000', textShadow: '0 0 10px rgba(255,0,0,0.8)' } : {}}>
                      {luckyResult.label}
                    </p>
                    <p className="text-sm font-tajawal" style={{ color: '#FF6666' }}>
                      الفريق {luckyResult.teamNum}
                    </p>
                  </>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
