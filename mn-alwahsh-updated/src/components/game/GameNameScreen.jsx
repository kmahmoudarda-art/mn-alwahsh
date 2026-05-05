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
      style={{ background: '#0a0000' }}
    >
      <style>{`
        @keyframes titleDrip {
          0%, 100% { text-shadow: 0 0 10px rgba(204,0,0,0.8), 0 0 30px rgba(139,0,0,0.5); }
          50%       { text-shadow: 0 0 20px rgba(255,0,0,1), 0 0 60px rgba(204,0,0,0.8), 0 0 100px rgba(139,0,0,0.4); }
        }
        @keyframes bgPulse {
          0%, 100% { opacity: 0.2; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      <AnimatePresence>{showManual && <InstructionManual onClose={() => setShowManual(false)} />}</AnimatePresence>

      {/* Paw print background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url('https://media.base44.com/images/public/69dca0dfc53463f8eae196fc/30ca55b32_image.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.12,
          animation: 'bgPulse 3s ease-in-out infinite',
          filter: 'sepia(1) saturate(3) hue-rotate(320deg)',
        }}
      />

      {/* Red vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(139,0,0,0.3) 100%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm text-center relative z-10"
      >
        <motion.h1
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-6xl md:text-8xl font-cairo font-black mb-2 tracking-tight"
          style={{
            color: '#CC0000',
            animation: 'titleDrip 2.5s ease-in-out infinite',
          }}
        >
          من الوحش
        </motion.h1>
        <p
          className="text-lg font-tajawal mb-4 font-bold"
          style={{ color: '#FF6666', textShadow: '0 0 8px rgba(204,0,0,0.5)' }}
        >
          لعبة المعرفة والتحدي
        </p>
        <button
          onClick={() => setShowManual(true)}
          className="flex items-center gap-2 mx-auto mb-8 px-4 py-2 rounded-xl font-cairo font-bold text-sm transition-all"
          style={{
            background: '#1a0000',
            border: '1px solid #8B0000',
            color: '#FFE4E4',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 15px #CC0000, 0 0 30px #8B0000'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <BookOpen className="w-4 h-4" />
          كيف تلعب؟
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-cairo font-bold mb-2" style={{ color: '#FFE4E4' }}>
              اسم اللعبة
            </label>
            <Input
              placeholder="مثال: حبيبي يا غالي 🎉"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-center text-base font-cairo h-12"
              style={{
                background: '#0d0000',
                border: '2px solid #8B0000',
                color: '#FFE4E4',
              }}
            />
            {name.trim() && (
              <p className={`text-xs font-tajawal mt-1 ${exists ? 'text-green-500' : ''}`} style={!exists ? { color: '#FF6666' } : {}}>
                {exists ? '✅ لعبة موجودة — سيتم الاستئناف من آخر نقطة' : '🆕 اسم جديد — سيتم إنشاء لعبة جديدة'}
              </p>
            )}
          </div>

          <motion.div whileHover={{ scale: name.trim() ? 1.02 : 1 }} whileTap={{ scale: name.trim() ? 0.98 : 1 }}>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="w-full text-lg font-cairo font-bold py-6 rounded-xl gap-2 disabled:opacity-40 transition-all"
              style={{
                background: 'linear-gradient(135deg, #8B0000, #4a0000)',
                color: '#FFE4E4',
                border: '1px solid #CC0000',
                boxShadow: name.trim() ? '0 0 15px rgba(139,0,0,0.5)' : 'none',
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
