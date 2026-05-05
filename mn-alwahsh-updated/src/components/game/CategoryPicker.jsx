import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { fetchCategories } from '../../utils/supabaseClient';
import CATEGORY_ICONS, { getIcon } from '../../utils/categoryIcons';

const CATEGORY_GROUPS = {
  '⚽ رياضة': ['football logo', 'رياضة', 'CR7', 'ميسي', 'كأس العرب', 'كأس آسيا', 'Champions League', 'المنتخب الأردني', 'League of Legends', 'Real Madrid', 'Barcelona', 'WildRift', 'ريال مدريد', 'برشلونة', 'برشلونه', 'وايلد ريفت', 'محترف كرة'],
  '🎬 ترفيه': ['جيم اوف ثرونز', 'جميل وهناء', 'جميل و هناء', 'أفلام عربية', 'أفلام إنجليزية', 'نتفليكس', 'بريكينج باد', 'بيكي بلايندرز', 'بريزون بريك', 'مسلسلات تركية', 'أفلام رعب', 'Friends', 'Arab Idol', 'Arab Got Talent', 'مسرحيات عربية', 'Game of Thrones', 'باب الحارة'],
  '🎵 موسيقى وفنانون': ['أم كلثوم', 'عبد الحليم', 'حمو بيكا', 'تامر حسني', 'عمرو دياب', 'أغاني', 'أغاني قديمة', 'فنانون عرب'],
  '🌍 جغرافيا وثقافة': ['أعلام العالم', 'علوم', 'جغرافيا', 'الإمارات', 'الأردن', 'دبي', 'تاريخ', 'براندات', 'English Lang', 'English Questions', 'أسئلة إنجليزية'],
  '💻 تكنولوجيا': ['هواتف ذكية', 'تكنولوجيا', 'سيارات'],
  '👑 بنات': ['بنات فقط', 'سبيستون', 'Sephora', 'سيفورا'],
  '🧠 تحديات': ['IQ', 'رياضيات', 'الغاز محيرة', 'عادات غريبة', 'Logos'],
  '🎲 متفرقات': ['أكل عربي', 'حيوانات', 'Dangerous Animals', 'حيوانات خطرة'],
};

