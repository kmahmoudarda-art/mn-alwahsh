import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CategoryPicker from './CategoryPicker';

const CATEGORY_ICONS = {
  'رياضة': '⚽', 'تاريخ': '📜', 'جغرافيا': '🌍', 'علوم': '🔬',
  'أفلام عربية': '🎬', 'أفلام إنجليزية': '🎥', 'نتفليكس': '🎞️',
  'بريكينج باد': '🧪', 'بيكي بلايندرز': '🎩', 'بريزون بريك': '🔓',
  'مسلسلات تركية': '🌙', 'أفلام رعب': '👻', 'CR7': '🥇', 'ميسي': '🐐',
  'أم كلثوم': '🎤', 'عبد الحليم': '🎵', 'حمو بيكا': '🎧',
  'تامر حسني': '🎶', 'عمرو دياب': '🌟', 'Arab Idol': '🏆',
  'Arab Got Talent': '🎭', 'الإمارات': '🇦🇪', 'الأردن': '🇯🇴',
  'دبي': '🏙️', 'كأس العرب': '🏆', 'كأس آسيا': '🥈',
  'Champions League': '⭐', 'المنتخب الأردني': '⚽', 'هواتف ذكية': '📱',
  'تكنولوجيا': '💻', 'سيارات': '🚗', 'براندات': '👜', 'سبيستون': '🚀',
  'بنات فقط': '👑', 'مسرحيات عربية': '🎭', 'حيوانات': '🦁',
  'أغاني': '🎼', 'أغاني قديمة': '📻', 'Friends': '☕',
  'League of Legends': '🎮', 'أكل عربي': '🍽️', 'IQ': '🧠',
  'رياضيات': '➗', 'English Lang': '🔤', 'Logos': '🖼️',
  'football logo': '🗿', 'Football logo': '🗿', 'FOOTBALL LOGO': '🗿', 'football Logo': '🗿',
};

function getIcon(name) {
  return CATEGORY_ICONS[name] || CATEGORY_ICONS[name?.trim()] || '🎯';
}

