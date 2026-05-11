import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import FlagQuestion from './FlagQuestion';
import { fetchSwapQuestion } from '../../utils/supabaseClient';
import { getCachedImageUrl, fetchAndCacheImage } from '../../utils/questionGenerator';
import { LIFELINES } from './LifelinePanel';

const GOLD = 'hsl(45 90% 42%)';
const GOLD_BG = 'hsl(45 90% 42% / 0.85)';
const GOLD_BORDER = 'hsl(45 90% 42% / 0.5)';

const SINGER_PHOTOS = {
  'أم كلثوم':          'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/UmKulthum.jpeg',
  'عبد الحليم حافظ':   'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/AbdHaleem.jpeg',
  'فيروز':              'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Fayrooz.jpeg',
  'فريد الأطرش':       'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Fareed.jpeg',
  'محمد عبد الوهاب':   'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/MAW.jpeg',
  'عمرو دياب':         'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Amrdiab.jpeg',
  'تامر حسني':         'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Tamer.jpeg',
  'محمد منير':         'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Moneer.jpeg',
  'أصالة':              'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Asala.jpeg',
  'أنغام':              'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Angham.jpeg',
  'شيرين عبد الوهاب':  'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Shereen.jpeg',
  'نانسي عجرم':        'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Nancy.jpeg',
  'إليسا':              'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Elissa.jpeg',
  'هيفاء وهبي':        'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Haifa.jpeg',
  'كاظم الساهر':       'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Kazem.jpeg',
  'حمو بيكا':          'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Hamo.jpeg',
  'محمود العسيلي':     'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/MoE.jpeg',
  'رامي صبري':         'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Ramy.jpeg',
  'بوسي':               'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Bossy.jpeg',
  'مصطفى كامل':        'https://cqqeyvhofbnvjemoihca.supabase.co/storage/v1/object/public/singers/Mostafa.jpeg',
};

const FULL_NAME_TO_STAGE = {
  // أم كلثوم
  'فاطمة إبراهيم السيد البلتاجي':        'أم كلثوم',
  'أم كلثوم إبراهيم البلتاجي':           'أم كلثوم',
  'أم كلثوم السيد إبراهيم البلتاجي':     'أم كلثوم',
  'فاطمة السيد إبراهيم البلتاجي':        'أم كلثوم',
  // عبد الحليم حافظ
  'عبد الحليم علي إسماعيل شبانة':        'عبد الحليم حافظ',
  'عبد الحليم إسماعيل علي شبانة':        'عبد الحليم حافظ',
  'عبد الحليم محمد إسماعيل شبانة':       'عبد الحليم حافظ',
  'علي إسماعيل عبد الحليم شبانة':        'عبد الحليم حافظ',
  // فيروز
  'نهاد وديع حداد الأسمر':               'فيروز',
  'نهاد وليم حداد الأسمر':               'فيروز',
  'نهاد وديع سليم الأسمر':               'فيروز',
  'نهاد كمال وديع الأسمر':               'فيروز',
  'نهاد وديع الأسمر حداد':               'فيروز',
  // فريد الأطرش
  'فريد فيليمون الأطرش':                 'فريد الأطرش',
  'فريد ميشيل الأطرش':                   'فريد الأطرش',
  'فريد فيليمون اللحام':                  'فريد الأطرش',
  'فريد يوسف الأطرش':                    'فريد الأطرش',
  'فريد فيليمون يوسف الأطرش':            'فريد الأطرش',
  // محمد عبد الوهاب
  'محمد عبد الوهاب إبراهيم':             'محمد عبد الوهاب',
  'محمد إبراهيم عبد الوهاب':             'محمد عبد الوهاب',
  'محمد عبد الوهاب إسماعيل':             'محمد عبد الوهاب',
  'محمد عبد الوهاب أحمد إبراهيم':        'محمد عبد الوهاب',
  // عمرو دياب
  'عمرو عبد الباسط عبد العزيز دياب':     'عمرو دياب',
  'عمرو عبد الرحيم عبد العزيز دياب':     'عمرو دياب',
  'عمرو باسط عبد العزيز دياب':           'عمرو دياب',
  'عمرو عبد الباسط عبد الرحمن دياب':     'عمرو دياب',
  // تامر حسني
  'تامر أشرف حسني':                      'تامر حسني',
  'تامر أشرف محمد حسني':                 'تامر حسني',
  'تامر محمد أشرف حسني':                 'تامر حسني',
  'تامر حسني أشرف محمد':                 'تامر حسني',
  // محمد منير
  'محمد منير محمد عبد الغني':            'محمد منير',
  'محمد منير عبد الغني محمد':            'محمد منير',
  'محمد منير محمد عبد الرحيم':           'محمد منير',
  'محمد منير أحمد عبد الغني':            'محمد منير',
  // أصالة
  'أصالة نصري فارس محمد':                'أصالة',
  'أصالة فارس نصري محمد':                'أصالة',
  'أصالة نصري محمد فارس':                'أصالة',
  'أصالة نصري فارس علي':                 'أصالة',
  // أنغام
  'أنغام أحمد علي محمد':                 'أنغام',
  'أنغام علي أحمد محمد':                 'أنغام',
  'أنغام محمد أحمد علي':                 'أنغام',
  'أنغام أحمد محمد علي':                 'أنغام',
  // شيرين عبد الوهاب
  'شيرين أحمد محمد عبد الوهاب':         'شيرين عبد الوهاب',
  'شيرين محمد أحمد عبد الوهاب':         'شيرين عبد الوهاب',
  'شيرين عبد الوهاب أحمد محمد':         'شيرين عبد الوهاب',
  'شيرين أحمد عبد الوهاب محمد':         'شيرين عبد الوهاب',
  // نانسي عجرم
  'نانسي نبيل جورج عجرم':                'نانسي عجرم',
  'نانسي جورج نبيل عجرم':                'نانسي عجرم',
  'نانسي نبيل جرجس عجرم':                'نانسي عجرم',
  'نانسي نبيل سمعان عجرم':               'نانسي عجرم',
  // إليسا
  'إليسا خوري توما':                      'إليسا',
  'إليسا توما خوري':                      'إليسا',
  'إليسا خوري ميشيل توما':               'إليسا',
  'إليسا جورج خوري توما':                'إليسا',
  // هيفاء وهبي
  'هيفاء وهبي زيدان الحسيني':            'هيفاء وهبي',
  'هيفاء زيدان وهبي الحسيني':            'هيفاء وهبي',
  'هيفاء وهبي زيدان محمد':              'هيفاء وهبي',
  'هيفاء وهبي الحسيني زيدان':            'هيفاء وهبي',
  // كاظم الساهر
  'كاظم جواد الساهر':                    'كاظم الساهر',
  'كاظم جواد علي الساهر':               'كاظم الساهر',
  'كاظم علي جواد الساهر':               'كاظم الساهر',
  'كاظم جواد محمد الساهر':              'كاظم الساهر',
  // حمو بيكا
  'محمود حسن حمو بيكا':                  'حمو بيكا',
  'محمود محمد حمو بيكا':                 'حمو بيكا',
  'محمود حسين حمو بيكا':                 'حمو بيكا',
  'محمود حسن محمد بيكا':                 'حمو بيكا',
  // محمود العسيلي
  'محمود السيد العسيلي':                  'محمود العسيلي',
  'محمود أحمد السيد العسيلي':             'محمود العسيلي',
  'محمود السيد أحمد العسيلي':             'محمود العسيلي',
  'محمود عبدالله السيد العسيلي':          'محمود العسيلي',
  // رامي صبري
  'رامي محمد فتحي صبري':                 'رامي صبري',
  'رامي فتحي محمد صبري':                 'رامي صبري',
  'رامي محمد صبري فتحي':                 'رامي صبري',
  'رامي أحمد فتحي صبري':                 'رامي صبري',
  // بوسي
  'بوسي سمير لطفي':                      'بوسي',
  'بوسي لطفي سمير':                      'بوسي',
  'بوسي سمير لطفي أحمد':                'بوسي',
  'بوسي أحمد سمير لطفي':                'بوسي',
  // مصطفى كامل
  'مصطفى مصطفى كامل عبد العزيز':        'مصطفى كامل',
  'مصطفى كامل مصطفى عبد العزيز':        'مصطفى كامل',
  'مصطفى عبد العزيز مصطفى كامل':        'مصطفى كامل',
  'مصطفى مصطفى عبد العزيز كامل':        'مصطفى كامل',
};

