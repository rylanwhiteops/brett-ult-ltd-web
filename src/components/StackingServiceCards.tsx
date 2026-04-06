'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export interface ServiceDetail {
  id: string;
  number: string;
  title: string;
  description: string;
  bullets: string[];
  standard?: string;
}

function ServiceCard({
  service,
  index,
  total,
  progress,
}: {
  service: ServiceDetail;
  index: number;
  total: number;
  progress: any;
}) {
  const targetScale = 1 - (total - index) * 0.035;
  const scale = useTransform(progress, [index / total, 1], [1, targetScale]);
  const top = 80 + index * 28;

  return (
    <div
      className="sticky h-screen flex items-center justify-center"
      style={{ top }}
    >
      <motion.div
        className="w-full max-w-5xl mx-auto"
        style={{ scale, transformOrigin: 'top center' }}
      >
        <div
          className="relative bg-[#0f0f0f] border-l-[3px] border-[#D4AF37] p-10 md:p-16"
          style={{ borderTop: '1px solid rgba(212,175,55,0.15)', borderRight: '1px solid rgba(212,175,55,0.08)', borderBottom: '1px solid rgba(212,175,55,0.08)' }}
        >
          {/* Number */}
          <span className="absolute top-8 right-10 font-mono text-[4rem] font-black leading-none text-[#D4AF37]/8">
            {service.number}
          </span>

          {/* Label */}
          <p className="text-[#A08928] text-[10px] font-semibold tracking-[0.35em] uppercase mb-4">
            Service {service.number}
            {service.standard && `  ${service.standard}`}
          </p>

          {/* Title */}
          <h2 className="text-[#F5F0E8] text-3xl md:text-4xl font-black uppercase tracking-tight leading-tight mb-6">
            {service.title}
          </h2>

          {/* Description */}
          <p className="text-[#9B9487] text-base mb-8 max-w-2xl" style={{ lineHeight: '1.78', letterSpacing: '0.012em' }}>
            {service.description}
          </p>

          {/* Bullets */}
          <ul className="space-y-2">
            {service.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[#9B9487]" style={{ lineHeight: '1.78' }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

interface Props {
  services: ServiceDetail[];
}

export default function StackingServiceCards({ services }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end'],
  });

  return (
    <div ref={container} style={{ minHeight: `${services.length * 100}vh` }}>
      {services.map((service, i) => (
        <ServiceCard
          key={service.id}
          service={service}
          index={i}
          total={services.length}
          progress={scrollYProgress}
        />
      ))}
    </div>
  );
}
