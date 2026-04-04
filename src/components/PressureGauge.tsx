'use client';

/**
 * PressureGauge — Mechanical pressure gauge
 *
 * Features
 *  • SVG gauge: metallic gold rim → matte black face → PSI arc + ticks + labels
 *  • Needle: spring physics (stiffness 80, damping 14) + live jitter at ±2-4°
 *  • Scroll-linked: needle 0→270° sweep as page scrolls 0→100%
 *  • Mouse 3D tilt: perspective parallax ±10° via useSpring
 *  • UFP logo at center: flame icon + monogram
 *  • Gold glow aura behind the whole gauge
 */

import { useEffect, useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useMotionTemplate,
} from 'framer-motion';

/* ── Geometry constants ──────────────────────────────────────── */
const V   = 300;           // SVG viewBox size
const CX  = V / 2;        // 150
const CY  = V / 2;        // 150

const R_RIM_OUT = 142;    // outer metallic rim
const R_RIM_IN  = 132;    // inner rim edge
const R_FACE    = 127;    // gauge face
const R_ARC     = 108;    // tick arc radius
const R_MAJ_OUT = 107;    // major tick outer
const R_MAJ_IN  =  92;    // major tick inner
const R_MIN_OUT = 107;    // minor tick outer
const R_MIN_IN  =  99;    // minor tick inner
const R_LABEL   =  78;    // number label radius

const A_START = -135;     // clock-degrees at 0 PSI  (SW)
const A_END   =  135;     // clock-degrees at 100 PSI (SE)
const A_SWEEP = A_END - A_START; // 270°

/* Convert clock-degrees (from 12-o'clock, clockwise) → SVG x,y */
const polar = (r: number, deg: number) => ({
  x: CX + r * Math.sin((deg * Math.PI) / 180),
  y: CY - r * Math.cos((deg * Math.PI) / 180),
});

/* SVG large-arc for the 270° tick arc */
const tickArcPath = () => {
  const s = polar(R_ARC, A_START);
  const e = polar(R_ARC, A_END);
  // sweep-flag=1 (clockwise), large-arc-flag=1 (>180°)
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R_ARC} ${R_ARC} 0 1 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
};

/* Tick data — 11 major (every 10 PSI) + 40 minor */
const majorTicks = Array.from({ length: 11 }, (_, i) => {
  const psi   = i * 10;
  const angle = A_START + (i / 10) * A_SWEEP;
  const outer = polar(R_MAJ_OUT, angle);
  const inner = polar(R_MAJ_IN,  angle);
  // Labels at 0, 20, 40, 60, 80, 100
  const label = i % 2 === 0 ? String(psi) : null;
  const lp    = label ? polar(R_LABEL, angle) : null;
  return { angle, outer, inner, label, lp };
});

const minorTicks = (() => {
  const ticks: { o: ReturnType<typeof polar>; i: ReturnType<typeof polar> }[] = [];
  for (let seg = 0; seg < 10; seg++) {
    for (let m = 1; m <= 4; m++) {
      const angle = A_START + ((seg + m / 5) / 10) * A_SWEEP;
      ticks.push({ o: polar(R_MIN_OUT, angle), i: polar(R_MIN_IN, angle) });
    }
  }
  return ticks;
})();

/* Needle path — drawn at 0° (pointing up), rotated by spring angle */
const NEEDLE = `
  M 0 -96
  L -2.5 -22
  L -4.5 0
  L -3 24
  L 0  30
  L  3 24
  L  4.5 0
  L  2.5 -22
  Z
`.trim();

