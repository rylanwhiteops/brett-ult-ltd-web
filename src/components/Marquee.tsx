'use client';

import { motion } from 'framer-motion';

const ITEMS = [
  'NFPA 13 Compliant',
  'Fully Licensed & Insured',
  'Red Seal Licensed Fitters',
  'Local 853 Union Member',
  '500+ Installations',
  'Ontario-Wide Service',
  'Residential  Commercial  Industrial',
  '24/7 Emergency Response',
  'West Hamilton Builder Association',
  'Design  Supply  Install',
];

export default function Marquee() {
  // Duplicate for seamless loop
  const all = [...ITEMS, ...ITEMS];

  return (
    <div className="relative z-10 border-y border-[#D4AF37]/12 overflow-hidden py-4 bg-[#080808]">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
        style={{ willChange: 'transform' }}
      >
        {all.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-12 flex-shrink-0">
            <span className="text-[#909090] text-[10px] font-semibold tracking-[0.35em] uppercase">
              {item}
            </span>
            <span className="text-[#D4AF37]/30 text-[8px]">◆</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
