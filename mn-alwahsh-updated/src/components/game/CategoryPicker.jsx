import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { fetchCategories } from '../../utils/supabaseClient';
import { base44 } from '@/api/base44Client';

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
  'رياضيات': '➗', 'English Lang': '🔤', 
  'football logo': '🗿',
  'Football logo': '🗿',
  'FOOTBALL LOGO': '🗿',
  'football Logo': '🗿'
};

const CATEGORY_GROUPS = {
  '⚽ رياضة': ['football logo', 'رياضة', 'CR7', 'ميسي', 'كأس العرب', 'كأس آسيا', 'Champions League', 'المنتخب الأردني', 'League of Legends', 'Real Madrid', 'Barcelona', 'WildRift', 'ريال مدريد', 'برشلونة', 'برشلونه', 'وايلد ريفت', 'محترف كرة'],
  '🎬 ترفيه': ['جيم اوف ثرونز','جميل وهناء','جميل و هناء','أفلام عربية', 'أفلام إنجليزية', 'نتفليكس', 'بريكينج باد', 'بيكي بلايندرز', 'بريزون بريك', 'مسلسلات تركية', 'أفلام رعب', 'Friends', 'Arab Idol', 'Arab Got Talent', 'مسرحيات عربية', 'Game of Thrones', 'باب الحارة'],
  '🎵 موسيقى وفنانون': ['أم كلثوم', 'عبد الحليم', 'حمو بيكا', 'تامر حسني', 'عمرو دياب', 'أغاني', 'أغاني قديمة','مشاهير عرب','فنانون عرب'],
  '🌍 جغرافيا وثقافة': ['جغرافيا', 'الإمارات', 'الأردن', 'دبي', 'تاريخ', 'براندات', 'English Lang', 'English Questions', 'أسئلة إنجليزية'],
  '💻 تكنولوجيا': ['هواتف ذكية', 'تكنولوجيا', 'سيارات'],
  '👑 بنات': ['بنات فقط', 'سبيستون', 'Sephora', 'سيفورا'],
  '🧠 تحديات': ['IQ', 'رياضيات', 'الغاز محيرة' ,'عادات غريبة'],
  '🎲 متفرقات': ['أكل عربي', 'علوم', 'حيوانات', 'Dangerous Animals', 'حيوانات خطرة'],
};

const CAT_TO_GROUP = {};
for (const [group, cats] of Object.entries(CATEGORY_GROUPS)) {
  for (const cat of cats) {
    CAT_TO_GROUP[cat.toLowerCase().trim()] = group;
  }
}

const iconCache = {};

async function getAutoIcon(categoryName) {
  if (iconCache[categoryName]) return iconCache[categoryName];
  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Reply with ONE emoji that best represents this quiz category: ${categoryName}. Reply with the emoji only, nothing else.`,
    });
    const emoji = (typeof result === 'string' ? result : result?.text || '🎯').trim().slice(0, 2);
    iconCache[categoryName] = emoji;
    return emoji;
  } catch {
    iconCache[categoryName] = '🎯';
    return '🎯';
  }
}

function groupCategories(categories) {
  const groups = {};
  for (const g of Object.keys(CATEGORY_GROUPS)) groups[g] = [];

  for (const cat of categories) {
    const normalizedCat = typeof cat === 'string' ? cat.toLowerCase().trim() : '';
    const g = CAT_TO_GROUP[normalizedCat];

    if (g) {
      groups[g].push(cat);
    } else {
      if (!groups['🎲 متفرقات']) groups['🎲 متفرقات'] = [];
      groups['🎲 متفرقات'].push(cat);
    }
  }
  return Object.fromEntries(Object.entries(groups).filter(([, cats]) => cats.length > 0));
}

export default function CategoryPicker({ selected, onToggle, max }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [icons, setIcons] = useState({ ...CATEGORY_ICONS });
  const loadingIcons = useRef(new Set());

  const load = () => {
    setLoading(true);
    setError(null);
    fetchCategories()
      .then(setCategories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!categories.length) return;
    const unknowns = categories.filter(c => !CATEGORY_ICONS[c] && !CATEGORY_ICONS[c.toLowerCase().trim()] && !loadingIcons.current.has(c));
    if (!unknowns.length) return;
    unknowns.forEach(c => loadingIcons.current.add(c));
    Promise.all(
      unknowns.map(async (c) => {
        const emoji = await getAutoIcon(c);
        return [c, emoji];
      })
    ).then(results => {
      setIcons(prev => {
        const next = { ...prev };
        results.forEach(([c, emoji]) => { next[c] = emoji; });
        return next;
      });
    });
  }, [categories]);

  if (loading) return <p className="text-center text-muted-foreground font-tajawal text-sm py-4">جاري تحميل الفئات...</p>;

  if (error) return (
    <div className="text-center py-4 space-y-2">
      <p className="text-red-400 font-tajawal text-xs break-all">{error}</p>
      <button onClick={load} className="text-xs text-primary underline font-cairo">إعادة المحاولة</button>
    </div>
  );

  const grouped = groupCategories(categories);

  return (
    <>
      <style>{`
        .category-scroll::-webkit-scrollbar { width: 6px; }
        .category-scroll::-webkit-scrollbar-track { background: transparent; }
        .category-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 10px; }
      `}</style>
      <div className="category-scroll overflow-y-auto overflow-x-hidden" style={{ height: '60vh', scrollBehavior: 'smooth' }}>
        {Object.entries(grouped).map(([groupName, cats]) => (
          <div key={groupName} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 700,
              color: '#000',
              letterSpacing: '0.1em',
              padding: '12px 8px 6px 8px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-cairo)',
            }}>
              {groupName}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {cats.map((name) => {
                const isSelected = selected.includes(name);
                const isDisabled = !isSelected && selected.length >= max;
                
                // Prioritize manual CATEGORY_ICONS list
                const emoji = CATEGORY_ICONS[name] || 
                              CATEGORY_ICONS[name.toLowerCase().trim()] || 
                              icons[name] || 
                              '⏳';

                return (
                  <motion.button
                    key={name}
                    whileHover={!isDisabled ? { scale: 1.05 } : {}}
                    whileTap={!isDisabled ? { scale: 0.95 } : {}}
                    onClick={() => !isDisabled && onToggle(name)}
                    disabled={isDisabled}
                    dir="rtl"
                    className={`relative rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1
                      ${isSelected
                        ? 'border-primary bg-primary/20 shadow-lg shadow-primary/40'
                        : isDisabled
                        ? 'border-border bg-muted/30 opacity-40'
                        : 'border-border bg-card/60 hover:border-primary/60 hover:bg-card/90'}
                    `}
                    style={{ height: 85 }}
                  >
                    <span style={{ fontSize: 32, lineHeight: 1 }}>{emoji}</span>
                    <span
                      className="font-tajawal text-center leading-tight px-1"
                      style={{ fontSize: 12, color: '#000', fontWeight: 600, textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' }}
                    >
                      {name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
