import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 2,
  duration: 1 + Math.random() * 2,
  symbol: ['★', '✨', '💫'][Math.floor(Math.random() * 3)],
  size: 12 + Math.floor(Math.random() * 16),
}));

export default function LuckyDoublePopup({ teamName }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(circle at 50% 40%, #1a0a00 0%, #0a0a1a 100%)' }}>
      {/* Gold particle rain */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="absolute top-0 pointer-events-none select-none"
          style={{
            left: `${p.x}%`,
            fontSize: p.size,
            animation: `luckyRain ${p.duration}s ${p.delay}s linear infinite`,
          }}
        >
          {p.symbol}
        </div>
      ))}

      <style>{`
        @keyframes luckyRain {
          0%   { transform: translateY(-40px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes spinStar {
          from { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(1.3); }
          to   { transform: rotate(360deg) scale(1); }
        }
      `}</style>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-center px-8 relative z-10"
      >
        <div className="text-5xl mb-4" style={{ animation: 'spinStar 2s linear infinite' }}>
          🌟⭐🌟
        </div>

        <h1 style={{
          fontSize: 36,
          fontFamily: 'var(--font-tajawal)',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.2,
          marginBottom: 12,
        }}>
          LUCKY DOUBLE POINTS!!
        </h1>

        <p style={{ fontSize: 20, color: '#e8c97a', fontFamily: 'var(--font-tajawal)', fontWeight: 700, marginBottom: 10 }}>
          نقاط مضاعفة للفريق الخاسر!
        </p>

        <p style={{ fontSize: 24, color: 'white', fontFamily: 'var(--font-cairo)', fontWeight: 800, marginBottom: 12 }}>
          {teamName} 🎉
        </p>

        <p style={{ fontSize: 14, color: 'rgba(255,220,100,0.7)', fontFamily: 'var(--font-tajawal)' }}>
          أجب بشكل صحيح لتضاعف نقاطك!
        </p>
      </motion.div>
    </div>
  );
}