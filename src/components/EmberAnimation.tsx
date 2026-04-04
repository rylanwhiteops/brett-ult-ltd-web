'use client';

/**
 * EmberAnimation — circular ember particles (gold + orange only)
 *
 * - 140 particles (60% reduction from 350)
 * - Circular sprites via canvas texture — no square pixels
 * - Gold (#D4A017) and Orange (#FF6B00) only
 * - Position: absolute, clipped by hero overflow:clip
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 140;
const GOLD   = new THREE.Color('#D4A017');
const ORANGE = new THREE.Color('#FF6B00');

// Circular sprite texture — drawn once, reused for all particles
function makeCircleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const r   = size / 2;
  const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0,   'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface Ember {
  vx: number; vy: number;
  life: number; maxLife: number;
  hue: number;
  size: number;
}

export default function EmberAnimation() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha:     false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x080808, 1);
    const W0 = mount.clientWidth  || window.innerWidth;
    const H0 = mount.clientHeight || window.innerHeight;
    renderer.setSize(W0, H0);
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -W0 / 2,  W0 / 2,
       H0 / 2, -H0 / 2,
      0.1, 100,
    );
    camera.position.z = 10;

    const circleTex = makeCircleTexture();

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors    = new Float32Array(PARTICLE_COUNT * 3);
    const sizes     = new Float32Array(PARTICLE_COUNT);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geometry.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    const material = new THREE.PointsMaterial({
      size:            12,
      map:             circleTex,
      vertexColors:    true,
      transparent:     true,
      opacity:         0.70,
      blending:        THREE.AdditiveBlending,
      depthWrite:      false,
      sizeAttenuation: false,
      alphaTest:       0.01,
    });

    scene.add(new THREE.Points(geometry, material));

    const W = W0;
    const H = H0;

    const embers: Ember[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      vx: 0, vy: 0, life: 0, maxLife: 1, hue: 0, size: 4,
    }));

    const spawnEmber = (i: number) => {
      positions[i * 3]     = (Math.random() - 0.5) * W;
      positions[i * 3 + 1] = -H / 2 - Math.random() * H * 0.15;
      positions[i * 3 + 2] = 0;
      embers[i].vx      = (Math.random() - 0.5) * 0.5;
      embers[i].vy      = 1.0 + Math.random() * 2.2;
      embers[i].maxLife = 130 + Math.random() * 200;
      embers[i].life    = 0;
      embers[i].hue     = Math.random();
      embers[i].size    = 6 + Math.random() * 10;
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      spawnEmber(i);
      positions[i * 3 + 1] = (Math.random() - 0.5) * H;
      embers[i].life = Math.random() * embers[i].maxLife;
    }

    const mouse = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth)  - 0.5;
      mouse.y = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    const onResize = () => {
      const w = mount.clientWidth  || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.left   = -w / 2; camera.right  =  w / 2;
      camera.top    =  h / 2; camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

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
      const mx = mouse.x * 1.0;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const em = embers[i];
        em.life++;
        if (em.life >= em.maxLife) { spawnEmber(i); continue; }

        const px = posAttr.getX(i);
        const dx = (mouse.x * W * 0.5 - px) / (W * 0.5);
        em.vx += dx * 0.006 * mx;
        em.vx *= 0.98;
        em.vx += (Math.random() - 0.5) * 0.03;
        em.vy += (Math.random() - 0.5) * 0.015;

        posAttr.setX(i, px + em.vx);
        posAttr.setY(i, posAttr.getY(i) + em.vy);

        const t          = em.life / em.maxLife;
        const alpha      = t < 0.1 ? t / 0.1 : 1 - Math.pow((t - 0.1) / 0.9, 1.5);
        const brightness = 0.5 + 0.5 * Math.sin(t * Math.PI);

        tmpColor.copy(GOLD).lerp(ORANGE, em.hue).multiplyScalar(brightness * alpha * 0.7);
        colAttr.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
        sizeAttr.setX(i, em.size * (0.4 + 0.7 * alpha));
      }

      posAttr.needsUpdate  = true;
      colAttr.needsUpdate  = true;
      sizeAttr.needsUpdate = true;
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      circleTex.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position:        'absolute',
        inset:           0,
        zIndex:          0,
        pointerEvents:   'none',
        backgroundColor: '#080808',
      }}
    />
  );
}