const CAT_TO_GROUP = {};
for (const [group, cats] of Object.entries(CATEGORY_GROUPS)) {
  for (const cat of cats) {
    CAT_TO_GROUP[cat.toLowerCase().trim()] = group;
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

export default function CategoryPicker({ selected, onToggle, onSetSelected, max }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openGroups, setOpenGroups] = useState(new Set());

  const load = () => {
    setLoading(true);
    setError(null);
    fetchCategories()
      .then(setCategories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleGroup = (g) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  };

  const pickRandom = () => {
    if (!categories.length) return;
    const shuffled = [...categories].sort(() => Math.random() - 0.5);
    onSetSelected(shuffled.slice(0, Math.min(max, shuffled.length)));
  };

  if (loading) return <p className="text-center font-tajawal text-sm py-4" style={{ color: '#FF6666' }}>جاري تحميل الفئات...</p>;

  if (error) return (
    <div className="text-center py-4 space-y-2">
      <p className="font-tajawal text-xs break-all" style={{ color: '#FF6666' }}>{error}</p>
      <button onClick={load} className="text-xs underline font-cairo" style={{ color: '#CC0000' }}>إعادة المحاولة</button>
    </div>
  );

  const grouped = groupCategories(categories);

  return (
    <>
      <style>{`
        .category-scroll::-webkit-scrollbar { width: 6px; }
        .category-scroll::-webkit-scrollbar-track { background: transparent; }
        .category-scroll::-webkit-scrollbar-thumb { background: rgba(139,0,0,0.5); border-radius: 10px; }
        .cat-btn:hover {
          box-shadow: 0 0 12px rgba(204,0,0,0.6), inset 0 0 8px rgba(139,0,0,0.2) !important;
          border-color: #CC0000 !important;
        }
      `}</style>

      {/* Random pick button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={pickRandom}
        dir="rtl"
        className="w-full mb-3 flex items-center justify-center gap-2 rounded-xl font-cairo font-bold"
        style={{
          padding: '10px 16px',
          background: 'linear-gradient(135deg, rgba(80,0,0,0.7), rgba(40,0,0,0.9))',
          border: '1.5px solid #CC0000',
          color: '#FFE4E4',
          fontSize: 14,
          boxShadow: '0 0 12px rgba(139,0,0,0.4)',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 18 }}>🎲</span>
        اختيار عشوائي
      </motion.button>

      <div className="category-scroll overflow-y-auto overflow-x-hidden" style={{ height: '60vh', scrollBehavior: 'smooth' }}>
        {Object.entries(grouped).map(([groupName, cats]) => {
          const isOpen = openGroups.has(groupName);
          const selectedCount = cats.filter(c => selected.includes(c)).length;

          return (
            <div key={groupName} style={{ marginBottom: 6 }}>
              {/* Collapsible group header */}
              <button
                onClick={() => toggleGroup(groupName)}
                dir="rtl"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13, fontWeight: 700, color: '#CC0000',
                  textShadow: '0 0 8px rgba(204,0,0,0.5)',
                  padding: '10px 10px',
                  borderRadius: isOpen ? '10px 10px 0 0' : 10,
                  background: isOpen ? 'rgba(80,0,0,0.4)' : 'rgba(40,0,0,0.5)',
                  border: '1px solid rgba(139,0,0,0.35)',
                  cursor: 'pointer', fontFamily: 'var(--font-cairo)',
                  transition: 'background 0.2s',
                  marginBottom: 0,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {groupName}
                  {selectedCount > 0 && (
                    <span style={{
                      background: '#CC0000', color: '#fff', borderRadius: 99,
                      fontSize: 10, fontWeight: 800, padding: '1px 7px',
                      boxShadow: '0 0 6px rgba(204,0,0,0.6)',
                    }}>
                      {selectedCount}
                    </span>
                  )}
                </span>
                <span style={{
                  fontSize: 11, opacity: 0.7, display: 'inline-block',
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>▼</span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    style={{
                      overflow: 'hidden',
                      background: 'rgba(20,0,0,0.3)',
                      borderRadius: '0 0 10px 10px',
                      border: '1px solid rgba(139,0,0,0.2)',
                      borderTop: 'none',
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: 8 }}>
                      {cats.map((name) => {
                        const isSelected = selected.includes(name);
                        const isDisabled = !isSelected && selected.length >= max;
                        const emoji = getIcon(name);

                        return (
                          <motion.button
                            key={name}
                            whileHover={!isDisabled ? { scale: 1.05 } : {}}
                            whileTap={!isDisabled ? { scale: 0.95 } : {}}
                            onClick={() => !isDisabled && onToggle(name)}
                            disabled={isDisabled}
                            dir="rtl"
                            className="cat-btn relative rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1"
                            style={{
                              height: 85,
                              background: isSelected
                                ? 'linear-gradient(135deg, rgba(139,0,0,0.5), rgba(74,0,0,0.7))'
                                : isDisabled ? 'rgba(26,0,0,0.3)' : 'rgba(26,0,0,0.6)',
                              border: isSelected
                                ? '2px solid #CC0000'
                                : isDisabled ? '2px solid #2a0000' : '2px solid #4a0000',
                              boxShadow: isSelected ? '0 0 15px rgba(204,0,0,0.5), inset 0 0 8px rgba(139,0,0,0.3)' : 'none',
                              opacity: isDisabled ? 0.4 : 1,
                            }}
                          >
                            <span style={{ fontSize: 32, lineHeight: 1 }}>{emoji}</span>
                            <span
                              className="font-tajawal text-center leading-tight px-1"
                              style={{ fontSize: 12, color: '#FFE4E4', fontWeight: 600 }}
                            >
                              {name}
                            </span>
                            {isSelected && (
                              <div
                                className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center shadow"
                                style={{ background: '#CC0000' }}
                              >
                                <Check className="w-2.5 h-2.5" style={{ color: '#FFE4E4' }} />
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </>
  );
}
