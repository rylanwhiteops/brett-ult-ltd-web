'use client';

/**
 * SprinklerModel — Scroll-jacked 3D sprinkler pump
 *
 * PIN:  GSAP ScrollTrigger pins #hero for 220vh of scroll
 * ZOOM: Camera moves from z=5.8 → z=3.8 (stays outside model, ~70% screen max)
 *
 * POSITION TIMELINE:
 *   At rest  — camera looks left (-1.9x) → model sits in far-right ~40% of screen
 *   On scroll — lookAt lerps to (0,0.2,0) → model sweeps center, zooms to 70%
 *
 * DISSOLVE TIMELINE (scroll progress 0 → 1):
 *   0.00 – 0.25  approaching    solid=1.0  wire=0.0
 *   0.25 – 0.62  X-ray reveal   solid 1→0  wire 0→1
 *   0.62 – 0.88  wireframe      solid=0.0  wire=1.0
 *   0.88 – 1.00  fade out       solid=0.0  wire 1→0
 *
 * Materials:
 *   Solid — dark gunmetal #2a2a2a, metalness 0.8, roughness 0.6
 *   Wire  — gold #D4A017 edge highlights, additive blend
 *
 * Desktop-only — bails immediately on mobile (saves GPU + 31MB GLB)
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ── helpers ────────────────────────────────────────── */
const lerp     = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01  = (x: number) => Math.max(0, Math.min(1, x));
const invLerp  = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));

