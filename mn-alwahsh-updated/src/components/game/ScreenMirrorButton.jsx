import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv2, X, Cast, Wifi } from 'lucide-react';

function MirrorModal({ onClose }) {
  const [casting, setCasting] = useState(false);
  const [castAvailable, setCastAvailable] = useState(!!window.__castReady);

  useEffect(() => {
    const handler = () => setCastAvailable(true);
    window.addEventListener('castready', handler);
    return () => window.removeEventListener('castready', handler);
  }, []);

  const handleCast = async () => {
    // Try Google Cast (works on Chrome with Chromecast / built-in Chromecast TVs)
    if (window.__castReady && window.cast) {
      try {
        setCasting(true);
        const ctx = cast.framework.CastContext.getInstance();
        await ctx.requestSession();
        setCasting(false);
        onClose();
        return;
      } catch (e) {
        setCasting(false);
      }
    }
    // Fallback: Presentation API
    if (window.PresentationRequest) {
      try {
        const req = new PresentationRequest([window.location.href]);
        await req.start();
        onClose();
      } catch (e) {}
    }
  };

  const brands = [
    {
      name: 'Samsung',
      color: '#1428A0',
      icon: '📺',
      steps: [
        'اضغط على زر "SmartThings" في ريموت Samsung',
        'أو افتح تطبيق SmartThings على هاتفك',
        'اختر "نسخ الشاشة" أو "Screen Mirroring"',
        'اختر التلفزيون من القائمة',
      ],
    },
    {
      name: 'LG',
      color: '#A50034',
      icon: '📺',
      steps: [
        'اضغط على زر المنزل في ريموت LG',
        'اذهب إلى الإعدادات ← مشاركة الشاشة',
        'أو استخدم "Screen Share" من بلوتوث هاتفك',
        'على iPhone: اضغط Screen Mirroring',
      ],
    },
    {
      name: 'Philips',
      color: '#0050A0',
      icon: '📺',
      steps: [
        'معظم شاشات Philips الحديثة تدعم Chromecast',
        'استخدم زر Cast في متصفح Chrome',
        'أو اضغط "نسخ الشاشة" من إعدادات هاتفك الأندرويد',
        'على iPhone: استخدم AirPlay إن كان مدعوماً',
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
          maxHeight: '90vh',
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

        {/* Cast button — shown on Chrome when Cast SDK is available or Presentation API exists */}
        {(castAvailable || (typeof PresentationRequest !== 'undefined')) && (
          <button
            onClick={handleCast}
            disabled={casting}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 14,
              background: casting
                ? 'rgba(139,0,0,0.3)'
                : 'linear-gradient(135deg, #6B0000 0%, #CC0000 50%, #6B0000 100%)',
              border: '1px solid rgba(255,60,60,0.4)',
              color: '#FFE4E4',
              fontFamily: 'var(--font-cairo)',
              fontWeight: 700,
              fontSize: 15,
              cursor: casting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 20,
              boxShadow: '0 0 20px rgba(204,0,0,0.4)',
            }}
          >
            <Cast style={{ width: 18, height: 18 }} />
            {casting ? 'جارٍ البحث عن التلفزيون...' : 'اعرض على التلفزيون (Cast)'}
          </button>
        )}

        <p style={{ fontSize: 12, color: 'rgba(255,150,150,0.6)', fontFamily: 'var(--font-cairo)', marginBottom: 16, textAlign: 'center' }}>
          أو اتبع الخطوات حسب نوع تلفزيونك
        </p>

        {/* Per-brand instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {brands.map(brand => (
            <div key={brand.name} style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${brand.color}44`,
              borderRadius: 14,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Wifi style={{ width: 16, height: 16, color: brand.color }} />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#FFE4E4', fontFamily: 'var(--font-cairo)' }}>
                  {brand.name}
                </span>
              </div>
              <ol style={{ margin: 0, paddingRight: 18, listStyleType: 'decimal' }}>
                {brand.steps.map((step, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'rgba(255,220,220,0.8)', fontFamily: 'var(--font-cairo)', marginBottom: 4, lineHeight: 1.5 }}>
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
