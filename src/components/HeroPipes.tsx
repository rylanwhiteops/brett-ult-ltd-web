'use client';

/**
 * HeroPipes — Hyper-realistic 3D pipe system
 *
 * Cylindrical gradient shader: Deep Bronze → Polished Gold → Deep Bronze
 * Specular highlight: 1px white at 25% opacity down the pipe centerline
 * Mechanical fittings: Elbow joints, threaded couplings, flange nut at gauge
 * Drop shadow on entire pipe layer: hover-over-background effect
 */

import { useEffect, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';

const PIPE_W    = 6;    // px — wide enough for 3D gradient to read
const ANIM_EASE = [0.22, 1, 0.36, 1] as const;

/* ── Mechanical Fittings ─────────────────────────────────────── */

/** Elbow joint — thick collar with 4 bolt studs */
function Elbow({ x, y }: { x: number; y: number }) {
  const bolts = [45, 135, 225, 315];
  return (
    <g>
      <circle cx={x} cy={y} r={12} fill="url(#fittingGrad)" stroke="rgba(212,175,55,0.55)" strokeWidth={1} />
      <circle cx={x} cy={y} r={6}  fill="#060606" stroke="rgba(212,175,55,0.25)" strokeWidth={0.8} />
      <circle cx={x} cy={y} r={2}  fill="rgba(212,175,55,0.6)" />
      {bolts.map(a => {
        const bx = x + 9 * Math.sin((a * Math.PI) / 180);
        const by = y - 9 * Math.cos((a * Math.PI) / 180);
        return (
          <g key={a}>
            <circle cx={bx} cy={by} r={2.2} fill="url(#fittingGrad)" stroke="rgba(212,175,55,0.3)" strokeWidth={0.5} />
            <circle cx={bx} cy={by} r={0.9} fill="#060606" />
          </g>
        );
      })}
    </g>
  );
}

/** Threaded coupling — barrel fitting with thread lines */
function ThreadedCoupling({ x, y, axis = 'h' }: { x: number; y: number; axis?: 'h' | 'v' }) {
  const rot = axis === 'v' ? `rotate(90,${x},${y})` : undefined;
  return (
    <g transform={rot}>
      <rect x={x - 14} y={y - 6} width={28} height={12}
        fill="url(#fittingGrad)" stroke="rgba(212,175,55,0.5)" strokeWidth={1} rx={1} />
      {/* Thread grooves */}
      {[-8, -4, 0, 4, 8].map(offset => (
        <line key={offset}
          x1={x + offset} y1={y - 6}
          x2={x + offset} y2={y + 6}
          stroke="rgba(0,0,0,0.4)" strokeWidth={0.8}
        />
      ))}
      {/* Center flange ring */}
      <rect x={x - 2} y={y - 6} width={4} height={12} fill="rgba(212,175,55,0.3)" />
      {/* Highlight */}
      <rect x={x - 14} y={y - 6} width={28} height={2}
        fill="rgba(255,255,255,0.07)" rx={1} />
    </g>
  );
}

/** Flange nut — hex bolt pattern at gauge entry */
function FlangeNut({ x, y }: { x: number; y: number }) {
  const hexPoints = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 * Math.PI) / 180;
    return `${(x + 13 * Math.sin(a)).toFixed(1)},${(y - 13 * Math.cos(a)).toFixed(1)}`;
  }).join(' ');

  return (
    <g>
      {/* Outer hex */}
      <polygon points={hexPoints} fill="url(#fittingGrad)" stroke="rgba(212,175,55,0.65)" strokeWidth={1.2} />
      {/* Inner bore */}
      <circle cx={x} cy={y} r={7} fill="#060606" stroke="rgba(212,175,55,0.35)" strokeWidth={1} />
      {/* Bore center */}
      <circle cx={x} cy={y} r={2.5} fill="rgba(212,175,55,0.55)" />
      {/* Bolt holes at hex corners */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 * Math.PI) / 180;
        const bx = x + 10 * Math.sin(a);
        const by = y - 10 * Math.cos(a);
        return (
          <circle key={i} cx={bx} cy={by} r={1.6}
            fill="#050505" stroke="rgba(212,175,55,0.3)" strokeWidth={0.5} />
        );
      })}
      {/* Hex face highlight */}
      <polygon points={hexPoints} fill="rgba(255,255,255,0.05)" />
    </g>
  );
}

