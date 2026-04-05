'use client';

import { motion } from 'framer-motion';

const ITEMS = [
  'NFPA 13 Certified',
  'ULC Listed Installer',
  'TSSA Licensed',
  'Ontario Building Code',
  '500+ Installations',
  '20+ Years Hamilton',
  'Industrial  Commercial',
  '24/7 Emergency Response',
  'Fully Insured  $5M',
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