/* ── Component ───────────────────────────────────────────────── */
export default function PressureGauge() {
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Scroll → needle angle */
  const { scrollYProgress } = useScroll();
  const rawAngle = useTransform(scrollYProgress, [0, 1], [A_START, A_END]);
  // Smooth scroll tracking spring — deliberate, mechanical
  const springAngle = useSpring(rawAngle, { stiffness: 60, damping: 18, restDelta: 0.01 });

  /* Jitter — high-frequency, low-amplitude needle tremor */
  const jitterRaw = useMotionValue(0);
  // Spring on jitter itself = fast snap-back = mechanical vibration feel
  const jitter = useSpring(jitterRaw, { stiffness: 300, damping: 10 });
  const glowPulse = useMotionValue(0.08);
  useEffect(() => {
    const id = setInterval(() => {
      const progress = (springAngle.get() - A_START) / A_SWEEP; // 0-1
      const amp = 0.8 + progress * 2.2; // tighter amplitude, faster frequency
      jitterRaw.set((Math.random() - 0.5) * amp);
      glowPulse.set(0.06 + progress * 0.1 + Math.random() * 0.06);
    }, 140); // 140ms — enough jitter feel without hammering the spring
    return () => clearInterval(id);
  }, [springAngle, jitterRaw, glowPulse]);

  /* Combined needle rotation — scroll spring + jitter spring */
  void useMotionTemplate`${springAngle}deg`; // keep springAngle reactive
  const needleRotateWithJitter = useMotionValue('0deg');
  useEffect(() => {
    const unsub1 = springAngle.on('change', (v) => {
      needleRotateWithJitter.set(`${(v + jitter.get()).toFixed(3)}deg`);
    });
    const unsub2 = jitter.on('change', (j) => {
      needleRotateWithJitter.set(`${(springAngle.get() + j).toFixed(3)}deg`);
    });
    return () => { unsub1(); unsub2(); };
  }, [springAngle, jitter, needleRotateWithJitter]);

  /* Mouse 3D tilt */
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const sTiltX = useSpring(tiltX, { stiffness: 120, damping: 18 });
  const sTiltY = useSpring(tiltY, { stiffness: 120, damping: 18 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      tiltX.set(((e.clientX - cx) / (r.width  / 2)) *  10); // ±10° around Y
      tiltY.set(((e.clientY - cy) / (r.height / 2)) * -8);  // ±8°  around X
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [tiltX, tiltY]);

  /* Scroll-derived PSI display */
  const psiDisplay = useTransform<number, number>(scrollYProgress, [0, 1], [0, 100]);

  return (
    /* Perspective wrapper — gives 3-D depth to child tilt */
    <div ref={wrapRef} style={{ perspective: '700px' }} className="select-none">

      {/* Pulsing amber glow — synced to needle jitter */}
      <motion.div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-50%',
          background: 'radial-gradient(circle, rgba(212,175,55,1) 0%, rgba(180,120,20,0.6) 35%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: glowPulse,
        }}
      />

      {/* 3D-tilting gauge body */}
      <motion.div
        style={{
          rotateY: sTiltX,
          rotateX: sTiltY,
          transformStyle: 'preserve-3d',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <svg
          viewBox={`0 0 ${V} ${V}`}
          width="420"
          height="420"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Pressure gauge — system load indicator"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* Metallic rim gradient — brushed gold */}
            <linearGradient id="rimGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#3d2e08" />
              <stop offset="18%"  stopColor="#c9a227" />
              <stop offset="35%"  stopColor="#f7e98e" />
              <stop offset="50%"  stopColor="#D4AF37" />
              <stop offset="68%"  stopColor="#f5e17a" />
              <stop offset="82%"  stopColor="#9a7c20" />
              <stop offset="100%" stopColor="#3d2e08" />
            </linearGradient>

            {/* Rim bevel inner edge */}
            <linearGradient id="rimInner" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#8a6e1a" stopOpacity="0.8" />
              <stop offset="50%"  stopColor="#1a1a1a" stopOpacity="1" />
              <stop offset="100%" stopColor="#8a6e1a" stopOpacity="0.6" />
            </linearGradient>

            {/* Needle gradient */}
            <linearGradient id="needleGrad" x1="0" y1="-96" x2="0" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#f7e98e" />
              <stop offset="30%"  stopColor="#D4AF37" />
              <stop offset="70%"  stopColor="#9a7c20" />
              <stop offset="100%" stopColor="#5a4010" />
            </linearGradient>

            {/* Glass reflection overlay */}
            <radialGradient id="glassReflect" cx="38%" cy="32%" r="55%">
              <stop offset="0%"  stopColor="rgba(255,255,255,0.06)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.01)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>

            {/* Face vignette */}
            <radialGradient id="faceVignette" cx="50%" cy="50%" r="50%">
              <stop offset="55%" stopColor="transparent" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
            </radialGradient>

            {/* Glow filter for needle and markings */}
            <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Rim outer glow */}
            <filter id="rimGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Clip face circle */}
            <clipPath id="faceClip">
              <circle cx={CX} cy={CY} r={R_FACE} />
            </clipPath>
          </defs>

          {/* ── Outer rim drop shadow ── */}
          <circle cx={CX} cy={CY} r={R_RIM_OUT + 4}
            fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="8"
            style={{ filter: 'blur(6px)' }}
          />

          {/* ── Metallic gold rim ── */}
          <circle cx={CX} cy={CY} r={R_RIM_OUT}
            fill="url(#rimGold)"
            filter="url(#rimGlow)"
          />

          {/* ── Rim inner bevel ── */}
          <circle cx={CX} cy={CY} r={R_RIM_IN}
            fill="url(#rimInner)"
          />

          {/* ── Matte black face ── */}
          <circle cx={CX} cy={CY} r={R_FACE}
            fill="#0a0a0a"
          />

          {/* Face vignette */}
          <circle cx={CX} cy={CY} r={R_FACE}
            fill="url(#faceVignette)"
          />

          {/* ── Tick arc — faint gold guide line ── */}
          <path
            d={tickArcPath()}
            fill="none"
            stroke="rgba(212,175,55,0.15)"
            strokeWidth="1"
          />

          {/* ── Minor ticks ── */}
          {minorTicks.map((t, i) => (
            <line
              key={i}
              x1={t.o.x} y1={t.o.y}
              x2={t.i.x} y2={t.i.y}
              stroke="rgba(212,175,55,0.35)"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          ))}

          {/* ── Major ticks ── */}
          {majorTicks.map((t, i) => (
            <g key={i} filter="url(#goldGlow)">
              <line
                x1={t.outer.x} y1={t.outer.y}
                x2={t.inner.x} y2={t.inner.y}
                stroke="#D4AF37"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {t.label && t.lp && (
                <text
                  x={t.lp.x}
                  y={t.lp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fontFamily="'Inter', ui-sans-serif, sans-serif"
                  fontWeight="600"
                  fill="rgba(212,175,55,0.75)"
                  letterSpacing="0.05em"
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}

          {/* ── PSI label ── */}
          <text
            x={CX} y={CY + 48}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7.5"
            fontFamily="'Inter', ui-sans-serif, sans-serif"
            fontWeight="700"
            fill="rgba(212,175,55,0.5)"
            letterSpacing="0.3em"
          >
            PSI
          </text>

          {/* ── UFP Logo — center of face ── */}
          <g filter="url(#goldGlow)">
            {/* Flame */}
            <path
              d={`
                M ${CX} ${CY - 28}
                C ${CX - 7} ${CY - 20} ${CX - 10} ${CY - 12} ${CX - 6} ${CY - 4}
                C ${CX - 10} ${CY - 8} ${CX - 13} ${CY - 14} ${CX - 11} ${CY - 20}
                C ${CX - 16} ${CY - 12} ${CX - 13} ${CY - 2} ${CX} ${CY + 6}
                C ${CX + 13} ${CY - 2} ${CX + 16} ${CY - 12} ${CX + 11} ${CY - 20}
                C ${CX + 13} ${CY - 14} ${CX + 10} ${CY - 8} ${CX + 6} ${CY - 4}
                C ${CX + 10} ${CY - 12} ${CX + 7} ${CY - 20} ${CX} ${CY - 28}
                Z
              `}
              fill="#D4AF37"
              opacity="0.15"
            />
            {/* Inner flame highlight */}
            <path
              d={`
                M ${CX} ${CY - 22}
                C ${CX - 3} ${CY - 16} ${CX - 4} ${CY - 10} ${CX - 2} ${CY - 4}
                C ${CX} ${CY - 2} ${CX + 2} ${CY - 4} ${CX + 4} ${CY - 10}
                C ${CX + 4} ${CY - 16} ${CX + 3} ${CY - 16} ${CX} ${CY - 22}
                Z
              `}
              fill="#f7e98e"
              opacity="0.08"
            />
            {/* UFP monogram */}
            <text
              x={CX} y={CY + 20}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fontFamily="'Inter', ui-sans-serif, sans-serif"
              fontWeight="800"
              fill="#D4AF37"
              letterSpacing="0.18em"
              opacity="0.15"
            >
              UFP
            </text>
          </g>

          {/* ── Needle group — rotates around CX,CY ── */}
          <motion.g
            style={{
              rotate: needleRotateWithJitter,
              transformOrigin: `${CX}px ${CY}px`,
            }}
            filter="url(#goldGlow)"
          >
            {/* Shadow under needle */}
            <path
              d={NEEDLE}
              fill="rgba(0,0,0,0.4)"
              transform={`translate(${CX + 2},${CY + 2})`}
              style={{ filter: 'blur(3px)' }}
            />
            {/* Needle body */}
            <path
              d={NEEDLE}
              fill="url(#needleGrad)"
              transform={`translate(${CX},${CY})`}
            />
            {/* Needle center cap — gold disc */}
            <circle
              cx={CX} cy={CY} r="7"
              fill="#D4AF37"
            />
            {/* Cap highlight */}
            <circle
              cx={CX - 1.5} cy={CY - 1.5} r="2.5"
              fill="rgba(247,233,142,0.7)"
            />
            {/* Cap screw dot */}
            <circle
              cx={CX} cy={CY} r="1.5"
              fill="#1a1a1a"
            />
          </motion.g>

          {/* ── Deep well — strong inset vignette ── */}
          <circle cx={CX} cy={CY} r={R_FACE}
            fill="none"
            stroke="rgba(0,0,0,0.85)"
            strokeWidth="22"
            style={{ filter: 'blur(10px)' }}
          />

          {/* ── Glass reflection overlay ── */}
          <circle cx={CX} cy={CY} r={R_FACE}
            fill="url(#glassReflect)"
            style={{ mixBlendMode: 'screen' }}
          />

          {/* ── Glass diagonal glint ── */}
          <defs>
            <linearGradient id="glassGlint" x1="20%" y1="10%" x2="60%" y2="55%">
              <stop offset="0%"  stopColor="rgba(255,255,255,0.08)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.03)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <circle cx={CX} cy={CY} r={R_FACE}
            fill="url(#glassGlint)"
            clipPath="url(#faceClip)"
          />

          {/* ── Rim inner highlight ring ── */}
          <circle
            cx={CX} cy={CY} r={R_RIM_IN}
            fill="none"
            stroke="rgba(247,233,142,0.12)"
            strokeWidth="1"
          />
        </svg>

        {/* ── Glass lens — pure glint overlay, no blur ── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: 420, height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 35%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        {/* Live PSI readout below gauge */}
        <motion.div
          style={{ textAlign: 'center', marginTop: '12px' }}
        >
          <motion.span
            style={{
              fontFamily: "'Inter', monospace",
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.3em',
              color: 'rgba(212,175,55,0.55)',
              textTransform: 'uppercase' as const,
            }}
          >
            {'SYSTEM PRESSURE '}
          </motion.span>
          <motion.span
            style={{
              fontFamily: "'Inter', monospace",
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#D4AF37',
            }}
          >
            <MotionPSI value={psiDisplay} />
          </motion.span>
          <motion.span
            style={{
              fontFamily: "'Inter', monospace",
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: 'rgba(212,175,55,0.55)',
              marginLeft: '4px',
            }}
          >
            PSI
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* Integer readout that tracks the spring value */
function MotionPSI({ value }: { value: ReturnType<typeof useTransform<number, number>> }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    return value.on('change', (v) => {
      if (spanRef.current) {
        spanRef.current.textContent = Math.round(v as number).toString().padStart(3, '0');
      }
    });
  }, [value]);
  return <span ref={spanRef}>000</span>;
}
