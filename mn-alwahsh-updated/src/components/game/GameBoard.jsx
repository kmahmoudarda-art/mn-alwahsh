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
  Per-column palettes: bright header, then 3 point-tier shades.
  200 = lighter/airier, 400 = richer mid, 600 = deep/dramatic.
*/
const COL_PALETTES = [
  // 0: Emerald green
  {
    header:       'linear-gradient(150deg, #1a7a3a, #0d5228)',
    headerBorder: '#22cc66',
    headerText:   '#ccffdd',
    headerShadow: 'rgba(34,204,102,0.5)',
    tile200:  'linear-gradient(150deg, #2e9e52, #1a6b38)',
    tile400:  'linear-gradient(150deg, #1a6b38, #0d4524)',
    tile600:  'linear-gradient(150deg, #0d4524, #072d18)',
    border200: '#3dcc70', border400: '#1e9b52', border600: '#0e5c31',
    glow200: 'rgba(61,204,112,0.4)', glow400: 'rgba(30,155,82,0.5)', glow600: 'rgba(14,92,49,0.6)',
    text200: '#d4ffea', text400: '#aaf0cc', text600: '#88e0b0',
  },
  // 1: Royal blue
  {
    header:       'linear-gradient(150deg, #1a3d9e, #0d2570)',
    headerBorder: '#4477ff',
    headerText:   '#ccd9ff',
    headerShadow: 'rgba(68,119,255,0.5)',
    tile200:  'linear-gradient(150deg, #2a55cc, #1a3a99)',
    tile400:  'linear-gradient(150deg, #1a3a99, #0d2266)',
    tile600:  'linear-gradient(150deg, #0d2266, #081440)',
    border200: '#5588ff', border400: '#2255dd', border600: '#1133aa',
    glow200: 'rgba(85,136,255,0.4)', glow400: 'rgba(34,85,221,0.5)', glow600: 'rgba(17,51,170,0.6)',
    text200: '#d0dcff', text400: '#aabcff', text600: '#8899ee',
  },
  // 2: Warm amber / gold
  {
    header:       'linear-gradient(150deg, #996600, #664400)',
    headerBorder: '#ffcc22',
    headerText:   '#fff3cc',
    headerShadow: 'rgba(255,204,34,0.5)',
    tile200:  'linear-gradient(150deg, #cc8800, #996600)',
    tile400:  'linear-gradient(150deg, #996600, #664400)',
    tile600:  'linear-gradient(150deg, #664400, #3d2800)',
    border200: '#ffbb33', border400: '#cc8800', border600: '#885500',
    glow200: 'rgba(255,187,51,0.4)', glow400: 'rgba(204,136,0,0.5)', glow600: 'rgba(136,85,0,0.6)',
    text200: '#fff4cc', text400: '#ffe0aa', text600: '#ffcc88',
  },
  // 3: Teal / cyan
  {
    header:       'linear-gradient(150deg, #007777, #004d4d)',
    headerBorder: '#00ddcc',
    headerText:   '#ccfffa',
    headerShadow: 'rgba(0,221,204,0.5)',
    tile200:  'linear-gradient(150deg, #009999, #006666)',
    tile400:  'linear-gradient(150deg, #006666, #004444)',
    tile600:  'linear-gradient(150deg, #004444, #002828)',
    border200: '#00ccbb', border400: '#009988', border600: '#006655',
    glow200: 'rgba(0,204,187,0.4)', glow400: 'rgba(0,153,136,0.5)', glow600: 'rgba(0,102,85,0.6)',
    text200: '#ccfff8', text400: '#aaffee', text600: '#88eedd',
  },
  // 4: Violet / purple
  {
    header:       'linear-gradient(150deg, #550099, #360066)',
    headerBorder: '#bb55ff',
    headerText:   '#f0ccff',
    headerShadow: 'rgba(187,85,255,0.5)',
    tile200:  'linear-gradient(150deg, #7722cc, #550099)',
    tile400:  'linear-gradient(150deg, #550099, #380066)',
    tile600:  'linear-gradient(150deg, #380066, #200040)',
    border200: '#aa44ff', border400: '#7722cc', border600: '#550099',
    glow200: 'rgba(170,68,255,0.4)', glow400: 'rgba(119,34,204,0.5)', glow600: 'rgba(85,0,153,0.6)',
    text200: '#f2deff', text400: '#e0bbff', text600: '#cc99ff',
  },
  // 5: Crimson red
  {
    header:       'linear-gradient(150deg, #990000, #660000)',
    headerBorder: '#ff4444',
    headerText:   '#ffcccc',
    headerShadow: 'rgba(255,68,68,0.5)',
    tile200:  'linear-gradient(150deg, #cc2222, #991111)',
    tile400:  'linear-gradient(150deg, #991111, #660000)',
    tile600:  'linear-gradient(150deg, #660000, #3d0000)',
    border200: '#ff5555', border400: '#cc2222', border600: '#991111',
    glow200: 'rgba(255,85,85,0.4)', glow400: 'rgba(204,34,34,0.5)', glow600: 'rgba(153,17,17,0.6)',
    text200: '#ffdddd', text400: '#ffbbbb', text600: '#ff9999',
  },
];

function getColStyle(colIndex, points) {
  const p = COL_PALETTES[colIndex % COL_PALETTES.length];
  const isHigh = points === 600, isMid = points === 400;
  const bg     = isHigh ? p.tile600     : isMid ? p.tile400     : p.tile200;
  const border = isHigh ? p.border600   : isMid ? p.border400   : p.border200;
  const glow   = isHigh ? p.glow600     : isMid ? p.glow400     : p.glow200;
  const color  = isHigh ? p.text600     : isMid ? p.text400     : p.text200;
  return {
    borderRadius: '16px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    fontSize: points === 600 ? '24px' : points === 400 ? '22px' : '20px',
    fontWeight: 800,
    letterSpacing: '0.01em',
    background: bg,
    border: `2px solid ${border}`,
    color,
    boxShadow: `0 4px 16px ${glow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
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
                  border: `2px solid ${p.headerBorder}`,
                  boxShadow: `0 3px 12px rgba(0,0,0,0.45), 0 0 10px ${p.headerShadow}`,
                  borderRadius: '12px',
                  padding: '9px 4px',
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
