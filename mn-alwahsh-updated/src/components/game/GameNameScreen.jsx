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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden" dir="rtl">
      <AnimatePresence>{showManual && <InstructionManual onClose={() => setShowManual(false)} />}</AnimatePresence>
      {/* Paw print background */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `url('https://media.base44.com/images/public/69dca0dfc53463f8eae196fc/30ca55b32_image.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
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
          className="text-6xl md:text-8xl font-cairo font-black text-primary mb-2 tracking-tight"
        >
          من الوحش
        </motion.h1>
        <p className="text-foreground text-lg font-tajawal mb-4 font-bold">لعبة المعرفة والتحدي</p>
        <button
          onClick={() => setShowManual(true)}
          className="flex items-center gap-2 mx-auto mb-8 px-4 py-2 rounded-xl bg-secondary text-foreground font-cairo font-bold text-sm hover:bg-secondary/80 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          كيف تلعب؟
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-cairo font-bold text-foreground mb-2">
              اسم اللعبة
            </label>
            <Input
              placeholder="مثال: حبيبي يا غالي 🎉"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-center text-base font-cairo h-12 border-2 border-black"
            />
            {name.trim() && (
              <p className={`text-xs font-tajawal mt-1 ${exists ? 'text-green-500' : 'text-muted-foreground'}`}>
                {exists ? '✅ لعبة موجودة — سيتم الاستئناف من آخر نقطة' : '🆕 اسم جديد — سيتم إنشاء لعبة جديدة'}
              </p>
            )}
          </div>

          <motion.div whileHover={{ scale: name.trim() ? 1.02 : 1 }} whileTap={{ scale: name.trim() ? 0.98 : 1 }}>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="w-full text-lg font-cairo font-bold py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl gap-2 disabled:opacity-40"
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