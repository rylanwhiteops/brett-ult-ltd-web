'use client';

/**
 * SprinklerModel — Scroll-jacked 3D sprinkler pump with camera zoom-through
 *
 * PIN:  GSAP ScrollTrigger pins #hero for 220vh of scroll
 * ZOOM: Camera moves from z=5.8 → z=-2.2 (through the model)
 *
 * DISSOLVE TIMELINE (scroll progress 0 → 1):
 *   0.00 – 0.18  camera approaches  solid=1.0  wire=0.0
 *   0.18 – 0.55  entering model     solid 1→0  wire 0→1
 *   0.55 – 0.82  inside model       solid=0.0  wire=1.0
 *   0.82 – 1.00  exiting            solid=0.0  wire 1→0
 *
 * COPY: hero-copy div fades out + slides left over first 28% of scroll
 *
 * Materials:
 *   Solid  — MeshStandardMaterial gold #D4A017, metalness 0.88, roughness 0.22
 *   Wire   — EdgesGeometry LineSegments children, additive blend, gold
 *
 * Base removal: hides meshes whose bounding-box max-Y < bottom 7% of model
 * Silent load — no loading UI
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ── helpers ────────────────────────────────────────── */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const invLerp = (a: number, b: number, v: number) => clamp01((v - a) / (b - a));