function SelectedCategoryColumn({ categories, teamName, side, onRemove }) {
  const isRed = side === 'right';
  const color = isRed ? '#CC0000' : '#1155CC';
  const glow = isRed ? 'rgba(204,0,0,0.5)' : 'rgba(17,85,204,0.5)';
  const bg = isRed ? 'rgba(80,0,0,0.85)' : 'rgba(0,20,80,0.85)';
  const border = isRed ? 'rgba(204,0,0,0.5)' : 'rgba(17,85,204,0.5)';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      [side]: 0,
      width: 80,
      height: '100vh',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '10px 6px',
      background: `linear-gradient(to ${side === 'right' ? 'left' : 'right'}, ${bg}, transparent)`,
      pointerEvents: 'auto',
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color, textAlign: 'center',
        fontFamily: 'var(--font-cairo)', letterSpacing: '0.05em',
        textShadow: `0 0 6px ${glow}`, marginBottom: 4, lineHeight: 1.2,
        maxWidth: 72, wordBreak: 'break-word',
      }}>
        {teamName}
      </div>
      {[0, 1, 2].map(i => (
        <AnimatePresence key={i} mode="wait">
          {categories[i] ? (
            <motion.button
              key={categories[i]}
              initial={{ opacity: 0, scale: 0.6, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              whileHover={{ scale: 1.08, boxShadow: `0 0 18px ${glow}` }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={() => onRemove(categories[i])}
              title="اضغط لإزالة الفئة"
              style={{
                width: 68, minHeight: 68,
                borderRadius: 12,
                background: bg,
                border: `1.5px solid ${border}`,
                boxShadow: `0 0 10px ${glow}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '6px 4px', textAlign: 'center',
                cursor: 'pointer', position: 'relative',
              }}
            >
              <span style={{ fontSize: 22 }}>{getIcon(categories[i])}</span>
              <span style={{
                fontSize: 9, color: '#FFE4E4', fontFamily: 'var(--font-cairo)',
                fontWeight: 600, lineHeight: 1.2, wordBreak: 'break-word',
              }}>
                {categories[i]}
              </span>
              <span style={{
                position: 'absolute', top: 3, left: 3,
                fontSize: 10, lineHeight: 1, opacity: 0.6, color: '#FFE4E4',
              }}>✕</span>
            </motion.button>
          ) : (
            <motion.div
              key={`empty-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                width: 68, height: 68, borderRadius: 12,
                border: `1.5px dashed ${border}`,
                opacity: 0.25,
              }}
            />
          )}
        </AnimatePresence>
      ))}
    </div>
  );
}

export default function SetupScreen({ onStartGame }) {
  const [team1Name, setTeam1Name] = useState('Monster Red');
  const [team2Name, setTeam2Name] = useState('Monster Blue');
  const [team1Categories, setTeam1Categories] = useState([]);
  const [team2Categories, setTeam2Categories] = useState([]);

  const toggleCategory = (team, name) => {
    const setter = team === 1 ? setTeam1Categories : setTeam2Categories;
    const current = team === 1 ? team1Categories : team2Categories;
    if (current.includes(name)) {
      setter(current.filter(c => c !== name));
    } else if (current.length < 3) {
      setter([...current, name]);
    }
  };

  const isValid = team1Categories.length === 3 && team2Categories.length === 3;

  const handleStart = () => {
    if (!isValid) return;
    onStartGame({
      team1: { name: team1Name.trim() || 'Monster Red', categories: team1Categories },
      team2: { name: team2Name.trim() || 'Monster Blue', categories: team2Categories },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl" style={{ background: '#0a0000' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'url(/bg-setup.jpeg)',
        backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0,
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.45)', zIndex: 0 }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.6) 100%)', zIndex: 0,
      }} />
      <style>{`
        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 10px rgba(204,0,0,0.8), 0 0 30px rgba(139,0,0,0.5); }
          50%       { text-shadow: 0 0 20px rgba(255,0,0,1), 0 0 60px rgba(204,0,0,0.8); }
        }
      `}</style>

      {/* Side columns — only on setup page */}
      <SelectedCategoryColumn
        categories={team1Categories}
        teamName={team1Name.trim() || 'Monster Red'}
        side="right"
        onRemove={(name) => toggleCategory(1, name)}
      />
      <SelectedCategoryColumn
        categories={team2Categories}
        teamName={team2Name.trim() || 'Monster Blue'}
        side="left"
        onRemove={(name) => toggleCategory(2, name)}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-3xl"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div className="text-center mb-10">
          <motion.h1
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-6xl md:text-8xl font-cairo font-black mb-2 tracking-tight"
            style={{ color: '#CC0000', animation: 'titleGlow 2.5s ease-in-out infinite' }}
          >
            من الوحش
          </motion.h1>
          <p className="text-lg font-tajawal" style={{ color: '#FF6666', textShadow: '0 0 6px rgba(204,0,0,0.5)' }}>لعبة المعرفة والتحدي</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <TeamSetupCard
            teamNumber={1}
            teamName={team1Name}
            onNameChange={setTeam1Name}
            categories={team1Categories}
            onToggle={(name) => toggleCategory(1, name)}
            onSetSelected={(cats) => setTeam1Categories(cats)}
          />
          <TeamSetupCard
            teamNumber={2}
            teamName={team2Name}
            onNameChange={setTeam2Name}
            categories={team2Categories}
            onToggle={(name) => toggleCategory(2, name)}
            onSetSelected={(cats) => setTeam2Categories(cats)}
          />
        </div>

        <motion.div
          className="flex justify-center"
          whileHover={{ scale: isValid ? 1.02 : 1 }}
          whileTap={{ scale: isValid ? 0.98 : 1 }}
        >
          <Button
            onClick={handleStart}
            disabled={!isValid}
            className="text-xl font-cairo font-bold px-12 py-6 rounded-xl gap-3 disabled:opacity-40 transition-all"
            style={{
              background: 'linear-gradient(135deg, #8B0000, #4a0000)',
              color: '#FFE4E4',
              border: '1px solid #CC0000',
              boxShadow: isValid ? '0 0 20px rgba(139,0,0,0.6), 0 0 40px rgba(139,0,0,0.3)' : 'none',
            }}
            size="lg"
          >
            <Play className="w-6 h-6" />
            ابدأ اللعبة
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function TeamSetupCard({ teamNumber, teamName, onNameChange, categories, onToggle, onSetSelected }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: teamNumber === 1 ? 30 : -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 + teamNumber * 0.1 }}
      className="rounded-2xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(139,0,0,0.15), rgba(74,0,0,0.25))',
        border: '1px solid #8B0000',
        boxShadow: '0 0 15px rgba(139,0,0,0.2)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5" style={{ color: '#CC0000' }} />
        <h2 className="text-lg font-cairo font-bold" style={{ color: '#FFE4E4' }}>الفريق {teamNumber}</h2>
      </div>

      <Input
        placeholder={teamNumber === 1 ? 'Monster Red' : 'Monster Blue'}
        value={teamName}
        onChange={(e) => onNameChange(e.target.value)}
        className="mb-3 font-cairo text-base h-12"
        style={{ background: 'rgba(13,0,0,0.8)', border: '1px solid #4a0000', color: '#FFE4E4' }}
      />

      <p className="text-xs font-tajawal mb-2" style={{ color: '#FF6666' }}>
        اختر ٣ فئات ({categories.length}/3)
      </p>
      <CategoryPicker selected={categories} onToggle={onToggle} onSetSelected={onSetSelected} max={3} />
    </motion.div>
  );
}
