'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LINKS = [
  { label: 'Home',     href: '/'         },
  { label: 'Projects', href: '/projects'  },
  { label: 'Services', href: '/services'  },
  { label: 'Careers',  href: '/careers'   },
  { label: 'Contact',  href: '/contact'   },
];

function FlipLink({ href, children, onClick, active }: { href: string; children: string; onClick?: () => void; active?: boolean }) {
  const letters = children.split('');
  return (
    <motion.a
      href={href}
      onClick={onClick}
      className="relative block overflow-hidden uppercase text-sm font-semibold tracking-[0.18em] leading-none py-1"
      initial="idle"
      whileHover="hover"
    >
      <div aria-hidden="true">
        {letters.map((l, i) => (
          <motion.span
            key={i}
            className={`inline-block ${active ? 'text-[#D4AF37]' : 'text-[#F5F0E8]'}`}
            variants={{ idle: { y: 0 }, hover: { y: '-100%' } }}
            transition={{ duration: 0.22, delay: i * 0.018, ease: [0.22, 1, 0.36, 1] }}
          >
            {l === ' ' ? '\u00A0' : l}
          </motion.span>
        ))}
      </div>
      <div className="absolute inset-0" aria-hidden="true">
        {letters.map((l, i) => (
          <motion.span
            key={i}
            className="inline-block text-[#D4AF37]"
            variants={{ idle: { y: '100%' }, hover: { y: 0 } }}
            transition={{ duration: 0.22, delay: i * 0.018, ease: [0.22, 1, 0.36, 1] }}
          >
            {l === ' ' ? '\u00A0' : l}
          </motion.span>
        ))}
      </div>
      {active && (
        <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#D4AF37] opacity-60" />
      )}
      <span className="sr-only">{children}</span>
    </motion.a>
  );
}

export default function Navbar() {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [pathname,    setPathname]    = useState('/');

  useEffect(() => {
    setPathname(window.location.pathname);
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* CSS-driven entrance — avoids Framer Motion hydration race */}
      <header className="navbar-root fixed top-0 left-0 right-0 z-50">
        <div
          className="mx-auto px-8 md:px-16 h-16 flex items-center justify-between transition-all duration-500"
          style={{
            background: scrolled ? 'rgba(10,10,10,0.96)' : 'rgba(10,10,10,0.80)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottom: scrolled
              ? '1px solid rgba(212,175,55,0.20)'
              : '1px solid rgba(212,175,55,0.07)',
          }}
        >
          {/* Logo */}
          <a href="/" className="flex items-center group flex-shrink-0">
            <img src="/logo-horizontal.png" alt="Ultimate Fire Protection" className="h-9 w-auto" />
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-10">
            {LINKS.map(link => (
              <FlipLink key={link.href} href={link.href} active={pathname === link.href}>
                {link.label}
              </FlipLink>
            ))}
          </nav>

          {/* Desktop CTA */}
          <a
            href="/contact"
            className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold tracking-[0.2em] uppercase text-[#080808] bg-[#D4AF37] hover:bg-[#f7e98e] transition-colors duration-300 flex-shrink-0"
          >
            Get a Quote
          </a>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileOpen(v => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <motion.span
              className="block h-[1.5px] w-6 bg-[#F5F0E8]"
              animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 6 : 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.span
              className="block h-[1.5px] w-6 bg-[#F5F0E8]"
              animate={{ opacity: mobileOpen ? 0 : 1 }}
              transition={{ duration: 0.15 }}
            />
            <motion.span
              className="block h-[1.5px] w-6 bg-[#F5F0E8]"
              animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? -6 : 0 }}
              transition={{ duration: 0.2 }}
            />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-center px-12"
            style={{ background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(20px)' }}
            initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
            exit={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav className="flex flex-col gap-8">
              {LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ delay: i * 0.06 + 0.1, duration: 0.35 }}
                >
                  <a
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`text-4xl font-black uppercase tracking-tight transition-colors duration-200 ${pathname === link.href ? 'text-[#D4AF37]' : 'text-[#F5F0E8] hover:text-[#D4AF37]'}`}
                  >
                    {link.label}
                  </a>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ delay: LINKS.length * 0.06 + 0.1, duration: 0.35 }}
              >
                <a
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center px-8 py-3.5 text-sm font-bold tracking-[0.2em] uppercase text-[#080808] bg-[#D4AF37] hover:bg-[#f7e98e] transition-colors duration-300"
                >
                  Get a Quote
                </a>
              </motion.div>
            </nav>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-16 flex items-center gap-4"
            >
              <img src="/logo-stacked.png" alt="Ultimate Fire Protection" className="h-8 w-auto opacity-60" />
              <p className="text-[#909090] text-xs tracking-[0.3em] uppercase">Hamilton, Ontario  Est. 2020</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .navbar-root {
          animation: navbarEntrance 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }
        @keyframes navbarEntrance {
          from { transform: translateY(-64px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
