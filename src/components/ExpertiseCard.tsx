'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

interface Props {
  icon: string;       // inline SVG string
  title: string;
  description: string;
  index: number;      // stagger delay source
}

export default function ExpertiseCard({ icon, title, description, index }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  /*
    Fires when the card enters the viewport from below — the same moment
    the conduit head (also scroll-driven) reaches this vertical position.
    margin: '-15% 0px -15% 0px' = triggers when card is 15% into view,
    matching the conduit head which leads by roughly that margin.
  */
  const isInView = useInView(ref, {
    once: true,
    margin: '-15% 0px -15% 0px',
  });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.08,
      }}
      className="expertise-card group relative overflow-hidden"
    >
      {/* Gold border glow pulse — fires on inView */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: [0, 1, 0.3] } : {}}
        transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.08 + 0.1 }}
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.6), 0 0 40px rgba(212,175,55,0.12)',
          borderRadius: 'inherit',
        }}
      />

      {/* Icon */}
      <div
        className="icon-wrap mb-6 w-12 h-12 flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: icon }}
      />

      {/* Title */}
      <h3 className="text-[#F5F0E8] text-lg font-bold tracking-tight mb-3 group-hover:text-[#D4AF37] transition-colors duration-300">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[#F5F0E8]/50 text-sm leading-relaxed">
        {description}
      </p>

      {/* Bottom gold accent line — slides in from left on reveal */}
      <motion.div
        className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-[#D4AF37] to-transparent"
        initial={{ width: '0%' }}
        animate={isInView ? { width: '60%' } : {}}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 + 0.3 }}
      />
    </motion.div>
  );
}
