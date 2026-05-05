import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EASY_MESSAGES = [
  { emoji: '😊', main: 'Very Easy!', sub: 'هذا سهل جداً!' },
  { emoji: '🍋', main: 'Easy Peasy!', sub: 'أسهل من الماء!' },
  { emoji: '🤲', main: 'على قد الإيد', sub: 'مش محتاج تفكر!' },
  { emoji: '🎁', main: 'Free Points!', sub: 'نقاط مجانية!' },
];

const MEDIUM_MESSAGES = [
  { emoji: '💪', main: 'Be a Man!', sub: 'وقت تثبت نفسك!' },
  { emoji: '🔥', main: 'This is Hard for You!', sub: 'هذا صعب عليك؟' },
  { emoji: '⚔️', main: 'Fight Harder!', sub: 'حارب أكثر!' },
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const DISPLAY_VALUES = [200, 200, 400, 400, 600, 600];

/*
  All headers share the same warm gold colour.
  Tile rows are coloured by point tier (same across all columns):
    200 → light mint green
    400 → light periwinkle blue
    600 → light lavender
*/
const HEADER_STYLE = {
  background:   '#C8A84B',
  border:       '2px solid #e0c06a',
  color:        '#ffffff',
  boxShadow:    '0 3px 10px rgba(180,140,40,0.35)',
};

const TIER = {
  200: { bg: '#eaf7f0', border: '#a8dbb8', color: '#3a8a58', shadow: 'rgba(168,219,184,0.4)' },
  400: { bg: '#e8eef8', border: '#a8bce0', color: '#3a5fa8', shadow: 'rgba(168,188,224,0.4)' },
  600: { bg: '#f0ecf8', border: '#c0aee0', color: '#6a48a8', shadow: 'rgba(192,174,224,0.4)' },
};

function getColStyle(_colIndex, points) {
  const t = TIER[points] || TIER[200];
  return {
    borderRadius: '14px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.18s ease',
    cursor: 'pointer',
    fontSize: points === 600 ? '22px' : points === 400 ? '20px' : '18px',
    fontWeight: 800,
    background: t.bg,
    border: `2px solid ${t.border}`,
    color: t.color,
    boxShadow: `0 3px 12px ${t.shadow}`,
  };
}

function DangerOverlay() {
  return (
    <>
      <style>{`
        @keyframes dangerPulse {
          0%   { box-shadow: 0 0 10px #8B0000, 0 0 30px rgba(139,0,0,0.4); }
          50%  { box-shadow: 0 0 40px #FF0000, 0 0 80px rgba(255,0,0,0.5); }
          100% { box-shadow: 0 0 10px #8B0000, 0 0 30px rgba(139,0,0,0.4); }
        }
        @keyframes flashRed {
          0%, 100% { opacity: 0; }
          25%, 75%  { opacity: 1; }
        }
        @keyframes pulseSub {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.08); }
        }
      `}</style>
      <div className="fixed inset-0 z-40 pointer-events-none" style={{ background: 'rgba(255,0,0,0.18)', animation: 'flashRed 0.45s ease 3' }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          style={{ background: 'linear-gradient(135deg, #1a0000, #0d0000)', border: '3px solid #CC0000', borderRadius: '20px', padding: '40px 60px', textAlign: 'center', animation: 'dangerPulse 0.5s ease infinite' }}
        >
          <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '12px' }}>💀</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF0000', fontFamily: 'var(--font-cairo)', marginBottom: '8px', textShadow: '0 0 15px rgba(255,0,0,0.8)' }}>سؤال خطر!</div>
          <div style={{ fontSize: '22px', color: '#FFE4E4', fontFamily: 'var(--font-cairo)', fontWeight: 'bold', animation: 'pulseSub 0.6s ease infinite' }}>600 نقطة</div>
        </motion.div>
      </div>
    </>
  );
}

function EscapeOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
        style={{ background: 'linear-gradient(135deg, #1a0500, #0d0000)', border: '3px solid orange', borderRadius: '20px', padding: '40px 60px', textAlign: 'center' }}
      >
        <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '12px' }}>🏃</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'orange', fontFamily: 'var(--font-cairo)', marginBottom: '8px' }}>اهرب يا كبير!</div>
        <div style={{ fontSize: '18px', color: '#FFE4E4', fontFamily: 'var(--font-cairo)', fontWeight: 'bold' }}>سؤال صعب جداً!</div>
      </motion.div>
    </div>
  );
}

function EasyPopup({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ background: 'linear-gradient(135deg, #1a0000, #0d0000)', border: '2px solid rgba(139,0,0,0.8)', borderRadius: '20px', padding: '40px 60px', textAlign: 'center', maxWidth: '380px' }}
      >
        <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '12px' }}>{message.emoji}</div>
        <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#FF6666', fontFamily: 'var(--font-tajawal)', marginBottom: '8px' }}>{message.main}</div>
        <div style={{ fontSize: '16px', color: 'rgba(255,180,180,0.8)', fontFamily: 'var(--font-tajawal)' }}>{message.sub}</div>
      </motion.div>
    </div>
  );
}

function MediumPopup({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ background: 'linear-gradient(135deg, #200000, #0d0000)', border: '2px solid rgba(180,0,0,0.8)', borderRadius: '20px', padding: '40px 60px', textAlign: 'center', maxWidth: '380px' }}
      >
        <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '12px' }}>{message.emoji}</div>
        <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#CC0000', fontFamily: 'var(--font-tajawal)', marginBottom: '8px' }}>{message.main}</div>
        <div style={{ fontSize: '16px', color: 'rgba(255,150,150,0.7)', fontFamily: 'var(--font-tajawal)' }}>{message.sub}</div>
      </motion.div>
    </div>
  );
}

