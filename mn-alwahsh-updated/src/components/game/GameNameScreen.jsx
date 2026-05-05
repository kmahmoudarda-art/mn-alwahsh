import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InstructionManual from './InstructionManual';

function sessionKey(n) { return `singim_session_${n.trim().toLowerCase()}`; }
function sessionExists(n) {
  try {
    const raw = localStorage.getItem(sessionKey(n));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed.savedAt && Date.now() - parsed.savedAt > 60 * 60 * 1000) return false;
    return !!parsed.gamePhase;
  } catch { return false; }
}

export default function GameNameScreen({ onEnter }) {
  const [name, setName] = useState('');
  const [showManual, setShowManual] = useState(false);
  const exists = name.trim() ? sessionExists(name.trim()) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onEnter(trimmed);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
      style={{ background: '#050000' }}
    >
      <style>{`
        @keyframes titleFlicker {
          0%,100% { text-shadow: 0 0 12px #FF0000, 0 0 40px #CC0000, 0 0 80px #8B0000; }
          48%      { text-shadow: 0 0 8px #FF0000, 0 0 25px #CC0000; }
          50%      { opacity: 0.88; }
          52%      { text-shadow: 0 0 12px #FF0000, 0 0 40px #CC0000; }
        }
        @keyframes skyPulse {
          0%,100% { opacity: 0.55; }
          50%      { opacity: 0.72; }
        }
        @keyframes skullHover {
          0%,100% { transform: translateY(0) rotate(-6deg) scale(1); }
          50%      { transform: translateY(-14px) rotate(6deg) scale(1.05); }
        }
        @keyframes fogBase {
          0%,100% { opacity: 0.28; }
          50%      { opacity: 0.42; }
        }
        .horror-input::placeholder { color: rgba(255,100,100,0.4); }
        .horror-input:focus { outline: none; box-shadow: 0 0 0 2px #CC0000, 0 0 20px rgba(204,0,0,0.35) !important; }
        .horror-btn:hover { box-shadow: 0 0 28px rgba(204,0,0,0.65), 0 0 55px rgba(139,0,0,0.35) !important; }
      `}</style>

      <AnimatePresence>{showManual && <InstructionManual onClose={() => setShowManual(false)} />}</AnimatePresence>

      {/* Deep red sky pulse */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 100% 55% at 50% 0%, rgba(180,0,0,0.6) 0%, transparent 70%)',
        animation: 'skyPulse 3s ease-in-out infinite',
      }} />

      {/* Monster paw background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url('https://media.base44.com/images/public/69dca0dfc53463f8eae196fc/30ca55b32_image.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        opacity: 0.18,
        filter: 'sepia(1) saturate(4) hue-rotate(320deg) contrast(1.3)',
      }} />

      {/* Edge vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.78) 100%)',
      }} />

      {/* Claw marks - top-left corner */}
      <div className="absolute top-0 left-0 pointer-events-none" style={{
        backgroundImage: `url('https://media.base44.com/images/public/69dca0dfc53463f8eae196fc/290f8ce95_image.png')`,
        backgroundSize: '200px', backgroundRepeat: 'no-repeat',
        width: 200, height: 200, opacity: 0.22,
        filter: 'sepia(1) saturate(5) hue-rotate(320deg)',
        transform: 'rotate(180deg)',
      }} />
      {/* Claw marks - bottom-right corner */}
      <div className="absolute bottom-0 right-0 pointer-events-none" style={{
        backgroundImage: `url('https://media.base44.com/images/public/69dca0dfc53463f8eae196fc/290f8ce95_image.png')`,
        backgroundSize: '180px', backgroundRepeat: 'no-repeat',
        width: 180, height: 180, opacity: 0.18,
        filter: 'sepia(1) saturate(5) hue-rotate(320deg)',
      }} />

      {/* Floating skulls */}
      {[
        { style: { left: '5%',  top: '16%',    fontSize: 50, animDur: '4.5s', animDel: '0s'   } },
        { style: { right: '5%', top: '20%',    fontSize: 36, animDur: '5.5s', animDel: '1s'   } },
        { style: { left: '7%',  bottom: '16%', fontSize: 28, animDur: '6s',   animDel: '2s'   } },
        { style: { right: '6%', bottom: '20%', fontSize: 44, animDur: '4s',   animDel: '0.5s' } },
      ].map((s, i) => (
        <div key={i} className="absolute pointer-events-none select-none"
          style={{ ...s.style, animation: `skullHover ${s.style.animDur} ease-in-out infinite ${s.style.animDel}` }}>
          💀
        </div>
      ))}

      {/* Bottom fog glow */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
        height: '28vh',
        background: 'linear-gradient(to top, rgba(90,0,0,0.3) 0%, transparent 100%)',
        animation: 'fogBase 4s ease-in-out infinite',
      }} />

      {/* ── Content ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-sm text-center relative"
        style={{ zIndex: 10 }}
      >
        <motion.h1
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 120 }}
          className="text-7xl md:text-9xl font-cairo font-black mb-1 tracking-tight"
          style={{ color: '#CC0000', animation: 'titleFlicker 4s ease-in-out infinite', lineHeight: 1.05 }}
        >
          من الوحش
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-base font-tajawal font-bold mb-2"
          style={{ color: '#FF6666', textShadow: '0 0 10px rgba(204,0,0,0.6)', letterSpacing: '0.05em' }}
        >
          لعبة المعرفة والتحدي
        </motion.p>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, #CC0000, transparent)' }} />
          <span style={{ fontSize: 16 }}>⚔️</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #CC0000, transparent)' }} />
        </div>

        <button
          onClick={() => setShowManual(true)}
          className="flex items-center gap-2 mx-auto mb-7 px-5 py-2.5 rounded-xl font-cairo font-bold text-sm transition-all"
          style={{
            background: 'rgba(10,0,0,0.7)',
            border: '1px solid rgba(139,0,0,0.7)',
            color: '#FFE4E4',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,0,0,0.3)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(204,0,0,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,0,0,0.7)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <BookOpen className="w-4 h-4" style={{ color: '#CC0000' }} />
          كيف تلعب؟
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-cairo font-bold mb-2" style={{ color: '#FFE4E4', textShadow: '0 0 6px rgba(204,0,0,0.4)' }}>
              اسم اللعبة
            </label>
            <Input
              placeholder="مثال: حبيبي يا غالي 🎉"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="horror-input text-center text-base font-cairo rounded-xl"
              style={{
                background: 'rgba(5,0,0,0.85)',
                border: '2px solid #8B0000',
                color: '#FFE4E4',
                backdropFilter: 'blur(8px)',
                fontSize: 15,
                height: 52,
              }}
            />
            {name.trim() && (
              <p className={`text-xs font-tajawal mt-1.5 ${exists ? 'text-green-400' : ''}`}
                style={!exists ? { color: '#FF6666' } : {}}>
                {exists ? '✅ لعبة موجودة — سيتم الاستئناف' : '🆕 اسم جديد — لعبة جديدة'}
              </p>
            )}
          </div>

          <motion.div whileHover={{ scale: name.trim() ? 1.03 : 1 }} whileTap={{ scale: name.trim() ? 0.97 : 1 }}>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="horror-btn w-full text-lg font-cairo font-bold py-6 rounded-xl gap-2 disabled:opacity-40 transition-all"
              style={{
                background: 'linear-gradient(135deg, #6B0000 0%, #CC0000 50%, #6B0000 100%)',
                color: '#FFE4E4',
                border: '1px solid rgba(255,60,60,0.4)',
                boxShadow: name.trim() ? '0 0 20px rgba(139,0,0,0.55)' : 'none',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              <Gamepad2 className="w-5 h-5" />
              {exists ? 'استئناف اللعبة' : 'إنشاء لعبة جديدة'}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
