import { useState } from 'react';
import { createPortal } from 'react-dom';

// Small looping "how to play" preview pinned to a corner. Fixed-position so
// it never shifts the page layout; tap it to watch full-size with sound.
export default function HowToPlayVideo() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return createPortal(
    <>
      {!open && (
        <div dir="rtl" style={{
          position: 'fixed', left: 12, bottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: 40,
          width: 'min(110px, 28vw)', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #CC0000',
          boxShadow: '0 0 14px rgba(204,0,0,0.5)', background: '#000',
        }}>
          <button onClick={() => setHidden(true)} aria-label="إخفاء الفيديو" style={{
            position: 'absolute', top: 2, left: 2, zIndex: 2, width: 20, height: 20, borderRadius: 10,
            border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, lineHeight: '20px', padding: 0,
          }}>✕</button>
          <video src="/how-to-play.mp4" autoPlay muted loop playsInline preload="metadata"
            onClick={() => setOpen(true)} style={{ width: '100%', display: 'block', cursor: 'pointer' }} />
          <div onClick={() => setOpen(true)} style={{
            fontFamily: 'var(--font-cairo)', fontSize: 11, fontWeight: 700, color: '#FFE4E4',
            textAlign: 'center', padding: '3px 0', background: 'rgba(139,0,0,0.85)', cursor: 'pointer',
          }}>▶ كيف تلعب؟</div>
        </div>
      )}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <video src="/how-to-play.mp4" autoPlay controls playsInline onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 900, maxHeight: '85vh', borderRadius: 14, border: '2px solid #CC0000' }} />
        </div>
      )}
    </>,
    document.body
  );
}