export default function GameBoard({ categories, answeredTiles, onTileClick, teamNames, readyTiles = new Set() }) {
  const [popupType, setPopupType] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [pendingTile, setPendingTile] = useState(null);

  const handleTileClick = (colIndex, rowIndex, cat, points) => {
    let popup = null;
    let message = null;
    if (points === 200 && Math.random() * 100 < 30) { popup = 'easy'; message = randomFrom(EASY_MESSAGES); }
    else if (points === 400 && Math.random() * 100 < 20) { popup = 'medium'; message = randomFrom(MEDIUM_MESSAGES); }
    else if (points === 600) {
      const r = Math.random() * 100;
      if (r < 5) popup = 'escape';
      else if (r < 15) popup = 'danger';
    }

    if (popup) {
      setPendingTile({ colIndex, rowIndex, cat, points });
      setPopupType(popup); setPopupMessage(message);
      setTimeout(() => {
        setPopupType(null); setPopupMessage(null);
        onTileClick(colIndex, rowIndex, cat, points);
        setPendingTile(null);
      }, 2500);
    } else {
      onTileClick(colIndex, rowIndex, cat, points);
    }
  };

  return (
    <>
      <AnimatePresence>
        {popupType === 'danger' && <DangerOverlay />}
        {popupType === 'escape' && <EscapeOverlay />}
        {popupType === 'easy' && popupMessage && <EasyPopup message={popupMessage} />}
        {popupType === 'medium' && popupMessage && <MediumPopup message={popupMessage} />}
      </AnimatePresence>

      <div className="gb-board w-full px-1 md:px-4" dir="rtl"
        style={popupType === 'danger' ? { animation: 'dangerShake 0.6s ease' } : {}}>
        <style>{`
          @keyframes dangerShake {
            0%   { transform: translateX(0); } 15% { transform: translateX(-8px); }
            30%  { transform: translateX(8px); }  45% { transform: translateX(-6px); }
            60%  { transform: translateX(6px); }  75% { transform: translateX(-4px); }
            90%  { transform: translateX(4px); }  100%{ transform: translateX(0); }
          }
          .tile-btn:hover:not(:disabled) {
            filter: brightness(1.25) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6) !important;
          }
          .shine-overlay {
            position: absolute; top: -50%; left: -60%; width: 40%; height: 200%;
            background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.07) 50%, transparent 80%);
            transform: rotate(10deg); pointer-events: none; transition: left 0.5s ease;
          }
          button:hover .shine-overlay { left: 130%; }
        `}</style>

        {/*
          Two team sections side-by-side in landscape, stacked in portrait.
          Each section has: team label + 3 category columns.
          Each category column has its header directly above its tiles.
        */}
        <div className="gb-teams-wrapper flex flex-col sm:flex-row gap-1 sm:gap-2">
          {[0, 1].map(teamIdx => {
            const teamName = teamNames?.[teamIdx] || (teamIdx === 0 ? 'الفريق الأول' : 'الفريق الثاني');
            const teamCats = categories.slice(teamIdx * 3, teamIdx * 3 + 3);
            const colOffset = teamIdx * 3;

            return (
              <div key={teamIdx} className="gb-team-section flex-1 flex flex-col gap-1">
                {/* Team label */}
                <div className="gb-team-label text-center font-cairo font-bold text-sm rounded-lg py-1"
                  style={{ color: '#FF6666', background: 'rgba(139,0,0,0.2)' }}>
                  {teamName}
                </div>

                {/* 3 category columns side by side */}
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 flex-1">
                  {teamCats.map((cat, i) => {
                    const colIndex = colOffset + i;
                    return (
                      <div key={colIndex} className="gb-cat-col flex flex-col gap-0.5">
                        {/* Category header */}
                        <motion.div
                          className="gb-cat-cell text-center"
                          initial={{ opacity: 0, y: -12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: colIndex * 0.07 }}
                          style={{
                            ...HEADER_STYLE,
                            borderRadius: '10px',
                            padding: '7px 3px',
                          }}
                        >
                          <p className="gb-cat-text text-[10px] sm:text-xs font-cairo font-bold leading-tight truncate"
                            style={{ color: '#fff' }}>
                            {cat}
                          </p>
                        </motion.div>

                        {/* Tiles grouped by tier — each pair directly under the header */}
                        {[[200, 0, 1], [400, 2, 3], [600, 4, 5]].map(([points, rowA, rowB], tierIdx) => (
                          <div key={points} className="gb-tier-pair flex flex-col gap-px"
                            style={{ marginTop: tierIdx > 0 ? '3px' : 0 }}>
                            {[rowA, rowB].map(rowIndex => {
                              const tileKey = `${colIndex}-${rowIndex}`;
                              const isAnswered = answeredTiles.has(tileKey);
                              return (
                                <motion.button
                                  key={tileKey}
                                  className="gb-tile tile-btn relative min-h-[36px] py-2 text-center font-cairo font-bold overflow-hidden"
                                  initial={{ opacity: 0, scale: 0.85 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: (rowIndex * 6 + colIndex) * 0.015 + 0.2 }}
                                  whileTap={!isAnswered ? { scale: 0.95 } : {}}
                                  onClick={() => !isAnswered && handleTileClick(colIndex, rowIndex, cat, points)}
                                  disabled={isAnswered || !!popupType}
                                  style={isAnswered
                                    ? {
                                        background: 'rgba(255,255,255,0.04)',
                                        color: 'rgba(200,200,200,0.25)',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        fontSize: '16px',
                                        cursor: 'not-allowed',
                                        opacity: 0.45,
                                        transition: 'all 0.3s ease',
                                      }
                                    : { ...getColStyle(colIndex, points), borderRadius: '10px' }
                                  }
                                >
                                  {isAnswered ? '✓' : points}
                                  {!isAnswered && <div className="shine-overlay" />}
                                </motion.button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
