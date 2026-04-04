'use client';

/**
 * GaugePipes — Full industrial fire-suppression header attached to the gauge.
 * Gauge: 420×420 px. Pipe system fills the hero vertically.
 *
 * System layout:
 *   Vertical supply enters from above (230px)
 *   ├─ T1 (y=-150): upper header — left branch + right branch w/ valve
 *   └─ T2 (y=-55):  lower header — right branch w/ valve + label
 *   Gauge inlet at y=0 (FlangeNut)
 *   Bottom exit tap below gauge
 */

import { motion } from 'framer-motion';
import PressureGauge from './PressureGauge';

/* ── Constants ──────────────────────────────────────────────── */
const PIPE_W  = 10;
const R       = PIPE_W / 2;          // 5
const EASE    = [0.22, 1, 0.36, 1] as const;

const CX = 210;                       // center of 420px gauge

// Supply pipe (vertical)
const SUPPLY_TOP   = -235;            // top of vertical supply
const GAUGE_ENTRY  =    0;            // enters gauge housing here

// Tee positions along supply
const T1_Y = -150;                    // upper tee
const T2_Y =  -55;                    // lower tee

// Upper branch (right): CX → R1_X at y=T1_Y
const R1_X     = CX + 155;           // 365
const RV1_X    = CX +  90;           // 300 — valve on upper right

// Upper branch (left): CX → L1_X at y=T1_Y
const L1_X     = CX - 125;           //  85
const LV1_X    = CX -  72;           // 138 — valve on left

// Lower branch (right): CX → R2_X at y=T2_Y
const R2_X     = CX + 115;           // 325
const RV2_X    = CX +  68;           // 278 — valve on lower right

// Bottom exit tap
const BOTTOM_ENTRY = 420;            // gauge bottom
const BOTTOM_EXIT  = 420 + 42;       // short downward exit

/* ── Pipe paths ─────────────────────────────────────────────── */
const pathSupply = `M ${CX} ${SUPPLY_TOP} L ${CX} ${GAUGE_ENTRY}`;
const pathR1     = `M ${CX} ${T1_Y} L ${R1_X} ${T1_Y}`;
const pathL1     = `M ${CX} ${T1_Y} L ${L1_X} ${T1_Y}`;
const pathR2     = `M ${CX} ${T2_Y} L ${R2_X} ${T2_Y}`;
const pathBottom = `M ${CX} ${BOTTOM_ENTRY} L ${CX} ${BOTTOM_EXIT}`;

/* ── Fittings ──────────────────────────────────────────────── */
function FlangeNut({ x, y, r = 14 }: { x: number; y: number; r?: number }) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 * Math.PI) / 180;
    return `${(x + r * Math.sin(a)).toFixed(1)},${(y - r * Math.cos(a)).toFixed(1)}`;
  }).join(' ');
  return (
    <g>
      <polygon points={pts} fill="url(#gpFit)" stroke="rgba(212,175,55,0.7)" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={r * 0.52} fill="#060606" stroke="rgba(212,175,55,0.4)" strokeWidth={1} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 * Math.PI) / 180;
        return <circle key={i} cx={x + r * 0.77 * Math.sin(a)} cy={y - r * 0.77 * Math.cos(a)}
          r={2} fill="#050505" stroke="rgba(212,175,55,0.4)" strokeWidth={0.6} />;
      })}
      <circle cx={x} cy={y} r={3} fill="rgba(212,175,55,0.65)" />
    </g>
  );
}

function Tee({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={14} fill="url(#gpFit)" stroke="rgba(212,175,55,0.65)" strokeWidth={1.2} />
      <circle cx={x} cy={y} r={6}  fill="#050505" stroke="rgba(212,175,55,0.25)" strokeWidth={0.8} />
      {[0, 60, 120, 180, 240, 300].map(a => (
        <circle key={a}
          cx={x + 11 * Math.sin((a * Math.PI) / 180)}
          cy={y - 11 * Math.cos((a * Math.PI) / 180)}
          r={2} fill="#050505" stroke="rgba(212,175,55,0.45)" strokeWidth={0.6}
        />
      ))}
      <circle cx={x} cy={y} r={2.5} fill="rgba(212,175,55,0.55)" />
    </g>
  );
}

