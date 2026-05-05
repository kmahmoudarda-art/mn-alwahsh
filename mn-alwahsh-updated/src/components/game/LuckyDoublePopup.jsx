import { useRef } from 'react';
import { motion } from 'framer-motion';

const PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 2,
  duration: 1 + Math.random() * 2,
  symbol: ['🩸', '💀', '👻'][Math.floor(Math.random() * 3)],
  size: 12 + Math.floor(Math.random() * 16),
}));

export default function LuckyDoublePopup({ teamName }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: 'radial-gradient(circle at 50% 40%, #2a0000 0%, #0a0000 100%)' }}>
      {/* Blood particle rain */}
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
        @keyframes luckyGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(139,0,0,0.5), 0 0 40px rgba(139,0,0,0.3); }
          50%       { box-shadow: 0 0 40px rgba(255,0,0,0.8), 0 0 80px rgba(204,0,0,0.5); }
        }
      `}</style>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-center px-8 relative z-10 rounded-2xl py-8"
        style={{
          background: 'linear-gradient(135deg, #1a0000, #0d0000)',
          border: '2px solid #CC0000',
          animation: 'luckyGlow 1.5s ease-in-out infinite',
        }}
      >
        <div className="text-5xl mb-4" style={{ animation: 'spinStar 2s linear infinite' }}>
          💀⚡💀
        </div>

        <h1 style={{
          fontSize: 36,
          fontFamily: 'var(--font-tajawal)',
          fontWeight: 800,
          color: '#FF0000',
          textShadow: '0 0 20px rgba(255,0,0,0.9), 0 0 40px rgba(204,0,0,0.6)',
          lineHeight: 1.2,
          marginBottom: 12,
        }}>
          LUCKY DOUBLE POINTS!!
        </h1>

        <p style={{ fontSize: 20, color: '#FF6666', fontFamily: 'var(--font-tajawal)', fontWeight: 700, marginBottom: 10, textShadow: '0 0 8px rgba(204,0,0,0.5)' }}>
          نقاط مضاعفة للفريق الخاسر!
        </p>

        <p style={{ fontSize: 24, color: '#FFE4E4', fontFamily: 'var(--font-cairo)', fontWeight: 800, marginBottom: 12, textShadow: '0 0 10px rgba(204,0,0,0.5)' }}>
          {teamName} 🎉
        </p>

        <p style={{ fontSize: 14, color: 'rgba(255,150,150,0.7)', fontFamily: 'var(--font-tajawal)' }}>
          أجب بشكل صحيح لتضاعف نقاطك!
        </p>
      </motion.div>
    </div>
  );
}
