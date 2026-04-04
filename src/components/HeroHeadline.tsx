'use client';

import { motion } from 'framer-motion';

const WORDS = ['Uncompromised', 'Protection.'];

export default function HeroHeadline() {
  return (
    <h1 className="font-black uppercase leading-[0.92] tracking-[-0.04em] text-5xl md:text-7xl lg:text-8xl mb-8 text-center">
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
              animation: 'shimmer 5s linear infinite',
            }}
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 1.2,
              delay: 0.7 + wi * 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
