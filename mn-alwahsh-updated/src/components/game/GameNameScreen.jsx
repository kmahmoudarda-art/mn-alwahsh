import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, BookOpen, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InstructionManual from './InstructionManual';

function InstallBanner({ prompt, onDismiss }) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,0,0,0.97)',
        borderTop: '2px solid #CC0000',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 -4px 30px rgba(204,0,0,0.35)',
      }}
      dir="rtl"
    >
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FFE4E4', fontFamily: 'var(--font-cairo)' }}>
          ثبّت من الوحش على هاتفك
        </p>
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,150,150,0.7)', fontFamily: 'var(--font-cairo)' }}>
          العب بدون إنترنت، مثل تطبيق حقيقي
        </p>
      </div>
      <button
        onClick={() => { prompt.prompt(); onDismiss(); }}
        style={{
          background: 'linear-gradient(135deg, #6B0000, #CC0000)',
          color: '#FFE4E4', border: 'none', borderRadius: 10,
          padding: '8px 16px', fontSize: 13, fontWeight: 700,
          fontFamily: 'var(--font-cairo)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 0 14px rgba(204,0,0,0.5)',
        }}
      >
        <Download style={{ width: 14, height: 14 }} />
        تثبيت
      </button>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,100,100,0.6)', padding: 4 }}>
        <X style={{ width: 16, height: 16 }} />
      </button>
    </motion.div>
  );
}

export default function GameNameScreen({ onEnter }) {
  const [name, setName] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onEnter(trimmed);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl" style={{ background: '#050000' }}>
      <style>{`
        @keyframes titleFlicker {
          0%,100% { text-shadow: 0 0 12px #FF0000, 0 0 40px #CC0000, 0 0 80px #8B0000; }
          48%      { text-shadow: 0 0 8px #FF0000, 0 0 25px #CC0000; }
          50%      { opacity: 0.88; }
          52%      { text-shadow: 0 0 12px #FF0000, 0 0 40px #CC0000; }
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
      `}</style>

      <AnimatePresence>{showManual && <InstructionManual onClose={() => setShowManual(false)} />}</AnimatePresence>

      <AnimatePresence>
        {showInstall && installPrompt && (
          <InstallBanner prompt={installPrompt} onDismiss={() => setShowInstall(false)} />
        )}
      </AnimatePresence>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 110% 70% at 50% 30%, #2a0000 0%, #0d0000 60%, #050000 100%)', zIndex: 0,
      }} />
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: 'cover', objectPosition: 'center', zIndex: 1 }}>
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.35)', zIndex: 2 }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)', zIndex: 2,
      }} />

      {/* Floating skulls */}
      {[
        { left: '5%',  top: '16%',    fontSize: 50, dur: '4.5s', del: '0s'   },
        { right: '5%', top: '20%',    fontSize: 36, dur: '5.5s', del: '1s'   },
        { left: '7%',  bottom: '16%', fontSize: 28, dur: '6s',   del: '2s'   },
        { right: '6%', bottom: '20%', fontSize: 44, dur: '4s',   del: '0.5s' },
      ].map((s, i) => (
        <div key={i} className="absolute pointer-events-none select-none"
          style={{ ...s, zIndex: 3, animation: `skullHover ${s.dur} ease-in-out infinite ${s.del}` }}>
          💀
        </div>
      ))}

      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
        height: '28vh', background: 'linear-gradient(to top, rgba(90,0,0,0.35) 0%, transparent 100%)',
        animation: 'fogBase 4s ease-in-out infinite', zIndex: 2,
      }} />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-md relative"
        style={{ zIndex: 10 }}
      >
        {/* Title */}
        <div className="text-center mb-6">
          <motion.h1
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 120 }}
            className="font-cairo font-black tracking-tight"
            style={{ fontSize: 'clamp(42px, 10vw, 80px)', color: '#CC0000', animation: 'titleFlicker 4s ease-in-out infinite', lineHeight: 1.1 }}
          >
            من الوحش
          </motion.h1>
          <p className="text-base font-tajawal font-bold mb-3"
            style={{ color: '#FF6666', textShadow: '0 0 10px rgba(204,0,0,0.6)', letterSpacing: '0.05em' }}>
            لعبة المعرفة والتحدي
          </p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, #CC0000, transparent)' }} />
            <span style={{ fontSize: 16 }}>⚔️</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #CC0000, transparent)' }} />
          </div>

          {/* How to play + Install row */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setShowManual(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-cairo font-bold text-sm transition-all"
              style={{ background: 'rgba(10,0,0,0.7)', border: '1px solid rgba(139,0,0,0.7)', color: '#FFE4E4', backdropFilter: 'blur(8px)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,0,0,0.7)'; }}
            >
              <BookOpen className="w-4 h-4" style={{ color: '#CC0000' }} />
              كيف تلعب؟
            </button>

            <button
              onClick={() => installPrompt ? (installPrompt.prompt(), setShowInstall(false)) : setShowInstall(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-cairo font-bold text-sm transition-all"
              style={{ background: 'rgba(10,0,0,0.7)', border: '1px solid rgba(139,0,0,0.7)', color: '#FFE4E4', backdropFilter: 'blur(8px)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,0,0,0.7)'; }}
            >
              <Download className="w-4 h-4" style={{ color: '#CC0000' }} />
              تثبيت
            </button>
          </div>
        </div>

        {/* Game name form */}
        <div style={{
          background: 'rgba(5,0,0,0.7)', borderRadius: 18,
          border: '1.5px solid rgba(139,0,0,0.35)', padding: 20,
          backdropFilter: 'blur(10px)',
        }}>
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#FFE4E4', fontFamily: 'var(--font-cairo)', marginBottom: 14 }}>
            أدخل اسم اللعبة
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input
              placeholder="مثال: حبيبي يا غالي 🎉"
              value={name}
              onChange={e => setName(e.target.value)}
              className="horror-input text-center font-cairo rounded-xl"
              style={{
                background: 'rgba(5,0,0,0.85)', border: '2px solid #8B0000',
                color: '#FFE4E4', backdropFilter: 'blur(8px)', fontSize: 15, height: 50,
              }}
            />
            <motion.div whileHover={{ scale: name.trim() ? 1.02 : 1 }} whileTap={{ scale: name.trim() ? 0.97 : 1 }}>
              <Button
                type="submit"
                disabled={!name.trim()}
                className="w-full font-cairo font-bold py-5 rounded-xl gap-2 disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #6B0000 0%, #CC0000 50%, #6B0000 100%)',
                  color: '#FFE4E4', border: '1px solid rgba(255,60,60,0.4)', fontSize: 16,
                  boxShadow: name.trim() ? '0 0 20px rgba(139,0,0,0.55)' : 'none',
                }}
              >
                <Gamepad2 className="w-5 h-5" />
                إنشاء لعبة
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