export default function SprinklerModel() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Desktop-only — bail out entirely on mobile to save GPU + skip 31MB GLB
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop) return;

    // Dimension fallbacks: mount may have height:0 if parent uses min-height (not height)
    const getW = () => mount.clientWidth  || Math.round(window.innerWidth * 0.6);
    const getH = () => mount.clientHeight || window.innerHeight;

    /* ── Renderer ────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha:     true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.setSize(getW(), getH());
    mount.appendChild(renderer.domElement);

    /* ── Scene ───────────────────────────────────────── */
    const scene = new THREE.Scene();

    /* ── Environment ─────────────────────────────────── */
    const pmrem  = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment          = envTex;
    scene.environmentIntensity = 0.45; // subtle — steel reads from direct lights
    pmrem.dispose();

    /* ── Camera ──────────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(38, getW() / getH(), 0.01, 200);
    camera.position.set(0, 0.4, 5.8);
    camera.lookAt(-1.4, 0.0, 0); // looking left → model appears in right ~40% of screen

    /* ── Lights — industrial steel palette ───────────── */
    // Cool ambient — fills shadows without warmth
    scene.add(new THREE.AmbientLight(0x0d0e12, 2.0));

    // Key light — warm white from top-right, casts hard shadows on metal surfaces
    const keyLight = new THREE.PointLight(0xf0ead8, 160, 28);
    keyLight.position.set(5, 9, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    scene.add(keyLight);

    // Cool rim light — blue-grey from back-left, defines edges on dark metal
    const rimLight = new THREE.PointLight(0x3a5a8a, 60, 20);
    rimLight.position.set(-6, 2, -3);
    scene.add(rimLight);

    // Gold accent — subtle warm fill from low front angle (gold edge catch)
    const goldAccent = new THREE.DirectionalLight(0xD4A017, 0.35);
    goldAccent.position.set(1, -2, 6);
    scene.add(goldAccent);

    // Fill from below — prevents total shadow on underside
    const fillLight = new THREE.DirectionalLight(0x1a1c22, 0.8);
    fillLight.position.set(0, -5, 2);
    scene.add(fillLight);

    /* ── Materials — gunmetal + gold wire ────────────── */
    const steelBase = new THREE.MeshStandardMaterial({
      color:               new THREE.Color('#2a2a2a'),
      metalness:           0.80,
      roughness:           0.60,
      envMapIntensity:     0.55,
      transparent:         true,
      opacity:             1,
      polygonOffset:       true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits:  1,
    });

    const wireBase = new THREE.LineBasicMaterial({
      color:       0xD4A017,
      transparent: true,
      opacity:     0,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });

    /* ── Mouse ───────────────────────────────────────── */
    const mouse = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth  - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    /* ── Resize ──────────────────────────────────────── */
    const onResize = () => {
      const w = getW();
      const h = getH();
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

    /* ── Scroll progress ─────────────────────────────── */
    const progress = { value: 0 };

    const st = ScrollTrigger.create({
      trigger: '#hero',
      start:   'top top',
      end:     '+=220%',
      pin:     true,
      scrub:   1.0,
      onUpdate: (self) => {
        progress.value = self.progress;

        const t = invLerp(0, 0.28, self.progress);

        // Fade + slide hero copy out over first 28% of scroll
        const copyEl = document.getElementById('hero-copy');
        if (copyEl) {
          copyEl.style.opacity   = String(lerp(1, 0, t));
          copyEl.style.transform = `translateX(${lerp(0, -50, t)}px)`;
        }

        // Fade gradient mask — reveals full-screen model as copy exits
        const maskEl = document.getElementById('model-mask');
        if (maskEl) {
          maskEl.style.opacity = String(lerp(1, 0, t));
        }
      },
    });

    /* ── Model state ─────────────────────────────────── */
    interface SolidEntry { mat: THREE.MeshStandardMaterial }
    interface WireEntry  { mat: THREE.LineBasicMaterial    }

    let solidEntries: SolidEntry[] = [];
    let wireEntries:  WireEntry[]  = [];
    let modelGroup: THREE.Group | null = null;
    let baseRotY = 0;

    /* ── Load GLB ────────────────────────────────────── */
    new GLTFLoader().load('/red_sprinkler_pump.glb', (gltf) => {
      const root = gltf.scene;

      /* Centre + scale */
      const box    = new THREE.Box3().setFromObject(root);
      const centre = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const scale  = 3.0 / Math.max(size.x, size.y, size.z);

      root.scale.setScalar(scale);
      root.position.sub(centre.multiplyScalar(scale));

      /* Re-measure after scale */
      const sBox = new THREE.Box3().setFromObject(root);
      // Remove base platform — any mesh whose top is in the bottom 60%
      const baseThreshold = sBox.min.y + (sBox.max.y - sBox.min.y) * 0.60;

      /* Apply materials + base removal */
      root.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        mesh.castShadow    = true;
        mesh.receiveShadow = true;

        const mb = new THREE.Box3().setFromObject(mesh);
        if (mb.max.y < baseThreshold) { mesh.visible = false; return; }

        // Dark gunmetal solid
        const solidMat = steelBase.clone() as THREE.MeshStandardMaterial;
        mesh.material = solidMat;
        solidEntries.push({ mat: solidMat });

        // Gold wire edges
        const edges   = new THREE.EdgesGeometry(mesh.geometry, 20);
        const wireMat = wireBase.clone() as THREE.LineBasicMaterial;
        const lines   = new THREE.LineSegments(edges, wireMat);
        lines.renderOrder = 1;
        mesh.add(lines);
        wireEntries.push({ mat: wireMat });
      });

      // Re-center + rescale based on VISIBLE geometry only
      // (base removal shifts the centroid and shrinks the visible portion)
      const visBox = new THREE.Box3();
      root.traverse(child => {
        if ((child as THREE.Mesh).isMesh && child.visible) {
          visBox.expandByObject(child);
        }
      });
      const visCenter = visBox.getCenter(new THREE.Vector3());
      root.position.y -= visCenter.y; // pull visible center to y=0

      // Rescale so the visible portion fills the target world size
      const visSize   = visBox.getSize(new THREE.Vector3());
      const visMaxDim = Math.max(visSize.x, visSize.y, visSize.z);
      const TARGET    = 3.2; // world-unit size for the visible part
      const groupScale = visMaxDim > 0.001 ? TARGET / visMaxDim : 1;

      modelGroup = new THREE.Group();
      modelGroup.add(root);
      modelGroup.scale.setScalar(groupScale);
      scene.add(modelGroup);
    });

    /* ── RAF loop (30fps cap) ────────────────────────── */
    const FRAME_MS = 1000 / 30;
    let lastFrame  = 0;
    let rafId      = 0;
    let lerpRX     = 0;
    let lerpRY     = 0;
    let lastP      = -1;

    // Camera path: z stays outside model (max 70% screen fill)
    // Scroll zoom limit: camera never gets closer than 40% of starting z (5.8 * 0.4 = 2.32)
    // CAM_END at z=3.8 satisfies both constraints
    const CAM_START  = new THREE.Vector3(0, 0.5,  5.8);
    const CAM_END    = new THREE.Vector3(0, 0.3,  3.8);

    // LookAt lerps from left (model appears right ~40% of screen) to center
    const LOOK_START = new THREE.Vector3(-1.4, 0.0, 0);
    const LOOK_END   = new THREE.Vector3( 0,   0.0, 0);
    const LOOK_NOW   = new THREE.Vector3();

    const loop = (ts: number) => {
      rafId = requestAnimationFrame(loop);
      if (ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;

      const p = progress.value;

      /* ── Camera: zoom path + lookAt sweep ─────────── */
      camera.position.lerpVectors(CAM_START, CAM_END, p);
      // lookAt completes by 60% of scroll — model is centered before full wireframe
      LOOK_NOW.lerpVectors(LOOK_START, LOOK_END, clamp01(p / 0.60));
      camera.lookAt(LOOK_NOW);

      /* ── Dissolve logic ─────────────────────────────
         0.00–0.25  approaching   solid=1  wire=0
         0.25–0.62  X-ray reveal  solid→0  wire→1
         0.62–0.88  wireframe     solid=0  wire=1
         0.88–1.00  fade out      solid=0  wire→0
      */
      if (Math.abs(p - lastP) > 0.003) {
        lastP = p;

        const solidOpacity =
          p < 0.25 ? 1 :
          p < 0.62 ? lerp(1, 0, invLerp(0.25, 0.62, p)) :
          0;

        const wireOpacity =
          p < 0.25 ? 0 :
          p < 0.62 ? lerp(0, 1, invLerp(0.25, 0.62, p)) :
          p < 0.88 ? 1 :
                     lerp(1, 0, invLerp(0.88, 1.00, p));

        solidEntries.forEach(({ mat }) => {
          mat.opacity = Math.max(0, solidOpacity);
          mat.visible = solidOpacity > 0.005;
        });
        wireEntries.forEach(({ mat }) => {
          mat.opacity = Math.max(0, wireOpacity * 0.88);
        });
      }

      /* ── Model rotation ─────────────────────────────
         Slow spin at rest, stops as zoom begins
      */
      if (modelGroup) {
        baseRotY += 0.004 * (1 - clamp01(p * 4));

        const mouseFactor = 1 - clamp01(p * 5);
        lerpRX += (mouse.y * -0.18 * mouseFactor - lerpRX) * 0.05;
        lerpRY += (mouse.x *  0.16 * mouseFactor - lerpRY) * 0.05;

        modelGroup.rotation.y = baseRotY + lerpRY;
        modelGroup.rotation.x = lerpRX;
      }

      /* ── Key light follows mouse ─────────────────── */
      keyLight.position.x = 5 + mouse.x * 2;
      keyLight.position.y = 9 + mouse.y * -1.5;

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(loop);

    /* ── Cleanup ─────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      st.kill();
      const copyEl = document.getElementById('hero-copy');
      if (copyEl) { copyEl.style.opacity = '1'; copyEl.style.transform = ''; }
      const maskEl = document.getElementById('model-mask');
      if (maskEl) { maskEl.style.opacity = '1'; }
      steelBase.dispose();
      wireBase.dispose();
      envTex.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
