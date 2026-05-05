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

/* ── 6 distinct column colour palettes ── */
const COL_PALETTES = [
  // 0: Blood red
  {
    header: 'linear-gradient(160deg, #3d0000, #1a0000)',
    headerBorder: '#8B0000',
    headerText: '#FF8888',
    tile200: 'linear-gradient(150deg, rgba(100,0,0,0.7), rgba(55,0,0,0.9))',
    tile400: 'linear-gradient(150deg, rgba(140,0,0,0.75), rgba(75,0,0,0.92))',
    tile600: 'linear-gradient(150deg, rgba(200,0,0,0.8), rgba(100,0,0,0.95))',
    border200: 'rgba(139,0,0,0.6)',
    border400: 'rgba(180,0,0,0.7)',
    border600: 'rgba(220,0,0,0.85)',
    glow: '#CC0000',
    text: '#FFD8D8',
  },
  // 1: Deep purple
  {
    header: 'linear-gradient(160deg, #1e0040, #0d0020)',
    headerBorder: '#6600BB',
    headerText: '#CC88FF',
    tile200: 'linear-gradient(150deg, rgba(60,0,120,0.7), rgba(30,0,60,0.9))',
    tile400: 'linear-gradient(150deg, rgba(90,0,160,0.75), rgba(50,0,90,0.92))',
    tile600: 'linear-gradient(150deg, rgba(130,0,210,0.8), rgba(70,0,130,0.95))',
    border200: 'rgba(102,0,187,0.55)',
    border400: 'rgba(130,0,220,0.65)',
    border600: 'rgba(170,0,255,0.8)',
    glow: '#9900FF',
    text: '#EDD8FF',
  },
  // 2: Dark teal
  {
    header: 'linear-gradient(160deg, #003535, #001a1a)',
    headerBorder: '#008888',
    headerText: '#66DDDD',
    tile200: 'linear-gradient(150deg, rgba(0,80,80,0.7), rgba(0,40,40,0.9))',
    tile400: 'linear-gradient(150deg, rgba(0,110,110,0.75), rgba(0,55,55,0.92))',
    tile600: 'linear-gradient(150deg, rgba(0,150,150,0.8), rgba(0,80,80,0.95))',
    border200: 'rgba(0,136,136,0.55)',
    border400: 'rgba(0,170,170,0.65)',
    border600: 'rgba(0,210,210,0.8)',
    glow: '#00BBBB',
    text: '#D8FFFF',
  },
  // 3: Dark amber / gold
  {
    header: 'linear-gradient(160deg, #3a2000, #1a0e00)',
    headerBorder: '#AA6600',
    headerText: '#FFBB55',
    tile200: 'linear-gradient(150deg, rgba(100,55,0,0.7), rgba(55,25,0,0.9))',
    tile400: 'linear-gradient(150deg, rgba(140,75,0,0.75), rgba(75,35,0,0.92))',
    tile600: 'linear-gradient(150deg, rgba(190,100,0,0.8), rgba(100,50,0,0.95))',
    border200: 'rgba(170,102,0,0.55)',
    border400: 'rgba(200,130,0,0.65)',
    border600: 'rgba(240,160,0,0.8)',
    glow: '#DD9900',
    text: '#FFF0D0',
  },
  // 4: Deep navy / indigo
  {
    header: 'linear-gradient(160deg, #000d40, #000820)',
    headerBorder: '#1133BB',
    headerText: '#7799FF',
    tile200: 'linear-gradient(150deg, rgba(0,20,100,0.7), rgba(0,10,55,0.9))',
    tile400: 'linear-gradient(150deg, rgba(0,30,140,0.75), rgba(0,15,80,0.92))',
    tile600: 'linear-gradient(150deg, rgba(0,45,190,0.8), rgba(0,22,110,0.95))',
    border200: 'rgba(17,51,187,0.55)',
    border400: 'rgba(30,80,220,0.65)',
    border600: 'rgba(50,110,255,0.8)',
    glow: '#2255FF',
    text: '#D0DDFF',
  },
  // 5: Dark forest green
  {
    header: 'linear-gradient(160deg, #0a2200, #041200)',
    headerBorder: '#226600',
    headerText: '#66DD44',
    tile200: 'linear-gradient(150deg, rgba(20,70,0,0.7), rgba(10,35,0,0.9))',
    tile400: 'linear-gradient(150deg, rgba(30,100,0,0.75), rgba(15,55,0,0.92))',
    tile600: 'linear-gradient(150deg, rgba(40,140,0,0.8), rgba(20,80,0,0.95))',
    border200: 'rgba(34,102,0,0.55)',
    border400: 'rgba(50,140,0,0.65)',
    border600: 'rgba(70,180,0,0.8)',
    glow: '#33BB00',
    text: '#D8FFD0',
  },
];

