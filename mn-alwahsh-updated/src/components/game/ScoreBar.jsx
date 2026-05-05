import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Plus, Minus, Settings, X, Skull } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PayPalDonateButton from './PayPalDonateButton';

export default function ScoreBar({ team1, team2, currentTeam, onAdjust, onBack }) {
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      await base44.auth.deleteAccount();
    } catch {
      await base44.auth.logout();
    }
  };

  return (
    <>
      <style>{`
        @keyframes bloodDripBar {
          0%   { transform: scaleY(0); opacity:0; }
          60%  { opacity: 1; }
          100% { transform: scaleY(1); opacity: 0.9; }
        }
        @keyframes scorePulseActive {
          0%,100% { box-shadow: 0 0 0 2px #CC0000, 0 4px 24px rgba(204,0,0,0.35); }
          50%      { box-shadow: 0 0 0 4px #FF0000, 0 4px 32px rgba(255,0,0,0.55); }
        }
        @keyframes whitePulse {
          0%,100% { box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
          50%      { box-shadow: 0 6px 30px rgba(0,0,0,0.6); }
        }
        .drip-bar {
          position: absolute;
          bottom: -18px;
          width: 8px;
          background: linear-gradient(to bottom, #8B0000, #CC0000, #FF0000);
          border-radius: 0 0 50% 50%;
          transform-origin: top;
          animation: bloodDripBar linear infinite;
        }
      `}</style>

      <div
        className="flex items-center justify-between gap-3 px-3 py-3 relative overflow-visible"
        dir="rtl"
        style={{
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          background: 'linear-gradient(180deg, #150000 0%, #0a0000 100%)',
          borderBottom: '2px solid #8B0000',
          boxShadow: '0 4px 30px rgba(139,0,0,0.5)',
          zIndex: 20,
        }}
      >
        {/* Horror claw marks background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url('https://media.base44.com/images/public/69dca0dfc53463f8eae196fc/290f8ce95_image.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Blood drip drops at bottom edge */}
        {[8, 20, 35, 50, 62, 75, 88].map((left, i) => (
          <div key={i} className="drip-bar" style={{
            left: `${left}%`,
            height: `${14 + (i % 3) * 10}px`,
            animationDuration: `${2.5 + i * 0.4}s`,
            animationDelay: `${i * 0.3}s`,
            width: `${6 + (i % 2) * 4}px`,
          }} />
        ))}

        {/* Content row */}
        <div className="relative z-10 flex items-center justify-between gap-3 w-full">
          <TeamScore
            name={team1.name}
            score={team1.score}
            isActive={currentTeam === 1}
            scoreKey={team1.scoreKey}
            onAdjust={(d) => onAdjust(1, d)}
            align="right"
          />

          {/* Center hub */}
          <div className="flex flex-col items-center shrink-0 gap-1">
            <div className="relative">
              <Trophy className="w-7 h-7" style={{ color: '#CC0000', filter: 'drop-shadow(0 0 8px #FF0000)' }} />
              <div className="absolute -top-1 -right-1 text-xs">💀</div>
            </div>
            <span className="text-[10px] font-cairo font-black tracking-widest" style={{ color: '#FF4444', textShadow: '0 0 8px #FF0000' }}>من الوحش</span>
            <PayPalDonateButton />
            <div className="flex gap-1 mt-0.5">
              <button onClick={onBack} className="w-6 h-6 flex items-center justify-center rounded-full transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#aaa' }} title="العودة">
                <X className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowSettings(true)} className="w-6 h-6 flex items-center justify-center rounded-full transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#aaa' }}>
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <TeamScore
            name={team2.name}
            score={team2.score}
            isActive={currentTeam === 2}
            scoreKey={team2.scoreKey}
            onAdjust={(d) => onAdjust(2, d)}
            align="left"
            reverse
          />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.85)' }} dir="rtl">
          <div className="rounded-2xl p-6 w-80 shadow-2xl" style={{ background: '#fff', border: '3px solid #CC0000' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cairo font-bold text-lg text-gray-900">الإعدادات</h2>
              <button onClick={() => { setShowSettings(false); setConfirmDelete(false); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="w-full rounded-xl px-4 py-3 font-cairo font-bold transition-colors"
                style={{ background: '#CC0000', color: '#fff' }}>
                حذف الحساب
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-tajawal text-center text-gray-700">هل أنت متأكد؟ لا يمكن التراجع.</p>
                <button onClick={handleDeleteAccount} className="w-full rounded-xl px-4 py-3 font-cairo font-bold"
                  style={{ background: '#CC0000', color: '#fff' }}>نعم، احذف حسابي</button>
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
  const getTitleBadge = () => {
    if (score >= 3000) return { text: 'امبراطور 👑', color: '#C9A84C' };
    if (score >= 2500) return { text: 'اسطورة 🌟', color: '#e67e22' };
    if (score >= 2000) return { text: 'ملك 🔥', color: '#e74c3c' };
    if (score >= 1000) return { text: 'وحش 💪', color: '#CC0000' };
    return null;
  };
  const badge = getTitleBadge();

  return (
    <motion.div
      layout
      className={`flex-1 max-w-[160px] rounded-2xl overflow-hidden transition-all duration-300`}
      style={
        isActive
          ? {
              background: '#ffffff',
              border: '3px solid #CC0000',
              animation: 'scorePulseActive 1.5s ease-in-out infinite',
            }
          : {
              background: '#ffffff',
              border: '2px solid rgba(200,200,200,0.8)',
              animation: 'whitePulse 3s ease-in-out infinite',
            }
      }
    >
      {/* Red accent top bar */}
      <div style={{
        height: 5,
        background: isActive
          ? 'linear-gradient(90deg, #8B0000, #FF0000, #8B0000)'
          : 'linear-gradient(90deg, #ccc, #999, #ccc)',
        backgroundSize: '200% 100%',
        animation: isActive ? 'shimmerBar 2s linear infinite' : 'none',
      }} />

      <div className={`px-3 py-2 ${align === 'left' ? 'text-left' : 'text-right'}`}>
        {/* Team name */}
        <p className="text-xs font-cairo font-bold truncate" style={{ color: isActive ? '#8B0000' : '#444' }}>
          {name}
          {isActive && <span className="text-[10px] font-normal mr-1" style={{ color: '#CC0000' }}>● دورهم</span>}
        </p>

        {/* Score row */}
        <div className={`flex items-center gap-2 mt-1 ${reverse ? 'flex-row' : 'flex-row-reverse'}`}>
          <motion.p
            key={scoreKey}
            className={`text-4xl font-cairo font-black flex-1 leading-none ${align === 'left' ? 'text-left' : 'text-right'}`}
            style={{ color: isActive ? '#8B0000' : '#222', textShadow: isActive ? '0 2px 8px rgba(139,0,0,0.3)' : 'none' }}
            initial={{ scale: 1.25, color: '#FF0000' }}
            animate={{ scale: 1, color: isActive ? '#8B0000' : '#222' }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {score}
          </motion.p>

          {/* +/- buttons */}
          <div className="flex flex-col gap-1">
            <button onClick={() => onAdjust(100)} className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-sm transition-all"
              style={{ background: '#22c55e', color: '#fff' }}>
              <Plus className="w-3 h-3" />
            </button>
            <button onClick={() => onAdjust(-100)} className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-sm transition-all"
              style={{ background: '#CC0000', color: '#fff' }}>
              <Minus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Badge */}
        {badge && (
          <p className="text-[10px] font-cairo font-bold mt-0.5" style={{ color: badge.color }}>
            {badge.text}
          </p>
        )}
      </div>
    </motion.div>
  );
}
