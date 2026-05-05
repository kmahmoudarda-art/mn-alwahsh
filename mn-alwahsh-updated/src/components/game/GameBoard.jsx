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

const POINT_VALUES = [200, 400, 600];
const DISPLAY_VALUES = [200, 200, 400, 400, 600, 600];

function getGlassStyle(points) {
  const baseStyle = {
    borderRadius: '14px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.25s ease',
    cursor: 'pointer',
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '0.02em',
  };

  const styles = {
    200: {
      ...baseStyle,
      background: 'linear-gradient(145deg, rgba(80,0,0,0.55) 0%, rgba(40,0,0,0.75) 100%)',
      border: '1.5px solid rgba(139,0,0,0.55)',
      color: '#FFD0D0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,60,60,0.1)',
    },
    400: {
      ...baseStyle,
      background: 'linear-gradient(145deg, rgba(120,0,0,0.65) 0%, rgba(60,0,0,0.85) 100%)',
      border: '1.5px solid rgba(180,0,0,0.65)',
      color: '#FFE0D0',
      boxShadow: '0 4px 16px rgba(0,0,0,0.55), 0 0 8px rgba(180,0,0,0.25), inset 0 1px 0 rgba(255,80,80,0.12)',
    },
    600: {
      ...baseStyle,
      background: 'linear-gradient(145deg, rgba(180,0,0,0.7) 0%, rgba(90,0,0,0.9) 100%)',
      border: '2px solid rgba(220,0,0,0.75)',
      color: '#FFF0D0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 0 15px rgba(220,0,0,0.35), inset 0 1px 0 rgba(255,100,100,0.2)',
    },
  };

  return styles[points] || styles[200];
}