// Preload all singer photos into blob cache the moment this module is imported
Object.values(SINGER_PHOTOS).forEach(url => fetchAndCacheImage(url));

function cleanSingerName(fullName) {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  // 1. Exact match in full name reverse lookup
  if (FULL_NAME_TO_STAGE[trimmed]) return FULL_NAME_TO_STAGE[trimmed];
  // 2. Already a stage name
  if (SINGER_PHOTOS[trimmed]) return trimmed;
  // 3. Stage name contained in text
  for (const stageName of Object.keys(SINGER_PHOTOS)) {
    if (trimmed.includes(stageName)) return stageName;
  }
  // 4. Full name key contained in or contains text
  for (const [fullNameKey, stageName] of Object.entries(FULL_NAME_TO_STAGE)) {
    if (trimmed.includes(fullNameKey) || fullNameKey.includes(trimmed)) return stageName;
  }
  console.log('❌ No match found for:', trimmed);
  return trimmed;
}

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  width: '100vw',
  height: '100dvh',
  zIndex: 999998,
  background: 'rgba(0,0,0,0.75)',
};

const modalStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  width: '100vw',
  height: '100dvh',
  minWidth: '100vw',
  minHeight: '100dvh',
  maxWidth: '100vw',
  maxHeight: '100dvh',
  margin: 0,
  padding: 0,
  borderRadius: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  background: 'transparent',
  zIndex: 999999,
  transform: 'none',
  inset: 0,
};

/* Light-mode answer button helpers */
const ANS_DEFAULT_BG  = '#f8f8f8';
const ANS_DEFAULT_BDR = '1.5px solid #e0e0e0';
const ANS_DEFAULT_CLR = '#1a1a1a';
const ANS_KEY_CLR     = '#CC0000';
const ANS_CORRECT_BG  = 'rgba(34,197,94,0.15)';
const ANS_CORRECT_BDR = '2px solid #22c55e';
const ANS_CORRECT_CLR = '#15803d';
const ANS_WRONG_BG    = 'rgba(239,68,68,0.12)';
const ANS_WRONG_BDR   = '2px solid #ef4444';
const ANS_WRONG_CLR   = '#991b1b';
const ANS_DIM_BG      = 'rgba(0,0,0,0.03)';
const ANS_DIM_BDR     = '1px solid rgba(0,0,0,0.06)';
const ANS_DIM_CLR     = 'rgba(0,0,0,0.18)';

function lockViewport() {
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no');
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const scrollY = window.scrollY;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.top = `-${scrollY}px`;
}

function unlockViewport() {
  const scrollY = document.body.style.top;
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.top = '';
  window.scrollTo(0, parseInt(scrollY || '0') * -1);
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0');
}

