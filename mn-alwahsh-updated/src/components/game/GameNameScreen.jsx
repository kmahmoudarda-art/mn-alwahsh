import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, BookOpen, Search, Plus, Clock, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import InstructionManual from './InstructionManual';
import { listSessions, loadSession } from '../../utils/sessionStore';
import { getIcon } from '../../utils/categoryIcons';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${d} يوم`;
}

function GameCard({ session, onResume }) {
  const cats = session.categories || [];
  const t1 = session.teams?.[1];
  const t2 = session.teams?.[2];
  const total = 36;
  const done = session.answeredTiles?.length || 0;
  const pct = Math.round((done / total) * 100);

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(204,0,0,0.5)' }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onResume(session._name)}
      dir="rtl"
      style={{
        width: '100%', textAlign: 'right',
        background: 'rgba(15,0,0,0.85)',
        border: '1.5px solid rgba(139,0,0,0.5)',
        borderRadius: 16, padding: '14px 16px',
        cursor: 'pointer', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,150,150,0.7)', fontFamily: 'var(--font-cairo)' }}>
          <Clock style={{ display: 'inline', width: 10, height: 10, marginLeft: 3 }} />
          {timeAgo(session.savedAt)}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 800, color: '#FFE4E4',
          fontFamily: 'var(--font-cairo)', lineHeight: 1.2,
        }}>
          {session._name}
        </span>
      </div>

      {/* Teams */}
      {t1 && t2 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#22c55e', fontFamily: 'var(--font-cairo)' }}>{t2.score}</span>
            <span style={{ fontSize: 11, color: '#FFE4E4', opacity: 0.8, fontFamily: 'var(--font-cairo)' }}>{t2.name}</span>
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,200,200,0.5)', fontFamily: 'var(--font-cairo)' }}>⚔️</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#FFE4E4', opacity: 0.8, fontFamily: 'var(--font-cairo)' }}>{t1.name}</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', fontFamily: 'var(--font-cairo)' }}>{t1.score}</span>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ position: 'relative', height: 4, borderRadius: 99, background: 'rgba(139,0,0,0.25)' }}>
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 99,
          background: 'linear-gradient(to left, #CC0000, #8B0000)',
          boxShadow: '0 0 6px rgba(204,0,0,0.6)',
          transition: 'width 0.4s ease',
        }} />
        <span style={{
          position: 'absolute', left: 0, top: -14,
          fontSize: 9, color: 'rgba(255,150,150,0.7)', fontFamily: 'var(--font-cairo)',
        }}>{pct}% مكتمل</span>
      </div>

      {/* Category icons */}
      {cats.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 2 }}>
          {cats.map(c => (
            <span key={c} style={{ fontSize: 16 }} title={c}>{getIcon(c)}</span>
          ))}
        </div>
      )}

      {/* Resume label */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        background: 'rgba(139,0,0,0.25)', borderRadius: 8, padding: '4px 0',
        border: '1px solid rgba(204,0,0,0.2)',
      }}>
        <Gamepad2 style={{ width: 12, height: 12, color: '#CC0000' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#FF6666', fontFamily: 'var(--font-cairo)' }}>
          اضغط للاستئناف
        </span>
      </div>
    </motion.button>
  );
}

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
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState([]);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    setSessions(listSessions());

    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const filtered = sessions.filter(s =>
    !search.trim() || (s._name || '').toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onEnter(trimmed);
  };

  const nameExists = name.trim()
    ? sessions.some(s => (s._name || '').toLowerCase() === name.trim().toLowerCase())
    : false;

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
            style={{ fontSize: 'clamp(64px, 15vw, 110px)', color: '#CC0000', animation: 'titleFlicker 4s ease-in-out infinite', lineHeight: 1.05 }}
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

            {/* Manual install tip (always visible on mobile) */}
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

        {/* Saved games section */}
        {sessions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,150,150,0.6)', fontFamily: 'var(--font-cairo)' }}>
                {sessions.length} لعبة
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#CC0000', fontFamily: 'var(--font-cairo)', textShadow: '0 0 8px rgba(204,0,0,0.5)' }}>
                الألعاب الجارية
              </span>
            </div>

            {/* Search */}
            {sessions.length > 2 && (
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  width: 14, height: 14, color: 'rgba(204,0,0,0.6)',
                }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث عن لعبة..."
                  className="horror-input"
                  style={{
                    width: '100%', padding: '8px 12px 8px 36px',
                    background: 'rgba(5,0,0,0.8)', border: '1.5px solid rgba(139,0,0,0.4)',
                    borderRadius: 10, color: '#FFE4E4', fontSize: 13, fontFamily: 'var(--font-cairo)',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto', paddingBottom: 4 }}>
              {filtered.length === 0 && search && (
                <p style={{ textAlign: 'center', color: 'rgba(255,100,100,0.5)', fontFamily: 'var(--font-cairo)', fontSize: 13 }}>
                  لا توجد نتائج
                </p>
              )}
              {filtered.map(s => (
                <GameCard key={s._name} session={s} onResume={onEnter} />
              ))}
            </div>
          </div>
        )}

        {/* New game form */}
        <div style={{
          background: 'rgba(5,0,0,0.7)', borderRadius: 18,
          border: '1.5px solid rgba(139,0,0,0.35)', padding: 20,
          backdropFilter: 'blur(10px)',
        }}>
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#FFE4E4', fontFamily: 'var(--font-cairo)', marginBottom: 14 }}>
            {sessions.length > 0 ? '+ إنشاء لعبة جديدة' : 'أدخل اسم اللعبة'}
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
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
              {name.trim() && (
                <p className="text-xs font-tajawal mt-1.5 text-center" style={{ color: nameExists ? '#4ade80' : '#FF6666' }}>
                  {nameExists ? '✅ لعبة موجودة — اضغط للاستئناف' : '🆕 اسم جديد — لعبة جديدة'}
                </p>
              )}
            </div>
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
                {nameExists ? 'استئناف اللعبة' : 'إنشاء لعبة'}
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