function Valve({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 14} y={y - 9} width={28} height={18}
        fill="url(#gpFit)" stroke="rgba(212,175,55,0.65)" strokeWidth={1.5} rx={1.5} />
      {/* Internal valve cross */}
      <line x1={x} y1={y - 9} x2={x} y2={y + 9}
        stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
      {/* Stem */}
      <line x1={x} y1={y - 9} x2={x} y2={y - 20}
        stroke="rgba(212,175,55,0.75)" strokeWidth={1.8} />
      {/* Handle wheel */}
      <line x1={x - 9} y1={y - 20} x2={x + 9} y2={y - 20}
        stroke="rgba(212,175,55,0.9)" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={x} cy={y - 20} r={2} fill="rgba(212,175,55,0.8)" />
      {/* Highlight */}
      <rect x={x - 14} y={y - 9} width={28} height={4}
        fill="rgba(255,255,255,0.07)" rx={1.5} />
    </g>
  );
}

function EndCap({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={7}
        fill="#060606" stroke="rgba(212,175,55,0.5)" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={3} fill="rgba(212,175,55,0.3)" />
    </g>
  );
}

function PressureDot({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <motion.circle cx={x} cy={y} r={6} fill="none" stroke="#D4AF37" strokeWidth={1.2}
        animate={{ r: [6, 14, 6], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut' }}
      />
      <circle cx={x} cy={y} r={4} fill="#D4AF37" opacity={0.9} />
    </g>
  );
}

/* ── 3D pipe segment ─────────────────────────────────────────── */
function Pipe3D({ d, gradId, delay = 0 }: { d: string; gradId: string; delay?: number }) {
  return (
    <g>
      {/* Shadow */}
      <motion.path d={d} fill="none"
        stroke="rgba(0,0,0,0.65)" strokeWidth={PIPE_W + 6} strokeLinecap="butt"
        style={{ filter: 'blur(5px)' }}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay, ease: EASE }}
      />
      {/* Body */}
      <motion.path d={d} fill="none"
        stroke={`url(#${gradId})`} strokeWidth={PIPE_W} strokeLinecap="butt"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay, ease: EASE }}
      />
      {/* Specular */}
      <motion.path d={d} fill="none"
        stroke="rgba(255,255,255,0.2)" strokeWidth={1.2} strokeLinecap="butt"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, delay: delay + 0.07, ease: EASE }}
      />
    </g>
  );
}

