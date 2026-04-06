'use client';

import { useRef, useState, useEffect } from 'react';

export interface ServiceItem {
  id: string;
  number: string;
  title: string;
  description: string;
  bullets: string[];
  standard?: string;
  acquired?: boolean;
}

export default function MobileServiceCarousel({ services }: { services: ServiceItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Hide swipe hint after first interaction
    const onScroll = () => setShowHint(false);
    track.addEventListener('scroll', onScroll, { once: true, passive: true });

    // IntersectionObserver to track which card is active
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const i = Number((entry.target as HTMLElement).dataset.index);
            setActive(i);
          }
        });
      },
      { root: track, threshold: 0.6 }
    );

    const cards = track.querySelectorAll('[data-index]');
    cards.forEach(card => observer.observe(card));

    return () => {
      observer.disconnect();
      track.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector(`[data-index="${i}"]`) as HTMLElement;
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  return (
    <div className="relative">

      {/* Swipe hint — fades out after first scroll */}
      <div
        className="absolute right-4 top-1/2 z-20 flex items-center gap-1.5 pointer-events-none transition-opacity duration-500"
        style={{ opacity: showHint ? 1 : 0, transform: 'translateY(-50%)' }}
      >
        <span className="text-[#D4AF37]/50 text-[10px] font-semibold tracking-[0.25em] uppercase">Swipe</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="#D4AF37" strokeOpacity="0.5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Card track — CSS scroll snap */}
      <div
        ref={trackRef}
        className="flex overflow-x-auto"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`.snap-track::-webkit-scrollbar { display: none; }`}</style>

        {services.map((s, i) => (
          <div
            key={s.id}
            data-index={i}
            className="flex-shrink-0 w-full px-6 pb-4"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div
              className="relative bg-[#0f0f0f] border-l-[3px] border-[#D4AF37]"
              style={{
                borderTop:    '1px solid rgba(212,175,55,0.18)',
                borderRight:  '1px solid rgba(212,175,55,0.08)',
                borderBottom: '1px solid rgba(212,175,55,0.08)',
                padding: '1.75rem 1.5rem',
              }}
            >
              {/* Ghost number watermark */}
              <span
                className="absolute top-4 right-5 font-black leading-none select-none pointer-events-none"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '6rem',
                  color: 'rgba(212,175,55,0.07)',
                  lineHeight: 1,
                }}
              >
                {s.number}
              </span>

              {/* Counter */}
              <div className="flex items-center justify-between mb-5">
                <p className="eyebrow text-[#A08928]">
                  {s.standard && !s.acquired ? s.standard : 'Service'}
                </p>
                <p className="eyebrow text-[#909090]">{s.number} / {String(services.length).padStart(2, '0')}</p>
              </div>

              {/* Title */}
              <h3
                className="font-black uppercase text-[#F5F0E8] leading-[0.92] tracking-[-0.02em] mb-5"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(1.9rem, 8vw, 2.4rem)' }}
              >
                {s.title}
              </h3>

              {/* Gold rule */}
              <div className="w-10 h-px bg-[#D4AF37]/40 mb-5" />

              {/* Description */}
              <p className="text-[#9B9487] text-sm mb-6" style={{ lineHeight: '1.78', letterSpacing: '0.012em' }}>
                {s.description}
              </p>

              {/* Bullets */}
              <ul className="space-y-3">
                {s.bullets.map((b, bi) => (
                  <li key={bi} className="flex items-start gap-3">
                    <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" />
                    <span className="text-[#9B9487] text-sm" style={{ lineHeight: '1.78' }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Progress — pill for active, dot for inactive, tappable */}
      <div className="flex justify-center items-center gap-2 mt-6">
        {services.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            aria-label={`Go to service ${i + 1}`}
            className="transition-all duration-400"
            style={{
              width:        i === active ? '28px' : '7px',
              height:       '7px',
              borderRadius: '9999px',
              background:   i === active ? '#D4AF37' : 'rgba(212,175,55,0.22)',
              border:       'none',
              cursor:       'pointer',
              transitionProperty: 'width, background',
              transitionDuration: '350ms',
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
