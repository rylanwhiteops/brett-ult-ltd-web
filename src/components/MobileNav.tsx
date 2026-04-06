'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const TABS = [
  {
    label: 'Home',
    href: '/',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#D4AF37' : '#909090'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    label: 'Projects',
    href: '/projects',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#D4AF37' : '#909090'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    label: 'Services',
    href: '/services',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#D4AF37' : '#909090'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C9 7 8 9.5 8 12a4 4 0 0 0 8 0c0-2.5-1-5-4-10z"/>
        <path d="M12 8c-1 2-1.5 3.5-1.5 4.5a1.5 1.5 0 0 0 3 0C13.5 11.5 13 10 12 8z" fill={active ? '#D4AF37' : '#909090'} stroke="none" opacity="0.5"/>
      </svg>
    ),
  },
  {
    label: 'Contact',
    href: '/contact',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#D4AF37' : '#909090'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
      </svg>
    ),
  },
];

export default function MobileNav() {
  const [pathname, setPathname] = useState('/');

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const activeIndex = TABS.findIndex(t => t.href === pathname);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50" aria-label="Mobile navigation">
      {/* Frosted glass bar */}
      <div
        style={{
          background: 'rgba(8,8,8,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(212,175,55,0.18)',
        }}
      >
        {/* Sliding gold indicator — sits on top of the border */}
        <div className="relative h-[2px] bg-transparent overflow-visible">
          {activeIndex >= 0 && (
            <motion.div
              className="absolute top-0 h-[2px]"
              style={{
                width: `${100 / TABS.length}%`,
                background: 'linear-gradient(to right, transparent, #D4AF37, transparent)',
                boxShadow: '0 0 12px rgba(212,175,55,0.6)',
              }}
              animate={{ left: `${(activeIndex / TABS.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
        </div>

        {/* Tab row */}
        <div className="grid grid-cols-4 pb-safe">
          {TABS.map((tab, i) => {
            const active = pathname === tab.href;
            return (
              <motion.a
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center gap-1 py-3 relative"
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {/* Active glow behind icon */}
                {active && (
                  <motion.div
                    layoutId="tab-glow"
                    className="absolute inset-0 mx-3 rounded-xl"
                    style={{ background: 'rgba(212,175,55,0.06)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}

                <span className="relative z-10">{tab.icon(active)}</span>
                <span
                  className="relative z-10 text-[9px] font-semibold tracking-[0.18em] uppercase transition-colors duration-200"
                  style={{ color: active ? '#D4AF37' : '#909090' }}
                >
                  {tab.label}
                </span>
              </motion.a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
