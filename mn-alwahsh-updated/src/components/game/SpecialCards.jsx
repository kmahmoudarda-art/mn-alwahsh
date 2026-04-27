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
        {
          transform: 'translate(-50%, -50%) scale(0.3) rotate(0deg)',
          opacity: '0',
        },
        {
          transform: `translate(calc(-50% + ${tx * 0.3}px), calc(-50% + ${ty * 0.3}px)) scale(1.2) rotate(${rotation * 0.3}deg)`,
          opacity: '1',
          offset: 0.2,
        },
        {
          transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0.5) rotate(${rotation}deg)`,
          opacity: '0',
        },
      ],
      {
        duration: duration * 1000,
        delay: delay * 1000,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'forwards',
      }
    ).onfinish = () => star.remove();
  }

  // Trailing stream
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
          {
            transform: 'translate(-50%, -50%) scale(0)',
            opacity: '0',
          },
          {
            transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`,
            opacity: '0',
          },
        ],
        {
          duration: duration * 1000,
          delay: delay * 1000,
          easing: 'ease-out',
          fill: 'forwards',
        }
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
      // 10% chance — DOUBLE LUCK
      const btn = doubleLuckBtnRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;

        // Button animation
        btn.style.animation = 'doublePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        btn.style.boxShadow = '0 0 0 0 rgba(201,168,76,0.8)';
        btn.animate(
          [
            {
              boxShadow: '0 0 0 0 rgba(201,168,76,0.8)',
              opacity: '1',
            },
            {
              boxShadow: '0 0 0 30px rgba(201,168,76,0)',
              opacity: '0',
            },
          ],
          {
            duration: 500,
            easing: 'ease-out',
            fill: 'forwards',
          }
        );

        // Screen flash
        const flash = document.createElement('div');
        flash.style.cssText = `
          position: fixed;
          inset: 0;
          background: rgba(201,168,76,0.12);
          pointer-events: none;
          z-index: 99998;
        `;
        document.body.appendChild(flash);
        flash.animate(
          [{ opacity: '1' }, { opacity: '0' }],
          { duration: 400, easing: 'ease-out', fill: 'forwards' }
        ).onfinish = () => flash.remove();

        // Star burst
        spawnStarBurst(originX, originY);
      }

      setIsDoubleLuck(true);
      setShowDoubleLuckPopup(true);

      // Confetti burst
      confetti({
        particleCount: 20,
        spread: 100,
        origin: { y: 0.5, x: 0.5 },
        colors: ['#c9a84c', '#e8c97a', '#d4af37'],
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
        // Apply double luck: gains are doubled, losses are halved
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

  return (
    <>
      <style>{`
        @keyframes doublePop {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.25) rotate(-3deg); }
          60%  { transform: scale(0.95) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
      <div className="flex items-center justify-center gap-2 px-4 pb-2 flex-wrap" dir="rtl">
        {/* Team 1 cards */}
        <div className="flex gap-1">
          <button
            ref={doubleLuckBtnRef}
            onClick={() => handleLucky(1)}
            disabled={team1UsedLucky || spinning}
            className={`text-xs font-cairo px-2 py-1 rounded-lg border transition-all ${
              team1UsedLucky
                ? 'opacity-30 line-through border-border text-muted-foreground cursor-not-allowed'
                : 'border-yellow-400 text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 cursor-pointer'
            }`}
            title="بطاقة الحظ - تسرق نقاط أو تخسر"
          >
            🃏 حظ
          </button>
        <button
          onClick={() => onQuickTimer(1)}
          disabled={team1UsedQuick}
          className={`text-xs font-cairo px-2 py-1 rounded-lg border transition-all ${
            team1UsedQuick
              ? 'opacity-30 line-through border-border text-muted-foreground cursor-not-allowed'
              : 'border-red-400 text-red-400 bg-red-400/10 hover:bg-red-400/20 cursor-pointer'
          }`}
          title="ضغط الوقت - يجعل السؤال 15 ثانية"
        >
          ⏱️ 15ث
        </button>
      </div>

      <span className="text-muted-foreground text-xs font-tajawal">vs</span>

        {/* Team 2 cards */}
        <div className="flex gap-1">
          <button
            onClick={() => handleLucky(2)}
            disabled={team2UsedLucky || spinning}
            className={`text-xs font-cairo px-2 py-1 rounded-lg border transition-all ${
              team2UsedLucky
                ? 'opacity-30 line-through border-border text-muted-foreground cursor-not-allowed'
                : 'border-yellow-400 text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 cursor-pointer'
            }`}
            title="بطاقة الحظ - تسرق نقاط أو تخسر"
          >
            🃏 حظ
          </button>
        <button
          onClick={() => onQuickTimer(2)}
          disabled={team2UsedQuick}
          className={`text-xs font-cairo px-2 py-1 rounded-lg border transition-all ${
            team2UsedQuick
              ? 'opacity-30 line-through border-border text-muted-foreground cursor-not-allowed'
              : 'border-red-400 text-red-400 bg-red-400/10 hover:bg-red-400/20 cursor-pointer'
          }`}
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
            style={{ background: 'rgba(0, 0, 0, 0.75)' }}
          >
            <style>{`
              @keyframes spinCoin {
                0%   { transform: rotateY(0deg) scale(1); }
                50%  { transform: rotateY(180deg) scale(1.3); }
                100% { transform: rotateY(360deg) scale(1); }
              }
              @keyframes goldShimmer {
                0%   { box-shadow: 0 0 10px #c9a84c, 0 0 20px rgba(201,168,76,0.3); }
                50%  { box-shadow: 0 0 25px #c9a84c, 0 0 60px rgba(201,168,76,0.5), 0 0 100px rgba(201,168,76,0.2); }
                100% { box-shadow: 0 0 10px #c9a84c, 0 0 20px rgba(201,168,76,0.3); }
              }
            `}</style>
            
            <motion.div
              initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: -10, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                background: 'linear-gradient(135deg, #1a1200, #2d1f00)',
                border: '2px solid #c9a84c',
                borderRadius: '24px',
                padding: '50px 60px',
                textAlign: 'center',
                maxWidth: '400px',
                animation: 'goldShimmer 1s ease infinite',
              }}
            >
              <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '16px', animation: 'spinCoin 0.8s ease infinite' }}>
                🪙
              </div>
              <div
                style={{
                  fontSize: '34px',
                  fontWeight: 'bold',
                  fontFamily: 'var(--font-tajawal)',
                  marginBottom: '12px',
                  background: 'linear-gradient(135deg, #c9a84c, #e8c97a, #c9a84c)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                حظ مضاعف!
              </div>
              <div style={{ fontSize: '18px', color: '#e8c97a', fontFamily: 'var(--font-tajawal)', marginBottom: '12px', fontWeight: 'bold' }}>
                ×2 النقاط مضاعفة!
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,200,100,0.6)', fontFamily: 'var(--font-tajawal)' }}>
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
            <div className="bg-card border-2 border-primary rounded-2xl px-8 py-6 shadow-2xl text-center">
              {spinning ? (
                <p className="text-2xl font-cairo font-black text-primary animate-pulse">🎲 يتم السحب...</p>
              ) : luckyResult ? (
                <>
                  <p className={`text-3xl font-cairo font-black mb-2 ${luckyResult.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {luckyResult.label}
                  </p>
                  <p className="text-sm font-tajawal text-muted-foreground">
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