/** Gate valve */
function Valve({ x, y, axis = 'h' }: { x: number; y: number; axis?: 'h' | 'v' }) {
  const rot = axis === 'v' ? `rotate(90,${x},${y})` : undefined;
  return (
    <g transform={rot}>
      <rect x={x - 11} y={y - 7} width={22} height={14}
        fill="url(#fittingGrad)" stroke="rgba(212,175,55,0.6)" strokeWidth={1.5} rx={1} />
      <line x1={x} y1={y - 7} x2={x} y2={y + 7} stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} />
      {/* Valve stem */}
      <line x1={x} y1={y - 7} x2={x} y2={y - 15} stroke="rgba(212,175,55,0.7)" strokeWidth={1.2} />
      <line x1={x - 6} y1={y - 15} x2={x + 6} y2={y - 15} stroke="rgba(212,175,55,0.8)" strokeWidth={2} />
      {/* Highlight */}
      <rect x={x - 11} y={y - 7} width={22} height={3} fill="rgba(255,255,255,0.06)" rx={1} />
    </g>
  );
}

/** Pulsing pressure indicator at pipe terminal */
function PressureDot({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <motion.circle
        cx={x} cy={y} r={5}
        fill="none" stroke="#D4AF37" strokeWidth={1}
        animate={{ r: [5, 11, 5], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
      />
      <circle cx={x} cy={y} r={3.5} fill="#D4AF37" opacity={0.9} />
    </g>
  );
}

/* ── 3D Pipe Renderer ────────────────────────────────────────── */

/** Ghost track — ultra-dim blueprint guide line */
function GhostPipe({ d }: { d: string }) {
  return (
    <path d={d} fill="none"
      stroke="rgba(212,175,55,0.055)" strokeWidth={PIPE_W}
      strokeLinecap="butt"
    />
  );
}

/** Live 3D pipe: cylindrical gradient + specular highlight */
function Pipe3D({
  d,
  gradId,
  delay = 0,
}: {
  d: string; gradId: string; delay?: number;
}) {
  return (
    <g>
      {/* Ambient shadow bleed */}
      <motion.path
        d={d} fill="none"
        stroke="rgba(0,0,0,0.55)" strokeWidth={PIPE_W + 6}
        strokeLinecap="butt"
        style={{ filter: 'blur(5px)' }}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.8, delay, ease: ANIM_EASE }}
      />
      {/* Pipe body — cylindrical gradient */}
      <motion.path
        d={d} fill="none"
        stroke={`url(#${gradId})`} strokeWidth={PIPE_W}
        strokeLinecap="butt"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.8, delay, ease: ANIM_EASE }}
      />
      {/* Specular highlight — 1px white stripe */}
      <motion.path
        d={d} fill="none"
        stroke="rgba(255,255,255,0.22)" strokeWidth={1}
        strokeLinecap="butt"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.8, delay: delay + 0.08, ease: ANIM_EASE }}
      />
    </g>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export default function HeroPipes() {
  const [dim, setDim] = useState({ w: 1440, h: 900 });
  const svgOpacity = useMotionValue(1);

  useEffect(() => {
    const update = () => setDim({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update, { passive: true });

    // Fade out when scrolling past the hero (300vh)
    const onScroll = () => {
      const heroEnd   = window.innerHeight * 3;
      const fadeOver  = window.innerHeight * 0.5;
      const fadeStart = heroEnd - fadeOver;
      const t = Math.max(0, Math.min(1, (window.scrollY - fadeStart) / fadeOver));
      svgOpacity.set(1 - t);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', onScroll);
    };
  }, [svgOpacity]);

  const { w, h } = dim;

  /* Key positions */
  const condX     = w >= 768 ? 96 : 64;
  const gaugeX    = Math.min(w - 220, w * 0.78);
  const gaugeY    = h / 2 + 20;
  // Pipes frame the content — run along TOP and BOTTOM edges, never through text
  const supplyY1  = h * 0.10;   // above all hero copy
  const supplyY2  = h * 0.90;   // below CTA button
  const riserX    = gaugeX - 8;
  const gaugeTopY = gaugeY - 155;

  // Midpoints for couplings along long horizontal runs
  const midX       = condX + (w * 0.32);
  const couplingAX = (condX + riserX) / 2;

  // Valve positions — well clear of content
  const valveAX = condX + (riserX - condX) * 0.65;
  const valveDX = midX;

  /* Pipe paths — strict 90° elbows only */
  const pathA = `M ${condX} ${supplyY1} L ${riserX} ${supplyY1}`;
  const pathB = `M ${riserX} ${supplyY1} L ${riserX} ${gaugeTopY}`;
  const pathC = `M ${riserX} ${gaugeTopY} L ${gaugeX} ${gaugeTopY}`;
  const pathD = `M ${condX} ${supplyY2} L ${midX} ${supplyY2}`;
  const stubD = `M ${midX + 11} ${supplyY2} L ${midX + 32} ${supplyY2}`;

  /* Label positions */
  const tagA  = { x: condX + (riserX - condX) * 0.38, y: supplyY1 };
  const tagD  = { x: condX + (midX - condX) * 0.52,   y: supplyY2 };

  const R = PIPE_W / 2; // half pipe width for gradient extents

  return (
    <motion.svg
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 3,
        pointerEvents: 'none',
        overflow: 'visible',
        filter: 'drop-shadow(6px 8px 14px rgba(0,0,0,0.75))',
        opacity: svgOpacity,
      }}
    >
      <defs>
        {/* Fitting gradient — used for all mechanical hardware */}
        <linearGradient id="fittingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#2a1a05" />
          <stop offset="20%"  stopColor="#8a6a18" />
          <stop offset="42%"  stopColor="#D4AF37" />
          <stop offset="55%"  stopColor="#f7e98e" />
          <stop offset="70%"  stopColor="#c9a227" />
          <stop offset="85%"  stopColor="#6B4423" />
          <stop offset="100%" stopColor="#1a0e03" />
        </linearGradient>

        {/* Horizontal pipe at supplyY1 — gradient perpendicular (top→bottom) */}
        <linearGradient id="hGradA" gradientUnits="userSpaceOnUse"
          x1={condX} y1={supplyY1 - R}
          x2={condX} y2={supplyY1 + R}>
          <stop offset="0%"   stopColor="#2a1506" />
          <stop offset="30%"  stopColor="#9a7c20" />
          <stop offset="52%"  stopColor="#D4AF37" />
          <stop offset="72%"  stopColor="#7a5c12" />
          <stop offset="100%" stopColor="#1a0e03" />
        </linearGradient>

        {/* Vertical riser at riserX — gradient perpendicular (left→right) */}
        <linearGradient id="vGradB" gradientUnits="userSpaceOnUse"
          x1={riserX - R} y1={supplyY1}
          x2={riserX + R} y2={supplyY1}>
          <stop offset="0%"   stopColor="#2a1506" />
          <stop offset="30%"  stopColor="#9a7c20" />
          <stop offset="52%"  stopColor="#D4AF37" />
          <stop offset="72%"  stopColor="#7a5c12" />
          <stop offset="100%" stopColor="#1a0e03" />
        </linearGradient>

        {/* Short stub into gauge top at gaugeTopY — horizontal */}
        <linearGradient id="hGradC" gradientUnits="userSpaceOnUse"
          x1={riserX} y1={gaugeTopY - R}
          x2={riserX} y2={gaugeTopY + R}>
          <stop offset="0%"   stopColor="#2a1506" />
          <stop offset="30%"  stopColor="#9a7c20" />
          <stop offset="52%"  stopColor="#D4AF37" />
          <stop offset="72%"  stopColor="#7a5c12" />
          <stop offset="100%" stopColor="#1a0e03" />
        </linearGradient>

        {/* Return line at supplyY2 — horizontal */}
        <linearGradient id="hGradD" gradientUnits="userSpaceOnUse"
          x1={condX} y1={supplyY2 - R}
          x2={condX} y2={supplyY2 + R}>
          <stop offset="0%"   stopColor="#2a1506" />
          <stop offset="30%"  stopColor="#9a7c20" />
          <stop offset="52%"  stopColor="#D4AF37" />
          <stop offset="72%"  stopColor="#7a5c12" />
          <stop offset="100%" stopColor="#1a0e03" />
        </linearGradient>
      </defs>

      {/* ── Ghost tracks — dim blueprint underlay ── */}
      <g opacity={1}>
        <GhostPipe d={pathA} />
        <GhostPipe d={pathB} />
        <GhostPipe d={pathC} />
        <GhostPipe d={pathD} />
        <GhostPipe d={stubD} />
      </g>

      {/* ── Live 3D pipes (draw in staggered) ── */}
      <Pipe3D d={pathA} gradId="hGradA" delay={0.1} />
      <Pipe3D d={pathB} gradId="vGradB" delay={0.9} />
      <Pipe3D d={pathC} gradId="hGradC" delay={1.5} />
      <Pipe3D d={pathD} gradId="hGradD" delay={0.3} />
      <Pipe3D d={stubD} gradId="hGradD" delay={1.1} />

      {/* ── Elbow fittings at 90° turns ── */}
      <motion.g
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.85, duration: 0.45, ease: ANIM_EASE }}
        style={{ transformOrigin: `${riserX}px ${supplyY1}px` }}
      >
        <Elbow x={riserX} y={supplyY1} />
      </motion.g>
      <motion.g
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.52, duration: 0.45, ease: ANIM_EASE }}
        style={{ transformOrigin: `${riserX}px ${gaugeTopY}px` }}
      >
        <Elbow x={riserX} y={gaugeTopY} />
      </motion.g>

      {/* ── Threaded couplings — mid-run every ~500px ── */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.5 }}
      >
        <ThreadedCoupling x={couplingAX} y={supplyY1} axis="h" />
      </motion.g>
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.5 }}
      >
        <ThreadedCoupling x={condX + (midX - condX) * 0.45} y={supplyY2} axis="h" />
      </motion.g>

      {/* ── Flange nut at gauge entry — physically screwed in ── */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.9, duration: 0.55, ease: ANIM_EASE }}
        style={{ transformOrigin: `${gaugeX}px ${gaugeTopY}px` }}
      >
        <FlangeNut x={gaugeX} y={gaugeTopY} />
      </motion.g>

      {/* ── Gate valves ── */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.5 }}
      >
        <Valve x={valveAX} y={supplyY1} axis="h" />
        <Valve x={valveDX} y={supplyY2} axis="h" />
      </motion.g>

      {/* ── Tee junctions at conduit tap-off ── */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.4 }}
      >
        <circle cx={condX} cy={supplyY1} r={5.5}
          fill="#080808" stroke="rgba(212,175,55,0.45)" strokeWidth={1.5} />
        <circle cx={condX} cy={supplyY1} r={2.2} fill="rgba(212,175,55,0.7)" />
        <circle cx={condX} cy={supplyY2} r={5.5}
          fill="#080808" stroke="rgba(212,175,55,0.45)" strokeWidth={1.5} />
        <circle cx={condX} cy={supplyY2} r={2.2} fill="rgba(212,175,55,0.7)" />
      </motion.g>

      {/* ── Pressure dots at terminals ── */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 2.0, duration: 0.6 }}
      >
        <PressureDot x={midX + 32} y={supplyY2} />
      </motion.g>

      {/* ── Pipe spec labels ── */}
      <motion.text
        x={tagA.x} y={tagA.y - 11}
        textAnchor="middle" fontSize="7"
        fontFamily="ui-monospace, 'SF Mono', monospace"
        fontWeight="600" letterSpacing="0.18em"
        fill="rgba(212,175,55,0.35)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.65, duration: 0.8 }}
      >
        SUPPLY — 175 PSI
      </motion.text>

      <motion.text
        x={tagD.x} y={tagD.y - 11}
        textAnchor="middle" fontSize="7"
        fontFamily="ui-monospace, 'SF Mono', monospace"
        fontWeight="600" letterSpacing="0.18em"
        fill="rgba(212,175,55,0.35)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 0.95, duration: 0.8 }}
      >
        RETURN — ISO 14520
      </motion.text>

      <motion.text
        x={riserX + 12} y={(supplyY1 + gaugeTopY) / 2}
        fontSize="7"
        fontFamily="ui-monospace, 'SF Mono', monospace"
        fontWeight="600" letterSpacing="0.18em"
        fill="rgba(212,175,55,0.35)"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.35, duration: 0.8 }}
      >
        RISER
      </motion.text>
    </motion.svg>
  );
}
