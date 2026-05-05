import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv2, X, Wifi } from 'lucide-react';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isAndroid = () => /Android/i.test(navigator.userAgent);

function MirrorModal({ onClose }) {
  const ios = isIOS();
  const android = isAndroid();

  const sections = ios ? [
    {
      title: 'AirPlay على Apple TV أو Samsung / LG',
      color: '#CC0000',
      icon: '📱',
      steps: [
        'افتح مركز التحكم (اسحب من الأعلى يميناً)',
        'اضغط على "Screen Mirroring" أو "نسخ الشاشة"',
        'اختر التلفزيون من القائمة',
        'تأكد أن هاتفك والتلفزيون على نفس الواي فاي',
      ],
    },
    {
      title: 'Samsung Smart TV',
      color: '#1428A0',
      icon: '📺',
      steps: [
        'افتح تطبيق SmartThings على iPhone',
        'أو اضغط "SmartView" في ريموت Samsung',
        'اختر iPhone من قائمة الأجهزة',
        'اقبل الاتصال على التلفزيون',
      ],
    },
    {
      title: 'LG TV',
      color: '#A50034',
      icon: '📺',
      steps: [
        'اضغط زر المنزل في ريموت LG',
        'اذهب إلى الإعدادات ← مشاركة الشاشة',
        'شغّل Screen Share وانتظر الاتصال',
        'أو استخدم AirPlay إن كان LG يدعمه',
      ],
    },
  ] : android ? [
    {
      title: 'عرض على التلفزيون',
      color: '#CC0000',
      icon: '📡',
      steps: [
        'افتح لوحة الإشعارات (اسحب من الأعلى)',
        'ابحث عن "نسخ الشاشة" أو "Screen Cast"',
        'اختر التلفزيون من القائمة',
        'تأكد أن هاتفك والتلفزيون على نفس الواي فاي',
      ],
    },
    {
      title: 'Samsung — Smart View',
      color: '#1428A0',
      icon: '📺',
      steps: [
        'اسحب لوحة الإشعارات ← Smart View',
        'أو افتح تطبيق SmartThings',
        'اختر التلفزيون واضغط "نسخ الشاشة"',
      ],
    },
    {
      title: 'Google Chromecast / Built-in Cast',
      color: '#DB4437',
      icon: '📡',
      steps: [
        'افتح متصفح Chrome على هاتفك',
        'اضغط النقاط الثلاث (⋮) في الأعلى',
        'اختر "Cast" أو "بث"',
        'اختر التلفزيون من القائمة',
      ],
    },
    {
      title: 'LG TV',
      color: '#A50034',
      icon: '📺',
      steps: [
        'اضغط زر المنزل في ريموت LG',
        'اذهب إلى الإعدادات ← مشاركة الشاشة',
        'شغّل وانتظر الاتصال من هاتفك',
      ],
    },
  ] : [
    {
      title: 'iPhone / iPad — AirPlay',
      color: '#CC0000',
      icon: '📱',
      steps: [
        'مركز التحكم ← Screen Mirroring',
        'اختر التلفزيون من القائمة',
      ],
    },
    {
      title: 'Android — نسخ الشاشة',
      color: '#3DDC84',
      icon: '📱',
      steps: [
        'لوحة الإشعارات ← نسخ الشاشة / Smart View',
        'اختر التلفزيون من القائمة',
      ],
    },
    {
      title: 'Google Cast (Chrome)',
      color: '#DB4437',
      icon: '📡',
      steps: [
        'متصفح Chrome ← النقاط ⋮ ← Cast',
        'اختر التلفزيون',
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 30 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(8,0,0,0.97)',
          border: '1.5px solid rgba(204,0,0,0.4)',
          borderRadius: 20,
          padding: 24,
          width: '100%',
          maxWidth: 480,
          maxHeight: '90svh',
          overflowY: 'auto',
          boxShadow: '0 0 60px rgba(204,0,0,0.25)',
        }}
        dir="rtl"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tv2 style={{ width: 22, height: 22, color: '#CC0000' }} />
            <span style={{ fontSize: 18, fontWeight: 900, color: '#FFE4E4', fontFamily: 'var(--font-cairo)' }}>
              عرض على التلفزيون
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,100,100,0.6)', padding: 4 }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,150,150,0.7)', fontFamily: 'var(--font-cairo)', marginBottom: 16, textAlign: 'center' }}>
          {ios ? 'اتبع الخطوات حسب نوع تلفزيونك — iPhone / iPad' : android ? 'اتبع الخطوات حسب نوع تلفزيونك — Android' : 'اتبع الخطوات حسب جهازك ونوع التلفزيون'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sections.map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${s.color}44`,
              borderRadius: 14,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Wifi style={{ width: 16, height: 16, color: s.color }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#FFE4E4', fontFamily: 'var(--font-cairo)' }}>
                  {s.icon} {s.title}
                </span>
              </div>
              <ol style={{ margin: 0, paddingRight: 18, listStyleType: 'decimal' }}>
                {s.steps.map((step, j) => (
                  <li key={j} style={{ fontSize: 12, color: 'rgba(255,220,220,0.85)', fontFamily: 'var(--font-cairo)', marginBottom: 5, lineHeight: 1.6 }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'rgba(255,100,100,0.4)', textAlign: 'center', marginTop: 16, fontFamily: 'var(--font-cairo)' }}>
          تأكد أن هاتفك والتلفزيون على نفس شبكة الواي فاي
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function ScreenMirrorButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 500,
          background: 'rgba(8,0,0,0.75)',
          border: '1.5px solid rgba(204,0,0,0.5)',
          borderRadius: 14,
          padding: '9px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 18px rgba(204,0,0,0.25)',
          color: '#FFE4E4',
          fontFamily: 'var(--font-cairo)',
          fontWeight: 700,
          fontSize: 13,
        }}
        dir="rtl"
      >
        <Tv2 style={{ width: 17, height: 17, color: '#CC0000' }} />
        عرض على التلفاز
      </motion.button>

      <AnimatePresence>
        {open && <MirrorModal onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
