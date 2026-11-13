// "Guess the song" player — a plain audio button that plays the official
// ~30-second preview Apple publishes for each song (iTunes Search/Lookup API).
// No audio is hosted by us, and nothing on screen shows the song's name,
// artwork or video. Credit to Apple is shown as required by their terms.
//
// `onStarted` fires once when the preview actually starts playing; the game's
// countdown is started from there instead of when the question opens.
import { useEffect, useRef, useState } from 'react';

const MAX_WAIT_MS = 60000; // never leave the game stuck if play is never pressed
const CLIP_SECONDS = 5;   // how long each press of play lasts

export default function SongPlayer({ itunesId, onStarted }) {
  const audioRef = useRef(null);
  const startedRef = useRef(false);
  const stopTimerRef = useRef(null);
  const onStartedRef = useRef(onStarted);
  onStartedRef.current = onStarted;
  const [status, setStatus] = useState('loading'); // loading | ready | playing | error
  const [errCode, setErrCode] = useState(0); // 1 lookup failed, 2 no preview, 3 audio failed, 4 play blocked
  const fireStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (onStartedRef.current) onStartedRef.current();
  };

  useEffect(() => {
    let cancelled = false;
    startedRef.current = false;
    const fallback = setTimeout(fireStarted, MAX_WAIT_MS);
    const lookup = async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error('lookup-' + r.status);
      return (await r.json())?.results?.[0]?.previewUrl || null;
    };
    const viaServer = async () => {
      const r = await fetch(`/.netlify/functions/itunes-preview?id=${encodeURIComponent(itunesId)}`);
      if (!r.ok) throw new Error('fn-' + r.status);
      return (await r.json())?.previewUrl || null;
    };
    // Server lookup first (works regardless of the player's region/ad blocker),
    // then Apple directly as a fallback.
    viaServer().catch(() => null)
      .then(u => u || lookup(`https://itunes.apple.com/lookup?id=${encodeURIComponent(itunesId)}`).catch(() => null))
      .then(url => {
        if (!url) { const e = new Error('no-preview'); e.code = 2; throw e; }
        if (cancelled) return;
        const a = new Audio(url);
        a.preload = 'auto';
        a.onplaying = () => {
          setStatus('playing'); fireStarted();
          clearTimeout(stopTimerRef.current);
          stopTimerRef.current = setTimeout(() => a.pause(), CLIP_SECONDS * 1000);
        };
        a.onpause = () => setStatus('ready');
        a.onended = () => setStatus('ready');
        a.onerror = () => { setErrCode(3); setStatus('error'); fireStarted(); };
        audioRef.current = a;
        setStatus('ready');
      })
      .catch((e) => { if (!cancelled) { setErrCode(e?.code || 1); setStatus('error'); fireStarted(); } }); // don't freeze the game
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      clearTimeout(stopTimerRef.current);
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
    a.play().catch(() => { setErrCode(4); setStatus('error'); });
  };

  const label = status === 'loading' ? '⏳ جاري التحميل…'
    : status === 'error' ? `⚠️ تعذّر تشغيل المقطع (${errCode})`
    : status === 'playing' ? '⏸️ إيقاف' : (startedRef.current ? '🔁 أعد المقطع' : '🎧 شغّل المقطع');

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:12, flexShrink:0 }}>
      <button onClick={toggle} disabled={status === 'loading' || status === 'error'} style={{
        fontFamily:'var(--font-cairo)', fontWeight:800, fontSize:18, padding:'14px 28px', borderRadius:40,
        border:'2px solid #1a1a1a', background: status === 'playing' ? '#fde68a' : '#fff', color:'#1a1a1a',
        cursor: status === 'loading' || status === 'error' ? 'default' : 'pointer', minWidth:200,
      }}>{label}</button>
      <span style={{ fontFamily:'var(--font-cairo)', fontSize:11, color:'#555', marginTop:6 }}>
        مقطع قصير (٥ ثوانٍ) · العدّاد يبدأ عند التشغيل · ♪ Preview by Apple
      </span>
    </div>
  );
}
