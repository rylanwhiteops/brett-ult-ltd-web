'use client';

import { motion, useReducedMotion } from 'framer-motion';

const WORDS = ['Uncompromised', 'Protection.'];

export default function HeroHeadline() {
  const reducedMotion = useReducedMotion();

  return (
    <h1 className="font-black uppercase leading-[0.9] tracking-[-0.04em] text-[3.6rem] md:text-[5.4rem] lg:text-[7.2rem] mb-8">
      {WORDS.map((word, wi) => (
        <span key={wi} className="block overflow-hidden">
          <motion.span
            className="block"
            style={{
              background: 'linear-gradient(105deg,#5a4710 0%,#9a7c20 15%,#D4AF37 35%,#f7e98e 50%,#D4AF37 65%,#9a7c20 85%,#5a4710 100%)',
              backgroundSize: '250% auto',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: reducedMotion ? 'none' : 'shimmer 5s linear infinite',
            }}
            initial={reducedMotion ? false : { y: '115%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    duration: 1.4,
                    delay: 0.5 + wi * 0.55,
                    ease: [0.16, 1, 0.3, 1],
                  }
            }
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
