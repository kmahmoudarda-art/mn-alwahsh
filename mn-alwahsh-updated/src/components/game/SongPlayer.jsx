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
const LOAD_TIMEOUT_MS = 10000; // the clip's address must be found and the audio created by then
const PLAY_TIMEOUT_MS = 8000;  // after pressing play, sound must actually start by then

export default function SongPlayer({ itunesId, onStarted, onFailed, onSkip, skipsLeft = 0, solo = false }) {
  const audioRef = useRef(null);
  const startedRef = useRef(false);
  const stopTimerRef = useRef(null);
  const onStartedRef = useRef(onStarted);
  onStartedRef.current = onStarted;
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;
  const [status, setStatus] = useState('loading'); // loading | ready | playing | error
  const [attempt, setAttempt] = useState(0); // bumped to retry loading after an error
  const [errCode, setErrCode] = useState(0); // 1 lookup failed, 2 no preview, 3 audio failed, 4 play refused, 5 sound never started, 6 timed out loading
  const [attempted, setAttempted] = useState(false); // the player has pressed play at least once
  const playWatch = useRef(null);
  const fireStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (onStartedRef.current) onStartedRef.current();
  };

  // Any failure ends the same way: show the error and, in the solo game, let it swap the question.
  const fail = (code) => {
    clearTimeout(playWatch.current);
    setErrCode(code); setStatus('error'); fireStarted();
    if (onFailedRef.current) onFailedRef.current();
  };

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    startedRef.current = false;
    const fallback = setTimeout(fireStarted, MAX_WAIT_MS);
    // Never sit on "loading" forever (a stalled request used to leave the question stuck).
    const loadWatch = setTimeout(() => { if (!cancelled && !audioRef.current) fail(6); }, LOAD_TIMEOUT_MS);
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
        let startPos = 0;
        a.onplaying = () => {
          clearTimeout(playWatch.current);
          startPos = a.currentTime;
          setStatus('playing'); fireStarted();
          clearTimeout(stopTimerRef.current);
          stopTimerRef.current = setTimeout(() => a.pause(), CLIP_SECONDS * 1000);
        };
        // second, independent way to stop at 5s (in case the timer is throttled)
        a.ontimeupdate = () => { if (!a.paused && a.currentTime - startPos >= CLIP_SECONDS) a.pause(); };
        a.onpause = () => { clearTimeout(playWatch.current); setStatus('ready'); };
        a.onended = () => { clearTimeout(playWatch.current); setStatus('ready'); };
        a.onerror = () => {
          if (attempt === 0) { setAttempt(1); return; } // one silent retry
          fail(3);
        };
        audioRef.current = a;
        clearTimeout(loadWatch);
        setStatus('ready');
      })
      .catch((e) => { clearTimeout(loadWatch); if (!cancelled) fail(e?.code || 1); }); // don't freeze the game
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      clearTimeout(loadWatch);
      clearTimeout(playWatch.current);
      clearTimeout(stopTimerRef.current);
      const a = audioRef.current;
      if (a) { a.onplaying = a.onpause = a.onended = a.onerror = a.ontimeupdate = null; a.pause(); }
      audioRef.current = null;
    };
  }, [itunesId, attempt]);

  const toggle = () => {
    if (status === 'error') { setStatus('loading'); setAttempt(n => n + 1); return; } // tap to retry
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) { a.pause(); return; }
    a.currentTime = 0;
    setAttempted(true);
    // pressing play must produce sound; if the device refuses or nothing starts, treat it as a failure
    clearTimeout(playWatch.current);
    playWatch.current = setTimeout(() => fail(5), PLAY_TIMEOUT_MS); // cleared the moment sound starts or the player pauses
    a.play().catch(() => fail(4));
  };

  const label = status === 'loading' ? '⏳ جاري التحميل…'
    : status === 'error' ? `⚠️ تعذّر التشغيل (${errCode}) · اضغط للمحاولة`
    : status === 'playing' ? '⏸️ إيقاف' : (startedRef.current ? '🔁 أعد المقطع' : '🎧 شغّل المقطع');

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:12, flexShrink:0 }}>
      <button onClick={toggle} disabled={status === 'loading'} style={{
        fontFamily:'var(--font-cairo)', fontWeight:800, fontSize:18, padding:'14px 28px', borderRadius:40,
        border:'2px solid #1a1a1a', background: status === 'playing' ? '#fde68a' : '#fff', color:'#1a1a1a',
        cursor: status === 'loading' ? 'default' : 'pointer', minWidth:200,
      }}>{label}</button>
      <span style={{ fontFamily:'var(--font-cairo)', fontSize:11, color:'#555', marginTop:6 }}>
        {solo ? 'مقطع قصير (٥ ثوانٍ) · العدّاد (30 ثانية) يبدأ عند التشغيل · ♪ Preview by Apple' : 'مقطع قصير (٥ ثوانٍ) · العدّاد يبدأ عند التشغيل · ♪ Preview by Apple'}
      </span>
      {onSkip && attempted && skipsLeft > 0 && status !== 'loading' && (
        <button onClick={onSkip} style={{
          fontFamily:'var(--font-cairo)', fontWeight:700, fontSize:13, marginTop:8, padding:'6px 14px', borderRadius:20,
          border:'1px solid #8B1A1A', background:'transparent', color:'#8B1A1A', cursor:'pointer',
        }}>🔄 لا تسمع الصوت؟ بدّل الأغنية ({skipsLeft})</button>
      )}
    </div>
  );
}
