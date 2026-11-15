// Number that counts to its new value. Starts from the previous value, so a
// score that goes 1,200 → 1,400 counts up by 200 instead of replaying from 0.
import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { ease } from './soloMotion';

export default function CountUp({ value, from, duration = 0.9, signed = false }) {
  const reduce = useReducedMotion();
  const start = useRef(from ?? value);
  const [shown, setShown] = useState(from ?? value);

  useEffect(() => {
    if (reduce) { setShown(value); start.current = value; return undefined; }
    const controls = animate(start.current, value, {
      duration, ease,
      onUpdate: v => setShown(Math.round(v)),
      onComplete: () => { start.current = value; },
    });
    return () => { controls.stop(); start.current = value; };
  }, [value, duration, reduce]);

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {signed && shown > 0 ? '+' : ''}{shown.toLocaleString('en')}
    </span>
  );
}
