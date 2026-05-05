import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'mn_alwahsh_bgmusic_muted';

export default function BackgroundMusic() {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [started, setStarted] = useState(false);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio('/bg-music.mp3');
    audio.loop = true;
    audio.volume = 0.28;
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // Start on first user interaction (browsers block autoplay without it)
  useEffect(() => {
    if (started) return;
    const tryPlay = () => {
      if (!audioRef.current || started) return;
      audioRef.current.muted = muted;
      audioRef.current.play().then(() => {
        setStarted(true);
      }).catch(() => {});
    };
    const events = ['touchstart', 'mousedown', 'keydown'];
    events.forEach(e => document.addEventListener(e, tryPlay, { once: true, passive: true }));
    // Also try immediately (works in some PWA contexts)
    tryPlay();
    return () => events.forEach(e => document.removeEventListener(e, tryPlay));
  }, [started, muted]);

  // Sync muted state to audio element + localStorage
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
