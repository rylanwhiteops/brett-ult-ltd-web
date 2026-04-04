'use client';

/**
 * SprinklerModel — Scroll-jacked 3D sprinkler pump
 *
 * - Full GLB loaded, all meshes under one parent group (never separate)
 * - Steel gray (#8a8a8a) material, gold lighting, clearly visible
 * - Camera starts far-right (offset lookAt), zooms to center on scroll
 * - Zoom limit: ends at z=4.8 (20% closer from z=6.2 start)
 * - Base platform removed via Y-threshold on visible bounding box
 * - autoClear + clear() each frame — no ghost artifacts
 * - Desktop only — hard bail on mobile
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const lerp    = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const invLerp = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));

export default function SprinklerModel() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Desktop only
    if (window.innerWidth < 768) return;

    const getW = () => mount.clientWidth  || Math.round(window.innerWidth * 0.6);
    const getH = () => mount.clientHeight || window.innerHeight;

    /* ── Renderer ────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias:       true,
      alpha:           true,
      powerPreference: 'high-performance',
    });
    renderer.autoClear           = true;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.setSize(getW(), getH());

    // No inline background on the canvas — transparent
    renderer.domElement.style.background = 'transparent';
    mount.appendChild(renderer.domElement);

    /* ── Scene ───────────────────────────────────────── */
    const scene = new THREE.Scene();

    /* ── Environment ─────────────────────────────────── */
    const pmrem  = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment          = envTex;
    scene.environmentIntensity = 0.3;
    pmrem.dispose();

    /* ── Camera ──────────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(38, getW() / getH(), 0.01, 200);
    // z=6.2 start → z=4.8 end (20% closer max)
    camera.position.set(0, 0.4, 6.2);
    camera.lookAt(-1.4, 0.0, 0);

    /* ── Lights — gold glow on steel ─────────────────── */
    scene.add(new THREE.AmbientLight(0x111111, 2.0));

    // Primary gold key light — top right
    const keyLight = new THREE.PointLight(0xD4A017, 3.0, 30);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    scene.add(keyLight);

    // Gold fill — front left
    const fillLight = new THREE.PointLight(0xD4A017, 1.5, 25);
    fillLight.position.set(-4, 2, 5);
    scene.add(fillLight);

    // White rim — from behind
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(0, 3, -6);
    scene.add(rimLight);

    /* ── Materials ───────────────────────────────────── */
    const steelBase = new THREE.MeshStandardMaterial({
      color:               new THREE.Color('#8a8a8a'),
      metalness:           0.9,
      roughness:           0.4,
      envMapIntensity:     0.6,
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
      renderer.setSize(getW(), getH());
      camera.aspect = getW() / getH();
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

    /* ── Scroll ──────────────────────────────────────── */
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

        const copyEl = document.getElementById('hero-copy');
        if (copyEl) {
          copyEl.style.opacity   = String(lerp(1, 0, t));
          copyEl.style.transform = `translateX(${lerp(0, -50, t)}px)`;
        }
        const maskEl = document.getElementById('model-mask');
        if (maskEl) maskEl.style.opacity = String(lerp(1, 0, t));
      },
    });

    /* ── Model ───────────────────────────────────────── */
    interface SolidEntry { mat: THREE.MeshStandardMaterial }
    interface WireEntry  { mat: THREE.LineBasicMaterial    }

    let solidEntries: SolidEntry[] = [];
    let wireEntries:  WireEntry[]  = [];
    // Single parent group — all meshes stay under this, nothing ever separates
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    let baseRotY = 0;

    new GLTFLoader().load('/red_sprinkler_pump.glb', (gltf) => {
      const root = gltf.scene;

      // Step 1: scale the full GLB to a normalized size
      const fullBox  = new THREE.Box3().setFromObject(root);
      const fullSize = fullBox.getSize(new THREE.Vector3());
      const normScale = 3.0 / Math.max(fullSize.x, fullSize.y, fullSize.z);
      root.scale.setScalar(normScale);

      // Center the full model at origin first
      const fullCentre = fullBox.getCenter(new THREE.Vector3());
      root.position.sub(fullCentre.multiplyScalar(normScale));

      // Step 2: determine base threshold on scaled geometry
      // The base platform is a large flat disc — its centroid sits very low.
      // Hide any mesh whose CENTER Y is in the bottom 35% of the model height.
      const scaledBox  = new THREE.Box3().setFromObject(root);
      const modelMinY  = scaledBox.min.y;
      const modelMaxY  = scaledBox.max.y;
      const modelH     = modelMaxY - modelMinY;
      // Threshold: hide mesh if its centroid is below this Y value
      const centroidThreshold = modelMinY + modelH * 0.35;

      // Step 3: apply materials to ALL meshes, hide base platform pieces
      root.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        mesh.castShadow    = true;
        mesh.receiveShadow = true;

        const mb        = new THREE.Box3().setFromObject(mesh);
        const centroidY = (mb.min.y + mb.max.y) / 2;
        if (centroidY < centroidThreshold) {
          mesh.visible = false;
          return;
        }

        const solidMat = steelBase.clone() as THREE.MeshStandardMaterial;
        mesh.material  = solidMat;
        solidEntries.push({ mat: solidMat });

        const edges   = new THREE.EdgesGeometry(mesh.geometry, 20);
        const wireMat = wireBase.clone() as THREE.LineBasicMaterial;
        const lines   = new THREE.LineSegments(edges, wireMat);
        lines.renderOrder = 1;
        mesh.add(lines);
        wireEntries.push({ mat: wireMat });
      });

      // Step 4: re-center on VISIBLE geometry so there's no float / empty space
      const visBox = new THREE.Box3();
      root.traverse(child => {
        if ((child as THREE.Mesh).isMesh && child.visible) {
          visBox.expandByObject(child);
        }
      });
      if (!visBox.isEmpty()) {
        const visCenter = visBox.getCenter(new THREE.Vector3());
        root.position.y -= visCenter.y;
      }

      // Step 5: add root to single parent group — 30% larger than previous target
      // Previous effective world size was ~3.0; 30% bigger = 3.9
      const visSize   = (() => { const b = new THREE.Box3(); root.traverse(c => { if ((c as THREE.Mesh).isMesh && c.visible) b.expandByObject(c); }); return b.getSize(new THREE.Vector3()); })();
      const visDim    = Math.max(visSize.x, visSize.y, visSize.z);
      const TARGET    = 3.9;
      modelGroup.scale.setScalar(visDim > 0.001 ? TARGET / visDim : 1);
      modelGroup.add(root);
    });

    /* ── RAF loop (30fps cap) ────────────────────────── */
    const FRAME_MS = 1000 / 30;
    let lastFrame  = 0;
    let rafId      = 0;
    let lerpRX     = 0;
    let lerpRY     = 0;
    let lastP      = -1;

    const CAM_START  = new THREE.Vector3(0, 0.4, 6.2);
    const CAM_END    = new THREE.Vector3(0, 0.3, 4.8); // 20% closer max
    const LOOK_START = new THREE.Vector3(-1.4, 0.0, 0);
    const LOOK_END   = new THREE.Vector3( 0,   0.0, 0);
    const LOOK_NOW   = new THREE.Vector3();

    const loop = (ts: number) => {
      rafId = requestAnimationFrame(loop);
      if (ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;

      // Explicit clear each frame — prevents ghost/artifact lines
      renderer.clear();

      const p = progress.value;

      /* Camera */
      camera.position.lerpVectors(CAM_START, CAM_END, p);
      LOOK_NOW.lerpVectors(LOOK_START, LOOK_END, clamp01(p / 0.55));
      camera.lookAt(LOOK_NOW);

      /* Dissolve
         0.00–0.28  solid=1  wire=0
         0.28–0.65  solid→0  wire→1
         0.65–0.88  solid=0  wire=1
         0.88–1.00  solid=0  wire→0
      */
      if (Math.abs(p - lastP) > 0.002) {
        lastP = p;

        const solidOpacity =
          p < 0.28 ? 1 :
          p < 0.65 ? lerp(1, 0, invLerp(0.28, 0.65, p)) :
          0;

        const wireOpacity =
          p < 0.28 ? 0 :
          p < 0.65 ? lerp(0, 1, invLerp(0.28, 0.65, p)) :
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

      /* Rotation — single group only */
      baseRotY += 0.004 * (1 - clamp01(p * 4));
      const mf = 1 - clamp01(p * 5);
      lerpRX += (mouse.y * -0.18 * mf - lerpRX) * 0.05;
      lerpRY += (mouse.x *  0.16 * mf - lerpRY) * 0.05;
      modelGroup.rotation.y = baseRotY + lerpRY;
      modelGroup.rotation.x = lerpRX;

      /* Key light tracks mouse */
      keyLight.position.x = 5 + mouse.x * 2;
      keyLight.position.y = 8 + mouse.y * -1.5;

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
      if (maskEl) maskEl.style.opacity = '1';
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
