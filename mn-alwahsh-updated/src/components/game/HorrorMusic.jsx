import { useEffect, useRef, useState } from 'react';

export default function HorrorMusic() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const nodesRef = useRef([]);

  const stop = () => {
    nodesRef.current.forEach(n => { try { n.stop(); } catch {} });
    nodesRef.current = [];
    if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
  };

  const start = () => {
    stop();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    masterRef.current = master;

    /* ── helper ── */
    const osc = (freq, type, gainVal, detune = 0) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      g.gain.value = gainVal;
      o.connect(g);
      g.connect(master);
      o.start();
      nodesRef.current.push(o);
      return { o, g };
    };

    /* ── Low horror drone ── */
    const { o: d1 } = osc(40, 'sine', 0.6);
    const { o: d2 } = osc(41.2, 'sine', 0.4);        // slight beating
    const { o: d3 } = osc(80, 'triangle', 0.18);      // octave
    const { o: d4 } = osc(20, 'sine', 0.3);           // sub rumble

    /* ── Slow LFO on drone pitch ── */
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoG.gain.value = 3;
    lfo.connect(lfoG);
    lfoG.connect(d1.frequency);
    lfoG.connect(d2.frequency);
    lfo.start();
    nodesRef.current.push(lfo);

    /* ── Atmospheric pad (filtered noise) ── */
    const bufLen = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 180;
    noiseFilter.Q.value = 4;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.25;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();
    nodesRef.current.push(noise);

    /* ── Slow LFO on noise gain (breathing effect) ── */
    const breathLFO = ctx.createOscillator();
    const breathG = ctx.createGain();
    breathLFO.frequency.value = 0.12;
    breathG.gain.value = 0.12;
    breathLFO.connect(breathG);
    breathG.connect(noiseGain.gain);
    breathLFO.start();
    nodesRef.current.push(breathLFO);

    /* ── Occasional high creaky stabs ── */
    const scheduleCreak = () => {
      if (!ctxRef.current) return;
      const delay = 4 + Math.random() * 10;
      setTimeout(() => {
        if (!ctxRef.current) return;
        const freq = 800 + Math.random() * 1200;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freq, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(freq * 0.3, ctx.currentTime + 0.8);
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        o.connect(g);
        g.connect(master);
        o.start();
        o.stop(ctx.currentTime + 0.85);
        scheduleCreak();
      }, delay * 1000);
    };
    scheduleCreak();

    /* ── Deep bass pulses ── */
    const schedulePulse = () => {
      if (!ctxRef.current) return;
      const delay = 3 + Math.random() * 6;
      setTimeout(() => {
        if (!ctxRef.current) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 55 + Math.random() * 20;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
        o.connect(g);
        g.connect(master);
        o.start();
        o.stop(ctx.currentTime + 1.9);
        schedulePulse();
      }, delay * 1000);
    };
    schedulePulse();
  };

  useEffect(() => {
    if (playing) start();
    else stop();
    return stop;
  }, [playing]);

  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = volume;
  }, [volume]);

  return (
    <div className="flex items-center gap-1.5" dir="rtl">
      <button
        onClick={() => setPlaying(p => !p)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-cairo font-bold transition-all"
        style={{
          background: playing ? 'rgba(139,0,0,0.8)' : 'rgba(255,255,255,0.12)',
          border: playing ? '1px solid #FF4444' : '1px solid rgba(255,255,255,0.25)',
          color: playing ? '#FFE4E4' : 'rgba(255,255,255,0.7)',
          fontSize: 11,
        }}
        title={playing ? 'إيقاف الموسيقى' : 'تشغيل موسيقى الرعب'}
      >
        {playing ? '🔇' : '🎵'} {playing ? 'إيقاف' : 'رعب'}
      </button>
      {playing && (
        <input
          type="range" min="0" max="1" step="0.05"
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          style={{ width: 48, accentColor: '#CC0000', cursor: 'pointer' }}
        />
      )}
    </div>
  );
}
