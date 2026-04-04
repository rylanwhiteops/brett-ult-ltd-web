'use client';

/**
 * EmberAnimation — Three.js canvas-based fire/ember particle system
 *
 * - Gold (#D4A017) and orange (#FF6B1A) particles
 * - Flow upward with drift, react to mouse movement
 * - 30fps cap, BufferGeometry Points for performance
 * - Canvas background initialized to #080808 (no white flash)
 * - position: fixed, inset: 0, z-index: 0 — behind hero text
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 600;
const GOLD  = new THREE.Color('#D4A017');
const ORANGE = new THREE.Color('#FF6B1A');
const RED_EMBER = new THREE.Color('#CC3300');

interface Ember {
  vx: number; vy: number;        // world-space velocity
  life: number; maxLife: number; // 0 → dead
  hue: number;                   // 0=gold, 0.5=orange, 1=red
  size: number;
}

export default function EmberAnimation() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ── Renderer ─────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x080808, 1);
    const W0 = mount.clientWidth  || window.innerWidth;
    const H0 = mount.clientHeight || window.innerHeight;
    renderer.setSize(W0, H0);
    mount.appendChild(renderer.domElement);

    /* ── Scene / Camera ───────────────────────────────── */
    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -W0 / 2,  W0 / 2,
       H0 / 2, -H0 / 2,
      0.1, 100,
    );
    camera.position.z = 10;

    /* ── Geometry & Material ──────────────────────────── */
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geometry.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    const material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    /* ── Ember state ─────────────────────────────────── */
    const W = W0;
    const H = H0;

    const embers: Ember[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      vx: 0, vy: 0, life: 0, maxLife: 1, hue: 0, size: 2,
    }));

    const spawnEmber = (i: number) => {
      // x: full width, weighted toward bottom
      positions[i * 3]     = (Math.random() - 0.5) * W;
      // y: spawn at bottom quarter
      positions[i * 3 + 1] = -H / 2 - Math.random() * H * 0.2;
      positions[i * 3 + 2] = 0;

      embers[i].vx      = (Math.random() - 0.5) * 0.6;
      embers[i].vy      = 0.8 + Math.random() * 2.0;
      embers[i].maxLife = 120 + Math.random() * 180;
      embers[i].life    = 0;
      embers[i].hue     = Math.random(); // 0=gold, 0.5=orange, 1=red-ember
      embers[i].size    = 1.5 + Math.random() * 3.5;
    };

    // Seed all particles at staggered heights on load
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      spawnEmber(i);
      // scatter them up the screen so it's full from frame 1
      positions[i * 3 + 1] = (Math.random() - 0.5) * H;
      embers[i].life = Math.random() * embers[i].maxLife;
    }

    /* ── Mouse ───────────────────────────────────────── */
    const mouse = { x: 0, y: 0 }; // -0.5 → 0.5 normalised

    const onMouse = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth)  - 0.5;
      mouse.y = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    /* ── Resize ──────────────────────────────────────── */
    const onResize = () => {
      const w = mount.clientWidth  || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.left   = -w / 2;
      camera.right  =  w / 2;
      camera.top    =  h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

    /* ── RAF loop (30fps cap) ────────────────────────── */
    const FRAME_MS = 1000 / 30;
    let lastFrame  = 0;
    let rafId      = 0;

    const tmpColor = new THREE.Color();

    const loop = (ts: number) => {
      rafId = requestAnimationFrame(loop);
      if (ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;

      const posAttr  = geometry.attributes.position as THREE.BufferAttribute;
      const colAttr  = geometry.attributes.color    as THREE.BufferAttribute;
      const sizeAttr = geometry.attributes.size     as THREE.BufferAttribute;

      // Mouse influence — gentle horizontal pull at scale of screen width
      const mx = mouse.x * 1.2; // -0.6 → 0.6 world units per frame push

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const em = embers[i];
        em.life++;

        if (em.life >= em.maxLife) {
          spawnEmber(i);
          continue;
        }

        // Apply mouse drift (stronger when mouse is near the particle horizontally)
        const px = posAttr.getX(i);
        const dx = (mouse.x * W * 0.5 - px) / (W * 0.5); // -1→1 relative proximity
        em.vx += dx * 0.008 * mx; // subtle horizontal attraction
        em.vx *= 0.98; // dampen drift

        posAttr.setX(i, px + em.vx);
        posAttr.setY(i, posAttr.getY(i) + em.vy);

        // Slight turbulence
        em.vx += (Math.random() - 0.5) * 0.04;
        em.vy += (Math.random() - 0.5) * 0.02;

        // Life alpha: fade in quick, hold, fade out
        const t     = em.life / em.maxLife;
        const alpha = t < 0.1 ? t / 0.1 : 1 - Math.pow((t - 0.1) / 0.9, 1.5);

        // Color: gold → orange → red based on hue + lifecycle
        const colorMix = em.hue < 0.5
          ? GOLD.clone().lerp(ORANGE, em.hue * 2)
          : ORANGE.clone().lerp(RED_EMBER, (em.hue - 0.5) * 2);

        // Brighten at peak life (t≈0.3)
        const brightness = 0.6 + 0.6 * Math.sin(t * Math.PI);
        tmpColor.copy(colorMix).multiplyScalar(brightness * alpha);

        colAttr.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
        sizeAttr.setX(i, em.size * (0.5 + 0.7 * alpha));
      }

      posAttr.needsUpdate  = true;
      colAttr.needsUpdate  = true;
      sizeAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(loop);

    /* ── Cleanup ─────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor: '#080808',
      }}
    />
  );
}
