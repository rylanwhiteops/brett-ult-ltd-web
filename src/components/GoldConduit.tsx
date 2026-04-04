'use client';

import { useScroll, useSpring, useTransform, motion } from 'framer-motion';
import { useRef } from 'react';


export default function GoldConduit() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Spring physics: mechanical weight, no bounce
  const pathLength = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 20,
    restDelta: 0.001,
  });

  // Fade out conduit in the last 20% of hero scroll
  const conduitOpacity = useTransform(scrollYProgress, [0.78, 1.0], [1, 0]);

  // Drive the dot's top position (0% → 100% of viewport)
  const dotTop = useTransform(pathLength, [0, 1], ['0vh', '100vh']);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {/* Fixed conduit — fades out as hero ends */}
      <motion.div
        className="fixed top-0 left-16 md:left-24 h-screen w-[2px]"
        aria-hidden="true"
        style={{ opacity: conduitOpacity }}
      >

        {/* SVG conduit line */}
        <svg
          width="2"
          height="100%"
          viewBox="0 0 2 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full"
        >
          {/* Ghost track */}
          <path
            d="M 1 0 L 1 1000"
            stroke="#D4AF37"
            strokeOpacity="0.18"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Animated gold draw */}
          <motion.path
            d="M 1 0 L 1 1000"
            stroke="#D4AF37"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            style={{ pathLength }}
          />
        </svg>

        {/* Ambient glow — large diffuse radial behind the tip */}
        <motion.div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            top: dotTop,
            left: '50%',
            width: '180px',
            height: '180px',
            marginLeft: '-90px',
            background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.06) 40%, transparent 70%)',
            filter: 'blur(8px)',
          }}
        />

        {/* Travelling glow cap — sharp dot on top of ambient */}
        <motion.div
          className="conduit-dot absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#D4AF37]"
          style={{ top: dotTop, boxShadow: '0 0 18px 6px rgba(212,175,55,0.8), 0 0 40px 10px rgba(212,175,55,0.2)' }}
        />
      </motion.div>
    </div>
  );
}