export default function SprinklerModel() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Desktop-only — bail out entirely on mobile to save GPU
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop) return;

    // Dimension fallbacks: mount may have height:0 if parent uses min-height (not height)
    const getW = () => mount.clientWidth  || Math.round(window.innerWidth * 0.6);
    const getH = () => mount.clientHeight || window.innerHeight;

    /* ── Renderer ────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // 1.5 vs 2 — big GPU saving
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    renderer.setSize(getW(), getH());
    mount.appendChild(renderer.domElement);

    /* ── Scene ───────────────────────────────────────── */
    const scene = new THREE.Scene();

    /* ── Environment (RoomEnvironment for gold reflections) ── */
    const pmrem  = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.08).texture;
    scene.environment          = envTex;
    scene.environmentIntensity = 0.75;
    pmrem.dispose();

    /* ── Camera ──────────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(
      38,
      getW() / getH(),
      0.01, 200,
    );
    // Start position (outside model)
    camera.position.set(0, 0.5, 5.8);
    camera.lookAt(0, 0.2, 0);

    /* ── Lights ──────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0x150b00, 2.5));

    const keyLight = new THREE.PointLight(0xD4A017, 200, 25);
    keyLight.position.set(4, 8, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512); // 512 sufficient — halves shadow texture cost
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xFF8C00, 40, 22);
    fillLight.position.set(-5, 1, 3);
    scene.add(fillLight);

    // Inside-model light — becomes dominant when camera is inside
    const innerLight = new THREE.PointLight(0xD4A017, 0, 8);
    innerLight.position.set(0, 0, 0);
    scene.add(innerLight);

    const dirLight = new THREE.DirectionalLight(0xD4A017, 0.6);
    dirLight.position.set(2, -1, -5);
    scene.add(dirLight);

    /* ── Material bases ──────────────────────────────── */
    const goldBase = new THREE.MeshStandardMaterial({
      color:               new THREE.Color('#D4A017'),
      metalness:           0.88,
      roughness:           0.22,
      envMapIntensity:     1.4,
      transparent:         true,
      opacity:             1,
      polygonOffset:       true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits:  1,
    });

    const wireBase = new THREE.LineBasicMaterial({
      color:      0xD4A017,
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

    // ResizeObserver keeps renderer in sync as container expands during scroll
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    /* ── Scroll progress (GSAP ScrollTrigger — desktop only) ── */
    const progress = { value: 0 };

    const st = isDesktop ? ScrollTrigger.create({
      trigger:      '#hero',
      start:        'top top',
      end:          '+=220%',
      pin:          true,
      scrub:        1.0,
      onUpdate: (self) => {
        progress.value = self.progress;

        const t = invLerp(0, 0.28, self.progress);

        // Fade + slide hero copy out over first 28% of scroll
        const copyEl = document.getElementById('hero-copy');
        if (copyEl) {
          copyEl.style.opacity   = String(lerp(1, 0, t));
          copyEl.style.transform = `translateX(${lerp(0, -50, t)}px)`;
        }

        // Expand model container from right-60% → full screen as copy exits
        const modelEl = document.getElementById('model-container');
        if (modelEl) {
          const pct = lerp(60, 100, t);
          const left = lerp(40, 0, t);
          modelEl.style.width = `${pct}%`;
          modelEl.style.left  = `${left}%`;
          modelEl.style.right = 'auto';
        }
      },
    }) : null;

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
      const sBox          = new THREE.Box3().setFromObject(root);
      const baseThreshold = sBox.min.y + (sBox.max.y - sBox.min.y) * 0.07;

      /* Apply materials */
      root.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        mesh.castShadow    = true;
        mesh.receiveShadow = true;

        // Hide base platform
        const mb = new THREE.Box3().setFromObject(mesh);
        if (mb.max.y < baseThreshold) { mesh.visible = false; return; }

        // Gold solid
        const solidMat = goldBase.clone() as THREE.MeshStandardMaterial;
        mesh.material = solidMat;
        solidEntries.push({ mat: solidMat });

        // Wire edges as child (inherits mesh transforms)
        const edges   = new THREE.EdgesGeometry(mesh.geometry, 20); // higher threshold = fewer segments
        const wireMat = wireBase.clone() as THREE.LineBasicMaterial;
        const lines   = new THREE.LineSegments(edges, wireMat);
        lines.renderOrder = 1;
        mesh.add(lines);
        wireEntries.push({ mat: wireMat });
      });

      modelGroup = new THREE.Group();
      modelGroup.add(root);
      scene.add(modelGroup);
    });

    /* ── RAF loop (30fps cap) ────────────────────────── */
    const FRAME_MS = 1000 / 30;
    let lastFrame  = 0;
    let rafId      = 0;
    let lerpRX     = 0;
    let lerpRY     = 0;
    let lastP      = -1; // track previous progress to skip redundant material updates

    const LOOK_AT = new THREE.Vector3(0, 0.2, 0);

    // Camera path
    const CAM_START = new THREE.Vector3(0, 0.5,  5.8);
    const CAM_END   = new THREE.Vector3(0, 0.0, -2.2);

    const loop = (ts: number) => {
      rafId = requestAnimationFrame(loop);
      if (ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;

      const p = progress.value;

      /* ── Camera zoom path ──────────────────────────── */
      camera.position.lerpVectors(CAM_START, CAM_END, p);
      camera.lookAt(LOOK_AT);

      /* ── Dissolve material logic ────────────────────
         0.00–0.18  approaching  solid=1   wire=0
         0.18–0.55  entering     solid 1→0 wire 0→1
         0.55–0.82  inside       solid=0   wire=1
         0.82–1.00  exiting      solid=0   wire 1→0
      */
      // Only update materials when progress moves enough to matter
      if (Math.abs(p - lastP) > 0.003) {
        lastP = p;

        const solidOpacity =
          p < 0.18 ? 1 :
          p < 0.55 ? lerp(1, 0, invLerp(0.18, 0.55, p)) :
          0;

        const wireOpacity =
          p < 0.18 ? 0 :
          p < 0.55 ? lerp(0, 1, invLerp(0.18, 0.55, p)) :
          p < 0.82 ? 1 :
                     lerp(1, 0, invLerp(0.82, 1.00, p));

        solidEntries.forEach(({ mat }) => {
          mat.opacity = Math.max(0, solidOpacity);
          mat.visible = solidOpacity > 0.005;
        });
        wireEntries.forEach(({ mat }) => {
          mat.opacity = Math.max(0, wireOpacity * 0.90);
        });

        // Inner glow brightens as camera moves inside
        const inside = clamp01(invLerp(0.40, 0.65, p)) * (1 - clamp01(invLerp(0.80, 1.0, p)));
        innerLight.intensity = inside * 80;
      }

      /* ── Model rotation ─────────────────────────────
         Slow rotation at rest, stops as zoom begins
      */
      if (modelGroup) {
        baseRotY += 0.004 * (1 - clamp01(p * 4)); // decelerates in first 25%

        // Mouse parallax fades out as zoom takes over
        const mouseFactor = 1 - clamp01(p * 5);
        lerpRX += (mouse.y * -0.20 * mouseFactor - lerpRX) * 0.05;
        lerpRY += (mouse.x *  0.18 * mouseFactor - lerpRY) * 0.05;

        modelGroup.rotation.y = baseRotY + lerpRY;
        modelGroup.rotation.x = lerpRX;
      }

      /* ── Key light follows mouse ─────────────────── */
      keyLight.position.x = 4 + mouse.x * 2;
      keyLight.position.y = 8 + mouse.y * -1.5;

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(loop);

    /* ── Cleanup ─────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      ro.disconnect();
      st?.kill();
      // Restore state on cleanup
      const copyEl = document.getElementById('hero-copy');
      if (copyEl) { copyEl.style.opacity = '1'; copyEl.style.transform = ''; }
      const modelEl = document.getElementById('model-container');
      if (modelEl) { modelEl.style.width = '60%'; modelEl.style.left = ''; modelEl.style.right = '0'; }
      goldBase.dispose();
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
