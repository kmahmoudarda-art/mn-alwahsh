import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const LUCKY_OUTCOMES = [
  { delta:  300, label: '🎉 ربحت 300 نقطة!' },
  { delta:  250, label: '🎉 ربحت 250 نقطة!' },
  { delta:  200, label: '🎉 ربحت 200 نقطة!' },
  { delta:  100, label: '🎉 ربحت 100 نقطة!' },
  { delta:  100, label: '🎉 ربحت 100 نقطة!', cancelOpponentLucky: true },
  { delta:  100, label: '🎉 ربحت 100 نقطة!', cancelOpponentTimer: true },
  { delta:  250, label: '🎉 ربحت 250 نقطة!', extraLucky: true },
  { delta: -250, label: '💀 خسرت 250 نقطة!' },
  { delta: -200, label: '💀 خسرت 200 نقطة!' },
  { delta: -100, label: '💀 خسرت 100 نقطة!', cancelSelfTimer: true },
];

function spawnStarBurst(originX, originY) {
  const stars = ['⭐', '🌟', '✨', '💫', '⚡'];
  const count = 40;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.innerText = stars[Math.floor(Math.random() * stars.length)];
    star.style.cssText = `position:fixed;left:${originX}px;top:${originY}px;font-size:${12 + Math.random() * 24}px;pointer-events:none;z-index:99999;transform:translate(-50%,-50%);transition:none;`;
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
        { transform: 'translate(-50%,-50%) scale(0.3) rotate(0deg)', opacity: '0' },
        { transform: `translate(calc(-50% + ${tx * 0.3}px),calc(-50% + ${ty * 0.3}px)) scale(1.2) rotate(${rotation * 0.3}deg)`, opacity: '1', offset: 0.2 },
        { transform: `translate(calc(-50% + ${tx}px),calc(-50% + ${ty}px)) scale(0.5) rotate(${rotation}deg)`, opacity: '0' },
      ],
      { duration: duration * 1000, delay: delay * 1000, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)', fill: 'forwards' }
    ).onfinish = () => star.remove();
  }
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
  const [luckyPending, setLuckyPending] = useState(false); // true from first tap until all popups finish
  const [showSpinner, setShowSpinner] = useState(false);
  const [showDoubleLuckPopup, setShowDoubleLuckPopup] = useState(false);
  const [specialAnnouncement, setSpecialAnnouncement] = useState(null);
  const doubleLuckBtnRef = useRef(null);

  const team1UsedLucky = usedLucky[1];
  const team2UsedLucky = usedLucky[2];
  const team1UsedQuick = usedQuickTimer[1];
  const team2UsedQuick = usedQuickTimer[2];

  const handleLucky = (teamNum) => {
    if (luckyPending) return;
    setLuckyPending(true); // lock immediately — prevents double-tap during any delay

    const isDoubleLuck = Math.random() < 0.05;

    if (isDoubleLuck) {
      const btn = doubleLuckBtnRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        spawnStarBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        btn.animate(
          [
            { boxShadow: '0 0 0 0 rgba(204,0,0,0.8)' },
            { boxShadow: '0 0 0 30px rgba(204,0,0,0)' },
          ],
          { duration: 500, easing: 'ease-out', fill: 'none' }
        );
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;inset:0;background:rgba(139,0,0,0.18);pointer-events:none;z-index:99998;';
        document.body.appendChild(flash);
        flash.animate([{ opacity: '1' }, { opacity: '0' }], { duration: 400, easing: 'ease-out', fill: 'forwards' }).onfinish = () => flash.remove();
      }
      confetti({ particleCount: 20, spread: 100, origin: { y: 0.5, x: 0.5 }, colors: ['#CC0000', '#FF0000', '#8B0000'] });
      setShowDoubleLuckPopup(true);
      setTimeout(() => {
        setShowDoubleLuckPopup(false);
        spinLucky(teamNum, true);
      }, 3000);
    } else {
      spinLucky(teamNum, false);
    }
  };

  const spinLucky = (teamNum, isDouble) => {
    setShowSpinner(true);
    setTimeout(() => {
      setShowSpinner(false);
      const opponent = teamNum === 1 ? 2 : 1;

      // 1% jackpot chance
      let base;
      if (Math.random() < 0.01) {
        base = { delta: 500, label: '🏆 جاكبوت! ربحت 500 نقطة!' };
      } else {
        const idx = Math.floor(Math.random() * 10);
        base = { ...LUCKY_OUTCOMES[idx] };
      }

      // If cancelOpponentLucky but opponent already used theirs → strip the effect
      if (base.cancelOpponentLucky && usedLucky[opponent]) {
        base = { ...base, cancelOpponentLucky: false, label: '🎉 ربحت 100 نقطة! (الخصم لم يبقَ له بطاقة حظ)' };
      }

      let finalDelta = base.delta;
      let displayLabel = base.label;

      if (isDouble) {
        if (finalDelta > 0) {
          finalDelta = finalDelta * 2;
          displayLabel = displayLabel.replace('نقطة', `نقطة (×2 = ${finalDelta})`);
        } else {
          finalDelta = Math.round(finalDelta / 2);
          displayLabel = displayLabel.replace('نقطة', `نقطة (÷2 = ${Math.abs(finalDelta)})`);
        }
      }

      const effects = {
        extraLucky:           !!base.extraLucky,
        cancelOpponentLucky:  !!base.cancelOpponentLucky,
        cancelOpponentTimer:  !!base.cancelOpponentTimer,
        cancelSelfTimer:      !!base.cancelSelfTimer,
        wasDouble:            isDouble,
      };

      const extraLines = [];
      if (base.cancelOpponentLucky && !usedLucky[opponent]) extraLines.push('🚫 بطاقة حظ الخصم أُلغيت!');
      if (base.cancelOpponentTimer)                          extraLines.push('🚫 ضغط الوقت للخصم أُلغي!');
      if (base.extraLucky)                                   extraLines.push('🔄 حصلت على فرصة حظ إضافية!');
      if (base.cancelSelfTimer)                              extraLines.push('⏱️ فقدت خيار ضغط الوقت!');

      setLuckyResult({ teamNum, label: displayLabel, delta: finalDelta, extraLines });
      onLuckyResult(teamNum, finalDelta, effects);

      // Special full-screen announcement for impactful effects
      if (extraLines.length > 0) {
        setSpecialAnnouncement({
          lines: extraLines,
          teamNum,
          teamName: teamNum === 1 ? team1.name : team2.name,
          isPositive: finalDelta > 0,
        });
      }

      // Clear everything together, then unlock the button
      const displayDuration = extraLines.length > 0 ? 4000 : 3000;
      setTimeout(() => {
        setLuckyResult(null);
        setSpecialAnnouncement(null);
        setLuckyPending(false); // unlock AFTER all popups are gone
      }, displayDuration);
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
        @keyframes specialPulse {
          0%,100% { box-shadow: 0 0 20px rgba(255,180,0,0.5); }
          50%      { box-shadow: 0 0 50px rgba(255,220,0,0.9); }
        }
        .special-btn { transition: transform 0.12s, box-shadow 0.12s; }
        .special-btn:not(:disabled):hover { transform: scale(1.08); }
        .special-btn:not(:disabled):active { transform: scale(0.95); }
      `}</style>

      <div className="flex items-center justify-center gap-3 px-4 pb-2 flex-wrap" dir="rtl" style={{ position: 'relative', zIndex: 25 }}>
        {/* Team 1 — red */}
        <div className="flex gap-2">
          <button
            ref={doubleLuckBtnRef}
            onClick={() => handleLucky(1)}
            disabled={team1UsedLucky || luckyPending}
            className="special-btn font-cairo px-3 py-1.5 rounded-xl"
            style={(team1UsedLucky || luckyPending) ? btnUsed : btnActive(true)}
            title="بطاقة الحظ"
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

        {/* Team 2 — blue */}
        <div className="flex gap-2">
          <button
            onClick={() => handleLucky(2)}
            disabled={team2UsedLucky || luckyPending}
            className="special-btn font-cairo px-3 py-1.5 rounded-xl"
            style={(team2UsedLucky || luckyPending) ? btnUsed : btnActive(false)}
            title="بطاقة الحظ"
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
      </div>

      {/* Double Luck Popup */}
      <AnimatePresence>
        {showDoubleLuckPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.85)' }}
          >
            <style>{`
              @keyframes spinCoin { 0% { transform: rotateY(0deg) scale(1); } 50% { transform: rotateY(180deg) scale(1.3); } 100% { transform: rotateY(360deg) scale(1); } }
              @keyframes redShimmer { 0%,100% { box-shadow: 0 0 10px #8B0000, 0 0 20px rgba(139,0,0,0.4); } 50% { box-shadow: 0 0 30px #CC0000, 0 0 70px rgba(204,0,0,0.6); } }
            `}</style>
            <motion.div
              initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: -10, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ background: 'linear-gradient(135deg, #1a0000, #0d0000)', border: '2px solid #CC0000', borderRadius: 24, padding: '50px 60px', textAlign: 'center', maxWidth: 400, animation: 'redShimmer 1s ease infinite' }}
            >
              <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16, animation: 'spinCoin 0.8s ease infinite' }}>💀</div>
              <div style={{ fontSize: 34, fontWeight: 'bold', fontFamily: 'var(--font-tajawal)', marginBottom: 12, color: '#FF0000', textShadow: '0 0 20px rgba(255,0,0,0.9)' }}>
                حظ مضاعف!
              </div>
              <div style={{ fontSize: 18, color: '#FF6666', fontFamily: 'var(--font-tajawal)', marginBottom: 12, fontWeight: 'bold' }}>
                ×2 الربح — ÷2 الخسارة!
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,100,100,0.6)', fontFamily: 'var(--font-tajawal)' }}>
                فرصة نادرة 5٪ ⭐
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spin / Result popup */}
      <AnimatePresence>
        {(showSpinner || luckyResult) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          >
            <div
              className="rounded-2xl px-8 py-6 shadow-2xl text-center"
              style={{ background: '#1a0000', border: '2px solid #CC0000', boxShadow: '0 0 30px rgba(204,0,0,0.5)', maxWidth: 340 }}
            >
              {showSpinner ? (
                <p className="text-2xl font-cairo font-black animate-pulse" style={{ color: '#CC0000', textShadow: '0 0 10px rgba(255,0,0,0.8)' }}>🎲 يتم السحب...</p>
              ) : luckyResult ? (
                <>
                  <p
                    className="text-2xl font-cairo font-black mb-1"
                    style={luckyResult.delta <= 0 ? { color: '#FF0000', textShadow: '0 0 10px rgba(255,0,0,0.8)' } : { color: '#4ade80' }}
                  >
                    {luckyResult.label}
                  </p>
                  {luckyResult.extraLines?.map((line, i) => (
                    <p key={i} className="font-cairo font-black mt-1" style={{ fontSize: 15, color: '#FFD700', textShadow: '0 0 8px rgba(255,200,0,0.7)' }}>
                      {line}
                    </p>
                  ))}
                  <p className="text-sm font-tajawal mt-2" style={{ color: '#FF6666' }}>
                    {luckyResult.teamNum === 1 ? team1?.name : team2?.name}
                  </p>
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Special Effect Full-Screen Announcement */}
      <AnimatePresence>
        {specialAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.6, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              style={{
                background: specialAnnouncement.isPositive
                  ? 'linear-gradient(135deg, #0a1a00, #0d2a00)'
                  : 'linear-gradient(135deg, #1a0000, #0d0000)',
                border: `2px solid ${specialAnnouncement.isPositive ? '#22c55e' : '#CC0000'}`,
                borderRadius: 24,
                padding: '40px 48px',
                textAlign: 'center',
                maxWidth: 420,
                animation: 'specialPulse 1.2s ease-in-out infinite',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>
                {specialAnnouncement.isPositive ? '🎊' : '💀'}
              </div>
              <p style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 20, color: specialAnnouncement.isPositive ? '#4ade80' : '#FF4444', marginBottom: 16 }}>
                {specialAnnouncement.teamName}
              </p>
              {specialAnnouncement.lines.map((line, i) => (
                <p key={i} style={{ fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 18, color: '#FFD700', textShadow: '0 0 12px rgba(255,200,0,0.8)', marginBottom: 8, lineHeight: 1.4 }}>
                  {line}
                </p>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
