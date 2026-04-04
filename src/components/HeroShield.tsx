'use client';

/**
 * HeroShield — Three.js gold wireframe shield + inner flame geometry
 *
 * - Extruded shield shape rendered as EdgesGeometry (clean gold wireframe)
 * - Inner elongated octahedron suggests a flame
 * - Slow Y-axis auto-rotation (~10s/rev)
 * - Mouse parallax: subtle tilt ±8°
 * - Gentle sinusoidal float
 * - 30fps cap, alpha canvas (transparent bg)
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeroShield() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ── Renderer ───────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const setSize = () => renderer.setSize(mount.clientWidth, mount.clientHeight);
    setSize();
    mount.appendChild(renderer.domElement);

    /* ── Scene / Camera ─────────────────────────────── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1, 100,
    );
    camera.position.z = 11;

    /* ── Shield shape ───────────────────────────────── */
    const shape = new THREE.Shape();
    shape.moveTo(0, 4.2);
    shape.lineTo(-3.2, 4.2);
    shape.lineTo(-3.2, 0.6);
    shape.bezierCurveTo(-3.2, -1.6, -1.9, -3.2, 0, -5.0);
    shape.bezierCurveTo( 1.9, -3.2,  3.2, -1.6, 3.2, 0.6);
    shape.lineTo(3.2, 4.2);
    shape.lineTo(0, 4.2);

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.09,
      bevelSegments: 4,
    });
    extrudeGeo.center();

    const edgesGeo = new THREE.EdgesGeometry(extrudeGeo, 12);
    const lineMat  = new THREE.LineBasicMaterial({
      color: 0xD4A017,
      transparent: true,
      opacity: 0.55,
    });
    const shield = new THREE.LineSegments(edgesGeo, lineMat);
    scene.add(shield);

    /* ── Inner flame octahedron ─────────────────────── */
    const innerGeo   = new THREE.OctahedronGeometry(1.35, 1);
    const innerEdges = new THREE.EdgesGeometry(innerGeo);
    const innerMat   = new THREE.LineBasicMaterial({
      color: 0xf7e98e,
      transparent: true,
      opacity: 0.22,
    });
    const flame = new THREE.LineSegments(innerEdges, innerMat);
    flame.scale.set(1, 1.55, 1); // elongate — flame-like
    scene.add(flame);

    /* ── Outer faint glow ring ──────────────────────── */
    const ringGeo = new THREE.TorusGeometry(4.8, 0.012, 4, 72);
    const ringMat = new THREE.LineBasicMaterial({
      color: 0xD4A017,
      transparent: true,
      opacity: 0.1,
    });
    const ring = new THREE.LineLoop(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    /* ── Mouse ──────────────────────────────────────── */
    const mouse = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5);
      mouse.y = (e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    /* ── Resize ─────────────────────────────────────── */
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

    /* ── RAF loop (30fps cap) ───────────────────────── */
    const FRAME_MS = 1000 / 30;
    let lastFrame  = 0;
    let rafId      = 0;
    let startTs    = 0;

    const loop = (ts: number) => {
      rafId = requestAnimationFrame(loop);
      if (!startTs) startTs = ts;
      if (ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;

      const t = (ts - startTs) * 0.001; // seconds

      // Base auto-rotation (~10s per full turn)
      shield.rotation.y = t * 0.628;
      flame.rotation.y  = -t * 0.5;
      flame.rotation.x  = t * 0.18;
      ring.rotation.z   = t * 0.08;

      // Mouse parallax overlay (target, lerp)
      const targetRX = mouse.y * 0.22;
      const targetRY = shield.rotation.y + mouse.x * 0.18;
      shield.rotation.x += (targetRX - shield.rotation.x) * 0.06;
      shield.rotation.y += (targetRY - shield.rotation.y) * 0.04;

      // Float
      const floatY   = Math.sin(t * 0.45) * 0.18;
      shield.position.y = floatY;
      flame.position.y  = floatY + Math.sin(t * 0.6) * 0.06;
      ring.position.y   = floatY * 0.5;

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(loop);

    /* ── Cleanup ────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      renderer.dispose();
      extrudeGeo.dispose(); edgesGeo.dispose(); lineMat.dispose();
      innerGeo.dispose(); innerEdges.dispose(); innerMat.dispose();
      ringGeo.dispose(); ringMat.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
