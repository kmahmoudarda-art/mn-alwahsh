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
      // fallback: logout if delete not supported
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
        }}
      >
        {/* Claws background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
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
            color="blue"
            scoreKey={team1.scoreKey}
            onAdjust={(d) => onAdjust(1, d)}
          />

          <div className="flex flex-col items-center shrink-0 gap-1">
            <Trophy className="w-6 h-6 text-primary" />
            <span className="text-xs font-tajawal text-muted-foreground">من الوحش</span>
            <PayPalDonateButton />
            <div className="flex gap-1">
              <button
                onClick={onBack}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="العودة للإعداد"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          <TeamScore
            name={team2.name}
            score={team2.score}
            isActive={currentTeam === 2}
            color="red"
            scoreKey={team2.scoreKey}
            onAdjust={(d) => onAdjust(2, d)}
            reverse
          />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-card border border-border rounded-2xl p-6 w-80 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cairo font-bold text-lg text-foreground">الإعدادات</h2>
              <button onClick={() => { setShowSettings(false); setConfirmDelete(false); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full rounded-xl px-4 py-3 bg-red-900/30 border border-red-500/40 text-red-400 font-cairo font-bold hover:bg-red-900/50 transition-colors"
              >
                حذف الحساب
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-tajawal text-muted-foreground text-center">هل أنت متأكد من حذف حسابك؟ لا يمكن التراجع عن هذه الخطوة.</p>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full rounded-xl px-4 py-3 bg-red-600 text-white font-cairo font-bold hover:bg-red-700 transition-colors"
                >
                  نعم، احذف حسابي
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="w-full rounded-xl px-4 py-3 bg-secondary text-foreground font-cairo hover:bg-secondary/80 transition-colors"
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

function TeamScore({ name, score, isActive, color, scoreKey, reverse, onAdjust }) {
  const bgActive = color === 'blue'
    ? 'bg-blue-600/30 border-blue-400/50'
    : 'bg-red-600/30 border-red-400/50';
  const bgInactive = 'bg-card/50 border-border';
  const textColor = color === 'blue' ? 'text-blue-300' : 'text-red-300';

  return (
    <motion.div
      layout
      className={`flex-1 max-w-xs rounded-xl border-2 px-3 py-2 transition-all duration-300 ${isActive ? bgActive : bgInactive} ${reverse ? 'text-left' : 'text-right'}`}
    >
      <p className="text-sm font-tajawal font-bold text-foreground truncate">
        {name}
        {isActive && <span className="mr-2 text-primary text-xs">◀ دورهم</span>}
      </p>
      <div className={`flex items-center gap-2 mt-1 ${reverse ? 'flex-row' : 'flex-row-reverse'}`}>
        <motion.p
          key={scoreKey}
          className={`text-3xl md:text-4xl font-cairo font-black flex-1 text-foreground ${reverse ? 'text-left' : 'text-right'}`}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {score}
          {score >= 3000 && <span className="text-3xl md:text-4xl font-cairo font-black text-yellow-400 mr-2">امبراطور 👑</span>}
          {score >= 2500 && score < 3000 && <span className="text-3xl md:text-4xl font-cairo font-black text-purple-400 mr-2">اسطورة 🌟</span>}
          {score >= 2000 && score < 2500 && <span className="text-3xl md:text-4xl font-cairo font-black text-orange-400 mr-2">ملك 🔥</span>}
          {score >= 1000 && score < 2000 && <span className="text-3xl md:text-4xl font-cairo font-black text-green-400 mr-2">وحش 💪</span>}
        </motion.p>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onAdjust(100)}
            className="w-7 h-7 rounded-md bg-green-600/30 hover:bg-green-600/60 text-green-300 flex items-center justify-center transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => onAdjust(-100)}
            className="w-7 h-7 rounded-md bg-red-600/30 hover:bg-red-600/60 text-red-300 flex items-center justify-center transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}