'use client';

/**
 * PressurizedSystem — canvas-based background engine
 *
 * Layers (drawn each RAF frame):
 *   0. Flashlight cursor              — soft dark-gold radial glow at mouse
 *   1. Flow particles along conduit   — parallax layer (fast)
 *   2. Horizontal conduit pulses      — from conduit every ~3.5s
 *
 * Mouse parallax: particles shift ±24px; flashlight follows cursor exactly
 * Conduit x: 64px (mobile <768px) | 96px (desktop)
 */

import { useEffect, useRef, useCallback } from 'react';

const GOLD  = (a: number) => `rgba(212,175,55,${a})`;
const GRID  = 50; // px — grid cell size
const MAX_PARTICLES = 55;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  branched: boolean;
}

interface Pulse {
  originX: number; originY: number;
  dir: 1 | -1;
  maxW: number;
  life: number; maxLife: number;
}


export default function PressurizedSystem() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const mouse       = useRef({ x: 0.5, y: 0.5 }); // normalised 0-1
  const particles   = useRef<Particle[]>([]);
  const pulses      = useRef<Pulse[]>([]);
  const lastPulseAt = useRef(0);
  const rafId       = useRef(0);
  const scroll      = useRef(0); // raw scrollY
  const lastPulseProgress = useRef(-1); // hero scroll progress that last triggered a pulse

  /* ── helpers ─────────────────────────────────────────────── */
  const conduitX = () =>
    typeof window !== 'undefined' && window.innerWidth >= 768 ? 96 : 64;

  const spawnParticle = (_W: number, H: number) => {
    if (particles.current.length >= MAX_PARTICLES) return;
    const cx = conduitX();
    particles.current.push({
      x: cx + (Math.random() - 0.5) * 2,
      // Spawn anywhere along top 70% of viewport, weighted toward top
      y: Math.pow(Math.random(), 1.8) * H * 0.7,
      vx: 0,
      vy: 0.6 + Math.random() * 1.4,
      life: 0,
      maxLife: 100 + Math.random() * 140,
      size: 0.8 + Math.random() * 1.4,
      branched: false,
    });
  };

  const spawnPulse = (H: number) => {
    const cx  = conduitX();
    // Snap pulse to nearest grid y-line
    const row = Math.round((Math.random() * H) / GRID);
    const py  = row * GRID;
    pulses.current.push(
      { originX: cx, originY: py, dir:  1, maxW: 120 + Math.random() * 180, life: 0, maxLife: 55 },
      { originX: cx, originY: py, dir: -1, maxW:  60 + Math.random() * 100, life: 0, maxLife: 55 },
    );
  };

  /* ── main draw ───────────────────────────────────────────── */
  const draw = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    ts: number,
  ) => {
    ctx.clearRect(0, 0, W, H);

    const mx = mouse.current.x; // 0-1
    const my = mouse.current.y; // 0-1

    // Parallax offsets
    const gox = (mx - 0.5) * 24;
    const pox = (mx - 0.5) * 48;  // particles — fast
    const poy = (my - 0.5) * 32;

    /* ── 0. FLASHLIGHT CURSOR ────────────────────────────── */
    const fx = mx * W;
    const fy = my * H;
    const flashlight = ctx.createRadialGradient(fx, fy, 0, fx, fy, 280);
    flashlight.addColorStop(0,   GOLD(0.025));
    flashlight.addColorStop(0.5, GOLD(0.008));
    flashlight.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = flashlight;
    ctx.fillRect(0, 0, W, H);

    /* ── 1. PARTICLES ────────────────────────────────────── */
    // Spawn rate: ~4% chance per frame (throttled loop ≈ 1-2 spawns/sec)
    if (Math.random() < 0.04) spawnParticle(W, H);

    ctx.save();
    ctx.translate(pox, poy);

    particles.current = particles.current.filter(p => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      // Branch onto nearest horizontal grid line (once per particle)
      if (!p.branched && p.vy > 0) {
        const nearY = Math.round(p.y / GRID) * GRID;
        if (Math.abs(p.y - nearY) < 1.5 && Math.random() < 0.018) {
          p.branched = true;
          p.vx = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.9);
          p.vy = 0;
        }
      }

      const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.9;

      // Trail
      if (p.life > 1) {
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 4, p.y - p.vy * 4);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = GOLD(alpha * 0.35);
        ctx.lineWidth = p.size * 0.6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Ember dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = GOLD(alpha);
      ctx.fill();

      return (
        p.life < p.maxLife &&
        p.x > -60 && p.x < W + 60 &&
        p.y < H + 10
      );
    });

    ctx.restore();

    /* ── 3. CONDUIT PULSES ───────────────────────────────── */
    // Time-based pulse every ~3.5s
    if (ts - lastPulseAt.current > 3500) {
      lastPulseAt.current = ts;
      spawnPulse(H);
    }

    // Scroll-triggered pulses: fire when conduit head crosses a new 10% threshold
    const heroH = H * 3; // hero is 300vh
    const prog  = Math.min(scroll.current / heroH, 1);
    const bucket = Math.floor(prog * 10);
    if (bucket !== lastPulseProgress.current) {
      lastPulseProgress.current = bucket;
      spawnPulse(H);
    }

    ctx.save();
    ctx.translate(gox, 0); // pulses follow horizontal parallax

    pulses.current = pulses.current.filter(pulse => {
      pulse.life++;
      const t     = pulse.life / pulse.maxLife;
      const alpha = (1 - t) * 0.4;
      const len   = pulse.maxW * t;

      const grad = ctx.createLinearGradient(
        pulse.originX, pulse.originY,
        pulse.originX + pulse.dir * len, pulse.originY,
      );
      grad.addColorStop(0, GOLD(alpha));
      grad.addColorStop(0.7, GOLD(alpha * 0.4));
      grad.addColorStop(1,   GOLD(0));

      ctx.beginPath();
      ctx.moveTo(pulse.originX, pulse.originY);
      ctx.lineTo(pulse.originX + pulse.dir * len, pulse.originY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Secondary faint width — inner glow
      ctx.beginPath();
      ctx.moveTo(pulse.originX, pulse.originY);
      ctx.lineTo(pulse.originX + pulse.dir * len * 0.6, pulse.originY);
      ctx.strokeStyle = GOLD(alpha * 0.6);
      ctx.lineWidth = 0.5;
      ctx.stroke();

      return pulse.life < pulse.maxLife;
    });

    ctx.restore();
  }, []);

  /* ── setup / teardown ────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onResize = () => resize();
    const onMouse  = (e: MouseEvent) => {
      mouse.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    const onScroll = () => { scroll.current = window.scrollY; };

    window.addEventListener('resize',    onResize,   { passive: true });
    window.addEventListener('mousemove', onMouse,    { passive: true });
    window.addEventListener('scroll',    onScroll,   { passive: true });

    let startTs = 0;
    let lastFrame = 0;
    const FRAME_MS = 1000 / 30; // cap at 30fps — halves CPU load
    const loop = (ts: number) => {
      rafId.current = requestAnimationFrame(loop);
      if (!startTs) startTs = ts;
      if (ts - lastFrame < FRAME_MS) return; // skip frame
      lastFrame = ts;
      draw(ctx, window.innerWidth, window.innerHeight, ts - startTs);
    };
    rafId.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('resize',    onResize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll',    onScroll);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        display: 'block',
        // Canvas stays permanently — it's the global background system
        // (particles + pulses + flashlight are fine on all sections)
      }}
    />
  );
}
