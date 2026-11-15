// Opened in the phone's browser from the apps (whose in-app view can't share files):
// draws the result picture from the numbers in the link and offers the share sheet.
// Anyone can open it; it only draws a picture and contains no account data.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { renderCard, shareTextFor } from '../components/solo/resultCard';
import { TOTAL_LEVELS } from '../utils/soloEngine';

const num = (v, min, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

const font = { fontFamily: 'var(--font-cairo)' };
const btn = {
  ...font, fontWeight: 800, fontSize: 16, color: '#FFE9E9', cursor: 'pointer', textDecoration: 'none', textAlign: 'center',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(196,22,28,0.6)', borderRadius: 12, padding: '12px 18px',
};

export default function SoloShare() {
  const [params] = useSearchParams();
  const level = num(params.get('l'), 1, TOTAL_LEVELS);
  const score = num(params.get('s'), 0, 200000);
  const finished = params.get('f') === '1';
  const allCategories = params.get('a') === '1';
  const [pic, setPic] = useState(null); // { url, blob }
  const [note, setNote] = useState('');

  useEffect(() => {
    if (level === null || score === null) return undefined;
    let url = null; let cancelled = false;
    renderCard({ level, score, finished, allCategories }).then((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setPic({ url, blob });
    });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [level, score, finished, allCategories]);

  if (level === null || score === null) {
    return (
      <div dir="rtl" style={{ ...font, minHeight: '100vh', background: '#0A0305', color: '#FFE9E9', display: 'grid', placeItems: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 12 }}>رابط المشاركة غير صالح.</p>
          <Link to="/solo" style={btn}>العودة إلى التحدّي</Link>
        </div>
      </div>
    );
  }

  const text = shareTextFor({ level, finished });
  const share = async () => {
    if (!pic) return;
    const file = new File([pic.blob], 'mn-alwahsh-solo.png', { type: 'image/png' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      setNote('جهازك لا يدعم المشاركة المباشرة: احفظ الصورة (اضغط عليها مطوّلاً) ثم أرسلها مع النص.');
    } catch (e) {
      if (e?.name !== 'AbortError') setNote('تعذّرت المشاركة، احفظ الصورة وأرسلها يدوياً.');
    }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text); setNote('نُسخ النص.'); } catch { /* clipboard blocked */ } };

  return (
    <div dir="rtl" style={{ ...font, minHeight: '100vh', background: '#0A0305', color: '#FFE9E9', padding: '16px 14px 30px' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pic ? <img src={pic.url} alt="نتيجتك" style={{ width: '100%', borderRadius: 14, border: '1px solid rgba(196,22,28,0.5)' }} /> : <p style={{ padding: 40 }}>جاري تجهيز الصورة…</p>}
        <p style={{ fontWeight: 700 }}>{text}</p>
        <button style={{ ...btn, borderColor: '#25D366' }} onClick={share} disabled={!pic}>📣 شارك الصورة</button>
        {pic && <a href={pic.url} download="mn-alwahsh-solo.png" style={{ ...btn, borderColor: '#FFD700', color: '#FFD700' }}>حفظ الصورة</a>}
        <button style={btn} onClick={copy}>نسخ النص</button>
        {note && <p style={{ fontSize: 13, opacity: 0.8 }}>{note}</p>}
      </div>
    </div>
  );
}
