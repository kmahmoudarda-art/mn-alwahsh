// "Guess the song" player — a plain audio button that plays the official
// ~30-second preview Apple publishes for each song (iTunes Search/Lookup API).
// No audio is hosted by us, and nothing on screen shows the song's name,
// artwork or video. Credit to Apple is shown as required by their terms.
//
// `onStarted` fires once when the preview actually starts playing; the game's
// countdown is started from there instead of when the question opens.
import { useEffect, useRef, useState } from 'react';

const MAX_WAIT_MS = 60000; // never leave the game stuck if play is never pressed

export default function SongPlayer({ itunesId, onStarted }) {
  const audioRef = useRef(null);
  const startedRef = useRef(false);
  const onStartedRef = useRef(onStarted);
  onStartedRef.current = onStarted;
  const [status, setStatus] = useState('loading'); // loading | ready | playing | error
  const fireStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (onStartedRef.current) onStartedRef.current();
  };

  useEffect(() => {
    let cancelled = false;
    startedRef.current = false;
    const fallback = setTimeout(fireStarted, MAX_WAIT_MS);
    fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(itunesId)}`)
      .then(r => r.json())
      .then(d => {
        const url = d?.results?.[0]?.previewUrl;
        if (!url) throw new Error('no preview');
        if (cancelled) return;
        const a = new Audio(url);
        a.preload = 'auto';
        a.onplaying = () => { setStatus('playing'); fireStarted(); };
        a.onpause = () => setStatus('ready');
        a.onended = () => setStatus('ready');
        a.onerror = () => { setStatus('error'); fireStarted(); };
        audioRef.current = a;
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) { setStatus('error'); fireStarted(); } }); // don't freeze the game
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      const a = audioRef.current;
      if (a) { a.onplaying = a.onpause = a.onended = a.onerror = null; a.pause(); }
      audioRef.current = null;
    };
  }, [itunesId]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) { a.pause(); return; }
    a.currentTime = 0;
    a.play().catch(() => setStatus('error'));
  };

  const label = status === 'loading' ? '⏳ جاري التحميل…'
    : status === 'error' ? '⚠️ تعذّر تشغيل المقطع'
    : status === 'playing' ? '⏸️ إيقاف' : '🎧 شغّل المقطع';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:12, flexShrink:0 }}>
      <button onClick={toggle} disabled={status === 'loading' || status === 'error'} style={{
        fontFamily:'var(--font-cairo)', fontWeight:800, fontSize:18, padding:'14px 28px', borderRadius:40,
        border:'2px solid #1a1a1a', background: status === 'playing' ? '#fde68a' : '#fff', color:'#1a1a1a',
        cursor: status === 'loading' || status === 'error' ? 'default' : 'pointer', minWidth:200,
      }}>{label}</button>
      <span style={{ fontFamily:'var(--font-cairo)', fontSize:11, color:'#555', marginTop:6 }}>
        العدّاد يبدأ عند تشغيل المقطع · ♪ Preview by Apple
      </span>
    </div>
  );
}
