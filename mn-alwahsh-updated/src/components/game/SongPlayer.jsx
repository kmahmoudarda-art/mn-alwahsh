// "Guess the song" player — plays a short clip through YouTube's own embedded
// player (no audio files are hosted by us). YouTube's terms require the player
// to stay visible and at least 200x200, so it is shown, not hidden; ads may
// play before the clip on monetized videos.
//
// Uses the YouTube IFrame API so we know when the clip really starts playing:
// `onStarted` fires once, at the first PLAYING state (i.e. after any ad), and
// the game's countdown is started from there instead of when the question opens.
import { useEffect, useRef } from 'react';

let apiPromise = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { apiPromise = null; reject(new Error('yt api')); };
    document.head.appendChild(s);
  });
  return apiPromise;
}

const MAX_WAIT_MS = 60000; // never leave the game stuck if play is never pressed

export default function SongPlayer({ videoId, start = 0, duration = 12, onStarted }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const startedRef = useRef(false);
  const onStartedRef = useRef(onStarted);
  onStartedRef.current = onStarted;

  useEffect(() => {
    let cancelled = false;
    const fireStarted = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      if (onStartedRef.current) onStartedRef.current();
    };
    const fallback = setTimeout(fireStarted, MAX_WAIT_MS);

    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          start, end: start + duration, playsinline: 1, rel: 0, modestbranding: 1,
          fs: 0, iv_load_policy: 3, disablekb: 1, origin: window.location.origin,
        },
        events: {
          onStateChange: (e) => { if (e.data === 1) fireStarted(); },
          onError: fireStarted,
        },
      });
    }).catch(fireStarted); // API blocked/offline: don't freeze the game

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [videoId, start, duration]);

  const replay = () => {
    try {
      playerRef.current?.loadVideoById({ videoId, startSeconds: start, endSeconds: start + duration });
    } catch { /* ignore */ }
  };

  if (!videoId) return null;
  return (
    <div style={{ width:'100%', maxWidth:320, display:'flex', flexDirection:'column', alignItems:'center', marginBottom:10, flexShrink:0 }}>
      <div style={{ width:'100%', aspectRatio:'16 / 10', minHeight:200, borderRadius:12, overflow:'hidden', background:'#000' }}>
        <div ref={hostRef} style={{ width:'100%', height:'100%' }} />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
        <button onClick={replay} style={{ fontFamily:'var(--font-cairo)', fontWeight:700, fontSize:12,
          padding:'4px 12px', borderRadius:16, border:'1px solid rgba(0,0,0,0.25)', background:'#fff', color:'#1a1a1a', cursor:'pointer' }}>
          🔁 إعادة المقطع
        </button>
        <span style={{ fontFamily:'var(--font-cairo)', fontSize:11, color:'#555' }}>العدّاد يبدأ عند تشغيل المقطع</span>
      </div>
    </div>
  );
}
