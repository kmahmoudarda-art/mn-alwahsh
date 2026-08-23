import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { fetchCategories } from '../../utils/supabaseClient';
import CATEGORY_ICONS, { getIcon } from '../../utils/categoryIcons';
import { isPremiumCategory, getPremiumPriceLabel, isTestAccount, ALL_CATEGORIES_PRICE, TRIAL_PRICE } from '../../utils/premiumConfig';
import { isSignedIn, getCurrentUser } from '../../utils/authClient';
import { fetchUnlockedCategories } from '../../utils/entitlements';
import { startZiinaCheckout } from '../../utils/ziinaClient';
import { isHiddenCategory } from '../../utils/hiddenCategories';
import AuthForm from './AuthForm';

const CATEGORY_GROUPS = {
  '⚽ رياضة': ['football logo', 'football Logo', 'Football Logo', 'FOOTBALL LOGO', 'رياضة', 'CR7', 'ميسي', 'كأس العرب', 'كأس آسيا', 'Champions League', 'المنتخب الأردني', 'League of Legends', 'Real Madrid', 'Barcelona', 'WildRift', 'ريال مدريد', 'برشلونة', 'برشلونه', 'وايلد ريفت', 'محترف كرة', 'كلاسيكو'],
  '🎬 ترفيه': ['جيم اوف ثرونز', 'جميل وهناء', 'جميل و هناء', 'أفلام عربية', 'أفلام إنجليزية', 'نتفليكس', 'بريكينج باد', 'بيكي بلايندرز', 'بريزون بريك', 'مسلسلات تركية', 'أفلام رعب', 'Friends', 'Arab Idol', 'Arab Got Talent', 'مسرحيات عربية', 'Game of Thrones', 'باب الحارة', 'أفلام احمد حلمي', 'Who Said GOT'],
  '🎵 موسيقى وفنانون': ['أم كلثوم', 'عبد الحليم', 'حمو بيكا', 'تامر حسني', 'عمرو دياب', 'أغاني', 'أغاني قديمة', 'فنانون عرب', 'من غنى ؟', 'لمن الاغنية'],
  '🌍 جغرافيا وثقافة': ['أعلام العالم', 'علوم', 'جغرافيا', 'الإمارات', 'الأردن', 'دبي', 'تاريخ', 'براندات', 'English Lang', 'English Questions', 'أسئلة إنجليزية', 'دول'],
  '💻 تكنولوجيا': ['هواتف ذكية', 'تكنولوجيا', 'سيارات'],
  '👑 بنات': ['بنات فقط', 'سبيستون', 'Sephora', 'سيفورا', 'guess fashion', 'Guess Fashion', 'GUESS FASHION', 'Guess fashion', 'Dubai Bling'],
  '🧒 أطفال': ['kids', 'Kids', 'KIDS', 'kids guess', 'Kids Guess', 'Kids guess', 'KIDS GUESS', 'Kids guess ', 'Kids Guess ', 'kids easy', 'Kids Easy', 'Kids easy', 'KIDS EASY', 'guess fashion easy', 'Guess Fashion Easy', 'Guess fashion easy', 'GUESS FASHION EASY', 'أطفال', 'عالم الأطفال', 'رسوم متحركة', 'كرتون', 'ديزني', 'Disney', 'بيبي شارك', 'Baby Shark', 'سبونج بوب', 'SpongeBob', 'حشرات', 'من الشخصية ؟'],
  '🧠 تحديات': ['IQ', 'رياضيات', 'الغاز محيرة', 'عادات غريبة', 'Logos', 'فلسفة', 'محاسبة'],
  '☪️ ديني': ['إسلامي', 'سيرة نبوية', 'فتوحات إسلامية'],
  '🎲 متفرقات': ['أكل عربي', 'حيوانات', 'Dangerous Animals', 'حيوانات خطرة', 'حيوانات خطيرة', 'معلومات عامة'],
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
    if (isHiddenCategory(cat)) continue; // hidden entirely — not shown, not selectable
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
  const [unlockPromptFor, setUnlockPromptFor] = useState(null);
  const [unlockedCategories, setUnlockedCategories] = useState([]);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState(null);
  // One-game-only unlocks from the 1 AED trial — never written to Supabase,
  // never persisted, so it naturally resets whenever CategoryPicker remounts
  // for a new game. See TRIAL_PRICE note in premiumConfig.js.
  const [trialCategories, setTrialCategories] = useState([]);

  const loadEntitlements = () => {
    fetchUnlockedCategories().then(setUnlockedCategories);
  };

  const load = () => {
    setLoading(true);
    setError(null);
    fetchCategories()
      .then(setCategories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    loadEntitlements();
  };

  useEffect(() => { load(); }, []);

  // Pick up a trial grant that PaymentResult.jsx stashed in sessionStorage
  // after a successful 1 AED Ziina payment — consumed once, then cleared.
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('mn_alwahsh_pending_trial');
      if (pending) {
        setTrialCategories(prev => prev.includes(pending) ? prev : [...prev, pending]);
        sessionStorage.removeItem('mn_alwahsh_pending_trial');
      }
    } catch {}
  }, []);

  const isUnlocked = (name) => !isPremiumCategory(name) || unlockedCategories.includes(name) || trialCategories.includes(name) || isTestAccount(getCurrentUser());

  const toggleGroup = (g) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  };

  const pickRandom = () => {
    if (!categories.length) return;
    const eligible = categories.filter(c => !isHiddenCategory(c) && isUnlocked(c));
    const pool = eligible.length ? eligible : categories.filter(c => !isHiddenCategory(c));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    onSetSelected(shuffled.slice(0, Math.min(max, shuffled.length)));
  };

  const handleUnlock = async (name) => {
    setUnlockError(null);
    setUnlocking(true);
    try {
      await startZiinaCheckout({ kind: 'category', category: name });
      // Browser navigates away to Ziina's hosted page — nothing more to do here.
    } catch (err) {
      setUnlockError('تعذر بدء عملية الدفع — حاول مرة أخرى');
      setUnlocking(false);
    }
  };

  const handleUnlockAll = async () => {
    setUnlockError(null);
    setUnlocking(true);
    try {
      await startZiinaCheckout({ kind: 'all' });
    } catch (err) {
      setUnlockError('تعذر بدء عملية الدفع — حاول مرة أخرى');
      setUnlocking(false);
    }
  };

  // Trial also goes through real payment now — 1 AED via Ziina — but grants
  // only a local, one-game unlock on return (see PaymentResult.jsx), never
  // written to Supabase.
  const handleTrial = async (name) => {
    setUnlockError(null);
    setUnlocking(true);
    try {
      await startZiinaCheckout({ kind: 'trial', category: name });
    } catch (err) {
      setUnlockError('تعذر بدء عملية الدفع — حاول مرة أخرى');
      setUnlocking(false);
    }
  };

  if (loading) return <p className="text-center font-tajawal text-sm py-4" style={{ color: '#FF6666' }}>جاري تحميل الفئات...</p>;

  if (error) return (
    <div className="text-center py-4 space-y-2">
      <p className="font-tajawal text-xs break-all" style={{ color: '#FF6666' }}>{error}</p>
      <button onClick={load} className="text-xs underline font-cairo" style={{ color: '#CC0000' }}>إعادة المحاولة</button>
    </div>
  );

  const grouped = groupCategories(categories);
  const hasLockedCategories = categories.some((c) => isPremiumCategory(c) && !isUnlocked(c));

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
        @media (orientation: landscape) and (max-height: 600px) {
          .cat-scroll-area { height: calc(100svh - 130px) !important; }
          .cat-btn { height: 64px !important; }
          .cat-btn span:first-child { font-size: 22px !important; }
          .cat-btn span:last-child { font-size: 10px !important; }
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

      {hasLockedCategories && !isSignedIn() && (
        <p dir="rtl" className="font-tajawal text-center" style={{
          fontSize: 12, color: '#FFD700', marginBottom: 10,
          background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 10, padding: '8px 10px',
        }}>
          🔒 سجّل الدخول لفتح المزيد من الفئات أو شرائها
        </p>
      )}

      <div className="cat-scroll-area category-scroll overflow-y-auto overflow-x-hidden" style={{ height: '60vh', scrollBehavior: 'smooth' }}>
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
                        const locked = isPremiumCategory(name) && !isUnlocked(name);

                        return (
                          <motion.button
                            key={name}
                            whileHover={!isDisabled ? { scale: 1.05 } : {}}
                            whileTap={!isDisabled ? { scale: 0.95 } : {}}
                            onClick={() => {
                              if (isDisabled) return;
                              if (locked) { setUnlockPromptFor(name); return; }
                              onToggle(name);
                            }}
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
                              opacity: isDisabled ? 0.4 : locked ? 0.75 : 1,
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
                            {locked && (
                              <div
                                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow"
                                style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid #FFD700' }}
                                title="فئة مميزة — بحاجة لفتحها"
                              >
                                <Lock className="w-3 h-3" style={{ color: '#FFD700' }} />
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

      {/* Unlock prompt — placeholder until Google Play Billing is wired in (see premiumConfig.js) */}
      <AnimatePresence>
        {unlockPromptFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setUnlockPromptFor(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
              style={{
                width: '100%', maxWidth: 340,
                background: 'linear-gradient(135deg, #2a0000, #140000)',
                border: '1.5px solid #FFD700',
                borderRadius: 16,
                padding: 24,
                textAlign: 'center',
                boxShadow: '0 0 30px rgba(255,215,0,0.25)',
              }}
            >
              <Lock className="w-8 h-8 mx-auto mb-3" style={{ color: '#FFD700' }} />
              <h3 className="font-cairo font-bold text-lg mb-1" style={{ color: '#FFE4E4' }}>
                {unlockPromptFor}
              </h3>
              <p className="font-tajawal text-sm mb-4" style={{ color: '#FF9999' }}>
                فئة مميزة — {getPremiumPriceLabel(unlockPromptFor)}
              </p>

              {isSignedIn() ? (
                <>
                  {unlockError && (
                    <p className="font-tajawal text-xs mb-2" style={{ color: '#FF6666' }}>{unlockError}</p>
                  )}
                  <button
                    onClick={() => handleUnlock(unlockPromptFor)}
                    disabled={unlocking}
                    className="w-full font-cairo font-bold rounded-xl py-3 mb-2 disabled:opacity-50"
                    style={{ background: '#FFD700', color: '#2a0000' }}
                  >
                    {unlocking ? '...' : `فتح هذه الفئة — ${getPremiumPriceLabel(unlockPromptFor)}`}
                  </button>
                  <button
                    onClick={handleUnlockAll}
                    disabled={unlocking}
                    className="w-full font-cairo font-bold rounded-xl py-3 mb-2 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#2a0000' }}
                  >
                    {unlocking ? '...' : `فتح جميع الفئات — ${ALL_CATEGORIES_PRICE} AED`}
                  </button>
                  <button
                    onClick={() => handleTrial(unlockPromptFor)}
                    disabled={unlocking}
                    className="w-full font-cairo font-bold rounded-xl py-3 mb-2 disabled:opacity-50"
                    style={{ background: 'rgba(255,215,0,0.12)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.4)' }}
                  >
                    {`جرّبها لهذه اللعبة فقط — ${TRIAL_PRICE} AED`}
                  </button>
                  <p className="font-tajawal text-xs mb-2" style={{ color: 'rgba(255,150,150,0.7)' }}>
                    التجربة تفتح الفئة لهذه اللعبة فقط، وتُقفل مرة أخرى بعدها
                  </p>
                  <button
                    onClick={() => setUnlockPromptFor(null)}
                    className="w-full font-cairo text-sm py-2"
                    style={{ color: '#FF9999' }}
                  >
                    إلغاء
                  </button>
                </>
              ) : (
                <>
                  <AuthForm onSignedIn={() => { loadEntitlements(); }} />
                  <button
                    onClick={() => setUnlockPromptFor(null)}
                    className="w-full font-cairo text-sm py-2 mt-2"
                    style={{ color: '#FF9999' }}
                  >
                    إلغاء
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