/* ── Label helper ───────────────────────────────────────────── */
function PipeLabel({ x, y, text, anchor = 'start' }: { x: number; y: number; text: string; anchor?: string }) {
  return (
    <motion.text x={x} y={y} fontSize="8" fontFamily="ui-monospace,'SF Mono',monospace"
      fontWeight="600" letterSpacing="0.18em" fill="rgba(212,175,55,0.38)"
      textAnchor={anchor}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ delay: 1.4, duration: 0.8 }}>
      {text}
    </motion.text>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export default function GaugePipes() {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>

      {/* Pipe + fitting SVG — overflows above/below/sides of gauge */}
      <svg
        aria-hidden="true"
        width={420}
        height={420}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'visible',
          zIndex: 2,
          pointerEvents: 'none',
          filter: 'drop-shadow(4px 8px 14px rgba(0,0,0,0.8))',
        }}
      >
        <defs>
          {/* Fitting */}
          <linearGradient id="gpFit" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#2a1a05" />
            <stop offset="22%"  stopColor="#7a5c12" />
            <stop offset="48%"  stopColor="#f7e98e" />
            <stop offset="72%"  stopColor="#c9a227" />
            <stop offset="100%" stopColor="#1a0e03" />
          </linearGradient>

          {/* Vertical supply — L→R cylindrical */}
          <linearGradient id="gpVert" gradientUnits="userSpaceOnUse"
            x1={CX - R} y1="0" x2={CX + R} y2="0">
            <stop offset="0%"   stopColor="#1a0e03" />
            <stop offset="28%"  stopColor="#9a7c20" />
            <stop offset="50%"  stopColor="#D4AF37" />
            <stop offset="74%"  stopColor="#7a5c12" />
            <stop offset="100%" stopColor="#1a0e03" />
          </linearGradient>

          {/* Upper horizontal — T→B cylindrical */}
          <linearGradient id="gpH1" gradientUnits="userSpaceOnUse"
            x1="0" y1={T1_Y - R} x2="0" y2={T1_Y + R}>
            <stop offset="0%"   stopColor="#1a0e03" />
            <stop offset="28%"  stopColor="#9a7c20" />
            <stop offset="50%"  stopColor="#D4AF37" />
            <stop offset="74%"  stopColor="#7a5c12" />
            <stop offset="100%" stopColor="#1a0e03" />
          </linearGradient>

          {/* Lower horizontal — T→B cylindrical */}
          <linearGradient id="gpH2" gradientUnits="userSpaceOnUse"
            x1="0" y1={T2_Y - R} x2="0" y2={T2_Y + R}>
            <stop offset="0%"   stopColor="#1a0e03" />
            <stop offset="28%"  stopColor="#9a7c20" />
            <stop offset="50%"  stopColor="#D4AF37" />
            <stop offset="74%"  stopColor="#7a5c12" />
            <stop offset="100%" stopColor="#1a0e03" />
          </linearGradient>

          {/* Bottom exit — same as vertical */}
          <linearGradient id="gpVert2" gradientUnits="userSpaceOnUse"
            x1={CX - R} y1="0" x2={CX + R} y2="0">
            <stop offset="0%"   stopColor="#1a0e03" />
            <stop offset="28%"  stopColor="#9a7c20" />
            <stop offset="50%"  stopColor="#D4AF37" />
            <stop offset="74%"  stopColor="#7a5c12" />
            <stop offset="100%" stopColor="#1a0e03" />
          </linearGradient>
        </defs>

        {/* ── Ghost tracks (faint guide lines) ── */}
        {[pathSupply, pathR1, pathL1, pathR2, pathBottom].map((d, i) => (
          <path key={i} d={d} fill="none"
            stroke="rgba(212,175,55,0.045)" strokeWidth={PIPE_W} strokeLinecap="butt" />
        ))}

        {/* ── 3D Pipe segments ── */}
        <Pipe3D d={pathSupply} gradId="gpVert"  delay={0.1} />
        <Pipe3D d={pathR1}     gradId="gpH1"    delay={0.55} />
        <Pipe3D d={pathL1}     gradId="gpH1"    delay={0.65} />
        <Pipe3D d={pathR2}     gradId="gpH2"    delay={0.8} />
        <Pipe3D d={pathBottom} gradId="gpVert2" delay={1.05} />

        {/* ── Fittings ── */}

        {/* Supply top cap */}
        <motion.g initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.4, ease: EASE }}
          style={{ transformOrigin: `${CX}px ${SUPPLY_TOP}px` }}>
          <EndCap x={CX} y={SUPPLY_TOP} />
        </motion.g>

        {/* T1 — upper tee junction */}
        <motion.g initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.48, duration: 0.45, ease: EASE }}
          style={{ transformOrigin: `${CX}px ${T1_Y}px` }}>
          <Tee x={CX} y={T1_Y} />
        </motion.g>

        {/* T2 — lower tee junction */}
        <motion.g initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.72, duration: 0.45, ease: EASE }}
          style={{ transformOrigin: `${CX}px ${T2_Y}px` }}>
          <Tee x={CX} y={T2_Y} />
        </motion.g>

        {/* FlangeNut at gauge inlet */}
        <motion.g initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.38, duration: 0.5, ease: EASE }}
          style={{ transformOrigin: `${CX}px 0px` }}>
          <FlangeNut x={CX} y={GAUGE_ENTRY} />
        </motion.g>

        {/* FlangeNut at gauge exit bottom */}
        <motion.g initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, duration: 0.4, ease: EASE }}
          style={{ transformOrigin: `${CX}px ${BOTTOM_ENTRY}px` }}>
          <FlangeNut x={CX} y={BOTTOM_ENTRY} r={12} />
        </motion.g>

        {/* Valve — upper right branch */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.4 }}>
          <Valve x={RV1_X} y={T1_Y} />
        </motion.g>

        {/* Valve — upper left branch */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.92, duration: 0.4 }}>
          <Valve x={LV1_X} y={T1_Y} />
        </motion.g>

        {/* Valve — lower right branch */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.4 }}>
          <Valve x={RV2_X} y={T2_Y} />
        </motion.g>

        {/* Pressure dots at branch terminals */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}>
          <PressureDot x={R1_X} y={T1_Y} />
        </motion.g>
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.45, duration: 0.5 }}>
          <PressureDot x={L1_X} y={T1_Y} />
        </motion.g>
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.55, duration: 0.5 }}>
          <PressureDot x={R2_X} y={T2_Y} />
        </motion.g>

        {/* Bottom exit pressure dot */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.65, duration: 0.5 }}>
          <PressureDot x={CX} y={BOTTOM_EXIT} />
        </motion.g>

        {/* ── Labels ── */}
        <PipeLabel x={CX + 12} y={(SUPPLY_TOP + T1_Y) / 2}      text="MAIN SUPPLY · 175 PSI" />
        <PipeLabel x={RV1_X + 18} y={T1_Y - 14}                  text="ISO 14520" />
        <PipeLabel x={CX + 12} y={T2_Y - 12}                     text="STANDPIPE" />
        <PipeLabel x={L1_X - 8} y={T1_Y - 14} text="N.O." anchor="end" />
      </svg>

      {/* ── Gauge ── */}
      <PressureGauge />
    </div>
  );
}
