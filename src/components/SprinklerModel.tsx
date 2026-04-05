'use client';

/**
 * SprinklerModel — Scroll-jacked holographic sprinkler pump
 *
 * Holographic look: semi-transparent solid faces (opacity 0.78), persistent
 * edge glow (opacity 0.22 baseline), emissive inner amber, low roughness.
 * Parts filter: base centroid-Y + XZ outlier radius — removes scattered
 * assembly components (side valve, crate, fittings) that are far from main body.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
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
    if (window.innerWidth < 768) {
      // No model on mobile — signal loader immediately
      window.dispatchEvent(new CustomEvent('app:ready'));
      return;
    }

    const getW = () => mount.clientWidth  || Math.round(window.innerWidth * 0.6);
    const getH = () => mount.clientHeight || window.innerHeight;

    /* ── Renderer ────────────────────────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({
      antialias:       true,
      alpha:           true,
      powerPreference: 'high-performance',
    });
    renderer.autoClear           = true;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled   = false; // off for perf — holographic look doesn't need shadows
    renderer.setSize(getW(), getH());
    renderer.domElement.style.background = '';
    mount.appendChild(renderer.domElement);

    /* ── Scene ───────────────────────────────────────────────────────────── */
    const scene = new THREE.Scene();

    /* ── Environment ─────────────────────────────────────────────────────── */
    const pmrem  = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
    scene.environment          = envTex;
    scene.environmentIntensity = 0.15;
    pmrem.dispose();

    /* ── Camera ──────────────────────────────────────────────────────────── */
    const camera = new THREE.PerspectiveCamera(38, getW() / getH(), 0.01, 200);
    camera.position.set(0, 0.4, 6.2);
    camera.lookAt(-1.4, 0.0, 0);

    /* ── Lights — holographic: gold key + blue-teal hologram fill + white rim */
    scene.add(new THREE.AmbientLight(0x0a0800, 1.2));

    const keyLight = new THREE.PointLight(0xD4A017, 3.5, 35);
    keyLight.position.set(6, 9, 5);
    scene.add(keyLight);

    // Holographic blue-teal fill (replaces orange — gives cold/tech contrast to gold)
    const holoFill = new THREE.PointLight(0x2060FF, 0.6, 30);
    holoFill.position.set(-5, 2, 6);
    scene.add(holoFill);

    // Warm secondary fill so it doesn't go too cold
    const warmFill = new THREE.PointLight(0xFF8800, 0.4, 20);
    warmFill.position.set(-4, -2, 3);
    scene.add(warmFill);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.6);
    rimLight.position.set(0, 2, -8);
    scene.add(rimLight);

    /* ── Material — holographic gold ─────────────────────────────────────── */
    const goldBase = new THREE.MeshStandardMaterial({
      color:               new THREE.Color('#D4AF37'),  // brand gold — matches headline text
      emissive:            new THREE.Color('#5A2800'),  // strong amber inner glow
      emissiveIntensity:   0.9,
      metalness:           0.9,
      roughness:           0.15,   // very low roughness = mirror-like holographic sheen
      envMapIntensity:     0.7,
      transparent:         true,
      opacity:             0.52,   // clearly semi-transparent — holographic projection look
      side:                THREE.FrontSide,
      polygonOffset:       true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits:  1,
    });

    // Wireframe edges: prominent holographic glow from the start
    const wireBase = new THREE.LineBasicMaterial({
      color:       0xD4AF37,  // brand gold edges
      transparent: true,
      opacity:     0.40,      // clearly visible baseline glow
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });

    /* ── Mouse ───────────────────────────────────────────────────────────── */
    const mouse = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth  - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    /* ── Resize ──────────────────────────────────────────────────────────── */
    const onResize = () => {
      renderer.setSize(getW(), getH());
      camera.aspect = getW() / getH();
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize, { passive: true });

    /* ── ScrollTrigger ───────────────────────────────────────────────────── */
    const progress = { value: 0 };

    const st = ScrollTrigger.create({
      trigger: '#hero',
      start:   'top top',
      end:     '+=235%',
      pin:     true,
      scrub:   0.6,
      onUpdate: (self) => {
        progress.value = self.progress;

        // Copy slides out (0 → 28%)
        const t = invLerp(0, 0.28, self.progress);
        const copyEl = document.getElementById('hero-copy');
        if (copyEl) {
          copyEl.style.opacity   = String(lerp(1, 0, t));
          copyEl.style.transform = `translateX(${lerp(0, -50, t)}px)`;
        }
        const maskEl = document.getElementById('model-mask');
        if (maskEl) maskEl.style.opacity = String(lerp(1, 0, t));

        // Fade to black over the last 15% — cinematic dissolve into next section
        const fadeEl = document.getElementById('hero-fade');
        if (fadeEl) {
          fadeEl.style.opacity = String(invLerp(0.85, 1.0, self.progress));
        }
      },
    });

    /* ── Model state ─────────────────────────────────────────────────────── */
    interface SolidEntry { mat: THREE.MeshStandardMaterial }
    interface WireEntry  { mat: THREE.LineBasicMaterial    }
    let solidEntries: SolidEntry[] = [];
    let wireEntries:  WireEntry[]  = [];

    const parent = new THREE.Object3D();
    scene.add(parent);

    let baseRotY = 0;

    /* ── GLB Load ─────────────────────────────────────────────────────────── */
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load('/red_sprinkler_pump.glb', (gltf) => {
      const root = gltf.scene;

      let meshCount = 0;
      root.traverse(c => { if ((c as THREE.Mesh).isMesh) meshCount++; });
      console.log(`[SprinklerModel] GLB loaded — ${meshCount} meshes`);

      /* 1. Normalise scale to 3-unit bounding box */
      const fullBox   = new THREE.Box3().setFromObject(root);
      const fullSize  = fullBox.getSize(new THREE.Vector3());
      const normScale = 3.0 / Math.max(fullSize.x, fullSize.y, fullSize.z);
      root.scale.setScalar(normScale);
      const fullCentre = fullBox.getCenter(new THREE.Vector3());
      root.position.sub(fullCentre.multiplyScalar(normScale));

      /* 2. Base-platform centroid filter — hide bottom 35% by Y */
      const scaledBox = new THREE.Box3().setFromObject(root);
      const modelH    = scaledBox.max.y - scaledBox.min.y;
      const centroidThresholdY = scaledBox.min.y + modelH * 0.12; // only cuts the very lowest flat base disc

      root.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        const mb        = new THREE.Box3().setFromObject(mesh);
        const centroidY = (mb.min.y + mb.max.y) * 0.5;
        if (centroidY < centroidThresholdY) mesh.visible = false;
      });

      /* 3. XZ outlier filter — remove parts far from the main body centroid.
            Computes mean XZ position of all currently-visible mesh centroids,
            then hides anything beyond MAX_RADIUS world units from that mean.
            This removes side valves, crates, and loose fittings that are
            physically separated from the main pump body in the GLB assembly. */
      const visibleCentroids: THREE.Vector3[] = [];
      root.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh || !child.visible) return;
        const mb = new THREE.Box3().setFromObject(child);
        visibleCentroids.push(mb.getCenter(new THREE.Vector3()));
      });

      if (visibleCentroids.length > 1) {
        const mean = visibleCentroids
          .reduce((acc, c) => acc.add(c), new THREE.Vector3())
          .divideScalar(visibleCentroids.length);

        // Compute median distance (more robust than mean for outlier detection)
        const distances = visibleCentroids.map(c =>
          Math.sqrt(Math.pow(c.x - mean.x, 2) + Math.pow(c.z - mean.z, 2))
        );
        distances.sort((a, b) => a - b);
        const medianDist = distances[Math.floor(distances.length / 2)];

        // Threshold: 3× median distance (keeps clustered body, drops outliers)
        const MAX_RADIUS = Math.max(medianDist * 3, 0.4);
        console.log(`[SprinklerModel] XZ filter — mean=(${mean.x.toFixed(2)},${mean.z.toFixed(2)}) medianDist=${medianDist.toFixed(2)} radius=${MAX_RADIUS.toFixed(2)}`);

        root.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh || !child.visible) return;
          const mb = new THREE.Box3().setFromObject(child);
          const c  = mb.getCenter(new THREE.Vector3());
          const dxz = Math.sqrt(Math.pow(c.x - mean.x, 2) + Math.pow(c.z - mean.z, 2));
          if (dxz > MAX_RADIUS) {
            child.visible = false;
            console.log(`[SprinklerModel] Filtered outlier at dxz=${dxz.toFixed(2)}`);
          }
        });
      }

      /* 4. Apply holographic material to all remaining visible meshes */
      root.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh || !child.visible) return;
        const mesh = child as THREE.Mesh;

        const solidMat = goldBase.clone() as THREE.MeshStandardMaterial;
        mesh.material  = solidMat;
        solidEntries.push({ mat: solidMat });

        const edges   = new THREE.EdgesGeometry(mesh.geometry, 20);
        const wireMat = wireBase.clone() as THREE.LineBasicMaterial;
        const lines   = new THREE.LineSegments(edges, wireMat);
        lines.renderOrder = 1;
        mesh.add(lines);
        wireEntries.push({ mat: wireMat });
      });

      /* 5. Re-centre on visible geometry */
      const visBox = new THREE.Box3();
      root.traverse(c => {
        if ((c as THREE.Mesh).isMesh && c.visible) visBox.expandByObject(c);
      });
      if (!visBox.isEmpty()) {
        const visCenter = visBox.getCenter(new THREE.Vector3());
        root.position.x -= visCenter.x;
        root.position.y -= visCenter.y;
        // don't offset Z — keep depth natural
      }

      /* 6. Scale group so visible portion fills target world size */
      const visSizeBox = new THREE.Box3();
      root.traverse(c => { if ((c as THREE.Mesh).isMesh && c.visible) visSizeBox.expandByObject(c); });
      const visDim = Math.max(...visSizeBox.getSize(new THREE.Vector3()).toArray());
      parent.scale.setScalar(visDim > 0.001 ? 3.9 / visDim : 1);

      parent.add(root);

      // Signal loader after two RAF ticks — gives the render loop time to
      // paint the model's first frame before the loader fades out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('app:ready'));
        });
      });
    });

    /* ── RAF 30fps ───────────────────────────────────────────────────────── */
    const FRAME_MS = 1000 / 30;
    let lastFrame  = 0, rafId = 0, lerpRX = 0, lerpRY = 0, lastP = -1;

    const CAM_START  = new THREE.Vector3(0, 0.4,  6.2);
    const CAM_END    = new THREE.Vector3(0, 0.3,  4.8);
    const LOOK_START = new THREE.Vector3(-1.4, 0.0, 0);
    const LOOK_END   = new THREE.Vector3( 0,   0.0, 0);
    const LOOK_NOW   = new THREE.Vector3();

    const loop = (ts: number) => {
      rafId = requestAnimationFrame(loop);
      if (ts - lastFrame < FRAME_MS) return;
      lastFrame = ts;

      renderer.clear();

      const p = progress.value;

      /* Camera */
      camera.position.lerpVectors(CAM_START, CAM_END, p);
      LOOK_NOW.lerpVectors(LOOK_START, LOOK_END, clamp01(p / 0.55));
      camera.lookAt(LOOK_NOW);

      /* Dissolve — holographic from the start:
         solid starts at 0.78 opacity, wire starts at 0.22
         transition 0.55→0.78: solid fades out, wire ramps to full
         wire 0.78→0.92: full wireframe
         fade 0.92→1.0: everything out */
      if (Math.abs(p - lastP) > 0.002) {
        lastP = p;

        const solidOpacity =
          p < 0.55 ? 0.52 :
          p < 0.78 ? lerp(0.52, 0, invLerp(0.55, 0.78, p)) :
          0;

        const wireOpacity =
          p < 0.55 ? 0.40 :                                  // always glowing
          p < 0.78 ? lerp(0.40, 1, invLerp(0.55, 0.78, p)) :
          p < 0.92 ? 1 :
                     lerp(1, 0, invLerp(0.92, 1.00, p));

        solidEntries.forEach(({ mat }) => {
          mat.opacity = Math.max(0, solidOpacity);
          mat.visible = solidOpacity > 0.005;
        });
        wireEntries.forEach(({ mat }) => {
          mat.opacity = Math.max(0, wireOpacity);
        });
      }

      /* Rotate single parent only */
      baseRotY += 0.004 * (1 - clamp01(p * 4));
      const mf = 1 - clamp01(p * 5);
      lerpRX += (mouse.y * -0.18 * mf - lerpRX) * 0.05;
      lerpRY += (mouse.x *  0.16 * mf - lerpRY) * 0.05;
      parent.rotation.y = baseRotY + lerpRY;
      parent.rotation.x = lerpRX;

      /* Gold key light tracks mouse */
      keyLight.position.x = 6 + mouse.x * 2;
      keyLight.position.y = 9 + mouse.y * -1.5;

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(loop);

    /* ── Cleanup ─────────────────────────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize',    onResize);
      st.kill();
      const copyEl = document.getElementById('hero-copy');
      if (copyEl) { copyEl.style.opacity = '1'; copyEl.style.transform = ''; }
      const maskEl = document.getElementById('model-mask');
      if (maskEl) maskEl.style.opacity = '1';
      const fadeEl = document.getElementById('hero-fade');
      if (fadeEl) fadeEl.style.opacity = '0';
      goldBase.dispose();
      wireBase.dispose();
      envTex.dispose();
      dracoLoader.dispose();
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
