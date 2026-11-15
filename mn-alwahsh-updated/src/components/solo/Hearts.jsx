// The player's hearts. The one that was just lost breaks with a little shake.
import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function Hearts({ hearts, max = 3 }) {
  const reduce = useReducedMotion();
  const prev = useRef(hearts);
  const [broken, setBroken] = useState(null); // index of the heart that was just lost

  useEffect(() => {
    let id;
    if (hearts < prev.current) {
      setBroken(hearts);
      id = setTimeout(() => setBroken(null), 800);
    }
    prev.current = hearts;
    return () => clearTimeout(id);
  }, [hearts]);

  return (
    <div role="img" aria-label={`${hearts} من ${max} قلوب`} style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
      {Array.from({ length: max }).map((_, i) => {
        const alive = i < hearts;
        return (
          <motion.span
            key={i}
            animate={broken === i && !reduce ? { scale: [1, 1.6, 0.85, 1], rotate: [0, -18, 18, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.7 }}
            style={{ fontSize: 20, lineHeight: 1, filter: alive ? 'none' : 'grayscale(1) opacity(0.4)' }}
          >
            {alive ? '❤️' : '🖤'}
          </motion.span>
        );
      })}
    </div>
  );
}
