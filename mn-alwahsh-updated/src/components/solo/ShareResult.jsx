// One button that shares the result picture plus a line saying which level
// was reached (no link). Phones and browsers with file sharing open the system
// share sheet (WhatsApp, Facebook, Instagram…); anywhere else a preview opens
// so the picture can be saved and sent by hand.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderResultCard, shareText, cardDataFor } from './resultCard';
import { isRunningInAndroidApp, isRunningInIOSApp } from '../../utils/platform';
import { canNativeShare, nativeShareImage } from '../../utils/nativeBridge';
import { springs } from './soloMotion';

// The apps' in-app view can't share files or save downloads, so they open this page in the
// phone's real browser (a different host, so the app hands it to Chrome/Safari). The
// Netlify address serves the same site.
const BROWSER_SHARE_ORIGIN = 'https://mnalwahsh.netlify.app';
const inApp = () => isRunningInAndroidApp() || isRunningInIOSApp();

const font = { fontFamily: 'var(--font-cairo)' };
const btn = {
  ...font, fontWeight: 800, fontSize: 15, color: '#FFE9E9', cursor: 'pointer',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,22,28,0.5)', borderRadius: 12, padding: '10px 16px',
};

export default function ShareResult({ run }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState(null); // { url } shown when the device can't share files
  const [copied, setCopied] = useState(false);
  const text = shareText(run);

  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  const onShare = async () => {
    setBusy(true); setError(false);
    try {
      const blob = await renderResultCard(run);
      if (!blob) throw new Error('no-image');
      // Inside the Android app: hand the picture to the system share sheet.
      if (canNativeShare() && await nativeShareImage(blob, text)) return;
      const file = new File([blob], 'mn-alwahsh-solo.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text });
          return;
        } catch (e) {
          if (e?.name === 'AbortError') return; // the player closed the share sheet
        }
      }
      setPreview({ url: URL.createObjectURL(blob) });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const openInBrowser = () => {
    const d = cardDataFor(run);
    const q = new URLSearchParams({ l: String(d.level), s: String(d.score), f: d.finished ? '1' : '0', a: d.allCategories ? '1' : '0' });
    window.location.href = `${BROWSER_SHARE_ORIGIN}/solo-share?${q}`;
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <motion.button whileTap={{ scale: 0.97 }} transition={springs.snappy} style={{ ...btn, width: '100%', borderColor: '#25D366' }} onClick={onShare} disabled={busy}>
        {busy ? 'جاري تجهيز الصورة…' : '📣 شارك نتيجتك (صورة)'}
      </motion.button>
      {error && <p style={{ ...font, fontSize: 12, color: '#FF8A8A' }}>تعذّر تجهيز الصورة، حاول مرة أخرى.</p>}

      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreview(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.82)', display: 'grid', placeItems: 'center', padding: 14, overflowY: 'auto' }}>
            <motion.div role="dialog" aria-modal="true" initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} transition={springs.gentle}
              onClick={(e) => e.stopPropagation()} dir="rtl"
              style={{ ...font, maxWidth: 420, width: '100%', background: '#140607', border: '1px solid rgba(196,22,28,0.5)', borderRadius: 16, padding: 14, textAlign: 'center', color: '#FFE9E9' }}>
              <img src={preview.url} alt="نتيجتك" style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain', borderRadius: 10 }} />
              <p style={{ fontSize: 14, fontWeight: 700, margin: '10px 0 4px' }}>{text}</p>
              <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
                {inApp() ? 'المشاركة المباشرة غير متاحة داخل التطبيق: افتح الصفحة في المتصفح لمشاركة الصورة.' : 'جهازك لا يدعم المشاركة المباشرة: احفظ الصورة ثم أرسلها مع النص.'}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {inApp()
                  ? <button style={{ ...btn, borderColor: '#25D366', color: '#25D366' }} onClick={openInBrowser}>افتح في المتصفح للمشاركة</button>
                  : <a href={preview.url} download="mn-alwahsh-solo.png" style={{ ...btn, textDecoration: 'none', borderColor: '#FFD700', color: '#FFD700' }}>حفظ الصورة</a>}
                <button style={btn} onClick={copy}>{copied ? '✔ نُسخ' : 'نسخ النص'}</button>
                <button style={btn} onClick={() => setPreview(null)}>إغلاق</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
