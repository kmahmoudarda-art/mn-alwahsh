import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Plus, Minus, Settings, X } from 'lucide-react';
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
      <div
        className="flex items-center justify-between gap-4 px-4 py-3 relative"
        dir="rtl"
        style={{
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          background: 'linear-gradient(180deg, #1a0000, #0a0000)',
          borderBottom: '1px solid #8B0000',
          boxShadow: '0 2px 20px rgba(139,0,0,0.4)',
        }}
      >
        {/* Claws background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url('https://media.base44.com/images/public/69dca0dfc53463f8eae196fc/290f8ce95_image.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* Content */}
        <div className="relative z-10 flex items-center justify-between gap-4 w-full">
          <TeamScore
            name={team1.name}
            score={team1.score}
            isActive={currentTeam === 1}
            scoreKey={team1.scoreKey}
            onAdjust={(d) => onAdjust(1, d)}
          />

          <div className="flex flex-col items-center shrink-0 gap-1">
            <Trophy className="w-6 h-6" style={{ color: '#CC0000', filter: 'drop-shadow(0 0 6px rgba(204,0,0,0.7))' }} />
            <span className="text-xs font-tajawal" style={{ color: '#FF6666', textShadow: '0 0 6px rgba(204,0,0,0.5)' }}>من الوحش</span>
            <PayPalDonateButton />
            <div className="flex gap-1">
              <button
                onClick={onBack}
                className="w-6 h-6 flex items-center justify-center transition-colors"
                style={{ color: '#FF6666' }}
                title="العودة للإعداد"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="w-6 h-6 flex items-center justify-center transition-colors"
                style={{ color: '#FF6666' }}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          <TeamScore
            name={team2.name}
            score={team2.score}
            isActive={currentTeam === 2}
            scoreKey={team2.scoreKey}
            onAdjust={(d) => onAdjust(2, d)}
            reverse
          />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.8)' }} dir="rtl">
          <div
            className="border rounded-2xl p-6 w-80 shadow-2xl"
            style={{ background: '#1a0000', border: '1px solid #8B0000', boxShadow: '0 0 30px rgba(139,0,0,0.4)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cairo font-bold text-lg" style={{ color: '#FFE4E4' }}>الإعدادات</h2>
              <button onClick={() => { setShowSettings(false); setConfirmDelete(false); }} style={{ color: '#FF6666' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full rounded-xl px-4 py-3 font-cairo font-bold transition-colors"
                style={{ background: 'rgba(139,0,0,0.3)', border: '1px solid rgba(204,0,0,0.5)', color: '#FF6666' }}
              >
                حذف الحساب
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-tajawal text-center" style={{ color: '#FF6666' }}>هل أنت متأكد من حذف حسابك؟ لا يمكن التراجع عن هذه الخطوة.</p>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full rounded-xl px-4 py-3 font-cairo font-bold transition-colors"
                  style={{ background: '#CC0000', color: '#FFE4E4' }}
                >
                  نعم، احذف حسابي
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="w-full rounded-xl px-4 py-3 font-cairo transition-colors"
                  style={{ background: 'rgba(139,0,0,0.2)', color: '#FFE4E4', border: '1px solid #4a0000' }}
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TeamScore({ name, score, isActive, scoreKey, reverse, onAdjust }) {
  return (
    <motion.div
      layout
      className={`flex-1 max-w-xs rounded-xl border-2 px-3 py-2 transition-all duration-300 ${reverse ? 'text-left' : 'text-right'}`}
      style={
        isActive
          ? { background: 'linear-gradient(135deg, rgba(139,0,0,0.4), rgba(74,0,0,0.6))', border: '2px solid #CC0000', boxShadow: '0 0 15px rgba(204,0,0,0.4)' }
          : { background: 'rgba(26,0,0,0.6)', border: '2px solid #4a0000' }
      }
    >
      <p className="text-sm font-tajawal font-bold truncate" style={{ color: '#FFE4E4' }}>
        {name}
        {isActive && <span className="mr-2 text-xs" style={{ color: '#FF6666' }}>◀ دورهم</span>}
      </p>
      <div className={`flex items-center gap-2 mt-1 ${reverse ? 'flex-row' : 'flex-row-reverse'}`}>
        <motion.p
          key={scoreKey}
          className={`text-3xl md:text-4xl font-cairo font-black flex-1 ${reverse ? 'text-left' : 'text-right'}`}
          style={{ color: '#FFE4E4', textShadow: isActive ? '0 0 10px rgba(255,0,0,0.5)' : 'none' }}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {score}
          {score >= 3000 && <span className="text-3xl md:text-4xl font-cairo font-black mr-2" style={{ color: '#C9A84C' }}>امبراطور 👑</span>}
          {score >= 2500 && score < 3000 && <span className="text-3xl md:text-4xl font-cairo font-black mr-2" style={{ color: '#FF6666' }}>اسطورة 🌟</span>}
          {score >= 2000 && score < 2500 && <span className="text-3xl md:text-4xl font-cairo font-black mr-2" style={{ color: '#FF6666' }}>ملك 🔥</span>}
          {score >= 1000 && score < 2000 && <span className="text-3xl md:text-4xl font-cairo font-black mr-2" style={{ color: '#CC0000' }}>وحش 💪</span>}
        </motion.p>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onAdjust(100)}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => onAdjust(-100)}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{ background: 'rgba(139,0,0,0.3)', color: '#FF6666', border: '1px solid rgba(204,0,0,0.3)' }}
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