function getColStyle(colIndex, points) {
  const p = COL_PALETTES[colIndex % COL_PALETTES.length];
  const bg = points === 600 ? p.tile600 : points === 400 ? p.tile400 : p.tile200;
  const border = points === 600 ? p.border600 : points === 400 ? p.border400 : p.border200;
  return {
    borderRadius: '14px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.22s ease',
    cursor: 'pointer',
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    background: bg,
    border: `1.5px solid ${border}`,
    color: p.text,
    boxShadow: `0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)`,
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

      <div className="w-full px-1 md:px-4" dir="rtl"
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

        {/* Team Labels */}
        <div className="grid grid-cols-2 gap-1 md:gap-2 mb-1">
          {[teamNames?.[0] || 'الفريق الأول', teamNames?.[1] || 'الفريق الثاني'].map((name, i) => (
            <div key={i} className="text-center text-sm font-cairo font-bold rounded-lg py-1"
              style={{ color: '#FF6666', background: 'rgba(139,0,0,0.2)' }}>
              {name}
            </div>
          ))}
        </div>

        {/* Category Headers - each column has its own palette colour */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 md:gap-2 mb-1 md:mb-2">
          {categories.map((cat, i) => {
            const p = COL_PALETTES[i % COL_PALETTES.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: p.header,
                  border: `1.5px solid ${p.headerBorder}`,
                  boxShadow: `0 0 10px rgba(0,0,0,0.4), 0 0 8px ${p.glow}33`,
                  borderRadius: '10px',
                  padding: '8px 4px',
                  textAlign: 'center',
                }}
              >
                <p className="text-[10px] sm:text-xs md:text-sm font-cairo font-bold leading-tight truncate"
                  style={{ color: p.headerText }}>
                  {cat}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Point Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 md:gap-2">
          {DISPLAY_VALUES.map((points, rowIndex) =>
            categories.map((cat, colIndex) => {
              const tileKey = `${colIndex}-${rowIndex}`;
              const isAnswered = answeredTiles.has(tileKey);
              const p = COL_PALETTES[colIndex % COL_PALETTES.length];

              return (
                <motion.button
                  key={tileKey}
                  className="tile-btn relative min-h-[44px] py-3 sm:py-4 md:py-5 text-center font-cairo font-bold overflow-hidden"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (rowIndex * 6 + colIndex) * 0.02 + 0.3 }}
                  whileTap={!isAnswered ? { scale: 0.96 } : {}}
                  onClick={() => !isAnswered && handleTileClick(colIndex, rowIndex, cat, points)}
                  disabled={isAnswered || !!popupType}
                  style={
                    isAnswered
                      ? {
                          background: 'rgba(255,255,255,0.04)',
                          color: 'rgba(200,200,200,0.25)',
                          borderRadius: '14px',
                          border: '1px solid rgba(255,255,255,0.06)',
                          fontSize: '18px',
                          cursor: 'not-allowed',
                          opacity: 0.45,
                          transition: 'all 0.3s ease',
                        }
                      : getColStyle(colIndex, points)
                  }
                >
                  {isAnswered ? '✓' : points}
                  {!isAnswered && <div className="shine-overlay" />}
                </motion.button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