export default function QuestionModal({
  question,
  loading,
  category,
  points,
  currentTeam,
  teamNames,
  teamLifelines,
  activeLifeline,
  friendHint,
  restTarget,
  onAnswer,
  onUseLifeline,
  onRestSubmit,
  onClose,
  onShowQuestion,
  answered,
  selectedAnswer,
  isCorrect,
  twoAnswersMode,
  firstWrongAnswer,
  timerSeconds,
  stealMode,
  onPassToOther,
  passToOtherUsed,
  luckyDoubleActive,
  onQuestionSwapped,
  onResetTimer,
  bonusTier,
  bonusConf,
  isTrapTile = false,
}) {
  const [restInput, setRestInput] = useState('');
  const [closeClickCount, setCloseClickCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [swapCount, setSwapCount] = useState(0);
  const [swapAnimating, setSwapAnimating] = useState(false);
  const [singerPhotoUrl, setSingerPhotoUrl] = useState(null);
  const closeTimeoutRef = useRef(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    lockViewport();
    const preventPinch = (e) => { if (e.touches.length > 1) e.preventDefault(); };
    const preventDoubleTap = (e) => {
      const now = Date.now();
      if (now - lastTapRef.current < 300) e.preventDefault();
      lastTapRef.current = now;
    };
    document.addEventListener('touchstart', preventPinch, { passive: false });
    document.addEventListener('touchend', preventDoubleTap, { passive: false });
    return () => {
      unlockViewport();
      document.removeEventListener('touchstart', preventPinch);
      document.removeEventListener('touchend', preventDoubleTap);
    };
  }, []);

  useEffect(() => { setSwapCount(0); }, [category, points]);

  useEffect(() => {
    setSingerPhotoUrl(null);
    if (!question) return;

    if (question.source_table === 'Fam') {
      console.log('Fam question:', question);
      console.log('image_url:', question.image_url);
      return;
    }

    if (question.source_table !== 'Fanan') return;
    const singerName = question.options?.[question.correct];
    const cleanName = cleanSingerName(singerName);
    const photoUrl = SINGER_PHOTOS[cleanName] || null;
    console.log('Singer:', cleanName);
    console.log('Photo URL:', photoUrl);
    setSingerPhotoUrl(photoUrl);
  }, [question]);

  const toast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleSwap = async () => {
    if (answered || !question) return;
    const newQ = await fetchSwapQuestion(category, points, question.id, question.source_table);
    if (!newQ) { toast('لا يوجد سؤال آخر متاح'); return; }
    setSwapAnimating(true);
    setTimeout(() => {
      onQuestionSwapped(newQ);
      setSwapCount(c => c + 1);
      setSwapAnimating(false);
      if (onResetTimer) onResetTimer();
    }, 250);
  };

  const handleCloseClick = () => {
    if (answered) return;
    onClose();
  };

  const usedLifelines = teamLifelines[currentTeam] || {};
  const activeTeamName = stealMode
    ? (currentTeam === 1 ? teamNames[1] : teamNames[0])
    : (currentTeam === 1 ? teamNames[0] : teamNames[1]);

  const qLen = question?.question?.length || 0;
  const qFontSize = qLen > 200 ? 12 : qLen > 150 ? 13 : qLen > 100 ? 14 : 16;

  // Dynamic image size based on screen height (portrait)
  function getImageSize() {
    const vh = window.innerHeight;
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) return '80px';
    if (vh < 650) return '80px';
    if (vh < 750) return '100px';
    if (vh < 850) return '120px';
    return '130px';
  }
  const imgSize = getImageSize();
  const isLandscape = window.innerWidth > window.innerHeight;

  const timerColor = timerSeconds === null ? '#4ade80'
    : timerSeconds <= 5 ? '#f87171'
    : timerSeconds <= 10 ? '#facc15'
    : '#4ade80';

  const showLifelinesBefore = !loading && !question && !answered;

  return (
    <>
      <style>{`
        @keyframes swapIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes swapOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(-20px); } }
        @keyframes luckyPulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.7;transform:scale(1.05);} }
        .swap-in { animation: swapIn 0.25s ease forwards; }
        .swap-out { animation: swapOut 0.25s ease forwards; }
        .lucky-pulse { animation: luckyPulse 1.2s ease-in-out infinite; }
        .ll-scroll::-webkit-scrollbar { display: none; }
        .ll-scroll { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      <div style={overlayStyle} />

      <div style={modalStyle} dir="rtl">

        {/* ── Looping video background ── */}
        <video autoPlay loop muted playsInline
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center',
            zIndex: 0, pointerEvents: 'none',
          }}>
          <source src="/bg-new.mp4" type="video/mp4" />
        </video>
        {/* Bright overlay so text stays readable */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(255,255,255,0.55)',
          zIndex: 1, pointerEvents: 'none',
        }} />

        {/* Content sits above the video */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: '#ffffff' }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px',
          borderBottom: '3px solid #CC0000',
          background: '#ffffff',
          boxShadow: '0 2px 12px rgba(204,0,0,0.15)',
          position: 'relative',
        }}>
          <div>
            <p style={{ fontFamily: 'var(--font-cairo)', fontWeight: 800, color: '#CC0000', fontSize: 15, margin: 0 }}>{category}</p>
            <p style={{ fontFamily: 'var(--font-tajawal)', color: '#666', fontSize: 11, margin: 0, fontWeight: 600 }}>
              {points} نقطة
            </p>
          </div>

          {timerSeconds !== null && (
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              border: `3px solid ${timerColor}`,
              background: `${timerColor}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 800, color: timerColor,
              fontFamily: 'var(--font-cairo)', flexShrink: 0,
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            }}>
              {timerSeconds}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ textAlign: 'left' }}>
              {stealMode && <p style={{ fontFamily:'var(--font-tajawal)', fontSize:10, color:'#ea580c', margin:0, fontWeight:700 }}>⚡ سرقة!</p>}
              <p style={{ fontFamily:'var(--font-cairo)', fontWeight:700, fontSize:13, color:'#1a1a1a', margin:0 }}>{activeTeamName}</p>
            </div>
            <button onClick={handleCloseClick} disabled={answered} style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: answered ? '#f5f5f5' : '#fff0f0', border: `1px solid ${answered ? '#e0e0e0' : '#ffcccc'}`,
              color: answered ? '#bbb' : '#CC0000',
              cursor: answered ? 'not-allowed' : 'pointer',
            }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Bonus tile banner ── */}
        {bonusTier && bonusConf?.[bonusTier] && (
          <div className="bonus-banner" style={{
            flexShrink: 0,
            background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 50%, #7c3aed 100%)',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, direction: 'rtl',
            borderBottom: '2px solid rgba(168,85,247,0.5)',
            boxShadow: '0 2px 12px rgba(168,85,247,0.4)',
            animation: 'bonusPulse 2s ease-in-out infinite',
          }}>
            <style>{`
              @keyframes bonusPulse {
                0%,100% { box-shadow: 0 2px 12px rgba(168,85,247,0.4); }
                50%      { box-shadow: 0 2px 28px rgba(168,85,247,0.9); }
              }
              @media (orientation: landscape) and (max-height: 500px) {
                .bonus-banner { padding: 4px 10px !important; gap: 6px !important; }
                .bonus-banner .bonus-star { font-size: 14px !important; }
                .bonus-banner .bonus-title { font-size: 10px !important; }
                .bonus-banner .bonus-sub   { font-size: 9px !important; }
                .bonus-banner .bonus-penalty { padding: 2px 7px !important; border-radius: 5px !important; }
                .bonus-banner .bonus-penalty p { font-size: 9px !important; }
              }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="bonus-star" style={{ fontSize: 22 }}>⭐</span>
              <div>
                <p className="bonus-title" style={{ margin: 0, fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>
                  سؤال مكافأة!
                </p>
                <p className="bonus-sub" style={{ margin: 0, fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>
                  إجابة صحيحة → <span style={{ color: '#fde68a', fontWeight: 900 }}>×{bonusConf[bonusTier].mult} = {Math.round(bonusTier * bonusConf[bonusTier].mult)} نقطة</span>
                </p>
              </div>
            </div>
            <div className="bonus-penalty" style={{
              background: 'rgba(239,68,68,0.85)', borderRadius: 8,
              padding: '5px 10px', textAlign: 'center',
              border: '1px solid rgba(255,100,100,0.5)',
            }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 13, color: '#fff', lineHeight: 1.1 }}>
                خطأ ← <span style={{ color: '#fca5a5' }}>-{bonusConf[bonusTier].penalty}</span>
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--font-cairo)', fontWeight: 600, fontSize: 10, color: 'rgba(255,255,255,0.75)', lineHeight: 1.1 }}>
                تُخصم من فريقك
              </p>
            </div>
          </div>
        )}

        {/* ── Trap tile banner ── */}
        {isTrapTile && (
          <div className="trap-banner" style={{
            flexShrink: 0,
            background: 'linear-gradient(90deg, #7f1d1d 0%, #ef4444 50%, #7f1d1d 100%)',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 8, direction: 'rtl',
            borderBottom: '2px solid rgba(239,68,68,0.5)',
            boxShadow: '0 2px 12px rgba(239,68,68,0.4)',
            animation: 'trapPulse 1.4s ease-in-out infinite',
          }}>
            <style>{`
              @keyframes trapPulse {
                0%,100% { box-shadow: 0 2px 12px rgba(239,68,68,0.4); }
                50%      { box-shadow: 0 2px 28px rgba(239,68,68,0.9); }
              }
              @media (orientation: landscape) and (max-height: 500px) {
                .trap-banner { padding: 4px 10px !important; gap: 6px !important; }
                .trap-banner .trap-icon { font-size: 14px !important; }
                .trap-banner .trap-title { font-size: 10px !important; }
                .trap-banner .trap-sub   { font-size: 9px !important; }
              }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="trap-icon" style={{ fontSize: 22 }}>☠️</span>
              <div>
                <p className="trap-title" style={{ margin: 0, fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>
                  سؤال فخ!
                </p>
                <p className="trap-sub" style={{ margin: 0, fontFamily: 'var(--font-cairo)', fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>
                  إجابة صحيحة → <span style={{ color: '#fde68a', fontWeight: 900 }}>+600 نقطة</span>
                </p>
              </div>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.5)', borderRadius: 8,
              padding: '5px 10px', textAlign: 'center',
              border: '1px solid rgba(255,100,100,0.5)',
            }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-cairo)', fontWeight: 900, fontSize: 13, color: '#fff', lineHeight: 1.1 }}>
                خطأ ← <span style={{ color: '#fca5a5' }}>-600</span>
              </p>
              <p style={{ margin: 0, fontFamily: 'var(--font-cairo)', fontWeight: 600, fontSize: 10, color: 'rgba(255,255,255,0.75)', lineHeight: 1.1 }}>
                تُخصم من فريقك
              </p>
            </div>
          </div>
        )}

        {/* Before question: lifelines */}
        {showLifelinesBefore && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 16, gap: 12 }}>
            {isTrapTile ? (
              <>
                <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:12, padding:'14px 18px', textAlign:'center', display:'flex', flexDirection:'column', gap:10 }}>
                  <p style={{ color:'#fca5a5', fontFamily:'var(--font-cairo)', fontWeight:800, fontSize:14, margin:0 }}>
                    ☠️ سؤال فخ — لا يمكن استخدام أي وسيلة مساعدة
                  </p>
                  <div style={{ borderTop:'1px solid rgba(239,68,68,0.3)', paddingTop:10 }}>
                    <p style={{ color:'#fff', fontFamily:'var(--font-cairo)', fontWeight:700, fontSize:13, margin:0 }}>
                      🎲 السؤال من فئة عشوائية
                    </p>
                    <p style={{ color:'rgba(255,255,255,0.6)', fontFamily:'var(--font-cairo)', fontWeight:500, fontSize:11, margin:'4px 0 0' }}>
                      لا تعرف الفئة حتى تظهر السؤال!
                    </p>
                  </div>
                </div>
                <Button onClick={onShowQuestion} className="w-full font-cairo font-bold bg-primary text-primary-foreground">أظهر السؤال</Button>
              </>
            ) : (
              <>
                <p style={{ textAlign: 'center', fontFamily:'var(--font-cairo)', fontSize:15, color:'#1a1a1a', margin:0 }}>
                  هل تريد استخدام وسيلة مساعدة قبل السؤال؟
                </p>
                <div className="ll-scroll" style={{ display:'flex', flexDirection:'row', overflowX:'auto', gap:8, paddingBottom:4 }}>
                  {LIFELINES.filter(ll => ll.phase === 'before').map(ll => {
                    const isUsed = usedLifelines[ll.id];
                    const isBlockedOnBonus = ll.id === 'trap' && !!bonusTier;
                    const isDisabled = isUsed || isBlockedOnBonus;
                    return (
                      <button key={ll.id} onClick={() => !isDisabled && onUseLifeline(ll.id)} disabled={isDisabled}
                        title={isBlockedOnBonus ? 'لا يمكن استخدام هذه الميزة على أسئلة المكافأة' : undefined}
                        style={{ whiteSpace:'nowrap', padding:'6px 12px', fontSize:13, borderRadius:20, flexShrink:0,
                          background: isDisabled ? 'rgba(255,255,255,0.03)' : GOLD_BG,
                          color: isDisabled ? 'rgba(255,255,255,0.3)' : '#000',
                          border: `1px solid ${isDisabled ? 'rgba(255,255,255,0.1)' : GOLD_BORDER}`,
                          fontFamily:'var(--font-cairo)', opacity: isDisabled ? 0.4 : 1,
                          textDecoration: isUsed ? 'line-through' : 'none', cursor: isDisabled ? 'not-allowed' : 'pointer',
                        }}>{ll.label}</button>
                    );
                  })}
                </div>
                {activeLifeline === 'trap' && (
                  <div style={{ background:'rgba(234,179,8,0.85)', border:'1px solid rgba(180,130,0,0.6)', borderRadius:12, padding:'10px 14px', textAlign:'center' }}>
                    <p style={{ color:'#000000', fontFamily:'var(--font-cairo)', fontWeight:800, fontSize:13, margin:0 }}>💰 دبل يا كبير مفعّل! إجابة صح = خصم من الخصم</p>
                  </div>
                )}
                <Button onClick={onShowQuestion} className="w-full font-cairo font-bold bg-primary text-primary-foreground">أظهر السؤال</Button>
              </>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><LoadingSpinner /></div>}

        {/* Flag mode */}
        {question && !loading && question.flag_mode && (
          <div style={{ flex:1, overflowY:'auto' }}>
            <FlagQuestion question={question} answered={answered} isCorrect={isCorrect} selectedAnswer={selectedAnswer} onAnswer={onAnswer} onClose={onClose} />
          </div>
        )}

        {/* Normal question */}
        {question && !loading && !question.flag_mode && (
          <>
            {(() => {
              const isFanan = question.source_table === 'Fanan';
              const isLogo = question.source_table === 'logo1';
              const hasImage = question.image_url && question.image_url !== '';
              const rawHeroUrl = hasImage
                ? isFanan ? (singerPhotoUrl || question.image_url) : question.image_url
                : null;
              const resolvedHeroUrl = rawHeroUrl ? getCachedImageUrl(rawHeroUrl) : null;

              // ── PORTRAIT WITH IMAGE: split layout ──
              // RIGHT: image + question | LEFT: answers stacked
              if (resolvedHeroUrl && !isLandscape) {
                const optionEntries = Object.entries(question.options);
                return (
                  <>
                    <div className={swapAnimating ? 'swap-out' : 'swap-in'} style={{
                      flexShrink: 0,
                      display: 'flex', flexDirection: 'row',
                      gap: 8, padding: '6px 10px 4px',
                      direction: 'rtl',
                      alignItems: 'stretch',
                    }}>
                      {/* LEFT: answers stacked */}
                      <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', gap: 6,
                        justifyContent: 'center',
                      }}>
                        {optionEntries.map(([key, value]) => {
                          const isEliminated = friendHint === key;
                          const isDisabled = isEliminated || (twoAnswersMode && firstWrongAnswer === key);
                          const isCorrectAnswer = question.correct === key;
                          const isSelected = selectedAnswer === key;
                          const isFirstWrong = firstWrongAnswer === key;
                          let bg = ANS_DEFAULT_BG, bdr = ANS_DEFAULT_BDR, color = ANS_DEFAULT_CLR;
                          if (answered) {
                            bg = '#f5f5f5'; bdr = '1px solid #e0e0e0'; color = '#888';
                            if (isCorrectAnswer) { bg=ANS_CORRECT_BG; bdr=ANS_CORRECT_BDR; color=ANS_CORRECT_CLR; }
                            else if (isSelected || isFirstWrong) { bg=ANS_WRONG_BG; bdr=ANS_WRONG_BDR; color=ANS_WRONG_CLR; }
                          }
                          if (!answered && isFirstWrong) { bg='rgba(239,68,68,0.18)'; bdr='1.5px solid rgba(239,68,68,0.65)'; color='rgb(185,28,28)'; }
                          if (isEliminated) { bg=ANS_DIM_BG; bdr=ANS_DIM_BDR; color=ANS_DIM_CLR; }
                          const showRedCross = isFirstWrong || (answered && isSelected && !isCorrectAnswer);
                          const Tag = answered ? 'div' : 'button';
                          return (
                            <Tag key={key}
                              onClick={!answered && !isDisabled ? () => onAnswer(key) : undefined}
                              disabled={!answered ? isDisabled : undefined}
                              style={{
                                minHeight: 44, borderRadius: 10, padding: '5px 8px',
                                fontSize: 15, fontWeight: 700, lineHeight: 1.3, wordBreak: 'break-word',
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
                                direction: 'rtl', textAlign: 'right',
                                background: bg, border: bdr, color,
                                opacity: isEliminated ? 0.3 : 1,
                                textDecoration: isEliminated ? 'line-through' : 'none',
                                cursor: (!answered && !isDisabled) ? 'pointer' : 'default',
                                fontFamily: 'var(--font-cairo)', transition: 'background 0.15s',
                                width: '100%', boxSizing: 'border-box',
                              }}>
                              <span style={{ fontWeight:700, color: showRedCross ? 'rgb(185,28,28)' : ANS_KEY_CLR, flexShrink:0 }}>{key}. {showRedCross ? '✗' : ''}</span>
                              {value}
                            </Tag>
                          );
                        })}
                      </div>

                      {/* RIGHT: image + question */}
                      <div style={{
                        width: 200, flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        <img
                          src={resolvedHeroUrl}
                          alt=""
                          style={{
                            width: 185, height: 185,
                            objectFit: 'contain',
                            objectPosition: 'center',
                            borderRadius: 8,
                            border: 'none',
                            boxShadow: 'none',
                            display: 'block',
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                          fetchPriority="high"
                        />
                        <p style={{
                          fontFamily: 'var(--font-cairo)', fontWeight: 800,
                          color: '#1a1a1a', fontSize: 16,
                          lineHeight: 1.4, direction: 'rtl', textAlign: 'center', margin: 0,
                          width: '100%',
                        }}>
                          {question.question}
                        </p>
                      </div>
                    </div>

                    {/* Status bar */}
                    <div style={{ flexShrink:0, padding:'0 12px 4px' }}>
                      {!isTrapTile && activeLifeline !== 'trap' && !stealMode && !answered && (
                        <button onClick={!passToOtherUsed ? onPassToOther : undefined} disabled={passToOtherUsed} style={{
                          width:'100%', padding:'4px 10px', borderRadius:10, fontSize:11,
                          background: passToOtherUsed ? 'rgba(255,255,255,0.03)' : 'rgba(160,0,0,0.85)',
                          border: passToOtherUsed ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(120,0,0,0.9)',
                          color: passToOtherUsed ? 'rgba(255,255,255,0.2)' : '#fff',
                          fontFamily:'var(--font-cairo)', cursor: passToOtherUsed ? 'not-allowed' : 'pointer',
                          textAlign:'center', opacity: passToOtherUsed ? 0.4 : 1,
                          textDecoration: passToOtherUsed ? 'line-through' : 'none',
                          fontWeight: 700,
                        }}>🎯 اسرق يا غالي → أعطها للفريق الثاني (10 ثواني)</button>
                      )}
                      {stealMode && !answered && (
                        <div style={{ background:'#ffffff', border:'1px solid rgba(251,146,60,0.5)', borderRadius:10, padding:'6px 10px', textAlign:'center' }}>
                          <p style={{ color:'#d97706', fontFamily:'var(--font-cairo)', fontWeight:800, fontSize:14, margin:0 }}>⚡ فرصة السرقة!</p>
                        </div>
                      )}
                      {friendHint && (
                        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, padding:'4px 10px', marginTop:4, textAlign:'center' }}>
                          <p style={{ color:'#fca5a5', fontFamily:'var(--font-cairo)', fontWeight:700, fontSize:11, margin:0 }}>🗑️ تم حذف إجابة خاطئة</p>
                        </div>
                      )}
                    </div>

                    {/* Lifelines — hidden during steal mode and on trap tiles */}
                    {!isTrapTile && !stealMode && !answered && (
                      <div className="ll-scroll" style={{ flexShrink:0, display:'flex', flexDirection:'row', overflowX:'auto', gap:8, padding:'0 12px 6px' }}>
                        {LIFELINES.filter(ll => ll.id !== 'trap').map(ll => {
                          const isUsed = usedLifelines[ll.id];
                          const isActive = activeLifeline === ll.id;
                          return (
                            <button key={ll.id} onClick={() => !isUsed && onUseLifeline(ll.id)} disabled={isUsed}
                              style={{ whiteSpace:'nowrap', padding:'6px 10px', fontSize:12, borderRadius:20, flexShrink:0,
                                background: isUsed ? 'rgba(255,255,255,0.03)' : isActive ? GOLD : GOLD_BG,
                                color: isUsed ? 'rgba(255,255,255,0.3)' : '#000',
                                border: `${isActive?'2':'1'}px solid ${isUsed ? 'rgba(255,255,255,0.08)' : GOLD_BORDER}`,
                                fontFamily:'var(--font-cairo)', opacity: isUsed ? 0.35 : 1,
                                textDecoration: isUsed ? 'line-through' : 'none',
                                cursor: isUsed ? 'not-allowed' : 'pointer',
                              }}>{ll.label}</button>
                          );
                        })}
                        <button onClick={handleSwap} disabled={swapAnimating}
                          style={{ whiteSpace:'nowrap', padding:'6px 10px', fontSize:12, borderRadius:20, flexShrink:0,
                            background: GOLD_BG, color: '#000', border: `1px solid ${GOLD_BORDER}`,
                            fontFamily:'var(--font-cairo)', cursor: 'pointer',
                          }}>🔄 تغيير سؤال مكرر</button>
                      </div>
                    )}
                  </>
                );
              }

             // ── LANDSCAPE WITH IMAGE: same split layout as portrait ──
              // LEFT: answers stacked | RIGHT: image + question
              if (resolvedHeroUrl && isLandscape) {
                const optionEntries = Object.entries(question.options);
                return (
                  <>
                    <div className={swapAnimating ? 'swap-out' : 'swap-in'} style={{
                      flex: 1, display: 'flex', flexDirection: 'row',
                      gap: 8, padding: '4px 10px',
                      direction: 'rtl', alignItems: 'stretch',
                      overflow: 'hidden',
                    }}>
                      {/* LEFT: answers stacked - 50% */}
                      <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column', gap: 5,
                        justifyContent: 'center', overflow: 'hidden',
                      }}>
                        {optionEntries.map(([key, value]) => {
                          const isEliminated = friendHint === key;
                          const isDisabled = isEliminated || (twoAnswersMode && firstWrongAnswer === key);
                          const isCorrectAnswer = question.correct === key;
                          const isSelected = selectedAnswer === key;
                          const isFirstWrong = firstWrongAnswer === key;
                          let bg = ANS_DEFAULT_BG, bdr = ANS_DEFAULT_BDR, color = ANS_DEFAULT_CLR;
                          if (answered) {
                            bg = '#f5f5f5'; bdr = '1px solid #e0e0e0'; color = '#888';
                            if (isCorrectAnswer) { bg=ANS_CORRECT_BG; bdr=ANS_CORRECT_BDR; color=ANS_CORRECT_CLR; }
                            else if (isSelected || isFirstWrong) { bg=ANS_WRONG_BG; bdr=ANS_WRONG_BDR; color=ANS_WRONG_CLR; }
                          }
                          if (!answered && isFirstWrong) { bg='rgba(239,68,68,0.18)'; bdr='1.5px solid rgba(239,68,68,0.65)'; color='rgb(185,28,28)'; }
                          if (isEliminated) { bg=ANS_DIM_BG; bdr=ANS_DIM_BDR; color=ANS_DIM_CLR; }
                          const showRedCross = isFirstWrong || (answered && isSelected && !isCorrectAnswer);
                          const Tag = answered ? 'div' : 'button';
                          return (
                            <Tag key={key}
                              onClick={!answered && !isDisabled ? () => onAnswer(key) : undefined}
                              disabled={!answered ? isDisabled : undefined}
                              style={{
                                flex: 1, borderRadius: 8, padding: '4px 8px',
                                fontSize: 15, fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word',
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
                                direction: 'rtl', textAlign: 'right',
                                background: bg, border: bdr, color,
                                opacity: isEliminated ? 0.3 : 1,
                                textDecoration: isEliminated ? 'line-through' : 'none',
                                cursor: (!answered && !isDisabled) ? 'pointer' : 'default',
                                fontFamily: 'var(--font-cairo)', transition: 'background 0.15s',
                                width: '100%', boxSizing: 'border-box',
                              }}>
                              <span style={{ fontWeight:700, color: showRedCross ? 'rgb(185,28,28)' : ANS_KEY_CLR, flexShrink:0 }}>{key}. {showRedCross ? '✗' : ''}</span>
                              {value}
                            </Tag>
                          );
                        })}
                      </div>

                      {/* RIGHT: image + question - 50% */}
                      <div style={{
                        flex: 1, flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                        <img
                          src={resolvedHeroUrl}
                          alt=""
                          style={{
                            width: '100%', maxWidth: 180,
                            height: 'auto', maxHeight: 150,
                            objectFit: 'contain',
                            objectPosition: 'center',
                            borderRadius: 8,
                            border: 'none', boxShadow: 'none', display: 'block',
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <p style={{
                          fontFamily: 'var(--font-cairo)', fontWeight: 800,
                          color: '#1a1a1a', fontSize: 16,
                          lineHeight: 1.3, direction: 'rtl', textAlign: 'center', margin: 0,
                          width: '100%', padding: '0 4px',
                        }}>
                          {question.question}
                        </p>
                      </div>
                    </div>

                    {/* Status bar */}
                    <div style={{ flexShrink:0, padding:'0 12px 2px' }}>
                      {!isTrapTile && activeLifeline !== 'trap' && !stealMode && !answered && (
                        <button onClick={!passToOtherUsed ? onPassToOther : undefined} disabled={passToOtherUsed} style={{
                          width:'100%', padding:'3px 10px', borderRadius:10, fontSize:10,
                          background: passToOtherUsed ? 'rgba(255,255,255,0.03)' : 'rgba(160,0,0,0.85)',
                          border: passToOtherUsed ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(120,0,0,0.9)',
                          color: passToOtherUsed ? 'rgba(255,255,255,0.2)' : '#fff',
                          fontFamily:'var(--font-cairo)', cursor: passToOtherUsed ? 'not-allowed' : 'pointer',
                          textAlign:'center', opacity: passToOtherUsed ? 0.4 : 1,
                          textDecoration: passToOtherUsed ? 'line-through' : 'none',
                          fontWeight: 700,
                        }}>🎯 اسرق يا غالي → أعطها للفريق الثاني (10 ثواني)</button>
                      )}
                      {stealMode && !answered && (
                        <div style={{ background:'#ffffff', border:'1px solid rgba(251,146,60,0.5)', borderRadius:10, padding:'4px 10px', textAlign:'center' }}>
                          <p style={{ color:'#d97706', fontFamily:'var(--font-cairo)', fontWeight:800, fontSize:14, margin:0 }}>⚡ فرصة السرقة!</p>
                        </div>
                      )}
                      {friendHint && (
                        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, padding:'3px 10px', marginTop:2, textAlign:'center' }}>
                          <p style={{ color:'#fca5a5', fontFamily:'var(--font-cairo)', fontWeight:700, fontSize:10, margin:0 }}>🗑️ تم حذف إجابة خاطئة</p>
                        </div>
                      )}
                    </div>

                    {/* Lifelines — hidden during steal mode and on trap tiles */}
                    {!isTrapTile && !stealMode && !answered && (
                      <div className="ll-scroll" style={{ flexShrink:0, display:'flex', flexDirection:'row', overflowX:'auto', gap:6, padding:'0 12px 4px' }}>
                        {LIFELINES.filter(ll => ll.id !== 'trap').map(ll => {
                          const isUsed = usedLifelines[ll.id];
                          const isActive = activeLifeline === ll.id;
                          return (
                            <button key={ll.id} onClick={() => !isUsed && onUseLifeline(ll.id)} disabled={isUsed}
                              style={{ whiteSpace:'nowrap', padding:'4px 8px', fontSize:11, borderRadius:20, flexShrink:0,
                                background: isUsed ? 'rgba(255,255,255,0.03)' : isActive ? GOLD : GOLD_BG,
                                color: isUsed ? 'rgba(255,255,255,0.3)' : '#000',
                                border: `${isActive?'2':'1'}px solid ${isUsed ? 'rgba(255,255,255,0.08)' : GOLD_BORDER}`,
                                fontFamily:'var(--font-cairo)', opacity: isUsed ? 0.35 : 1,
                                textDecoration: isUsed ? 'line-through' : 'none',
                                cursor: isUsed ? 'not-allowed' : 'pointer',
                              }}>{ll.label}</button>
                          );
                        })}
                        <button onClick={handleSwap} disabled={swapAnimating}
                          style={{ whiteSpace:'nowrap', padding:'4px 8px', fontSize:11, borderRadius:20, flexShrink:0,
                            background: GOLD_BG, color: '#000', border: `1px solid ${GOLD_BORDER}`,
                            fontFamily:'var(--font-cairo)', cursor: 'pointer',
                          }}>🔄 تغيير سؤال مكرر</button>
                      </div>
                    )}
                  </>
                );
              }
              // ── NO IMAGE: standard layout ──
              return (
                <>
                  <div className={swapAnimating ? 'swap-out' : 'swap-in'} style={{
                    flex:1, display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center',
                    padding:'10px 16px', overflow:'hidden',
                  }}>
                    <p style={{ fontFamily:'var(--font-cairo)', fontWeight:800,
                      color:'#1a1a1a', fontSize: qFontSize > 14 ? qFontSize + 4 : qFontSize + 4,
                      lineHeight:1.6, textAlign:'right', direction:'rtl', margin:0 }}>
                      {question.question}
                    </p>
                  </div>

                  {/* Status bar */}
                  <div style={{ flexShrink:0, padding:'0 12px 4px' }}>
                    {!isTrapTile && activeLifeline !== 'trap' && !stealMode && !answered && (
                      <button onClick={!passToOtherUsed ? onPassToOther : undefined} disabled={passToOtherUsed} style={{
                        width:'100%', padding:'4px 10px', borderRadius:10, fontSize:11,
                        background: passToOtherUsed ? 'rgba(255,255,255,0.03)' : 'rgba(160,0,0,0.85)',
                        border: passToOtherUsed ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(120,0,0,0.9)',
                        color: passToOtherUsed ? 'rgba(255,255,255,0.2)' : '#fff',
                        fontFamily:'var(--font-cairo)', cursor: passToOtherUsed ? 'not-allowed' : 'pointer',
                        textAlign:'center', opacity: passToOtherUsed ? 0.4 : 1,
                        textDecoration: passToOtherUsed ? 'line-through' : 'none',
                        fontWeight: 700,
                      }}>🎯 اسرق يا غالي → أعطها للفريق الثاني (10 ثواني)</button>
                    )}
                    {stealMode && !answered && (
                      <div style={{ background:'#ffffff', border:'1px solid rgba(251,146,60,0.5)', borderRadius:10, padding:'6px 10px', textAlign:'center' }}>
                        <p style={{ color:'#d97706', fontFamily:'var(--font-cairo)', fontWeight:800, fontSize:14, margin:0 }}>⚡ فرصة السرقة!</p>
                      </div>
                    )}
                    {friendHint && (
                      <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, padding:'4px 10px', marginTop:4, textAlign:'center' }}>
                        <p style={{ color:'#fca5a5', fontFamily:'var(--font-cairo)', fontWeight:700, fontSize:11, margin:0 }}>🗑️ تم حذف إجابة خاطئة</p>
                      </div>
                    )}
                  </div>

                  {/* Lifelines — hidden during steal mode and on trap tiles */}
                  {!isTrapTile && !stealMode && !answered && (
                    <div className="ll-scroll" style={{ flexShrink:0, display:'flex', flexDirection:'row', overflowX:'auto', gap:8, padding:'0 12px 6px' }}>
                      {LIFELINES.filter(ll => ll.id !== 'trap').map(ll => {
                        const isUsed = usedLifelines[ll.id];
                        const isActive = activeLifeline === ll.id;
                        return (
                          <button key={ll.id} onClick={() => !isUsed && onUseLifeline(ll.id)} disabled={isUsed}
                            style={{ whiteSpace:'nowrap', padding:'6px 10px', fontSize:12, borderRadius:20, flexShrink:0,
                              background: isUsed ? 'rgba(255,255,255,0.03)' : isActive ? GOLD : GOLD_BG,
                              color: isUsed ? 'rgba(255,255,255,0.3)' : '#000',
                              border: `${isActive?'2':'1'}px solid ${isUsed ? 'rgba(255,255,255,0.08)' : GOLD_BORDER}`,
                              fontFamily:'var(--font-cairo)', opacity: isUsed ? 0.35 : 1,
                              textDecoration: isUsed ? 'line-through' : 'none',
                              cursor: isUsed ? 'not-allowed' : 'pointer',
                            }}>{ll.label}</button>
                        );
                      })}
                      <button onClick={handleSwap} disabled={swapAnimating}
                        style={{ whiteSpace:'nowrap', padding:'6px 10px', fontSize:12, borderRadius:20, flexShrink:0,
                          background: GOLD_BG, color: '#000', border: `1px solid ${GOLD_BORDER}`,
                          fontFamily:'var(--font-cairo)', cursor: 'pointer',
                        }}>🔄 تغيير سؤال مكرر</button>
                    </div>
                  )}

                  {/* Options before answer */}
                  {!answered && (
                    <div style={{ flexShrink:0, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, padding:'0 12px 10px' }}>
                      {Object.entries(question.options).map(([key, value]) => {
                        const isEliminated = friendHint === key;
                        const isFirstWrong = firstWrongAnswer === key;
                        const isDisabled = isEliminated || (twoAnswersMode && isFirstWrong);
                        let bg = isEliminated ? ANS_DIM_BG : ANS_DEFAULT_BG;
                        let bdr = isEliminated ? ANS_DIM_BDR : ANS_DEFAULT_BDR;
                        let clr = isEliminated ? ANS_DIM_CLR : ANS_DEFAULT_CLR;
                        if (isFirstWrong) { bg='rgba(239,68,68,0.18)'; bdr='1.5px solid rgba(239,68,68,0.65)'; clr='rgb(185,28,28)'; }
                        return (
                          <button key={key} onClick={() => !isDisabled && onAnswer(key)} disabled={isDisabled}
                            style={{ minHeight:48, borderRadius:10, padding:'6px 10px',
                              fontSize:16, fontWeight:700, lineHeight:1.3, wordBreak:'break-word',
                              display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8,
                              direction:'rtl', textAlign:'right',
                              background: bg, border: bdr, color: clr,
                              opacity: isEliminated ? 0.3 : 1,
                              textDecoration: isEliminated ? 'line-through' : 'none',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              fontFamily:'var(--font-cairo)', transition:'background 0.15s',
                            }}>
                            <span style={{ fontWeight:700, color: isFirstWrong ? 'rgb(185,28,28)' : GOLD, flexShrink:0 }}>{key}. {isFirstWrong ? '✗' : ''}</span>
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Options after answer */}
                  {answered && (
                    <div style={{ flexShrink:0, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, padding:'0 12px 8px' }}>
                      {Object.entries(question.options).map(([key, value]) => {
                        const isCorrectAnswer = question.correct === key;
                        const isSelected = selectedAnswer === key;
                        const isFirstWrong = firstWrongAnswer === key;
                        let bg = '#f5f5f5', border = '1px solid #e0e0e0', color = '#888';
                        if (isCorrectAnswer) { bg=ANS_CORRECT_BG; border=ANS_CORRECT_BDR; color=ANS_CORRECT_CLR; }
                        else if (isSelected || isFirstWrong) { bg=ANS_WRONG_BG; border=ANS_WRONG_BDR; color=ANS_WRONG_CLR; }
                        const showRedCross = (isSelected || isFirstWrong) && !isCorrectAnswer;
                        return (
                          <div key={key} style={{ minHeight:48, borderRadius:10, padding:'6px 10px',
                            fontSize:16, fontWeight:700, lineHeight:1.3, wordBreak:'break-word',
                            display:'flex', alignItems:'center', justifyContent:'flex-end', gap:8,
                            direction:'rtl', textAlign:'right', background:bg, border, color,
                            fontFamily:'var(--font-cairo)',
                          }}>
                            <span style={{ fontWeight:700, color: showRedCross ? 'rgb(185,28,28)' : ANS_KEY_CLR, flexShrink:0 }}>{key}. {showRedCross ? '✗' : ''}</span>
                            {value}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Result banner */}
            {answered && (
              <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                style={{
                  flexShrink:0, margin:'0 16px 16px', borderRadius:12, padding:'12px 16px', textAlign:'center',
                  background: isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${isCorrect ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}`,
                }}>
                <p style={{ fontFamily:'var(--font-cairo)', fontWeight:900, fontSize:20, margin:'0 0 4px', color: isCorrect ? '#15803d' : '#CC0000' }}>
                  {isCorrect ? '🎉 إجابة صحيحة!' : '❌ إجابة خاطئة'}
                </p>
                {question.explanation && (
                  <p style={{ fontFamily:'var(--font-tajawal)', fontSize:12, color:'#555', margin:'0 0 8px' }}>{question.explanation}</p>
                )}
                <Button onClick={onClose} className="font-cairo bg-primary text-primary-foreground hover:bg-primary/90">متابعة</Button>
              </motion.div>
            )}
          </>
        )}
        </div>{/* end content wrapper */}
      </div>{/* end modalStyle */}

      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
            style={{
              position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
              zIndex:10000, background:'rgba(0,0,0,0.85)', color:'#fff',
              padding:'10px 20px', borderRadius:100, fontSize:13,
              fontFamily:'var(--font-tajawal)', whiteSpace:'nowrap',
            }}>
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
