import { useEffect, useRef, useState, useCallback } from 'react';

const STORAGE_KEY = 'mn_alwahsh_bgmusic_muted';

const TRACKS = [
  '/bg-music.mp3',
  '/track1.mpeg',
  '/track2.mpeg',
  '/track3.mpeg',
  '/track4.mpeg',
  '/track5.mpeg',
];

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BackgroundMusic() {
  const audioRef = useRef(null);
  const playlistRef = useRef(shuffled(TRACKS));
  const indexRef = useRef(0);
  const startedRef = useRef(false);

  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [started, setStarted] = useState(false);

  const loadTrack = useCallback((idx) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = playlistRef.current[idx];
    audio.load();
  }, []);

  const playNext = useCallback(() => {
    let next = indexRef.current + 1;
    if (next >= playlistRef.current.length) {
      playlistRef.current = shuffled(TRACKS);
      next = 0;
    }
    indexRef.current = next;
    loadTrack(next);
    audioRef.current.play().catch(() => {});
  }, [loadTrack]);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.28;
    audio.preload = 'auto';
    audioRef.current = audio;

    loadTrack(0);

    audio.addEventListener('ended', playNext);

    return () => {
      audio.removeEventListener('ended', playNext);
      audio.pause();
      audio.src = '';
    };
  }, [loadTrack, playNext]);

  // Start on first user interaction
  useEffect(() => {
    if (started) return;
    const tryPlay = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = muted;
      audio.play().then(() => setStarted(true)).catch(() => {});
    };
    const events = ['touchstart', 'mousedown', 'keydown'];
    events.forEach(e => document.addEventListener(e, tryPlay, { once: true, passive: true }));
    tryPlay();
    return () => events.forEach(e => document.removeEventListener(e, tryPlay));
  }, [started, muted]);

  // Sync muted state
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    try { localStorage.setItem(STORAGE_KEY, muted); } catch {}
  }, [muted]);

  const toggle = () => setMuted(m => !m);

  return (
    <button
      onClick={toggle}
      title={muted ? 'تشغيل الموسيقى' : 'كتم الموسيقى'}
      style={{
        position: 'fixed',
        bottom: 18,
        left: 18,
        zIndex: 9998,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(10,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
        transition: 'opacity 0.2s',
        opacity: 0.75,
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.75'}
    >
      {muted ? '🔇' : '🎵'}
    </button>
  );
}
