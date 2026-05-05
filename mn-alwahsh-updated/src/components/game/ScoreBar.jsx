import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Plus, Minus, Settings, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PayPalDonateButton from './PayPalDonateButton';
import HorrorMusic from './HorrorMusic';

export default function ScoreBar({ team1, team2, currentTeam, onAdjust, onBack }) {
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteAccount = async () => {
    try { await base44.auth.deleteAccount(); }
    catch { await base44.auth.logout(); }
  };

  return (
    <>
      <style>{`
        @keyframes activeCardGlow {
          0%,100% { box-shadow: 0 0 0 2.5px #CC0000, 0 4px 24px rgba(204,0,0,0.3); }
          50%      { box-shadow: 0 0 0 3px #FF2222, 0 6px 32px rgba(255,0,0,0.45); }
        }
        @keyframes shimmerBar {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>

      <div
        dir="rtl"
        className="relative flex items-center justify-between gap-3 px-3 overflow-hidden"
        style={{
          paddingTop: 'max(10px, env(safe-area-inset-top))',
          paddingBottom: 10,
          background: '#0a0000',
          borderBottom: '2px solid #6B0000',
          boxShadow: '0 3px 20px rgba(100,0,0,0.5)',
          zIndex: 20,
        }}
      >
        {/* Video background */}
        <video autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ objectFit: 'cover', objectPosition: 'center', zIndex: 0 }}>
          <source src="/bg-scorebar.mp4" type="video/mp4" />
        </video>
        {/* Dark tint over video so cards stay readable */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-between gap-3 w-full">
          <TeamScore name={team1.name} score={team1.score} isActive={currentTeam === 1} scoreKey={team1.scoreKey} onAdjust={d => onAdjust(1, d)} align="right" />

          {/* Centre */}
          <div className="flex flex-col items-center shrink-0 gap-0.5">
            <div className="relative">
              <Trophy className="w-6 h-6" style={{ color: '#CC0000', filter: 'drop-shadow(0 0 6px #FF0000)' }} />
              <span className="absolute -top-1 -right-1 text-xs">💀</span>
            </div>
            <span className="text-[10px] font-cairo font-black tracking-widest" style={{ color: '#FF4444', textShadow: '0 0 6px #FF0000' }}>من الوحش</span>
            <PayPalDonateButton />
            <HorrorMusic />
            <div className="flex gap-1 mt-0.5">
              <button onClick={onBack} className="w-6 h-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: '#bbb' }}>
                <X className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowSettings(true)} className="w-6 h-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: '#bbb' }}>
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <TeamScore name={team2.name} score={team2.score} isActive={currentTeam === 2} scoreKey={team2.scoreKey} onAdjust={d => onAdjust(2, d)} align="left" reverse />
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.82)' }} dir="rtl">
          <div className="rounded-2xl p-6 w-80 shadow-2xl" style={{ background: '#fff', border: '3px solid #CC0000' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cairo font-bold text-lg text-gray-900">الإعدادات</h2>
              <button onClick={() => { setShowSettings(false); setConfirmDelete(false); }}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="w-full rounded-xl px-4 py-3 font-cairo font-bold" style={{ background: '#CC0000', color: '#fff' }}>حذف الحساب</button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-tajawal text-center text-gray-700">هل أنت متأكد؟ لا يمكن التراجع.</p>
                <button onClick={handleDeleteAccount} className="w-full rounded-xl px-4 py-3 font-cairo font-bold" style={{ background: '#CC0000', color: '#fff' }}>نعم، احذف حسابي</button>
                <button onClick={() => setConfirmDelete(false)} className="w-full rounded-xl px-4 py-3 font-cairo border border-gray-300 text-gray-700">إلغاء</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TeamScore({ name, score, isActive, scoreKey, reverse, onAdjust, align }) {
  const badge = score >= 3000 ? { text: 'امبراطور 👑', color: '#b8860b' }
    : score >= 2500 ? { text: 'اسطورة 🌟', color: '#cc5500' }
    : score >= 2000 ? { text: 'ملك 🔥', color: '#cc0000' }
    : score >= 1000 ? { text: 'وحش 💪', color: '#8B0000' }
    : null;

  return (
    <motion.div
      layout
      className="flex-1 max-w-[330px] rounded-2xl overflow-hidden"
      style={
        isActive
          ? { background: '#ffffff', animation: 'activeCardGlow 1.6s ease-in-out infinite' }
          : { background: '#ffffff', boxShadow: '0 2px 12px rgba(0,0,0,0.35)' }
      }
    >
      {/* Top accent bar */}
      <div style={{
        height: 5,
        background: isActive
          ? 'linear-gradient(90deg, #8B0000, #FF0000, #CC0000, #FF0000, #8B0000)'
          : '#e5e5e5',
        backgroundSize: isActive ? '300% 100%' : 'auto',
        animation: isActive ? 'shimmerBar 2.5s linear infinite' : 'none',
      }} />

      <div className={`px-3 py-2 ${align === 'left' ? 'text-left' : 'text-right'}`}>
        {/* Name */}
        <p className="text-[11px] font-cairo font-bold truncate" style={{ color: isActive ? '#8B0000' : '#555' }}>
          {name}
          {isActive && <span className="text-[9px] mr-1" style={{ color: '#CC0000' }}>● دورهم</span>}
        </p>

        {/* Score + buttons */}
        <div className={`flex items-center gap-2 mt-0.5 ${reverse ? 'flex-row' : 'flex-row-reverse'}`}>
          <motion.p
            key={scoreKey}
            className={`text-4xl md:text-5xl font-cairo font-black flex-1 leading-none ${align === 'left' ? 'text-left' : 'text-right'}`}
            style={{ color: isActive ? '#8B0000' : '#1a1a1a' }}
            initial={{ scale: 1.3, color: '#CC0000' }}
            animate={{ scale: 1, color: isActive ? '#8B0000' : '#1a1a1a' }}
            transition={{ type: 'spring', stiffness: 350 }}
          >
            {score}
          </motion.p>
          <div className="flex flex-col gap-1">
            <button onClick={() => onAdjust(100)} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold shadow-sm"
              style={{ background: '#22c55e', color: '#fff' }}>
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onAdjust(-100)} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold shadow-sm"
              style={{ background: '#CC0000', color: '#fff' }}>
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {badge && <p className="text-[10px] font-cairo font-bold mt-0.5" style={{ color: badge.color }}>{badge.text}</p>}
      </div>
    </motion.div>
  );
}
