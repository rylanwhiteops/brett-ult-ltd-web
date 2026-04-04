'use client';

/**
 * HeroShield — Three.js gold wireframe shield
 *
 * - Extruded shield shape → EdgesGeometry wireframe (high opacity gold)
 * - Inner elongated octahedron (flame detail)
 * - Outer halo copy (slight scale offset, additive blend) — bloom effect
 * - Back glow disc: soft gold plane that pulses in opacity
 * - Slow Y-axis auto-rotation (~10s/rev)
 * - Mouse parallax tilt ±8°
 * - Sinusoidal float
 * - 30fps cap, alpha canvas
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
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    /* ── Scene / Camera ─────────────────────────────── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.z = 11;

    /* ── Shield shape (25% larger points vs previous) ── */
    const shape = new THREE.Shape();
    shape.moveTo(0,    4.8);
    shape.lineTo(-3.8, 4.8);
    shape.lineTo(-3.8, 0.7);
    shape.bezierCurveTo(-3.8, -1.9, -2.2, -3.8,  0, -5.8);
    shape.bezierCurveTo( 2.2, -3.8,  3.8, -1.9,  3.8, 0.7);
    shape.lineTo(3.8,  4.8);
    shape.lineTo(0,    4.8);

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.10,
      bevelSegments: 4,
    });
    extrudeGeo.center();

    /* Main shield wireframe */
    const edgesGeo = new THREE.EdgesGeometry(extrudeGeo, 10);
    const lineMat  = new THREE.LineBasicMaterial({
      color: 0xD4A017,
      transparent: true,
      opacity: 0.92,
    });
    const shield = new THREE.LineSegments(edgesGeo, lineMat);

    /* Halo — slightly larger, additive blend, lower opacity for bloom */
    const haloEdges = new THREE.EdgesGeometry(extrudeGeo, 10);
    const haloMat   = new THREE.LineBasicMaterial({
      color: 0xf0d060,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.LineSegments(haloEdges, haloMat);
    halo.scale.setScalar(1.07);

    /* ── Back glow disc (pulse) ─────────────────────── */
    const glowGeo = new THREE.CircleGeometry(5.8, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xD4A017,
      transparent: true,
      opacity: 0.035,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glowDisc = new THREE.Mesh(glowGeo, glowMat);
    glowDisc.position.z = -0.8;

    /* ── Inner flame octahedron ─────────────────────── */
    const innerGeo   = new THREE.OctahedronGeometry(1.5, 1);
    const innerEdges = new THREE.EdgesGeometry(innerGeo);
    const innerMat   = new THREE.LineBasicMaterial({
      color: 0xffe060,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
    });
    const flame = new THREE.LineSegments(innerEdges, innerMat);
    flame.scale.set(1, 1.6, 1);

    /* ── Outer ring ─────────────────────────────────── */
    const ringGeo = new THREE.TorusGeometry(5.4, 0.015, 4, 80);
    const ringMat = new THREE.LineBasicMaterial({
      color: 0xD4A017,
      transparent: true,
      opacity: 0.16,
    });
    const ring = new THREE.LineLoop(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;

    /* ── Group all pieces ───────────────────────────── */
    const group = new THREE.Group();
    group.add(glowDisc, ring, halo, shield, flame);
    scene.add(group);

    /* ── Mouse ──────────────────────────────────────── */
    const mouse = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth  - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
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
    // Lerp targets for smooth mouse tilt
    let rotX = 0, rotY = 0;

    const loop = (ts: number) => {
      rafId = requestAnimationFrame(loop);
      if (!startTs) startTs = ts;
      if (ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;

      const t = (ts - startTs) * 0.001;

      // Slow base rotation (~10s full turn)
      const baseY = t * 0.63;

      // Smooth mouse parallax (lerp toward target)
      rotX += (mouse.y * -0.28 - rotX) * 0.06;
      rotY += (baseY + mouse.x * 0.20 - rotY) * 0.06;

      group.rotation.x = rotX;
      group.rotation.y = rotY;

      // Inner flame counter-rotates slightly
      flame.rotation.y = -t * 0.45;
      flame.rotation.x =  t * 0.20;

      // Ring drifts
      ring.rotation.z = t * 0.09;

      // Float
      group.position.y = Math.sin(t * 0.42) * 0.22;

      // Glow pulse — breathes between dim and bright
      const pulse      = 0.5 + 0.5 * Math.sin(t * 1.1);
      glowMat.opacity  = 0.020 + pulse * 0.045;  // 0.020 → 0.065
      haloMat.opacity  = 0.10  + pulse * 0.14;   // 0.10  → 0.24
      innerMat.opacity = 0.28  + pulse * 0.18;   // 0.28  → 0.46

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
      haloEdges.dispose(); haloMat.dispose();
      glowGeo.dispose(); glowMat.dispose();
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