function DangerOverlay() {
  return (
    <>
      <style>{`
        @keyframes dangerShake {
          0%   { transform: translateX(0); }
          15%  { transform: translateX(-8px); }
          30%  { transform: translateX(8px); }
          45%  { transform: translateX(-6px); }
          60%  { transform: translateX(6px); }
          75%  { transform: translateX(-4px); }
          90%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
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
        .shine-overlay {
          position: absolute;
          top: -50%;
          left: -60%;
          width: 40%;
          height: 200%;
          background: linear-gradient(105deg, transparent 20%, rgba(255,100,100,0.15) 50%, transparent 80%);
          transform: rotate(10deg);
          transition: left 0.5s ease;
          pointer-events: none;
        }
        button:hover .shine-overlay {
          left: 130%;
        }
        .shine-reflection {
          background: linear-gradient(90deg, transparent, rgba(255,100,100,0.2), transparent);
          pointer-events: none;
        }
      `}</style>

      {/* Red flash overlay */}
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{
          background: 'rgba(255, 0, 0, 0.22)',
          animation: 'flashRed 0.45s ease 3',
        }}
      />

      {/* Danger popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          style={{
            background: 'linear-gradient(135deg, #1a0000, #0d0000)',
            border: '3px solid #CC0000',
            borderRadius: '20px',
            padding: '40px 60px',
            textAlign: 'center',
            animation: 'dangerPulse 0.5s ease infinite',
          }}
        >
          <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '12px' }}>💀</div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#FF0000',
              fontFamily: 'var(--font-cairo)',
              marginBottom: '8px',
              textShadow: '0 0 15px rgba(255,0,0,0.8)',
            }}
          >
            سؤال خطر!
          </div>
          <div
            style={{
              fontSize: '22px',
              color: '#FFE4E4',
              fontFamily: 'var(--font-cairo)',
              fontWeight: 'bold',
              animation: 'pulseSub 0.6s ease infinite',
            }}
          >
            600 نقطة
          </div>
        </motion.div>
      </div>
    </>
  );
}

function EscapeOverlay() {
  return (
    <>
      <style>{`
        @keyframes runShake {
          0%   { transform: translateX(0) rotate(0deg); }
          25%  { transform: translateX(-10px) rotate(-5deg); }
          50%  { transform: translateX(10px) rotate(5deg); }
          75%  { transform: translateX(-6px) rotate(-3deg); }
          100% { transform: translateX(0) rotate(0deg); }
        }
        @keyframes orangePulse {
          0%   { box-shadow: 0 0 10px orange; }
          50%  { box-shadow: 0 0 40px orange, 0 0 80px rgba(255,165,0,0.4); }
          100% { box-shadow: 0 0 10px orange; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          style={{
            background: 'linear-gradient(135deg, #1a0500, #0d0000)',
            border: '3px solid orange',
            borderRadius: '20px',
            padding: '40px 60px',
            textAlign: 'center',
            animation: 'orangePulse 0.6s ease infinite',
          }}
        >
          <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '12px', animation: 'runShake 0.4s ease infinite' }}>🏃</div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'orange',
              fontFamily: 'var(--font-cairo)',
              marginBottom: '8px',
            }}
          >
            اهرب يا كبير!
          </div>
          <div
            style={{
              fontSize: '18px',
              color: '#FFE4E4',
              fontFamily: 'var(--font-cairo)',
              fontWeight: 'bold',
            }}
          >
            سؤال صعب جداً!
          </div>
        </motion.div>
      </div>
    </>
  );
}

function EasyPopup({ message }) {
  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes easyPulse {
          0%   { box-shadow: 0 0 8px rgba(139,0,0,0.4); }
          50%  { box-shadow: 0 0 24px rgba(204,0,0,0.7); }
          100% { box-shadow: 0 0 8px rgba(139,0,0,0.4); }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            background: 'linear-gradient(135deg, #1a0000, #0d0000)',
            border: '2px solid rgba(139,0,0,0.8)',
            borderRadius: '20px',
            padding: '40px 60px',
            textAlign: 'center',
            maxWidth: '380px',
            animation: 'easyPulse 1s ease infinite',
          }}
        >
          <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '12px', animation: 'bounce 0.5s ease infinite' }}>
            {message.emoji}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#FF6666', fontFamily: 'var(--font-tajawal)', marginBottom: '8px', textShadow: '0 0 10px rgba(204,0,0,0.7)' }}>
            {message.main}
          </div>
          <div style={{ fontSize: '16px', color: 'rgba(255,180,180,0.8)', fontFamily: 'var(--font-tajawal)' }}>
            {message.sub}
          </div>
        </motion.div>
      </div>
    </>
  );
}

function MediumPopup({ message }) {
  return (
    <>
      <style>{`
        @keyframes flex {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25%       { transform: scale(1.2) rotate(-5deg); }
          75%       { transform: scale(1.2) rotate(5deg); }
        }
        @keyframes medPulse {
          0%   { box-shadow: 0 0 8px rgba(180,0,0,0.4); }
          50%  { box-shadow: 0 0 30px rgba(220,0,0,0.8); }
          100% { box-shadow: 0 0 8px rgba(180,0,0,0.4); }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            background: 'linear-gradient(135deg, #200000, #0d0000)',
            border: '2px solid rgba(180,0,0,0.8)',
            borderRadius: '20px',
            padding: '40px 60px',
            textAlign: 'center',
            maxWidth: '380px',
            animation: 'medPulse 1s ease infinite',
          }}
        >
          <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '12px', animation: 'flex 0.6s ease infinite' }}>
            {message.emoji}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#CC0000', fontFamily: 'var(--font-tajawal)', marginBottom: '8px', textShadow: '0 0 12px rgba(255,0,0,0.7)' }}>
            {message.main}
          </div>
          <div style={{ fontSize: '16px', color: 'rgba(255,150,150,0.7)', fontFamily: 'var(--font-tajawal)' }}>
            {message.sub}
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default function GameBoard({ categories, answeredTiles, onTileClick, teamNames, readyTiles = new Set() }) {
  const [popupType, setPopupType] = useState(null);
  const [popupMessage, setPopupMessage] = useState(null);
  const [pendingTile, setPendingTile] = useState(null);

  const team1Cats = categories.slice(0, 3);
  const team2Cats = categories.slice(3, 6);

  const handleTileClick = (colIndex, rowIndex, cat, points) => {
    let popup = null;
    let message = null;

    if (points === 200) {
      const rand200 = Math.random() * 100;
      if (rand200 < 30) {
        popup = 'easy';
        message = randomFrom(EASY_MESSAGES);
      }
    } else if (points === 400) {
      const rand400 = Math.random() * 100;
      if (rand400 < 20) {
        popup = 'medium';
        message = randomFrom(MEDIUM_MESSAGES);
      }
    } else if (points === 600) {
      const rand600 = Math.random() * 100;
      if (rand600 < 5) {
        popup = 'escape';
      } else if (rand600 < 15) {
        popup = 'danger';
      }
    }

    if (popup) {
      setPendingTile({ colIndex, rowIndex, cat, points });
      setPopupType(popup);
      setPopupMessage(message);
      setTimeout(() => {
        setPopupType(null);
        setPopupMessage(null);
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

      <div
        className="w-full px-1 md:px-4"
        dir="rtl"
        style={popupType === 'danger' ? { animation: 'dangerShake 0.6s ease' } : {}}
      >
        <style>{`
          @keyframes dangerShake {
            0%   { transform: translateX(0); }
            15%  { transform: translateX(-8px); }
            30%  { transform: translateX(8px); }
            45%  { transform: translateX(-6px); }
            60%  { transform: translateX(6px); }
            75%  { transform: translateX(-4px); }
            90%  { transform: translateX(4px); }
            100% { transform: translateX(0); }
          }
          @keyframes monsterPulse {
            0%, 100% { box-shadow: 0 0 10px #8B0000; }
            50%       { box-shadow: 0 0 25px #CC0000, 0 0 50px #8B0000; }
          }
          .tile-hover:hover {
            box-shadow: 0 0 20px #CC0000, inset 0 0 10px rgba(139,0,0,0.2) !important;
            border-color: #CC0000 !important;
          }
        `}</style>

        <div>
          {/* Team Labels */}
          <div className="grid grid-cols-2 gap-1 md:gap-2 mb-1">
            <div
              className="text-center text-sm font-cairo font-bold rounded-lg py-1"
              style={{ color: '#FF6666', background: 'rgba(139,0,0,0.2)', textShadow: '0 0 8px rgba(204,0,0,0.5)' }}
            >
              {teamNames?.[0] || 'الفريق الأول'}
            </div>
            <div
              className="text-center text-sm font-cairo font-bold rounded-lg py-1"
              style={{ color: '#FF6666', background: 'rgba(139,0,0,0.2)', textShadow: '0 0 8px rgba(204,0,0,0.5)' }}
            >
              {teamNames?.[1] || 'الفريق الثاني'}
            </div>
          </div>

          {/* Category Headers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 md:gap-2 mb-1 md:mb-2">
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  background: 'linear-gradient(135deg, #1a0000, #2d0000)',
                  border: '1px solid #8B0000',
                  boxShadow: '0 0 10px rgba(139,0,0,0.3)',
                  borderRadius: '8px',
                  padding: '8px 4px',
                  textAlign: 'center',
                }}
              >
                <p
                  className="text-[10px] sm:text-xs md:text-base font-cairo font-bold leading-tight truncate"
                  style={{ color: '#FF6666', textShadow: '0 0 8px rgba(204,0,0,0.5)' }}
                >
                  {cat}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Point Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 md:gap-2">
            {DISPLAY_VALUES.map((points, rowIndex) =>
              categories.map((cat, colIndex) => {
                const tileKey = `${colIndex}-${rowIndex}`;
                const isAnswered = answeredTiles.has(tileKey);
                const ptIdx = Math.floor(rowIndex / 2);
                const readyKey = `${colIndex}-${ptIdx}`;
                const isReady = readyTiles.has(readyKey);
                const isPending = !isAnswered && !isReady;

                return (
                  <motion.button
                    key={tileKey}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (rowIndex * 6 + colIndex) * 0.02 + 0.3 }}
                    whileHover={!isAnswered ? { y: -2 } : {}}
                    whileTap={!isAnswered ? { scale: 0.98, y: 1 } : {}}
                    onClick={() => !isAnswered && handleTileClick(colIndex, rowIndex, cat, points)}
                    disabled={isAnswered || popupType}
                    className={`relative min-h-[44px] py-3 sm:py-4 md:py-5 text-center font-cairo font-bold overflow-hidden${!isAnswered ? ' tile-hover' : ''}`}
                    style={
                      isAnswered
                        ? {
                            background: '#1a1a1a',
                            color: 'rgba(150,100,100,0.4)',
                            borderRadius: '16px',
                            border: '1px solid transparent',
                            fontSize: '18px',
                            cursor: 'not-allowed',
                            transition: 'all 0.3s ease',
                            opacity: 0.4,
                          }
                        : getGlassStyle(points)
                    }
                  >
                    {isAnswered ? '✓' : points}
                    {isPending && !isAnswered && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgba(255,100,100,0.5)' }} />
                    )}
                    {!isAnswered && <div className="absolute inset-0 shine-overlay" />}
                    {!isAnswered && <div className="absolute top-0 left-[10%] w-[80%] h-px shine-reflection" />}
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
