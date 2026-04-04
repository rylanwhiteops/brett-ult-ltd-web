'use client';

/**
 * SprinklerModel — Three.js GLB loader for red_sprinkler_pump.glb
 *
 * - GLTFLoader with DRACOLoader fallback not needed (no compression flags)
 * - Gold point light (#D4A017) from above-right + dim ambient
 * - Slow Y-axis auto-rotation
 * - Mouse parallax tilt (smooth lerp)
 * - Transparent canvas — ember particles show through behind
 * - 30fps cap
 * - Clean loading state while 31MB model streams
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function SprinklerModel() {
  const mountRef  = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ── Renderer ─────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,                    // transparent bg — embers show through
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    /* ── Scene / Camera ──────────────────────────── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      38,
      mount.clientWidth / mount.clientHeight,
      0.01, 100,
    );
    camera.position.set(0, 0.5, 4.5);

    /* ── Lighting ────────────────────────────────── */
    // Dim ambient — keeps shadows from going pure black
    const ambient = new THREE.AmbientLight(0x1a1008, 1.8);
    scene.add(ambient);

    // Gold key light — above-right, warm gold (#D4A017)
    const keyLight = new THREE.PointLight(0xD4A017, 120, 18);
    keyLight.position.set(3, 5, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Soft fill — slight warm orange from the left to match ember palette
    const fillLight = new THREE.PointLight(0xFF6B1A, 18, 20);
    fillLight.position.set(-4, 1, 2);
    scene.add(fillLight);

    // Subtle rim from behind — separates model from bg
    const rimLight = new THREE.DirectionalLight(0xD4A017, 0.4);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    /* ── Mouse ───────────────────────────────────── */
    const mouse  = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5);
      mouse.y = (e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    /* ── Resize ──────────────────────────────────── */
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

    /* ── Load GLB ────────────────────────────────── */
    let model: THREE.Group | null = null;
    let rafId  = 0;
    let lastFrame = 0;
    const FRAME_MS = 1000 / 30;
    let rotY   = 0;
    let tiltX  = 0;
    let tiltY  = 0;

    const loader = new GLTFLoader();
    loader.load(
      '/red_sprinkler_pump.glb',

      /* onLoad */
      (gltf) => {
        model = gltf.scene;

        // Centre and scale to fit viewport column
        const box    = new THREE.Box3().setFromObject(model);
        const centre = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 2.2 / maxDim;          // target ~2.2 world units tall

        model.scale.setScalar(scale);
        model.position.sub(centre.multiplyScalar(scale));

        // Ensure all meshes cast / receive shadows
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow    = true;
            mesh.receiveShadow = true;
          }
        });

        scene.add(model);
        setLoading(false);

        /* ── RAF loop (30fps) ──────────────────── */
        const loop = (ts: number) => {
          rafId = requestAnimationFrame(loop);
          if (ts - lastFrame < FRAME_MS) return;
          lastFrame = ts;

          if (!model) return;

          // Slow Y-axis auto-rotation
          rotY += 0.006;

          // Smooth mouse parallax tilt
          tiltX += (mouse.y * -0.25 - tiltX) * 0.06;
          tiltY += (mouse.x *  0.20 - tiltY) * 0.06;

          model.rotation.y = rotY + tiltY;
          model.rotation.x = tiltX;

          // Key light very subtly follows mouse for dynamic shading
          keyLight.position.x = 3 + mouse.x * 1.5;
          keyLight.position.y = 5 + mouse.y * -1.0;

          renderer.render(scene, camera);
        };
        rafId = requestAnimationFrame(loop);
      },

      /* onProgress */
      undefined,

      /* onError */
      (err) => {
        console.error('GLTFLoader error:', err);
        setError(true);
        setLoading(false);
      },
    );

    /* ── Cleanup ─────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Three.js canvas mount */}
      <div ref={mountRef} className="w-full h-full" aria-hidden="true" />

      {/* Loading state */}
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
          {/* Animated gold ring */}
          <div
            className="w-12 h-12 rounded-full border border-[#D4A017]/20"
            style={{
              borderTopColor: '#D4A017',
              animation: 'spin 1.2s linear infinite',
            }}
          />
          <p className="eyebrow text-[#6B6B6B]">Loading model</p>
        </div>
      )}

      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="eyebrow text-[#6B6B6B]">Model unavailable</p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
