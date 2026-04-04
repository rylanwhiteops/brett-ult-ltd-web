'use client';

import { motion, useReducedMotion } from 'framer-motion';

const WORDS = ['Uncompromised', 'Protection.'];

export default function HeroHeadline() {
  const reducedMotion = useReducedMotion();

  return (
    <h1
      className="font-black uppercase leading-[0.92] tracking-[-0.03em] mb-6"
      // clamp keeps text inside the 40% left column at all viewport widths
      style={{ fontSize: 'clamp(2.4rem, 5.2vw, 5.8rem)', overflow: 'visible' }}
    >
      {WORDS.map((word, wi) => (
        // clip the slide-up animation, but let the settled text overflow freely
        <span key={wi} className="block" style={{ overflow: wi === 0 ? 'hidden' : 'hidden', marginBottom: '0.05em' }}>
          <motion.span
            className="block"
            style={{
              background:           'linear-gradient(108deg,#5a4710 0%,#9a7c20 15%,#D4AF37 35%,#f7e98e 50%,#D4AF37 65%,#9a7c20 85%,#5a4710 100%)',
              backgroundSize:       '250% auto',
              WebkitBackgroundClip: 'text',
              backgroundClip:       'text',
              WebkitTextFillColor:  'transparent',
              animation:            reducedMotion ? 'none' : 'shimmer 6s linear infinite',
              display:              'block',
            }}
            initial={reducedMotion ? false : { y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 1.5, delay: 0.4 + wi * 0.5, ease: [0.16, 1, 0.3, 1] }
            }
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
